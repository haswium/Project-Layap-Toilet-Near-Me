// Report Form & Submitting Toilets

let reportMap = null;
let selectedPhotos = [];
let selectedFacilities = [];
let isSubmitting = false;

function initReportMap() {
  const container = document.getElementById('reportMap');
  if (!container) return;

  if (reportMap) {
    reportMap.remove();
  }

  reportMap = L.map('reportMap', {
    center: SURABAYA_COORDS,
    zoom: 15,
    zoomControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(reportMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(reportMap);

  reportMap.on('move', updateReportCoordinates);
  
  // Center map on user location if available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = L.latLng(pos.coords.latitude, pos.coords.longitude);
        reportMap.setView(center, 15);
        updateReportCoordinates();
      },
      (err) => {
        console.warn('Geolocation error:', err);
        updateReportCoordinates();
      }
    );
  } else {
    updateReportCoordinates();
  }
}

function updateReportCoordinates() {
  if (!reportMap) return;
  const center = reportMap.getCenter();
  const input = document.getElementById('selectedCoords');
  if (input) {
    input.value = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  }
}

function handleFileSelect(files) {
  Array.from(files).forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showToast(`❌ File ${file.name} melebihi batas 5MB`, 'error');
      return;
    }
    const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!valid.includes(file.type)) {
      showToast(`❌ Format ${file.name} tidak didukung (gunakan JPG, PNG, atau WebP)`, 'error');
      return;
    }
    selectedPhotos.push(file);
  });
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const container = document.getElementById('filePreview');
  if (!container) return;

  container.innerHTML = selectedPhotos.map((file, i) => `
    <div style="position: relative;">
      <img src="${URL.createObjectURL(file)}" alt="Preview">
      <button type="button" onclick="removePhoto(${i})" style="
        position: absolute;
        top: 4px;
        right: 4px;
        width: 22px;
        height: 22px;
        background: #FF5C5C;
        border: 1px solid #111;
        color: white;
        font-weight: bold;
        cursor: pointer;
      ">×</button>
    </div>
  `).join('');
}

window.removePhoto = function(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreviews();
};

function toggleFacility(f) {
  const index = selectedFacilities.indexOf(f);
  if (index > -1) {
    selectedFacilities.splice(index, 1);
  } else {
    selectedFacilities.push(f);
  }
  updateFacilitiesChips();
}

function updateFacilitiesChips() {
  const chips = document.querySelectorAll('.filter-chips .filter-chip');
  chips.forEach(chip => {
    const facility = chip.dataset.facility;
    if (selectedFacilities.includes(facility)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

async function uploadPhotos(reportId) {
  const bucket = 'toilet-photos';
  const folder = `reports/${reportId}`;
  const uploadedUrls = [];

  for (let i = 0; i < selectedPhotos.length; i++) {
    const file = selectedPhotos[i];
    const fileName = `${folder}/${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const { error: uploadErr } = await supabaseClient.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadErr) {
      console.warn('Storage upload error:', uploadErr);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(fileName);

    uploadedUrls.push({
      url: publicUrl,
      isPrimary: i === 0
    });

    await supabaseClient.from('report_images').insert({
      report_id: reportId,
      image_url: publicUrl,
      is_primary: i === 0
    });
  }
  return uploadedUrls;
}

async function submitReport(e) {
  e.preventDefault();
  if (isSubmitting) return;

  if (selectedPhotos.length === 0) {
    showToast('❌ Wajib unggah minimal 1 foto toilet', 'error');
    return;
  }
  if (selectedFacilities.length === 0) {
    showToast('❌ Wajib pilih minimal 1 fasilitas', 'error');
    return;
  }

  isSubmitting = true;
  const submitBtn = document.getElementById('submitReportBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Mengirim...';
  }

  try {
    const center = reportMap.getCenter();
    const name = document.getElementById('toiletName').value.trim();
    const address = document.getElementById('toiletAddress').value.trim();
    const floor = document.getElementById('toiletFloor').value.trim() || null;
    const priceType = document.getElementById('priceType').value;
    const price = priceType === 'berbayar' ? parseFloat(document.getElementById('toiletPrice').value) || 0 : 0;
    const comfort = parseInt(document.getElementById('comfortLevel').value);
    const desc = document.getElementById('toiletDescription').value.trim() || null;

    const { data: report, error: reportErr } = await supabaseClient
      .from('reports')
      .insert({
        user_id: currentUser.id,
        name,
        latitude: center.lat,
        longitude: center.lng,
        address,
        floor,
        price_type: priceType,
        price,
        comfort,
        description: desc,
        facilities: JSON.stringify(selectedFacilities),
        status: 'pending'
      })
      .select()
      .single();

    if (reportErr) throw reportErr;

    await uploadPhotos(report.id);

    showToast('✅ Laporan berhasil dikirim untuk ditinjau admin!', 'success');
    setTimeout(() => {
      window.location.href = 'my-reports.html';
    }, 1200);

  } catch (error) {
    console.error('Submit report error:', error);
    showToast('❌ ' + error.message, 'error');
  } finally {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '📤 Kirim Laporan';
    }
  }
}