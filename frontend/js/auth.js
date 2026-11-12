// Authentication Logic with Supabase OTP & Session Management

let currentUser = null;
let otpEmail = '';
let otpType = 'signup'; // 'signup' | 'login' | 'recovery'

async function checkAuth() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;

    if (currentUser) {
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
  } catch (error) {
    console.error('Check auth error:', error);
    updateAuthUI(false);
  }
}

// Update UI with Circle Avatar
async function updateAuthUI(isLoggedIn) {
  const registerCta = document.getElementById('registerCta');
  const loginBtn = document.getElementById('loginBtn');
  const myReportsBtn = document.getElementById('myReportsBtn');
  const adminDashboardBtn = document.getElementById('adminDashboardBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const reportToiletBtn = document.getElementById('reportToiletBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const guestLoginBtn = document.getElementById('guestLoginBtn');
  const headerAvatar = document.getElementById('headerAvatar');
  const displayName = document.getElementById('displayName');
  const greetingBox = document.getElementById('profileGreeting');

  if (isLoggedIn) {
     if (registerCta) registerCta.classList.add('hidden');
    if (guestLoginBtn) guestLoginBtn.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.remove('hidden');
    if (myReportsBtn) myReportsBtn.classList.remove('hidden');
    if (reportToiletBtn) reportToiletBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (greetingBox) greetingBox.style.display = 'block';
    if (displayName) displayName.textContent = currentUser?.email?.split('@')[0] || 'User';

    // Set Avatar (Fallback if no avatar_url)
    const avatarUrl = currentUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${currentUser?.email}&background=random`;
    if (headerAvatar) headerAvatar.src = avatarUrl;

    if (adminDashboardBtn) {
      if (currentUser?.role === 'admin') adminDashboardBtn.classList.remove('hidden');
      else adminDashboardBtn.classList.add('hidden');
    }
  } else {
     if (registerCta) registerCta.classList.remove('hidden');
    if (guestLoginBtn) guestLoginBtn.classList.remove('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');
    if (reportToiletBtn) reportToiletBtn.classList.add('hidden');
  }
}

async function handleLogin(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        await supabaseClient.auth.resend({
          type: 'signup',
          email: email
        });
        showOTPModal(email, 'signup');
        showToast('📧 Email belum diverifikasi. Kode OTP telah dikirimkan ulang ke email Anda.', 'warning');
        return;
      }
      throw error;
    }

    currentUser = data.user;
    showToast(' Berhasil masuk!', 'success');
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 800);

  } catch (error) {
    console.error('Login error:', error);
    showToast('X ' + error.message, 'error');
  }
}

async function handleLoginWithOTP(email) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      email: email
    });

    if (error) throw error;

    showOTPModal(email, 'login');
    showToast('📧 Kode OTP masuk telah dikirimkan ke email Anda.', 'success');
  } catch (error) {
    console.error('Login with OTP error:', error);
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

    showOTPModal(email, 'signup');
    showToast('📧 Pendaftaran berhasil! Silakan periksa email Anda untuk kode OTP.', 'success');

  } catch (error) {
    console.error('Register error:', error);
    showToast('❌ ' + error.message, 'error');
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI(false);
  showToast('✅ Berhasil keluar', 'success');
  setTimeout(() => {
    window.location.href = 'home.html';
  }, 500);
}

// Inline OTP Modal Management
function showOTPModal(email, type = 'signup') {
  otpEmail = email;
  otpType = type;

  let modal = document.getElementById('otpModal');
  if (!modal) {
    createOTPModalDOM();
    modal = document.getElementById('otpModal');
  }

  const emailDisplay = document.getElementById('otpEmailDisplay');
  if (emailDisplay) emailDisplay.textContent = email;

  modal.classList.add('show');
  setupOTPInputs();

  const firstInput = document.querySelector('.otp-box[data-index="0"]');
  if (firstInput) firstInput.focus();
}

function hideOTPModal() {
  const modal = document.getElementById('otpModal');
  if (modal) modal.classList.remove('show');
}

function createOTPModalDOM() {
  const div = document.createElement('div');
  div.id = 'otpModal';
  div.className = 'otp-modal';
  div.innerHTML = `
    <div class="otp-overlay" onclick="hideOTPModal()"></div>
    <div class="otp-container">
      <h2 class="otp-title">Verifikasi Kode OTP</h2>
      <p class="otp-subtitle">Masukkan 6 digit kode yang dikirimkan ke <br><strong id="otpEmailDisplay"></strong></p>
      
      <div class="otp-inputs" id="otpInputsContainer">
        <input type="text" maxlength="1" class="otp-box" data-index="0" />
        <input type="text" maxlength="1" class="otp-box" data-index="1" />
        <input type="text" maxlength="1" class="otp-box" data-index="2" />
        <input type="text" maxlength="1" class="otp-box" data-index="3" />
        <input type="text" maxlength="1" class="otp-box" data-index="4" />
        <input type="text" maxlength="1" class="otp-box" data-index="5" />
      </div>

      <button type="button" class="btn-primary-brown" id="verifyOTPBtn">Verifikasi</button>
      <button type="button" class="btn btn-secondary w-full mt-1" id="resendOTPBtn">Kirim Ulang Kode</button>
      <button type="button" class="btn-link" onclick="hideOTPModal()">Batal</button>
    </div>
  `;
  document.body.appendChild(div);
}

function setupOTPInputs() {
  const inputs = document.querySelectorAll('.otp-box');

  inputs.forEach((input, index) => {
    input.value = '';
    input.classList.remove('filled', 'error');

    input.oninput = (e) => {
      const val = e.target.value;
      if (val.length >= 1) {
        input.value = val[0];
        input.classList.add('filled');
        if (index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else {
          submitOTPVerification();
        }
      } else {
        input.classList.remove('filled');
      }
    };

    input.onkeydown = (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
        inputs[index - 1].value = '';
        inputs[index - 1].classList.remove('filled');
      }
    };

    input.onpaste = (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d+$/.test(paste)) {
        paste.split('').slice(0, 6).forEach((char, i) => {
          if (inputs[i]) {
            inputs[i].value = char;
            inputs[i].classList.add('filled');
          }
        });
        const lastIndex = Math.min(paste.length, 6) - 1;
        if (inputs[lastIndex]) inputs[lastIndex].focus();
        if (paste.length >= 6) submitOTPVerification();
      }
    };
  });

  const verifyBtn = document.getElementById('verifyOTPBtn');
  if (verifyBtn) verifyBtn.onclick = submitOTPVerification;

  const resendBtn = document.getElementById('resendOTPBtn');
  if (resendBtn) {
    resendBtn.onclick = async () => {
      try {
        if (otpType === 'login') {
          await supabaseClient.auth.signInWithOtp({ email: otpEmail });
        } else if (otpType === 'recovery') {
          await supabaseClient.auth.resetPasswordForEmail(otpEmail);
        } else {
          await supabaseClient.auth.resend({
            type: 'signup',
            email: otpEmail
          });
        }
        showToast('✅ Kode OTP baru berhasil dikirim!', 'success');
      } catch (err) {
        showToast('❌ Gagal mengirim ulang: ' + err.message, 'error');
      }
    };
  }
}

async function submitOTPVerification() {
  const inputs = document.querySelectorAll('.otp-box');
  const token = Array.from(inputs).map(i => i.value).join('');

  if (token.length !== 6) {
    showToast('❌ Masukkan 6 digit kode lengkap', 'error');
    return;
  }

  try {
    let verifyType = 'signup';
    if (otpType === 'login') verifyType = 'email';
    else if (otpType === 'recovery') verifyType = 'recovery';

    let { data, error } = await supabaseClient.auth.verifyOtp({
      email: otpEmail,
      token: token,
      type: verifyType
    });

    if (error && verifyType === 'signup') {
      const fallback = await supabaseClient.auth.verifyOtp({
        email: otpEmail,
        token: token,
        type: 'email'
      });
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error) throw error;

    hideOTPModal();
    showToast('✅ Verifikasi berhasil! Mengalihkan...', 'success');

    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);

  } catch (error) {
    inputs.forEach(i => i.classList.add('error'));
    setTimeout(() => {
      inputs.forEach(i => i.classList.remove('error'));
    }, 400);
    showToast('❌ ' + error.message, 'error');
  }
}

async function handleForgotPassword(email) {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) throw error;

    showOTPModal(email, 'recovery');
    showToast('📧 Kode recovery OTP telah dikirimkan ke email Anda.', 'success');
  } catch (error) {
    showToast('❌ ' + error.message, 'error');
  }
}


// Settings & Profile Management
function setupSettingsModal() {
  const modal = document.getElementById('settingsModalOverlay');
  const openBtn = document.getElementById('openSettingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const form = document.getElementById('settingsForm');
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('settingsAvatarPreview');

  if (!modal || !openBtn || !form) return;

  openBtn.onclick = () => {
    document.getElementById('settingsEmail').value = currentUser?.email || '';
    document.getElementById('settingsName').value = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '';
    avatarPreview.src = document.getElementById('headerAvatar').src;
    modal.classList.add('show');
  };

  closeBtn.onclick = () => modal.classList.remove('show');

  avatarInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) avatarPreview.src = URL.createObjectURL(file);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    try {
      let avatarUrl = currentUser?.user_metadata?.avatar_url;
      const file = avatarInput.files[0];

      if (file) {
        const fileName = `avatars/${currentUser.id}_${Date.now()}`;
        const { error: uploadErr } = await supabaseClient.storage
          .from('toilet-photos')
          .upload(fileName, file);
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabaseClient.storage
          .from('toilet-photos')
          .getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      const { error: updateErr } = await supabaseClient.auth.updateUser({
        data: { 
          full_name: document.getElementById('settingsName').value,
          avatar_url: avatarUrl
        }
      });

      if (updateErr) throw updateErr;

      showToast('✅ Profil berhasil diperbarui!', 'success');
      modal.classList.remove('show');
      checkAuth(); // Refresh UI
    } catch (err) {
      showToast('❌ Gagal update: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan Perubahan';
    }
  };
}

// Guard helpers
async function getUserRole() {
  if (!currentUser) return null;
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();
  return profile?.role || 'user';
}

async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showToast('⚠️ Silakan masuk terlebih dahulu', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
    return false;
  }
  currentUser = session.user;
  return true;
}

async function requireAdmin() {
  const authenticated = await requireAuth();
  if (!authenticated) return false;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    showToast('❌ Akses ditolak! Khusus administrator.', 'error');
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1500);
    return false;
  }
  return true;
}
