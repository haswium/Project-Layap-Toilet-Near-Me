// Leaflet Map Logic & Public Toilet Browsing

let map = null;
let markerClusterGroup = null;
let userMarker = null;
let toiletMarkers = [];
let allToilets = [];
let currentToilet = null;
let activeFilters = [];

function initMainMap() {
  if (!document.getElementById('map')) return;

  map = L.map('map', {
    center: SURABAYA_COORDS,
    zoom: 15,
    zoomControl: false,
    minZoom: 15,
    maxBounds: ITS_HOME_BOUNDS,
    maxBoundsViscosity: 1.0
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 40,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    spiderfyOnMaxZoom: true,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="toilet-cluster" style="
          width: 42px;
          height: 42px;
          background: #8ec5ea;
          border: 2px solid #111111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #111;
          box-shadow: 2px 2px 0 #111;
        ">[${count}]</div>`,
        className: 'toilet-cluster-wrap',
        iconSize: L.point(42, 42)
      });
    }
  });
  map.addLayer(markerClusterGroup);

  loadToilets();
}

async function loadToilets() {
  try {
    const { data, error } = await supabaseClient
      .from('toilets')
      .select(`
        *,
        toilet_images (
          id,
          image_url,
          is_primary
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allToilets = data || [];
    renderMarkers(allToilets);

  } catch (error) {
    console.error('Error loading toilets:', error);
    showToast('❌ Gagal memuat data toilet', 'error');
  }
}

function renderMarkers(toilets) {
  if (markerClusterGroup) {
    markerClusterGroup.clearLayers();
  }
  toiletMarkers = [];

  toilets.forEach(toilet => {
    const marker = L.marker([toilet.latitude, toilet.longitude], {
        icon: L.divIcon({
        className: '', 
        html: `
          <svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));">
            <!-- 1. Pin Tetesan Air (Biru) -->
            <path d="M18 0C9 0 2 8 2 17c0 10 16 27 16 27s16-17 16-27c0-9-7-17-16-17z" 
                  fill="#2563EB" stroke="#ffffff" stroke-width="1"/>
            
            <g transform="translate(18,18) scale(1.4) translate(-18,-18)">
              
              <!-- Ikon Pria (Kiri) -->
              <circle cx="13.7" cy="13" r="1.5" fill="#ffffff"/>
              <rect x="12.3" y="15" width="3" height="4" rx="0.5" fill="#ffffff"/>
              <rect x="12.3" y="19" width="1.2" height="3" fill="#ffffff"/>
              <rect x="14.1" y="19" width="1.2" height="3" fill="#ffffff"/>

              <!-- Garis Pemisah (|) -->
              <line x1="18" y1="12" x2="18" y2="22" stroke="#ffffff" stroke-width="1" opacity="1"/>

              <!-- Ikon Wanita (Kanan) -->
              <circle cx="23" cy="13" r="1.5" fill="#ffffff"/>
              <path d="M21 15h4l2 5h-8z" fill="#ffffff"/>
              <rect x="22" y="20" width="1" height="2" fill="#ffffff"/>
              <rect x="23" y="20" width="1" height="2" fill="#ffffff"/>
              
            </g>
          </svg>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 46],
        popupAnchor: [0, -46]
      })
    });

    marker.on('click', () => showToiletDetail(toilet));
    toiletMarkers.push(marker);
    markerClusterGroup.addLayer(marker);
  });
}

function showToiletDetail(toilet) {
  currentToilet = toilet;
  const primaryImg = toilet.toilet_images?.find(i => i.is_primary)?.image_url || 'https://via.placeholder.com/400x300?text=Toilet';
  const otherImgs = toilet.toilet_images?.filter(i => !i.is_primary) || [];

  const nameEl = document.getElementById('detailName');
  const addrEl = document.getElementById('detailAddress');
  const imgEl = document.getElementById('detailImage');
  const infoEl = document.getElementById('detailInfo');
  const tagsEl = document.getElementById('facilityTags');
  const photoGrid = document.getElementById('photoGrid');

  const mNameEl = document.getElementById('mobileDetailName');
  const mAddrEl = document.getElementById('mobileDetailAddress');
  const mImgEl = document.getElementById('mobileDetailImage');
  const mInfoEl = document.getElementById('mobileDetailInfo');
  const mTagsEl = document.getElementById('mobileFacilityTags');

  if (nameEl) nameEl.textContent = toilet.name;
  if (mNameEl) mNameEl.textContent = toilet.name;
  if (addrEl) addrEl.textContent = toilet.address;
  if (mAddrEl) mAddrEl.textContent = toilet.address;
  if (imgEl) imgEl.src = primaryImg;
  if (mImgEl) mImgEl.src = primaryImg; 

  let infoHtml = `
    <div class="toilet-detail-info-item">
      <span>Harga</span>
      <span>${toilet.price_type === 'gratis' ? 'Gratis' : formatCurrency(toilet.price)}</span>
    </div>
    <div class="toilet-detail-info-item">
      <span>Kenyamanan</span>
      <span class="comfort-rating">
        <span class="comfort-stars">${'★'.repeat(toilet.comfort)}${'☆'.repeat(5 - toilet.comfort)}</span>
        <span class="comfort-score">${toilet.comfort}/5</span>
      </span>
    </div>
  `;
  if (toilet.floor) {
    infoHtml = `<div class="toilet-detail-info-item"><span>Lantai</span><span>${toilet.floor}</span></div>` + infoHtml;
  }
  if (infoEl) infoEl.innerHTML = infoHtml;
  if (mInfoEl) mInfoEl.innerHTML = infoHtml;

  let facilities = [];
  try {
    facilities = Array.isArray(toilet.facilities) ? toilet.facilities : JSON.parse(toilet.facilities || '[]');
  } catch (e) {
    facilities = [];
  }

  const facilitiesHtml = facilities.map(f => `<span class="facility-tag">${typeof getFacilityLabel === 'function' ? getFacilityLabel(f) : f}</span>`).join('');

  // Masukkan ke Desktop & Mobile
  if (tagsEl) tagsEl.innerHTML = facilitiesHtml;
  if (mTagsEl) mTagsEl.innerHTML = facilitiesHtml; // Tambahan

  // Grid foto (hanya di desktop berdasarkan HTML sebelumnya)
  if (photoGrid) {
    photoGrid.innerHTML = otherImgs.map(img => `<img src="${img.image_url}" onclick="window.open('${img.image_url}', '_blank')" style="cursor:pointer;">`).join('');
  }

  // 4. TAMPILKAN PANEL YANG SESUAI DENGAN UKURAN LAYAR
  const panel = document.getElementById('toiletDetailPanel');
  const bottomSheet = document.getElementById('bottomSheet');

  if (window.innerWidth < 768) {
    if (panel) panel.classList.remove('show');
    if (bottomSheet) bottomSheet.classList.add('show');
  } else {
    if (bottomSheet) bottomSheet.classList.remove('show');
    if (panel) panel.classList.add('show');
  }

  map.setView([toilet.latitude, toilet.longitude], 16);
}

function hideToiletDetail() {
  const panel = document.getElementById('toiletDetailPanel');
  const bottomSheet = document.getElementById('bottomSheet');
  if (panel) panel.classList.remove('show');
  if (bottomSheet) bottomSheet.classList.remove('show');
  currentToilet = null;
}

function getUserLocation() {
  if (!navigator.geolocation) {
    showToast('❌ Browser tidak mendukung geolokasi', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const userLatLng = L.latLng(lat, lng);

      if (userMarker) map.removeLayer(userMarker);

      const isInsideITS = ITS_HOME_BOUNDS ? ITS_HOME_BOUNDS.contains(userLatLng) : true;

      if (isInsideITS) {
        userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'user-marker',
            html: `<div style="
              width: 20px;
              height: 20px;
              background: #98C9E8;
              border: 3px solid #111111;
              border-radius: 50%;
              box-shadow: 2px 2px 0 #111111;
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);

        map.setView([lat, lng], 16);
      } else {
        console.log("User di luar area ITS:", lat, lng);
        showToast('⚠️ Anda berada di luar area jangkauan aplikasi (ITS).', 'warning');
      }
    },
    (err) => {
      showToast('❌ Gagal membaca lokasi GPS: ' + err.message, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function applyFilters() {
  const query = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';

  const filtered = allToilets.filter(toilet => {
    const matchesSearch = toilet.name.toLowerCase().includes(query) || toilet.address.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (activeFilters.length === 0) return true;

    let facilities = [];
    try {
      facilities = Array.isArray(toilet.facilities) ? toilet.facilities : JSON.parse(toilet.facilities || '[]');
    } catch (e) {
      facilities = [];
    }

    return activeFilters.every(f => {
      if (f === 'gratis') return toilet.price_type === 'gratis';
      return facilities.includes(f);
    });
  });

  renderMarkers(filtered);

  const emptyStateBanner = document.getElementById('emptyStateBanner');
  
  if (emptyStateBanner) {
    if (filtered.length === 0) {
      emptyStateBanner.classList.add('show');   
    } else {
      emptyStateBanner.classList.remove('show'); 
    }
  }
}