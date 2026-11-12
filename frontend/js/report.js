// Report Form & Submitting Toilets

let reportMap = null;
let selectedPhotos = [];
let selectedFacilities = [];
let isGratis = true;
let isSubmitting = false;
let selectedComfort = 3;
let isEditMode = false;
let editReportId = null;
let existingImageUrl = null;

function initReportMap() {
  const container = document.getElementById('reportMap');
  if (!container) return;

  if (reportMap) {
    reportMap.remove();
  }

  reportMap = L.map('reportMap', {
    center: SURABAYA_COORDS,
    zoom: 15,
    zoomControl: false,
    minZoom: 14,
    maxBounds: ITS_REPORT_BOUNDS,
    maxBoundsViscosity: 1.0
  });

  L.control.zoom({ position: 'bottomright' }).addTo(reportMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(reportMap);

  reportMap.on('move', updateReportCoordinates);
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = L.latLng(pos.coords.latitude, pos.coords.longitude);
        if (ITS_REPORT_BOUNDS.contains(center)) {
          reportMap.setView(center, 15);
        }
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
  const file = files[0];
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    showToast('❌ Ukuran file maksimal 3MB', 'error');
    return;
  }
  const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!valid.includes(file.type)) {
    showToast('❌ Format file tidak didukung (gunakan JPG, PNG, atau WebP)', 'error');
    return;
  }
  selectedPhotos = [file];
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const container = document.getElementById('filePreview');
  if (!container) return;

  if (selectedPhotos.length > 0) {
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
  } else if (existingImageUrl) {
    container.innerHTML = `
      <div style="position: relative;">
        <img src="${existingImageUrl}" alt="Foto Sekarang">
        <button type="button" onclick="removeExistingPhoto()" style="
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
    `;
  } else {
    container.innerHTML = '';
  }
}

window.removePhoto = function(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreviews();
};

window.removeExistingPhoto = function() {
  existingImageUrl = null;
  renderPhotoPreviews();
};

function updateStarDisplay() {
  const starRating = document.getElementById('comfortRating');
  if (!starRating) return;
  const buttons = starRating.querySelectorAll('.star-btn');
  buttons.forEach((btn, i) => {
    if (i < selectedComfort) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    btn.classList.remove('hovered');
  });
}

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

async function loadReportForEdit(reportId) {
  try {
    const { data: report, error } = await supabaseClient
      .from('reports')
      .select('*, report_images(*)')
      .eq('id', reportId)
      .single();

    if (error) throw error;
    if (!report) throw new Error('Laporan tidak ditemukan');

    if (report.status !== 'pending') {
      showToast('⚠️ Hanya laporan berstatus pending yang dapat diedit', 'warning');
      setTimeout(() => { window.location.href = 'my-reports.html'; }, 1500);
      return;
    }

    isEditMode = true;
    editReportId = reportId;

    // Change title and button text
    const titleEl = document.querySelector('.report-page-title');
    if (titleEl) titleEl.textContent = 'Edit Laporan Toilet';
    const submitBtn = document.getElementById('submitReportBtn');
    if (submitBtn) submitBtn.textContent = 'Simpan Perubahan';

    // Set Name
    const nameInput = document.getElementById('toiletName');
    if (nameInput) nameInput.value = report.name || '';

    // Set Description
    const descInput = document.getElementById('toiletDescription');
    if (descInput) descInput.value = report.description || '';

    // Set Map Center
    if (report.latitude && report.longitude && reportMap) {
      reportMap.setView([report.latitude, report.longitude], 16);
      updateReportCoordinates();
    }

    // Set Comfort Rating
    selectedComfort = report.comfort || 3;
    const comfortInput = document.getElementById('comfortValue');
    if (comfortInput) comfortInput.value = selectedComfort;
    updateStarDisplay();

    // Set Price & Gratis
    const gratisCheckbox = document.querySelector('input[value="gratis"]');
    const priceInputGroup = document.getElementById('priceInputGroup');
    const priceInput = document.getElementById('toiletPrice');

    if (report.price_type === 'gratis') {
      isGratis = true;
      if (gratisCheckbox) gratisCheckbox.checked = true;
      if (priceInputGroup) priceInputGroup.classList.add('hidden');
    } else {
      isGratis = false;
      if (gratisCheckbox) gratisCheckbox.checked = false;
      if (priceInputGroup) priceInputGroup.classList.remove('hidden');
      if (priceInput) priceInput.value = report.price || '';
    }

    // Set Facilities
    let facs = [];
    try {
      facs = Array.isArray(report.facilities) ? report.facilities : JSON.parse(report.facilities || '[]');
    } catch (e) {
      facs = [];
    }
    selectedFacilities = facs;
    document.querySelectorAll('input[name="facility"]').forEach(cb => {
      if (cb.value !== 'gratis') {
        cb.checked = selectedFacilities.includes(cb.value);
      }
    });

    // Set Image
    const primaryImg = report.report_images?.find(img => img.is_primary) || report.report_images?.[0];
    if (primaryImg) {
      existingImageUrl = primaryImg.image_url;
      renderPhotoPreviews();
    }

  } catch (err) {
    console.error('Error loading report for edit:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

function prefillFromUrlParams(params) {
  const name = params.get('name');
  if (name) {
    const nameInput = document.getElementById('toiletName');
    if (nameInput) nameInput.value = name;
  }

  const desc = params.get('description');
  if (desc) {
    const descInput = document.getElementById('toiletDescription');
    if (descInput) descInput.value = desc;
  }

  const comfort = parseInt(params.get('comfort'));
  if (comfort) {
    selectedComfort = comfort;
    const comfortInput = document.getElementById('comfortValue');
    if (comfortInput) comfortInput.value = comfort;
    updateStarDisplay();
  }

  const lat = parseFloat(params.get('lat'));
  const lng = parseFloat(params.get('lng'));
  if (lat && lng && reportMap) {
    reportMap.setView([lat, lng], 16);
    updateReportCoordinates();
  }

  let facs = [];
  try {
    facs = JSON.parse(params.get('facilities') || '[]');
  } catch (e) {
    facs = [];
  }
  selectedFacilities = facs;
  document.querySelectorAll('input[name="facility"]').forEach(cb => {
    if (cb.value !== 'gratis') {
      cb.checked = selectedFacilities.includes(cb.value);
    }
  });

  const priceType = params.get('priceType');
  const gratisCheckbox = document.querySelector('input[value="gratis"]');
  const priceInputGroup = document.getElementById('priceInputGroup');
  if (priceType === 'berbayar') {
    isGratis = false;
    if (gratisCheckbox) gratisCheckbox.checked = false;
    if (priceInputGroup) priceInputGroup.classList.remove('hidden');
  }
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

  const name = document.getElementById('toiletName').value.trim();
  if (!name) {
    showToast('❌ Nama toilet wajib diisi', 'error');
    return;
  }

  if (selectedFacilities.length === 0) {
    showToast('❌ Wajib pilih minimal 1 fasilitas', 'error');
    return;
  }

  if (selectedPhotos.length === 0 && !existingImageUrl) {
    showToast('❌ Wajib unggah 1 foto toilet', 'error');
    return;
  }

  isSubmitting = true;
  const submitBtn = document.getElementById('submitReportBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  }

  try {
    const center = reportMap.getCenter();
    if (!ITS_REPORT_BOUNDS.contains(center)) {
      showToast('❌ Pin harus berada di area ITS Surabaya', 'error');
      return;
    }

    const desc = document.getElementById('toiletDescription').value.trim() || null;
    const priceType = isGratis ? 'gratis' : 'berbayar';
    const price = isGratis ? 0 : parseFloat(document.getElementById('toiletPrice').value) || 0;

    if (isEditMode && editReportId) {
      // UPDATE EXISTING REPORT
      const { error: updateErr } = await supabaseClient
        .from('reports')
        .update({
          name,
          latitude: center.lat,
          longitude: center.lng,
          price_type: priceType,
          price: price,
          comfort: selectedComfort,
          description: desc,
          facilities: JSON.stringify(selectedFacilities)
        })
        .eq('id', editReportId)
        .eq('user_id', currentUser.id)
        .eq('status', 'pending');

      if (updateErr) throw updateErr;

      // Handle photo replacement if user uploaded a new photo
      if (selectedPhotos.length > 0) {
        // Delete old image references
        await supabaseClient
          .from('report_images')
          .delete()
          .eq('report_id', editReportId);

        // Upload new photo
        await uploadPhotos(editReportId);
      }

      showToast('✅ Laporan berhasil diperbarui!', 'success');
      setTimeout(() => {
        window.location.href = 'my-reports.html';
      }, 1200);

    } else {
      // CREATE NEW REPORT
      const { data: report, error: reportErr } = await supabaseClient
        .from('reports')
        .insert({
          user_id: currentUser.id,
          name,
          latitude: center.lat,
          longitude: center.lng,
          address: 'Lokasi via Pin Peta',
          floor: null,
          price_type: priceType,
          price: price,
          comfort: selectedComfort,
          description: desc,
          facilities: JSON.stringify(selectedFacilities),
          status: 'pending'
        })
        .select()
        .single();

      if (reportErr) throw reportErr;

      await uploadPhotos(report.id);

      showToast('✅ Laporan berhasil dikirim!', 'success');
      setTimeout(() => {
        window.location.href = 'my-reports.html';
      }, 1200);
    }

  } catch (error) {
    console.error('Submit report error:', error);
    showToast('❌ ' + error.message, 'error');
  } finally {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = isEditMode ? 'Simpan Perubahan' : 'Kirim Laporan';
    }
  }
}
