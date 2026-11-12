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
        html: `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-${toilet.id}">
              <feOffset dx="2" dy="2" result="offsetblur"/>
              <feFlood flood-color="#111111" flood-opacity="1" result="offsetcolor"/>
              <feComposite in="offsetcolor" in2="offsetblur" operator="in"/>
              <feComposite in="SourceGraphic" operator="in"/>
            </filter>
          </defs>
          <!-- Pin teardrop shape -->
          <path d="M16 0C8.27 0 2 6.27 2 14c0 8 14 26 14 26s14-18 14-26c0-7.73-6.27-14-14-14z" 
                fill="#b8d3e1" stroke="#111111" stroke-width="1.5" filter="url(#shadow-${toilet.id})"/>
          <!-- Emoji toilet centered inside -->
          <text x="16" y="16" font-size="18" text-anchor="middle" dominant-baseline="middle" font-family="Arial">🚽</text>
        </svg>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        className: 'toilet-marker-pin'
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

  const panel = document.getElementById('toiletDetailPanel');
  const bottomSheet = document.getElementById('bottomSheet');

  const nameEl = document.getElementById('detailName');
  const addrEl = document.getElementById('detailAddress');
  const imgEl = document.getElementById('detailImage');
  const infoEl = document.getElementById('detailInfo');
  const tagsEl = document.getElementById('facilityTags');
  const photoGrid = document.getElementById('photoGrid');

  if (nameEl) nameEl.textContent = toilet.name;
  if (addrEl) addrEl.textContent = toilet.address;
  if (imgEl) imgEl.src = primaryImg;

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

  let facilities = [];
  try {
    facilities = Array.isArray(toilet.facilities) ? toilet.facilities : JSON.parse(toilet.facilities || '[]');
  } catch (e) {
    facilities = [];
  }

  if (tagsEl) {
    tagsEl.innerHTML = facilities.map(f => `<span class="facility-tag">${getFacilityLabel(f)}</span>`).join('');
  }

  if (photoGrid) {
    photoGrid.innerHTML = otherImgs.map(img => `<img src="${img.image_url}" onclick="window.open('${img.image_url}', '_blank')">`).join('');
  }

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

      if (userMarker) map.removeLayer(userMarker);

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
}
