// Toilet Near Me - Main Application
// Neo-Brutalist Design | Surabaya, Indonesia

(function() {
  'use strict';

  // ==================== STATE ====================
  let map = null;
  let reportMap = null;
  let userMarker = null;
  let toiletMarkers = [];
  let currentToilet = null;
  let currentUser = null;
  let selectedPhotos = [];
  let selectedFacilities = [];
  let activeFilters = [];
  let isSubmitting = false;

  // ==================== DOM ELEMENTS ====================
  const elements = {
    // Header & Profile
    profileBtn: document.getElementById('profileBtn'),
    profileMenu: document.getElementById('profileMenu'),
    loginBtn: document.getElementById('loginBtn'),
    myReportsBtn: document.getElementById('myReportsBtn'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    adminDashboardBtn: document.getElementById('adminDashboardBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    reportToiletBtn: document.getElementById('reportToiletBtn'),
    
    // Search & Filter
    searchInput: document.getElementById('searchInput'),
    filterDropdownBtn: document.getElementById('filterDropdownBtn'),
    filterOptions: document.getElementById('filterOptions'),
    
    // Location
    myLocationBtn: document.getElementById('myLocationBtn'),
    warningBanner: document.getElementById('warningBanner'),
    
    // Detail Panel (Desktop)
    toiletDetailPanel: document.getElementById('toiletDetailPanel'),
    detailImage: document.getElementById('detailImage'),
    detailCloseBtn: document.getElementById('detailCloseBtn'),
    detailName: document.getElementById('detailName'),
    detailAddress: document.getElementById('detailAddress'),
    detailInfo: document.getElementById('detailInfo'),
    detailFacilities: document.getElementById('detailFacilities'),
    facilityTags: document.getElementById('facilityTags'),
    detailPhotos: document.getElementById('detailPhotos'),
    photoGrid: document.getElementById('photoGrid'),
    viewLocationBtn: document.getElementById('viewLocationBtn'),
    
    // Bottom Sheet (Mobile)
    bottomSheet: document.getElementById('bottomSheet'),
    mobileDetailImage: document.getElementById('mobileDetailImage'),
    mobileDetailCloseBtn: document.getElementById('mobileDetailCloseBtn'),
    mobileDetailName: document.getElementById('mobileDetailName'),
    mobileDetailAddress: document.getElementById('mobileDetailAddress'),
    mobileDetailInfo: document.getElementById('mobileDetailInfo'),
    mobileDetailFacilities: document.getElementById('mobileDetailFacilities'),
    mobileFacilityTags: document.getElementById('mobileFacilityTags'),
    mobileViewLocationBtn: document.getElementById('mobileViewLocationBtn'),
    
    // Auth Modal
    authModal: document.getElementById('authModal'),
    authCloseBtn: document.getElementById('authCloseBtn'),
    loginTabBtn: document.getElementById('loginTabBtn'),
    registerTabBtn: document.getElementById('registerTabBtn'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerConfirmPassword: document.getElementById('registerConfirmPassword'),
    
    // Report Page
    reportPage: document.getElementById('reportPage'),
    reportMapEl: document.getElementById('reportMap'),
    selectedCoords: document.getElementById('selectedCoords'),
    reportForm: document.getElementById('reportForm'),
    toiletName: document.getElementById('toiletName'),
    toiletAddress: document.getElementById('toiletAddress'),
    toiletFloor: document.getElementById('toiletFloor'),
    priceType: document.getElementById('priceType'),
    priceInputGroup: document.getElementById('priceInputGroup'),
    toiletPrice: document.getElementById('toiletPrice'),
    comfortLevel: document.getElementById('comfortLevel'),
    facilitiesChips: document.getElementById('facilitiesChips'),
    selectedFacilitiesInput: document.getElementById('selectedFacilities'),
    toiletDescription: document.getElementById('toiletDescription'),
    fileUploadArea: document.getElementById('fileUploadArea'),
    fileInput: document.getElementById('fileInput'),
    filePreview: document.getElementById('filePreview'),
    cancelReportBtn: document.getElementById('cancelReportBtn'),
    submitReportBtn: document.getElementById('submitReportBtn'),
    
    // My Reports Page
    myReportsPage: document.getElementById('myReportsPage'),
    closeMyReportsBtn: document.getElementById('closeMyReportsBtn'),
    myReportsList: document.getElementById('myReportsList'),
    
    // Edit Profile Page
    editProfilePage: document.getElementById('editProfilePage'),
    closeEditProfileBtn: document.getElementById('closeEditProfileBtn'),
    editProfileForm: document.getElementById('editProfileForm'),
    editEmail: document.getElementById('editEmail'),
    newPassword: document.getElementById('newPassword'),
    
    // Admin Dashboard
    adminDashboard: document.getElementById('adminDashboard'),
    closeAdminBtn: document.getElementById('closeAdminBtn'),
    adminTableBody: document.getElementById('adminTableBody'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // ==================== UTILITY FUNCTIONS ====================
  
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getFacilityLabel(key) {
    const labels = {
      'air': '💧 Air',
      'wastafel': '🚰 Wastafel',
      'pria': '👨 Pria',
      'wanita': '👩 Wanita',
      'difabel': '♿ Difabel',
      'ruang_ganti': '👶 Ruang Ganti'
    };
    return labels[key] || key;
  }

  function getStatusBadge(status) {
    const badges = {
      'pending': '<span class="badge badge-pending">Pending</span>',
      'approved': '<span class="badge badge-approved">Approved</span>',
      'rejected': '<span class="badge badge-rejected">Rejected</span>'
    };
    return badges[status] || status;
  }

  // ==================== MAP INITIALIZATION ====================
  
  function initMainMap() {
    map = L.map('map', {
      center: SURABAYA_COORDS,
      zoom: 13,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add OpenStreetMap tiles with Neo-Brutalist styling consideration
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Load approved toilets
    loadToilets();
  }

  function initReportMap() {
    if (reportMap) {
      reportMap.remove();
    }

    reportMap = L.map('reportMap', {
      center: SURABAYA_COORDS,
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(reportMap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(reportMap);

    // Update coordinates when map moves
    reportMap.on('move', updateReportCoordinates);
    
    // Initial coordinate update
    updateReportCoordinates();
  }

  function updateReportCoordinates() {
    if (!reportMap) return;
    
    const center = reportMap.getCenter();
    elements.selectedCoords.value = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
  }

  // ==================== GPS & LOCATION ====================
  
  function getUserLocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation tidak didukung browser Anda', 'error');
      return;
    }

    showToast('📍 Mencari lokasi Anda...', 'warning');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Check if outside Surabaya
        const isOutsideSurabaya = 
          lat < SURABAYA_BOUNDS[0][0] || lat > SURABAYA_BOUNDS[1][0] ||
          lng < SURABAYA_BOUNDS[0][1] || lng > SURABAYA_BOUNDS[1][1];
        
        if (isOutsideSurabaya) {
          elements.warningBanner.classList.add('show');
        } else {
          elements.warningBanner.classList.remove('show');
        }

        // Center map on user location
        map.setView([lat, lng], 15);

        // Add or update user marker
        if (userMarker) {
          map.removeLayer(userMarker);
        }

        userMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'user-marker',
            html: `<div style="
              width: 20px;
              height: 20px;
              background: #2563EB;
              border: 3px solid #111111;
              border-radius: 50%;
              box-shadow: 4px 4px 0 #111111;
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);

        showToast('✅ Lokasi ditemukan!', 'success');
      },
      (error) => {
        console.error('GPS Error:', error);
        let message = '❌ Gagal mendapatkan lokasi';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = '❌ Izin lokasi ditolak. Aktifkan di pengaturan browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '❌ Informasi lokasi tidak tersedia';
            break;
          case error.TIMEOUT:
            message = '❌ Waktu habis mendapatkan lokasi';
            break;
        }
        
        showToast(message, 'error');
        elements.warningBanner.classList.add('show');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // ==================== TOILET DATA ====================
  
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

      // Clear existing markers
      toiletMarkers.forEach(marker => map.removeLayer(marker));
      toiletMarkers = [];

      // Add markers for each toilet
      data.forEach(toilet => {
        const primaryImage = toilet.toilet_images?.find(img => img.is_primary)?.image_url;
        
        const marker = L.marker([toilet.latitude, toilet.longitude], {
          icon: L.divIcon({
            className: 'toilet-marker',
            html: `<div style="
              width: 40px;
              height: 40px;
              background: #087F5B;
              border: 3px solid #111111;
              border-radius: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              box-shadow: 4px 4px 0 #111111;
              cursor: pointer;
            ">🚽</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
          })
        }).addTo(map);

        marker.on('click', () => showToiletDetail(toilet));
        toiletMarkers.push(marker);
      });

    } catch (error) {
      console.error('Error loading toilets:', error);
      showToast('❌ Gagal memuat data toilet', 'error');
    }
  }

  function filterToilets(toilets) {
    if (activeFilters.length === 0) return toilets;

    return toilets.filter(toilet => {
      const facilities = JSON.parse(toilet.facilities || '[]');
      
      return activeFilters.every(filter => {
        if (filter === 'gratis') return toilet.price_type === 'gratis';
        if (filter === 'air') return facilities.includes('air');
        if (filter === 'wastafel') return facilities.includes('wastafel');
        if (filter === 'difabel') return facilities.includes('difabel');
        if (filter === 'wanita') return facilities.includes('wanita');
        if (filter === 'pria') return facilities.includes('pria');
        return false;
      });
    });
  }

  // ==================== TOILET DETAIL ====================
  
  function showToiletDetail(toilet) {
    currentToilet = toilet;
    
    const primaryImage = toilet.toilet_images?.find(img => img.is_primary)?.image_url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23F5F0E8" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-size="40">🚽</text></svg>';
    
    const otherImages = toilet.toilet_images?.filter(img => !img.is_primary) || [];

    // Desktop panel
    elements.detailImage.src = primaryImage;
    elements.detailName.textContent = toilet.name;
    elements.detailAddress.textContent = toilet.address;
    
    // Info items
    let infoHtml = '';
    
    if (toilet.floor) {
      infoHtml += `
        <div class="toilet-detail-info-item">
          <span>Lantai</span>
          <span>${toilet.floor}</span>
        </div>`;
    }
    
    infoHtml += `
      <div class="toilet-detail-info-item">
        <span>Harga</span>
        <span>${toilet.price_type === 'gratis' ? 'Gratis' : formatCurrency(toilet.price)}</span>
      </div>
      <div class="toilet-detail-info-item">
        <span>Kenyamanan</span>
        <span>${'⭐'.repeat(toilet.comfort)}</span>
      </div>`;
    
    elements.detailInfo.innerHTML = infoHtml;

    // Facilities
    const facilities = JSON.parse(toilet.facilities || '[]');
    elements.facilityTags.innerHTML = facilities
      .map(f => `<span class="facility-tag">${getFacilityLabel(f)}</span>`)
      .join('');

    // Photos
    if (otherImages.length > 0) {
      elements.detailPhotos.style.display = 'block';
      elements.photoGrid.innerHTML = otherImages
        .map(img => `<img src="${img.image_url}" alt="Toilet photo" onclick="window.open('${img.image_url}', '_blank')">`)
        .join('');
    } else {
      elements.detailPhotos.style.display = 'none';
    }

    elements.toiletDetailPanel.classList.add('show');

    // Mobile bottom sheet
    elements.mobileDetailImage.src = primaryImage;
    elements.mobileDetailName.textContent = toilet.name;
    elements.mobileDetailAddress.textContent = toilet.address;
    elements.mobileDetailInfo.innerHTML = infoHtml;
    elements.mobileFacilityTags.innerHTML = facilities
      .map(f => `<span class="facility-tag">${getFacilityLabel(f)}</span>`)
      .join('');

    // Center map on toilet
    map.setView([toilet.latitude, toilet.longitude], 16);
  }

  function hideToiletDetail() {
    elements.toiletDetailPanel.classList.remove('show');
    elements.bottomSheet.classList.remove('show');
    currentToilet = null;
  }

  // ==================== AUTHENTICATION ====================
  
  async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    
    if (currentUser) {
      // Get user profile to check role
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        currentUser.role = profile.role;
      }

      updateAuthUI(true);
    } else {
      updateAuthUI(false);
    }
  }

  function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
      elements.loginBtn.classList.add('hidden');
      elements.myReportsBtn.classList.remove('hidden');
      elements.editProfileBtn.classList.remove('hidden');
      elements.reportToiletBtn.classList.remove('hidden');
      elements.logoutBtn.classList.remove('hidden');

      if (currentUser?.role === 'admin') {
        elements.adminDashboardBtn.classList.remove('hidden');
      } else {
        elements.adminDashboardBtn.classList.add('hidden');
      }
    } else {
      elements.loginBtn.classList.remove('hidden');
      elements.myReportsBtn.classList.add('hidden');
      elements.editProfileBtn.classList.add('hidden');
      elements.adminDashboardBtn.classList.add('hidden');
      elements.reportToiletBtn.classList.add('hidden');
      elements.logoutBtn.classList.add('hidden');
    }
  }

  async function handleLogin(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      currentUser = data.user;
      
      // Get profile
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        currentUser.role = profile.role;
      }

      updateAuthUI(true);
      elements.authModal.classList.remove('show');
      showToast('✅ Berhasil masuk!', 'success');
      
      // Reload toilets to potentially show more data
      loadToilets();
      
    } catch (error) {
      console.error('Login error:', error);
      showToast('❌ ' + error.message, 'error');
    }
  }

  async function handleRegister(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      // Create profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          role: 'user'
        });

      if (profileError) throw profileError;

      currentUser = data.user;
      currentUser.role = 'user';

      updateAuthUI(true);
      elements.authModal.classList.remove('show');
      showToast('✅ Pendaftaran berhasil! Silakan cek email untuk verifikasi.', 'success');
      
    } catch (error) {
      console.error('Register error:', error);
      showToast('❌ ' + error.message, 'error');
    }
  }

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    updateAuthUI(false);
    elements.profileMenu.classList.remove('show');
    showToast('✅ Berhasil keluar', 'success');
    loadToilets(); // Reload to show only public data
  }

  async function handleUpdatePassword(newPassword) {
    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showToast('✅ Kata sandi berhasil diubah', 'success');
      elements.newPassword.value = '';
      
    } catch (error) {
      console.error('Update password error:', error);
      showToast('❌ ' + error.message, 'error');
    }
  }

  // ==================== REPORT TOILET ====================
  
  function openReportPage() {
    if (!currentUser) {
      elements.authModal.classList.add('show');
      return;
    }

    elements.reportPage.classList.add('show');
    initReportMap();
    selectedPhotos = [];
    selectedFacilities = [];
    elements.filePreview.innerHTML = '';
    elements.reportForm.reset();
    updateFacilitiesChips();
  }

  function closeReportPage() {
    elements.reportPage.classList.remove('show');
    if (reportMap) {
      reportMap.remove();
      reportMap = null;
    }
  }

  function handleFileSelect(files) {
    Array.from(files).forEach(file => {
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
     showToast(`❌ File ${file.name} terlalu besar (max 5MB)`, 'error');
      return;
}

// Format sesuai PDF
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast(`❌ Format ${file.name} tidak didukung. Gunakan JPG, PNG, atau WebP`, 'error');
      return;
}
      selectedPhotos.push(file);
    });

    renderPhotoPreviews();
  }

  function renderPhotoPreviews() {
    elements.filePreview.innerHTML = selectedPhotos
      .map((file, index) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        return `<div style="position: relative;">
          <img src="" data-index="${index}" alt="Preview" onload="this.src='${URL.createObjectURL(file)}'">
          <button type="button" onclick="removePhoto(${index})" style="
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            background: #FF5C5C;
            border: 2px solid #111111;
            color: white;
            font-weight: bold;
            cursor: pointer;
         ">×</button>
        </div>`;
      })
      .join('');
  }

  window.removePhoto = function(index) {
    selectedPhotos.splice(index, 1);
    renderPhotoPreviews();
  };

  function toggleFacility(facility) {
    const index = selectedFacilities.indexOf(facility);
    if (index > -1) {
      selectedFacilities.splice(index, 1);
    } else {
      selectedFacilities.push(facility);
    }
    updateFacilitiesChips();
  }

  function updateFacilitiesChips() {
    const chips = elements.facilitiesChips.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      const facility = chip.dataset.facility;
      if (selectedFacilities.includes(facility)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
    elements.selectedFacilitiesInput.value = JSON.stringify(selectedFacilities);
  }

 async function uploadPhotos(reportId, isReport = true) {
  const uploadedUrls = [];
  const bucket = 'toilet-photos'; 
  const folder = isReport ? `reports/${reportId}` : `toilets/${reportId}`;
    
  for (let i = 0; i < selectedPhotos.length; i++) {
      const file = selectedPhotos[i];
      const fileName = `${folder}/${Date.now()}_${i}_${file.name}`;

      try {
        const { data, error } = await supabaseClient.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabaseClient.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedUrls.push({
          url: publicUrl,
          isPrimary: i === 0
        });

      } catch (error) {
        console.error('Upload error:', error);
        throw new Error(`Gagal upload foto: ${file.name}`);
      }
    }

    return uploadedUrls;
  }

  async function submitReport(e) {
    e.preventDefault();

    if (isSubmitting) return;
    if (selectedPhotos.length === 0) {
      showToast('❌ Upload minimal 1 foto', 'error');
      return;
    }
    if (selectedFacilities.length === 0) {
      showToast('❌ Pilih minimal 1 fasilitas', 'error');
      return;
    }

    isSubmitting = true;
    elements.submitReportBtn.disabled = true;
    elements.submitReportBtn.innerHTML = '<span class="spinner"></span> Mengirim...';

    try {
      const center = reportMap.getCenter();
      
      // Create report
      const { data: report, error: reportError } = await supabaseClient
        .from('reports')
        .insert({
          user_id: currentUser.id,
          name: elements.toiletName.value.trim(),
          latitude: center.lat,
          longitude: center.lng,
          address: elements.toiletAddress.value.trim(),
          floor: elements.toiletFloor.value.trim() || null,
          price_type: elements.priceType.value,
          price: elements.priceType.value === 'berbayar' ? parseFloat(elements.toiletPrice.value) || 0 : 0,
          comfort: parseInt(elements.comfortLevel.value),
          description: elements.toiletDescription.value.trim() || null,
          facilities: JSON.stringify(selectedFacilities),
          status: 'pending'
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload photos
      await uploadPhotos(report.id, true);

      showToast('✅ Laporan berhasil dikirim!', 'success');
      closeReportPage();
      loadMyReports();

    } catch (error) {
      console.error('Submit report error:', error);
      showToast('❌ ' + error.message, 'error');
    } finally {
      isSubmitting = false;
      elements.submitReportBtn.disabled = false;
      elements.submitReportBtn.innerHTML = '📤 Kirim Laporan';
    }
  }

  // ==================== MY REPORTS ====================
  
  async function loadMyReports() {
    if (!currentUser) return;

    elements.myReportsPage.classList.add('show');
    elements.myReportsList.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const { data: reports, error } = await supabaseClient
        .from('reports')
        .select(`
          *,
          report_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (reports.length === 0) {
        elements.myReportsList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3 class="empty-state-title">Belum ada laporan</h3>
            <p class="empty-state-description">Klik "Lapor Toilet" untuk menambahkan toilet baru</p>
          </div>`;
        return;
      }

      elements.myReportsList.innerHTML = reports.map(report => {
        const primaryImage = report.report_images?.find(img => img.is_primary)?.image_url;
        
        return `
          <div class="report-card">
            <div class="report-card-header">
              <div>
                <h3 style="margin-bottom: 8px;">${report.name}</h3>
                <p style="font-size: 0.875rem; color: #666;">${report.address}</p>
                <p style="font-size: 0.75rem; margin-top: 4px;">${formatDate(report.created_at)}</p>
              </div>
              ${getStatusBadge(report.status)}
            </div>
            
            ${primaryImage ? `<img src="${primaryImage}" style="width: 100%; height: 150px; object-fit: cover; border: 2px solid #111111; margin-bottom: 16px;">` : ''}
            
            ${report.status === 'rejected' && report.rejection_reason ? `
              <div style="background: #FF5C5C; color: white; padding: 12px; border: 2px solid #111111; margin-bottom: 16px;">
                <strong>Alasan Penolakan:</strong><br>
                ${report.rejection_reason}
              </div>
            ` : ''}
            
            <div class="report-card-actions">
              ${report.status === 'pending' ? `
                <button class="btn btn-secondary" onclick="editReport('${report.id}')">✏️ Edit</button>
                <button class="btn btn-danger" onclick="cancelReport('${report.id}')">🗑️ Batal</button>
              ` : ''}
              ${report.status === 'approved' ? `
                <button class="btn btn-primary" onclick="viewApprovedToilet('${report.id}')">🗺️ Lihat di Peta</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Load my reports error:', error);
      elements.myReportsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <h3 class="empty-state-title">Gagal memuat laporan</h3>
        </div>`;
    }
  }

  window.editReport = async function(reportId) {
    // Implement edit functionality
    showToast('🚧 Fitur edit akan segera hadir', 'warning');
  };

  window.cancelReport = async function(reportId) {
    if (!confirm('Yakin ingin membatalkan laporan ini?')) return;

    try {
      const { error } = await supabaseClient
        .from('reports')
        .delete()
        .eq('id', reportId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      showToast('✅ Laporan dibatalkan', 'success');
      loadMyReports();
    } catch (error) {
      showToast('❌ ' + error.message, 'error');
    }
  };

  window.viewApprovedToilet = function(reportId) {
    // Navigate to map and show the toilet
    elements.myReportsPage.classList.remove('show');
    // Would need to fetch the toilet data and show it on map
    showToast('🚧 Fitur ini akan segera hadir', 'warning');
  };

  // ==================== ADMIN DASHBOARD ====================
  
  let currentAdminTab = 'pending';

  async function loadAdminReports(status = 'pending') {
    currentAdminTab = status;
    
    // Update active tab
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === status);
    });

    elements.adminTableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>';

    try {
      const { data: reports, error } = await supabaseClient
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey (email),
          report_images (
            id,
            image_url,
            is_primary
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (reports.length === 0) {
        elements.adminTableBody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center">
              <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3 class="empty-state-title">Tidak ada laporan</h3>
              </div>
            </td>
          </tr>`;
        return;
      }

      elements.adminTableBody.innerHTML = reports.map(report => `
        <tr>
          <td>${new Date(report.created_at).toLocaleDateString('id-ID')}</td>
          <td>${report.name}</td>
          <td>${report.profiles?.email || '-'}</td>
          <td>${getStatusBadge(report.status)}</td>
          <td>
            <button class="btn btn-secondary" onclick="reviewReport('${report.id}')" style="padding: 4px 8px; font-size: 0.75rem;">
              👁️ Review
            </button>
          </td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('Load admin reports error:', error);
      elements.adminTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">
            <div class="empty-state">
              <div class="empty-state-icon">❌</div>
              <h3 class="empty-state-title">Gagal memuat data</h3>
            </div>
          </td>
        </tr>`;
    }
  }

  window.reviewReport = async function(reportId) {
    try {
    const { data: report, error } = await supabaseClient
      .from('reports')
      .select(`
        *,
        profiles!reports_user_id_fkey (email),
        report_images (
          id,
          image_url,
          is_primary
        )
      `)
      .eq('id', reportId)
      .single();

      if (error) throw error;

      const primaryImage = report.report_images?.find(img => img.is_primary)?.image_url;
      const otherImages = report.report_images?.filter(img => !img.is_primary) || [];
      const facilities = JSON.parse(report.facilities || '[]');

      const modal = document.createElement('div');
      modal.className = 'auth-modal show';
      modal.style.zIndex = '3000';
      modal.innerHTML = `
        <div class="auth-container" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
          <button class="auth-close" onclick="this.closest('.auth-modal').remove()">×</button>
          
          <h2 style="margin-bottom: 24px;">🔍 Review Laporan</h2>
          
          ${primaryImage ? `<img src="${primaryImage}" style="width: 100%; height: 300px; object-fit: cover; border: 3px solid #111111; margin-bottom: 16px;">` : ''}
          
          ${otherImages.length > 0 ? `
            <div class="photo-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 16px;">
              ${otherImages.map(img => `<img src="${img.image_url}" style="border: 2px solid #111111;">`).join('')}
            </div>
          ` : ''}
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <p><strong>Nama:</strong> ${report.name}</p>
              <p><strong>Alamat:</strong> ${report.address}</p>
              ${report.floor ? `<p><strong>Lantai:</strong> ${report.floor}</p>` : ''}
              <p><strong>Harga:</strong> ${report.price_type === 'gratis' ? 'Gratis' : formatCurrency(report.price)}</p>
              <p><strong>Kenyamanan:</strong> ${'⭐'.repeat(report.comfort)}</p>
            </div>
            <div>
              <p><strong>Pelapor:</strong> ${report.profiles?.email || '-'}</p>
              <p><strong>Tanggal:</strong> ${formatDate(report.created_at)}</p>
              <p><strong>Koordinat:</strong> ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}</p>
              <p><strong>Fasilitas:</strong> ${facilities.map(f => getFacilityLabel(f)).join(', ')}</p>
            </div>
          </div>
          
          ${report.description ? `
            <div style="background: #F5F0E8; padding: 16px; border: 2px solid #111111; margin-bottom: 16px;">
              <strong>Deskripsi:</strong><br>
              ${report.description}
            </div>
          ` : ''}
          
          <div style="border: 3px solid #111111; padding: 16px; margin-bottom: 16px;">
            <div id="reviewMap" style="height: 300px;"></div>
          </div>
          
          ${report.status === 'pending' ? `
            <div style="display: flex; gap: 16px;">
              <button class="btn btn-primary" id="approveBtn" style="flex: 1;">✅ APPROVE</button>
              <button class="btn btn-danger" id="rejectBtn" style="flex: 1;">❌ REJECT</button>
            </div>
            
            <div id="rejectReasonSection" style="display: none; margin-top: 16px;">
              <label style="display: block; font-weight: bold; margin-bottom: 8px;">Alasan Penolakan *</label>
              <textarea id="rejectReason" class="textarea" placeholder="Jelaskan alasan penolakan..."></textarea>
              <button class="btn btn-danger w-full" id="confirmRejectBtn">Konfirmasi Penolakan</button>
            </div>
          ` : ''}
        </div>
      `;

      document.body.appendChild(modal);

      // Initialize review map
      setTimeout(() => {
        const reviewMap = L.map('reviewMap').setView([report.latitude, report.longitude], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(reviewMap);
        L.marker([report.latitude, report.longitude]).addTo(reviewMap);
      }, 100);

      // Handle approve
      document.getElementById('approveBtn')?.addEventListener('click', async () => {
        if (!confirm('Approve laporan ini?')) return;
        
        try {
          // Create toilet from report
          const { data: toilet, error: toiletError } = await supabaseClient
            .from('toilets')
            .insert({
              name: report.name,
              latitude: report.latitude,
              longitude: report.longitude,
              address: report.address,
              floor: report.floor,
              price_type: report.price_type,
              price: report.price,
              comfort: report.comfort,
              description: report.description,
              facilities: report.facilities,
              status: 'approved'
            })
            .select()
            .single();

          if (toiletError) throw toiletError;

          // Copy images
          for (const img of report.report_images) {
            await supabaseClient.from('toilet_images').insert({
              toilet_id: toilet.id,
              image_url: img.image_url,
              is_primary: img.is_primary
            });
          }

          // Update report status
          await supabaseClient
            .from('reports')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: currentUser.id
            })
            .eq('id', reportId);

          showToast('✅ Laporan di-approve!', 'success');
          modal.remove();
          loadAdminReports(currentAdminTab);
          loadToilets();

        } catch (error) {
          showToast('❌ ' + error.message, 'error');
        }
      });

      // Handle reject
      document.getElementById('rejectBtn')?.addEventListener('click', () => {
        document.getElementById('rejectReasonSection').style.display = 'block';
      });

      document.getElementById('confirmRejectBtn')?.addEventListener('click', async () => {
        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) {
          showToast('❌ Alasan penolakan wajib diisi', 'error');
          return;
        }

        try {
          await supabaseClient
            .from('reports')
            .update({
              status: 'rejected',
              rejection_reason: reason,
              reviewed_at: new Date().toISOString(),
              reviewed_by: currentUser.id
            })
            .eq('id', reportId);

          showToast('✅ Laporan ditolak', 'success');
          modal.remove();
          loadAdminReports(currentAdminTab);

        } catch (error) {
          showToast('❌ ' + error.message, 'error');
        }
      });

    } catch (error) {
      console.error('Review report error:', error);
      showToast('❌ ' + error.message, 'error');
    }
  };

  // ==================== EVENT LISTENERS ====================
  
  function initEventListeners() {
    // Profile dropdown
    elements.profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.profileMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!elements.profileBtn.contains(e.target) && !elements.profileMenu.contains(e.target)) {
        elements.profileMenu.classList.remove('show');
      }
    });

    elements.loginBtn.addEventListener('click', () => {
      elements.authModal.classList.add('show');
      elements.profileMenu.classList.remove('show');
    });

    elements.myReportsBtn.addEventListener('click', () => {
      loadMyReports();
      elements.profileMenu.classList.remove('show');
    });

    elements.editProfileBtn.addEventListener('click', () => {
      elements.editProfilePage.classList.add('show');
      elements.editEmail.value = currentUser?.email || '';
      elements.profileMenu.classList.remove('show');
    });

    elements.adminDashboardBtn.addEventListener('click', () => {
      elements.adminDashboard.classList.add('show');
      loadAdminReports('pending');
      elements.profileMenu.classList.remove('show');
    });

    elements.logoutBtn.addEventListener('click', handleLogout);

    elements.reportToiletBtn.addEventListener('click', openReportPage);

    // Search & Filter
    elements.filterDropdownBtn.addEventListener('click', () => {
      elements.filterOptions.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!elements.filterDropdownBtn.contains(e.target) && !elements.filterOptions.contains(e.target)) {
        elements.filterOptions.classList.remove('show');
      }
    });

    // Filter checkboxes
    elements.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const filter = checkbox.dataset.filter;
        if (checkbox.checked) {
          if (!activeFilters.includes(filter)) {
            activeFilters.push(filter);
          }
        } else {
          activeFilters = activeFilters.filter(f => f !== filter);
        }
        // Re-filter toilets (would need to implement this)
        showToast(`🔍 Filter: ${activeFilters.length > 0 ? activeFilters.join(', ') : 'Semua'}`, 'warning');
      });
    });

    // My Location
    elements.myLocationBtn.addEventListener('click', getUserLocation);

    // Detail panel
    elements.detailCloseBtn.addEventListener('click', hideToiletDetail);
    elements.mobileDetailCloseBtn.addEventListener('click', hideToiletDetail);
    elements.viewLocationBtn.addEventListener('click', () => {
      if (currentToilet) {
        map.setView([currentToilet.latitude, currentToilet.longitude], 18);
      }
    });
    elements.mobileViewLocationBtn.addEventListener('click', () => {
      if (currentToilet) {
        map.setView([currentToilet.latitude, currentToilet.longitude], 18);
        elements.bottomSheet.classList.remove('show');
      }
    });

    // Auth modal
    elements.authCloseBtn.addEventListener('click', () => {
      elements.authModal.classList.remove('show');
    });

    elements.loginTabBtn.addEventListener('click', () => {
      elements.loginTabBtn.classList.add('active');
      elements.registerTabBtn.classList.remove('active');
      elements.loginForm.classList.remove('hidden');
      elements.registerForm.classList.add('hidden');
    });

    elements.registerTabBtn.addEventListener('click', () => {
      elements.registerTabBtn.classList.add('active');
      elements.loginTabBtn.classList.remove('active');
      elements.registerForm.classList.remove('hidden');
      elements.loginForm.classList.add('hidden');
    });

    elements.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin(elements.loginEmail.value, elements.loginPassword.value);
    });

    elements.registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = elements.registerPassword.value;
      const confirm = elements.registerConfirmPassword.value;
      
      if (password !== confirm) {
        showToast('❌ Kata sandi tidak cocok', 'error');
        return;
      }
      
      handleRegister(elements.registerEmail.value, password);
    });

    // Report page
    elements.cancelReportBtn.addEventListener('click', closeReportPage);
    elements.reportForm.addEventListener('submit', submitReport);

    // File upload
    elements.fileUploadArea.addEventListener('click', () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', (e) => {
      handleFileSelect(e.target.files);
    });

    // Drag & drop
    elements.fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.fileUploadArea.style.background = '#F5F0E8';
    });

    elements.fileUploadArea.addEventListener('dragleave', () => {
      elements.fileUploadArea.style.background = '#FFFFFF';
    });

    elements.fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.fileUploadArea.style.background = '#FFFFFF';
      handleFileSelect(e.dataTransfer.files);
    });

    // Price type change
    elements.priceType.addEventListener('change', () => {
      if (elements.priceType.value === 'berbayar') {
        elements.priceInputGroup.classList.remove('hidden');
      } else {
        elements.priceInputGroup.classList.add('hidden');
      }
    });

    // Facilities chips
    elements.facilitiesChips.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-chip')) {
        toggleFacility(e.target.dataset.facility);
      }
    });

    // My Reports page
    elements.closeMyReportsBtn.addEventListener('click', () => {
      elements.myReportsPage.classList.remove('show');
    });

    // Edit Profile page
    elements.closeEditProfileBtn.addEventListener('click', () => {
      elements.editProfilePage.classList.remove('show');
    });

    elements.editProfileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newPass = elements.newPassword.value;
      if (newPass) {
        handleUpdatePassword(newPass);
      } else {
        showToast('ℹ️ Masukkan kata sandi baru untuk mengubah', 'warning');
      }
    });

    // Admin dashboard
    elements.closeAdminBtn.addEventListener('click', () => {
      elements.adminDashboard.classList.remove('show');
    });

    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        loadAdminReports(btn.dataset.tab);
      });
    });

    // Close modals on outside click
    elements.authModal.addEventListener('click', (e) => {
      if (e.target === elements.authModal) {
        elements.authModal.classList.remove('show');
      }
    });
  }

  // ==================== INITIALIZATION ====================
  
  function init() {
    initMainMap();
    initEventListeners();
    checkAuth();
    
    // Request GPS on load
    setTimeout(getUserLocation, 1000);
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();