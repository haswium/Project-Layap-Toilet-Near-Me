// Admin Dashboard & My Reports Management

let currentAdminTab = 'pending';

// Admin: Load Reports by Status
async function loadAdminReports(status = 'pending') {
  currentAdminTab = status;
  const tableBody = document.getElementById('adminTableBody');
  if (!tableBody) return;

  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === status);
  });

  tableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner"></div></td></tr>';

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

    if (!reports || reports.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">
            <div class="empty-state">
              <div class="empty-state-icon">📭</div>
              <h3 class="empty-state-title">Tidak ada laporan</h3>
            </div>
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = reports.map(r => `
      <tr>
        <td>${new Date(r.created_at).toLocaleDateString('id-ID')}</td>
        <td><strong>${r.name}</strong></td>
        <td><span class="badge-status status-${r.status}">${getStatusLabel(r.status)}</span></td>
        <td>
          <button class="btn btn-secondary" onclick="openReviewModal('${r.id}')" style="padding: 6px 14px; font-size: 0.85rem;">
            👁️ Tinjau
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Load admin reports error:', err);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Gagal memuat data</td></tr>`;
  }
}

// Admin: Review Modal
async function openReviewModal(reportId) {
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

    const primaryImage = report.report_images?.find(i => i.is_primary)?.image_url;
    let facilities = [];
    try {
      facilities = Array.isArray(report.facilities) ? report.facilities : JSON.parse(report.facilities || '[]');
    } catch(e) {
      facilities = [];
    }

    const modal = document.createElement('div');
    modal.className = 'auth-modal show';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
      <div class="auth-container review-modal-container">
        <div class="review-modal-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="margin:0;">Tinjau Laporan</h2>
          <button class="auth-close" onclick="this.closest('.auth-modal').remove()" style="position:static;">×</button>
        </div>
        <div class="review-modal-content">
          ${primaryImage ? `<img src="${primaryImage}" class="review-image-preview">` : ''}

          <div class="review-details">
            <div class="review-item">
              <span class="review-label">Nama Toilet</span>
              <span class="review-value">${report.name}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Alamat</span>
              <span class="review-value">${report.address}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Pelapor</span>
              <span class="review-value">${report.profiles?.email || '-'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Fasilitas</span>
              <span class="review-value">${facilities.length > 0 ? facilities.map(f => getFacilityLabel(f)).join(', ') : '-'}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Kenyamanan</span>
              <span class="review-value">${'⭐'.repeat(report.comfort)}</span>
            </div>
            <div class="review-item">
              <span class="review-label">Harga</span>
              <span class="review-value">${report.price_type === 'gratis' ? 'Gratis' : formatCurrency(report.price)}</span>
            </div>
            ${report.rejection_reason ? `
            <div class="review-item" style="background: #fff5f5; padding: 10px; border-radius: 8px; border: 1px solid #fed7d7;">
              <span class="review-label" style="color: #e74c3c;">Alasan Penolakan Sebelumnya</span>
              <span class="review-value" style="color: #d63031;">${report.rejection_reason}</span>
            </div>` : ''}
            ${report.description ? `
            <div class="review-item">
              <span class="review-label">Deskripsi</span>
              <span class="review-value">${report.description}</span>
            </div>` : ''}
          </div>

          ${report.status === 'pending' ? `
            <div class="review-actions">
              <button class="btn-approve" id="btnApprove">Setujui</button>
              <button class="btn-reject" id="btnReject">Tolak</button>
            </div>
            <div class="reject-reason-box" id="rejectBox" style="display:none;">
              <textarea id="rejectReason" class="reject-textarea" placeholder="Tulis alasan penolakan..."></textarea>
              <button class="btn-reject" style="width:100%;" id="btnConfirmReject">Konfirmasi Penolakan</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const approveBtn = modal.querySelector('#btnApprove');
    if (approveBtn) {
      approveBtn.onclick = async () => {
        if (!confirm('Setujui laporan ini dan terbitkan ke peta umum?')) return;
        try {
          // Insert to toilets
          const { data: newToilet, error: tErr } = await supabaseClient
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

          if (tErr) throw tErr;

          // Copy images
          if (report.report_images) {
            for (const img of report.report_images) {
              await supabaseClient.from('toilet_images').insert({
                toilet_id: newToilet.id,
                image_url: img.image_url,
                is_primary: img.is_primary
              });
            }
          }

          // Mark report approved
          await supabaseClient
            .from('reports')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: currentUser.id
            })
            .eq('id', reportId);

          showToast('✅ Laporan disetujui & dipublikasikan!', 'success');
          modal.remove();
          loadAdminReports(currentAdminTab);
        } catch (err) {
          showToast('❌ ' + err.message, 'error');
        }
      };
    }

    const rejectBtn = modal.querySelector('#btnReject');
    if (rejectBtn) {
      rejectBtn.onclick = () => {
        modal.querySelector('#rejectBox').style.display = 'block';
      };
    }

    const confirmReject = modal.querySelector('#btnConfirmReject');
    if (confirmReject) {
      confirmReject.onclick = async () => {
        const reason = modal.querySelector('#rejectReason').value.trim();
        if (!reason) {
          showToast('❌ Tuliskan alasan penolakan', 'error');
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
        } catch (err) {
          showToast('❌ ' + err.message, 'error');
        }
      };
    }

  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// User: Load My Reports
async function loadMyReports() {
  const container = document.getElementById('myReportsList');
  if (!container) return;

  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

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

    if (!reports || reports.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3 class="empty-state-title">Belum ada laporan</h3>
          <p class="empty-state-description">Anda belum mendaftarkan toilet baru.</p>
        </div>`;
      return;
    }

    container.innerHTML = reports.map(r => {
      const primaryImage = r.report_images?.find(i => i.is_primary)?.image_url;
      return `
        <div class="report-card">
          <div class="report-card-header">
            <div>
              <h3>${r.name}</h3>
              <p style="font-size: 0.85rem; color: #666;">${r.address}</p>
              <p style="font-size: 0.75rem;">${formatDate(r.created_at)}</p>
            </div>
            ${getStatusBadge(r.status)}
          </div>
          ${primaryImage ? `<img src="${primaryImage}" style="width: 100%; height: 160px; object-fit: cover; border: 1px solid #111; margin-bottom: 12px;">` : ''}
          ${r.status === 'rejected' && r.rejection_reason ? `
            <div style="background: #FFEBEB; color: #D63031; padding: 10px; margin-bottom: 12px; border: 1px solid #FF7675; border-radius: 8px;">
              <strong>Alasan Penolakan:</strong> ${r.rejection_reason}
            </div>
          ` : ''}
          <div class="report-card-actions">
            ${r.status === 'pending' ? `
              <button class="btn btn-primary" onclick="editReport('${r.id}')" style="padding: 6px 12px; font-size: 0.85rem;">✏️ Edit</button>
              <button class="btn btn-danger" onclick="cancelReport('${r.id}')" style="padding: 6px 12px; font-size: 0.85rem;">🗑️ Hapus</button>
            ` : r.status === 'rejected' ? `
              <button class="btn btn-secondary" onclick="copyRejectedReport('${r.id}')" style="padding: 6px 12px; font-size: 0.85rem;">📝 Buat Laporan Baru</button>
              <button class="btn btn-danger" onclick="cancelReport('${r.id}')" style="padding: 6px 12px; font-size: 0.85rem;">🗑️ Hapus</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div class="empty-state">Gagal memuat laporan</div>`;
  }
}

window.cancelReport = async function(reportId) {
  if (!confirm('Yakin ingin menghapus laporan ini?')) return;
  try {
    const { error } = await supabaseClient
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', currentUser.id);

    if (error) throw error;
    showToast('✅ Laporan berhasil dihapus', 'success');
    loadMyReports();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
};

window.editReport = function(reportId) {
  window.location.href = `../pages/report.html?reportId=${reportId}&mode=edit`;
};

window.copyRejectedReport = async function(reportId) {
  try {
    const { data: report, error } = await supabaseClient
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) throw error;

    const params = new URLSearchParams({
      mode: 'copy',
      name: report.name || '',
      priceType: report.price_type || 'gratis',
      comfort: report.comfort || 3,
      description: report.description || '',
      facilities: report.facilities || '[]',
      lat: report.latitude || '',
      lng: report.longitude || ''
    });

    window.location.href = `../pages/report.html?${params.toString()}`;
  } catch (err) {
    showToast('❌ Gagal menyalin data laporan', 'error');
  }
};
