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
          <td colspan="5" class="text-center">
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
        <td>${r.name}</td>
        <td>${r.profiles?.email || '-'}</td>
        <td>${getStatusBadge(r.status)}</td>
        <td>
          <button class="btn btn-secondary" onclick="openReviewModal('${r.id}')" style="padding: 4px 10px; font-size: 0.75rem;">
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
      <div class="auth-container" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <button class="auth-close" onclick="this.closest('.auth-modal').remove()">×</button>
        <h2 style="margin-bottom: 16px;">Tinjau Laporan</h2>

        ${primaryImage ? `<img src="${primaryImage}" style="width: 100%; height: 240px; object-fit: cover; border: 1px solid #111; margin-bottom: 16px;">` : ''}

        <p><strong>Nama:</strong> ${report.name}</p>
        <p><strong>Alamat:</strong> ${report.address}</p>
        <p><strong>Pelapor:</strong> ${report.profiles?.email || '-'}</p>
        <p><strong>Fasilitas:</strong> ${facilities.map(f => getFacilityLabel(f)).join(', ')}</p>
        <p><strong>Kenyamanan:</strong> ${'⭐'.repeat(report.comfort)}</p>

        ${report.status === 'pending' ? `
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button class="btn btn-primary" id="btnApprove" style="flex: 1;">Setujui (Approve)</button>
            <button class="btn btn-danger" id="btnReject" style="flex: 1;">Tolak (Reject)</button>
          </div>
          <div id="rejectBox" style="display: none; margin-top: 16px;">
            <textarea id="rejectReason" class="textarea" placeholder="Tulis alasan penolakan..."></textarea>
            <button class="btn btn-danger w-full" id="btnConfirmReject">Konfirmasi Penolakan</button>
          </div>
        ` : ''}
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
            <div style="background: #FFEBEB; color: #D63031; padding: 10px; margin-bottom: 12px; border: 1px solid #FF7675;">
              <strong>Alasan Penolakan:</strong> ${r.rejection_reason}
            </div>
          ` : ''}
          <div class="report-card-actions">
            ${r.status === 'pending' ? `
              <button class="btn btn-danger" onclick="cancelReport('${r.id}')" style="padding: 6px 12px; font-size: 0.85rem;">🗑️ Batalkan</button>
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
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
};
