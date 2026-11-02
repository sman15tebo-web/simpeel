
// ==========================================
// 🚀 VIEW LOADER & INITIALIZATION
// ==========================================
const SIMPEEL_ACTIVITY_LOG_KEY = 'SIMPEEL_ACTIVITY_LOG';

function recordSimpeelActivity(action, result = 'info', detail = '', actor = '') {
    try {
        const rawLog = JSON.parse(localStorage.getItem(SIMPEEL_ACTIVITY_LOG_KEY) || '[]');
        const entries = Array.isArray(rawLog) ? rawLog : [];
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
        } catch (_) {}

        entries.unshift({
            at: new Date().toISOString(),
            action: String(action || 'Aktivitas').slice(0, 100),
            result: String(result || 'info'),
            detail: String(detail || '').slice(0, 500),
            actor: String(actor || currentUser?.displayName || currentUser?.username || currentUser?.nip || 'Tidak diketahui').slice(0, 100)
        });
        localStorage.setItem(SIMPEEL_ACTIVITY_LOG_KEY, JSON.stringify(entries.slice(0, 300)));
    } catch (error) {
        console.warn('[SiMPEEL Activity] Gagal menyimpan log aktivitas lokal:', error);
    }
}

function escapeActivityLogHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

window.recordSimpeelActivity = recordSimpeelActivity;

window.bukaLogAktivitasSimpeel = function () {
    let entries = [];
    try {
        const stored = JSON.parse(localStorage.getItem(SIMPEEL_ACTIVITY_LOG_KEY) || '[]');
        entries = Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.error('[SiMPEEL Activity] Gagal membaca log aktivitas:', error);
        return Swal.fire('Log Tidak Dapat Dibuka', 'Data log aktivitas lokal tidak dapat dibaca.', 'error');
    }
    entries = entries.filter(entry => entry && typeof entry === 'object');

    const statusClass = { success: 'success', error: 'danger', warning: 'warning', info: 'secondary' };
    const rows = entries.slice(0, 100).map(entry => {
        const date = new Date(entry.at);
        const dateText = Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
        const result = String(entry.result || 'info');
        const badgeClass = statusClass[result] || 'secondary';
        return `<tr>
            <td class="text-nowrap small">${escapeActivityLogHtml(dateText)}</td>
            <td><span class="badge text-bg-${badgeClass}">${escapeActivityLogHtml(result)}</span></td>
            <td class="fw-semibold">${escapeActivityLogHtml(entry.action || '-')}</td>
            <td>${escapeActivityLogHtml(entry.actor || '-')}</td>
            <td>${escapeActivityLogHtml(entry.detail || '-')}</td>
        </tr>`;
    }).join('');
    const content = entries.length
        ? `<div class="table-responsive text-start" style="max-height:62vh">
            <table class="table table-sm table-striped align-middle mb-0">
                <thead class="table-light position-sticky top-0"><tr><th>Waktu</th><th>Status</th><th>Aktivitas</th><th>Pengguna</th><th>Rincian</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div><div class="small text-muted text-start mt-2">Menampilkan maksimal 100 dari ${entries.length} catatan terbaru. Log tersimpan lokal di perangkat ini.</div>`
        : '<div class="text-muted py-4"><i class="fas fa-clipboard-list fa-2x mb-2"></i><br>Belum ada aktivitas tercatat. Log mulai dibuat sejak versi ini digunakan.</div>';

    Swal.fire({
        title: 'Log Activity SiMPEEL',
        html: content,
        width: 1000,
        confirmButtonText: 'Tutup'
    });
};

async function loadViews() {
    const includes = Array.from(document.querySelectorAll('[data-include]'));
    
    // Muat semua view secara paralel agar landing page dan seluruh UI terbuka secepat kilat
    await Promise.all(includes.map(async (el) => {
        const file = el.getAttribute('data-include');
        let html = '';
        try {
            if (isElectron && window.electronAPI?.loadView) {
                html = await window.electronAPI.loadView(file);
            } else {
                const requestFile = file === 'views/pages/view-pengaturan.html'
                    ? `${file}?v=20261027-sop-layout`
                    : file;
                const res = await fetch(requestFile);
                html = await res.text();
            }
            el.outerHTML = html;

            // Jika view yang dimuat adalah landing view, segera render logo dan nama sekolah dari cache!
            if (file.includes('landing.html')) {
                try {
                    const cached = localStorage.getItem('SIMPEEL_SETTINGS_CACHE');
                    if (cached && typeof applyPengaturanToDOM === 'function') {
                        applyPengaturanToDOM(JSON.parse(cached));
                    }
                } catch(e) {}
            }
        } catch (e) {
            console.error('Failed to load view:', file, e);
        }
    }));
}

async function showStandardPasswordReminder(sessionData) {
    const reminder = await Swal.fire({
        title: 'Password Masih Standar',
        text: 'Password Anda masih menggunakan NIP/NIK atau password standar 123456. Demi keamanan, segera ganti password.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ganti Sekarang',
        cancelButtonText: 'Nanti',
        allowOutsideClick: false
    });
    if (!reminder.isConfirmed) return;

    const change = await Swal.fire({
        title: 'Ganti Password',
        html: `<div class="row g-2 text-start">
            <div class="col-md-6"><label class="form-label" for="login-new-password">Password Baru</label><input id="login-new-password" type="password" class="form-control" autocomplete="new-password" minlength="8"></div>
            <div class="col-md-6"><label class="form-label" for="login-confirm-password">Ulangi Password</label><input id="login-confirm-password" type="password" class="form-control" autocomplete="new-password" minlength="8"></div>
        </div>`,
        showCancelButton: true,
        confirmButtonText: 'Simpan Password',
        cancelButtonText: 'Nanti',
        focusConfirm: false,
        preConfirm: () => {
            const password = document.getElementById('login-new-password').value;
            const confirmation = document.getElementById('login-confirm-password').value;
            const standardPasswords = [
                '123456',
                sessionData.nip,
                sessionData.nik
            ].filter(Boolean).map(value => String(value).trim());
            if (password.length < 8) {
                Swal.showValidationMessage('Password baru minimal 8 karakter.');
                return false;
            }
            if (standardPasswords.includes(password.trim())) {
                Swal.showValidationMessage('Password baru tidak boleh sama dengan NIP, NIK, atau password standar.');
                return false;
            }
            if (password !== confirmation) {
                Swal.showValidationMessage('Ulangi password harus sama dengan password baru.');
                return false;
            }
            return password;
        }
    });
    if (!change.isConfirmed || !change.value) return;

    Swal.fire({ title: 'Menyimpan Password...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const nip = sessionData.nip || sessionData.username;
        if (!nip) throw new Error('NIP akun tidak ditemukan. Silakan hubungi administrator.');
        const result = await apiCall('saveAkun', { nip, password: change.value });
        if (!result?.success) throw new Error(result?.message || 'Password gagal disimpan.');
        recordSimpeelActivity('Perubahan password', 'success', 'Password akun pegawai berhasil diubah.');

        try {
            const session = JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}');
            session.mustChangePassword = false;
            localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
        } catch (_) {}
        await Swal.fire('Berhasil', 'Password telah diganti dan disimpan dengan aman.', 'success');
    } catch (error) {
        recordSimpeelActivity('Perubahan password', 'error', 'Password akun pegawai gagal diubah.');
        await Swal.fire('Gagal', error.message || 'Password gagal disimpan.', 'error');
    }
}

let sessionExpiredPromptOpen = false;
let sessionExpiryTimer = null;
const SIMPEEL_ONLINE_SESSION_TTL_MS = 6 * 60 * 60 * 1000;

window.handleSimpeelSessionExpired = async function () {
    if (sessionExpiredPromptOpen) return;
    sessionExpiredPromptOpen = true;
    try {
        await Swal.fire({
            title: 'Sesi Telah Berakhir',
            text: 'Sesi Anda telah berakhir. Silakan login kembali.',
            icon: 'warning',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false
        });
        recordSimpeelActivity('Sesi berakhir', 'warning', 'Sesi login berakhir; pengguna diminta untuk login kembali.');
        if (isElectron && window.electronAPI?.logout) {
            try {
                await window.electronAPI.logout();
            } catch (error) {
                console.error('Gagal mengakhiri sesi desktop:', error);
            }
        }
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CACHE_KEY);
        checkSSOSession();
        showLoginView();
    } finally {
        sessionExpiredPromptOpen = false;
    }
};

// Modify window.onload to load views before initApp
window.addEventListener('DOMContentLoaded', async () => {
    if (isElectron) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CACHE_KEY);
    }
    await loadViews();
    if (typeof loadPengaturan === 'function') {
        loadPengaturan();
    }
    if (typeof initEvents === 'function') {
        initEvents();
    }
});

async function initEvents() {
    await dbManager.init();

    // === AUTOCOMPLETE TEMPAT LAHIR ===
    const inputLahir = document.getElementById('peg_tempat_lahir');
    const listLahir = document.getElementById('tempat_lahir_list');

    if (inputLahir && listLahir && typeof dataWilayah !== 'undefined') {
        let allKabKota = [];
        for (let prov in dataWilayah) {
            dataWilayah[prov].forEach(item => {
                allKabKota.push({ label: `${item} - Prov ${prov}`, value: item });
            });
        }
        if (typeof dataWilayahLama !== 'undefined') {
            for (let prov in dataWilayahLama) {
                dataWilayahLama[prov].forEach(item => {
                    allKabKota.push({ label: `${item} - Prov ${prov}`, value: item });
                });
            }
        }

        inputLahir.addEventListener('input', function () {
            const val = this.value.toLowerCase();
            listLahir.innerHTML = '';
            if (!val) {
                listLahir.style.display = 'none';
                return;
            }

            const matches = allKabKota.filter(k => k.label.toLowerCase().includes(val)).slice(0, 5);

            if (matches.length > 0) {
                listLahir.style.display = 'block';
                matches.forEach(m => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item list-group-item-action py-1 px-2';
                    li.style.cursor = 'pointer';
                    li.textContent = m.label;
                    li.onclick = () => {
                        inputLahir.value = m.value;
                        listLahir.style.display = 'none';
                    };
                    listLahir.appendChild(li);
                });
            } else {
                listLahir.style.display = 'none';
            }
        });

        document.addEventListener('click', function (e) {
            if (e.target !== inputLahir) {
                listLahir.style.display = 'none';
            }
        });
    }

    // === DROPDOWN ALAMAT PROVINSI & KABKOTA ===
    const selProv = document.getElementById('peg_alamat_provinsi');
    const selKab = document.getElementById('peg_alamat_kabkota');
    if (selProv && selKab && typeof dataWilayah !== 'undefined') {
        Object.keys(dataWilayah).sort().forEach(prov => {
            const opt = document.createElement('option');
            opt.value = prov;
            opt.textContent = prov;
            selProv.appendChild(opt);
        });

        selProv.addEventListener('change', function () {
            const provName = this.value;
            selKab.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';
            if (provName && dataWilayah[provName]) {
                dataWilayah[provName].forEach(kab => {
                    if (!kab.endsWith('(PROV)')) {
                        const opt = document.createElement('option');
                        opt.value = kab;
                        opt.textContent = kab;
                        selKab.appendChild(opt);
                    }
                });
            }
        });
    }
    loadPengaturan();
    checkSSOSession();
    initApp();

    const modalPegawai = document.getElementById('modalPegawai');
    if (modalPegawai) {
        modalPegawai.addEventListener('show.bs.modal', function () {
            if (typeof window.restoreModalPegawaiDOM === 'function') {
                window.restoreModalPegawaiDOM();
            }
            this.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            const firstTab = this.querySelector('#formPegawaiTabs .nav-link[data-bs-target="#f-pribadi"]');
            if (firstTab && window.bootstrap) {
                new bootstrap.Tab(firstTab).show();
            }
        });

        modalPegawai.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });
    }
    // === FIX DATE INPUT YEAR 6 DIGIT ISSUE ===
    document.addEventListener('focusin', function (e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'date') {
            if (!e.target.getAttribute('max')) {
                e.target.setAttribute('max', '9999-12-31');
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (!e.ctrlKey || !window.electronAPI?.setZoomFactor) return;

        const zoomKey = e.key;
        if (zoomKey !== '=' && zoomKey !== '+' && zoomKey !== '-' && zoomKey !== '0') return;

        e.preventDefault();
        const current = window.electronAPI.getZoomFactor();
        const next = zoomKey === '0'
            ? 1
            : Math.max(0.5, Math.min(2.5, current + (zoomKey === '-' ? -0.1 : 0.1)));
        window.electronAPI.setZoomFactor(Number(next.toFixed(1)));
    });

    const toggleSetPwd = document.getElementById('toggleSetPassword');
    if (toggleSetPwd) toggleSetPwd.addEventListener('click', togglePasswordVisibility);

    const toggleLoginPwd = document.getElementById('toggleLoginPassword');
    const loginPwd = document.getElementById('inputPassword');
    if (toggleLoginPwd && loginPwd) {
        toggleLoginPwd.addEventListener('click', function (e) {
            const type = loginPwd.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPwd.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('inputUsername').value.trim();
            const pass = document.getElementById('inputPassword').value.trim();
            if (!user || !pass) return;

            if (API_URL) {
                Swal.fire({ title: 'Authenticating...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                let loginAuthenticated = false;
                try {
                    const result = await apiCall('login', { username: user, password: pass });
                    if (result && result.success) {
                        const resData = result.data || result.user || result;
                        const sessionData = {
                            displayName: resData.nama || user,
                            role: resData.role || 'admin',
                            nip: resData.nip || null,
                            nik: resData.nik || resData.NIK || null,
                            username: resData.username || user,
                            accessToken: resData.accessToken || null,
                            mustChangePassword: resData.mustChangePassword === true,
                            sessionExpiresAt: isElectron ? null : Date.now() + SIMPEEL_ONLINE_SESSION_TTL_MS
                        };
                        localStorage.setItem(TOKEN_KEY, JSON.stringify(sessionData));
                        loginAuthenticated = true;
                        recordSimpeelActivity('Login', 'success', 'Login berhasil.', sessionData.displayName);
                        document.getElementById('inputUsername').value = '';
                        document.getElementById('inputPassword').value = '';
                        if (isElectron) await dbManager.init();
                        else await dbManager.forceFetchFromServer();
                        const employeeRecord = Array.isArray(dbManager.localData)
                            ? dbManager.localData.find(employee => String(employee.nip) === String(sessionData.nip || user))
                            : null;
                        sessionData.nik = sessionData.nik || employeeRecord?.nik || employeeRecord?.NIK || null;
                        const standardPasswords = ['123456', sessionData.nip, sessionData.nik, user]
                            .filter(Boolean)
                            .map(value => String(value).trim());
                        const needsPasswordChange = sessionData.role === 'pegawai' && (
                            sessionData.mustChangePassword || standardPasswords.includes(pass)
                        );
                        Swal.close();
                        checkSSOSession();
                        if (needsPasswordChange) {
                            setTimeout(() => showStandardPasswordReminder(sessionData), 350);
                        }
                    } else {
                        recordSimpeelActivity('Login', 'error', 'Percobaan login gagal.', user);
                        Swal.fire('Gagal!', result ? (result.message || 'Username atau Password salah!') : 'Gagal terhubung ke API Server', 'error');
                    }
                } catch (error) {
                    recordSimpeelActivity('Login', loginAuthenticated ? 'warning' : 'error', loginAuthenticated ? 'Login berhasil, tetapi pemuatan data awal gagal.' : 'Permintaan login gagal diproses.', user);
                    Swal.fire('Gagal!', error.message || 'Gagal terhubung ke API Server.', 'error');
                }
            } else {
                recordSimpeelActivity('Login', 'error', 'API tidak tersedia.', user);
                Swal.fire('Offline', 'Tidak terhubung ke API', 'error');
            }
        });
    }
}

function checkSSOSession() {
    const ssoToken = localStorage.getItem(TOKEN_KEY);
    const wrapper = document.getElementById('wrapper');
    const landingView = document.getElementById('spa-landing-view');
    const loginView = document.getElementById('spa-login-view');
    document.body.classList.toggle('splash-screen-active', !ssoToken);

    if (!ssoToken) {
        if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
        sessionExpiryTimer = null;
        if (wrapper) wrapper.classList.add('d-none');
        if (loginView) loginView.classList.add('d-none');
        if (landingView) landingView.classList.remove('d-none');
        // Sembunyikan bottom nav & tombol logout HP saat tidak ada sesi login
        const mobAdmin = document.getElementById('mobile-bottom-nav-admin');
        const mobPegawai = document.getElementById('mobile-bottom-nav-pegawai');
        const mobLogout = document.getElementById('topNavLogoutMobile');
        if (mobAdmin) mobAdmin.classList.add('d-none');
        if (mobPegawai) mobPegawai.classList.add('d-none');
        if (mobLogout) mobLogout.classList.add('d-none');
        return;
    }

    try {
        const data = JSON.parse(ssoToken);
        if (sessionExpiryTimer) clearTimeout(sessionExpiryTimer);
        sessionExpiryTimer = null;
        if (!isElectron && Number.isFinite(Number(data.sessionExpiresAt))) {
            const remainingMs = Number(data.sessionExpiresAt) - Date.now();
            sessionExpiryTimer = setTimeout(() => {
                window.handleSimpeelSessionExpired?.();
            }, Math.max(0, remainingMs));
        }
        if (data.displayName) document.getElementById('topName').textContent = data.displayName;
        if (landingView) landingView.classList.add('d-none');
        if (loginView) loginView.classList.add('d-none');
        if (wrapper) wrapper.classList.remove('d-none');

        const sidebarAdmin = document.getElementById('sidebar-admin');
        const sidebarPegawai = document.getElementById('sidebar-pegawai');
        const syncBtn = document.querySelector('[onclick="bukaModalSync()"]');
        const syncBtnParent = syncBtn ? syncBtn.closest('li') : null;

        if (data.role === 'pegawai') {
            // Tampilkan sidebar & bottom nav pegawai, sembunyikan admin
            if (sidebarAdmin) sidebarAdmin.classList.add('d-none');
            if (sidebarPegawai) sidebarPegawai.classList.remove('d-none');
            const mobAdmin = document.getElementById('mobile-bottom-nav-admin');
            const mobPegawai = document.getElementById('mobile-bottom-nav-pegawai');
            if (mobAdmin) mobAdmin.classList.add('d-none');
            if (mobPegawai) mobPegawai.classList.remove('d-none');
            const mobLogout = document.getElementById('topNavLogoutMobile');
            if (mobLogout) mobLogout.classList.remove('d-none');

            if (syncBtnParent) syncBtnParent.classList.add('d-none');
            document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.add('d-none'));
            // Navigate ke dashboard beranda pegawai
            setTimeout(() => {
                nav('dashboard-pegawai');
                if (typeof renderDashboardPegawai === 'function') renderDashboardPegawai();
                if (typeof renderProfilPegawai === 'function') renderProfilPegawai();
            }, 200);
        } else {
            // Admin: Tampilkan sidebar & bottom nav admin, sembunyikan pegawai
            if (sidebarAdmin) sidebarAdmin.classList.remove('d-none');
            if (sidebarPegawai) sidebarPegawai.classList.add('d-none');
            const mobAdmin = document.getElementById('mobile-bottom-nav-admin');
            const mobPegawai = document.getElementById('mobile-bottom-nav-pegawai');
            if (mobAdmin) mobAdmin.classList.remove('d-none');
            if (mobPegawai) mobPegawai.classList.add('d-none');
            const mobLogoutAdmin = document.getElementById('topNavLogoutMobile');
            if (mobLogoutAdmin) mobLogoutAdmin.classList.add('d-none');

            if (syncBtnParent) syncBtnParent.classList.remove('d-none');
            document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.remove('d-none'));
            setTimeout(() => nav('dashboard'), 200);
            setTimeout(() => initApp(), 220);
        }

        // Update badge koneksi setelah login
        setTimeout(updateConnectionStatus, 100);
    } catch (e) { console.error('checkSSOSession error', e); }
}

function showLoginView() {
    const landingView = document.getElementById('spa-landing-view');
    const loginView = document.getElementById('spa-login-view');
    document.body.classList.add('splash-screen-active');
    if (landingView) landingView.classList.add('d-none');
    if (loginView) loginView.classList.remove('d-none');
}

function showLandingView() {
    const landingView = document.getElementById('spa-landing-view');
    const loginView = document.getElementById('spa-login-view');
    document.body.classList.add('splash-screen-active');
    if (loginView) loginView.classList.add('d-none');
    if (landingView) landingView.classList.remove('d-none');
}

window.restoreModalPegawaiDOM = function () {
    const modalEl = document.getElementById('modalPegawai');
    const modalDialog = modalEl ? modalEl.querySelector('.modal-dialog') : null;
    if (!modalDialog) return;

    let modalContent = modalDialog.querySelector('.modal-content');
    if (!modalContent) {
        const inlineContent = document.getElementById('formPegawaiTabsContent')?.closest('.modal-content, .card') ||
            document.getElementById('formPegawai')?.closest('.modal-content, .card') ||
            document.querySelector('#view-update-data .modal-content, #view-update-data > div, #pegawai-input-container .modal-content, #pegawai-input-container > div');
        if (inlineContent) {
            modalDialog.appendChild(inlineContent);
            modalContent = inlineContent;
        }
    }
    if (modalContent) {
        modalContent.classList.remove('card', 'shadow-sm', 'border-0', 'w-100', 'rounded-3');
        modalContent.classList.add('modal-content');
        modalContent.style.boxShadow = '';
        modalContent.style.border = '';
        modalContent.style.borderRadius = '';
        const header = modalContent.querySelector('.modal-header');
        if (header) {
            header.style.display = '';
            header.className = 'modal-header bg-primary text-white py-3';
            const closeBtn = header.querySelector('.btn-close, button[data-bs-dismiss="modal"]');
            if (closeBtn) {
                closeBtn.style.display = '';
                closeBtn.classList.remove('d-none');
            }
        }
        const footer = modalContent.querySelector('.card-footer, .modal-footer');
        if (footer) {
            footer.className = 'modal-footer';
        }
        const cancelBtn = modalContent.querySelector('.modal-footer .btn-secondary[data-bs-dismiss="modal"]');
        if (cancelBtn) {
            cancelBtn.style.display = '';
            cancelBtn.classList.remove('d-none');
        }
    }
};

function nav(page) {
    const legacyRouteMap = {
        'akun': { page: 'data-induk', tabId: 'tab-di-akun' },
        'pegawai': { page: 'data-induk', tabId: 'tab-di-pegawai' },
        'rekap': { page: 'status-pegawai', tabId: 'tab-sp-aktif' },
        'riwayat': { page: 'status-pegawai', tabId: 'tab-sp-nonaktif' },
        'duk': { page: 'monitor', tabId: 'tab-mon-duk' },
        'gaji': { page: 'monitor', tabId: 'tab-mon-gaji' },
        'monitor-kgb': { page: 'monitor', tabId: 'tab-mon-gaji' },
        'pensiun': { page: 'monitor', tabId: 'tab-mon-pensiun' },
        'guru-sertif': { page: 'monitor', tabId: 'tab-mon-sertif' },
        'skumptk': { page: 'monitor', tabId: 'tab-mon-skumptk' },
        'pegawai-input': { page: 'update-data' }
    };
    const mapped = legacyRouteMap[page];
    const targetTabId = mapped ? mapped.tabId : null;
    if (mapped) {
        page = mapped.page;
    }

    if (page !== 'update-data' && page !== 'pegawai-input') {
        if (typeof window.restoreModalPegawaiDOM === 'function') {
            window.restoreModalPegawaiDOM();
        }
    }

    document.querySelectorAll('.page-view').forEach(el => {
        el.classList.add('d-none');
    });
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.nav-item-bottom').forEach(el => {
        el.classList.remove('active');
    });

    const targetPage = document.getElementById('view-' + page);
    if (targetPage) {
        targetPage.classList.remove('d-none');
    }

    const targetNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (targetNav) {
        targetNav.classList.add('active');
    }

    // Update bottom nav active state
    const targetBottomNav = document.querySelector(`.nav-item-bottom[onclick*="'${page}'"]`);
    if (targetBottomNav) {
        targetBottomNav.classList.add('active');
    }

    // NEW MERGED PAGES
    if (page === 'data-induk') {
        const dataIndukTabs = document.getElementById('dataIndukTabs');
        if (dataIndukTabs && !dataIndukTabs._navBound) {
            dataIndukTabs.addEventListener('shown.bs.tab', (event) => {
                if (event.target.getAttribute('data-bs-target') === '#di-akun') {
                    renderTabelAkun();
                } else if (event.target.getAttribute('data-bs-target') === '#di-pegawai') {
                    renderTabelPNS();
                }
            });
            dataIndukTabs._navBound = true;
        }
        if (targetTabId && window.bootstrap) {
            const tabEl = document.getElementById(targetTabId);
            if (tabEl) new bootstrap.Tab(tabEl).show();
        }
        const activeTab = dataIndukTabs?.querySelector('.nav-link.active');
        if (activeTab?.getAttribute('data-bs-target') === '#di-pegawai') renderTabelPNS();
        else renderTabelAkun();
    }
    if (page === 'status-pegawai') {
        if (targetTabId && window.bootstrap) {
            const tabEl = document.getElementById(targetTabId);
            if (tabEl) new bootstrap.Tab(tabEl).show();
        }
        renderTabelRekap();
        renderTabelRiwayat();
        renderTabelPensiun();
    }
    if (page === 'monitor') {
        renderTabelDUK();
        const monitorDukTabs = document.getElementById('monitorDukTabs');
        if (monitorDukTabs && !monitorDukTabs._navBound) {
            monitorDukTabs.addEventListener('shown.bs.tab', (event) => {
                const target = event.target.getAttribute('data-bs-target');
                const tableId = target === '#duk-pns-tab' ? '#tblDUKPNS'
                    : target === '#duk-pppk-tab' ? '#tblDUKPPPK'
                        : '#tblDUKPPPKPW';
                requestAnimationFrame(() => {
                    if ($.fn.DataTable.isDataTable(tableId)) {
                        $(tableId).DataTable().columns.adjust().draw(false);
                    } else {
                        renderTabelDUK();
                    }
                });
            });
            monitorDukTabs._navBound = true;
        }
        const tabGaji = document.getElementById('tab-mon-gaji');
        if (tabGaji && !tabGaji._navBound) {
            tabGaji.addEventListener('shown.bs.tab', () => renderTabelKGB());
            tabGaji._navBound = true;
        }
        const tabSkumptk = document.getElementById('tab-mon-skumptk');
        if (tabSkumptk && !tabSkumptk._navBound) {
            tabSkumptk.addEventListener('shown.bs.tab', () => renderTabelSKUMPTK());
            tabSkumptk._navBound = true;
        }
        const skumptkPills = document.getElementById('pills-tab-skumptk');
        if (skumptkPills && !skumptkPills._navBound) {
            skumptkPills.addEventListener('shown.bs.tab', (event) => {
                const target = event.target.getAttribute('data-bs-target');
                const tableId = target === '#pills-skumptk-pns' ? '#tblSkumptkPns' : '#tblSkumptkPppk';
                requestAnimationFrame(() => {
                    if ($.fn.DataTable.isDataTable(tableId)) {
                        $(tableId).DataTable().columns.adjust().draw(false);
                    } else {
                        renderTabelSKUMPTK();
                    }
                });
            });
            skumptkPills._navBound = true;
        }
        const tabPensiun = document.getElementById('tab-mon-pensiun');
        if (tabPensiun && !tabPensiun._navBound) {
            tabPensiun.addEventListener('shown.bs.tab', () => renderTabelPensiun());
            tabPensiun._navBound = true;
        }
        const tabSertif = document.getElementById('tab-mon-sertif');
        if (tabSertif && !tabSertif._navBound) {
            tabSertif.addEventListener('shown.bs.tab', () => renderTabelGuruSertif());
            tabSertif._navBound = true;
        }
        if (targetTabId && window.bootstrap) {
            const tabEl = document.getElementById(targetTabId);
            if (tabEl) {
                new bootstrap.Tab(tabEl).show();
                if (targetTabId === 'tab-mon-gaji') renderTabelKGB();
                else if (targetTabId === 'tab-mon-pensiun') renderTabelPensiun();
                else if (targetTabId === 'tab-mon-sertif') renderTabelGuruSertif();
                else if (targetTabId === 'tab-mon-skumptk') renderTabelSKUMPTK();
            }
        }
    }

    if (page === 'pengaturan') { if(typeof loadPengaturan === 'function') loadPengaturan(); }
    if (page === 'profil-pegawai') { if(typeof renderProfilPegawai === 'function') renderProfilPegawai(); }
    if (page === 'dashboard') {
        if (typeof initApp === 'function') initApp();
    }
    if (page === 'pegawai-input') { if(typeof loadInputDataPegawai === 'function') loadInputDataPegawai(); }
    if (page === 'dashboard-pegawai') { if(typeof renderDashboardPegawai === 'function') renderDashboardPegawai(); }
    if (page === 'update-data') { if(typeof bukaFormUpdateData === 'function') bukaFormUpdateData(); }
    if (page === 'usul-cuti') {
        const firstTab = document.getElementById('tab-cuti-pns');
        if (firstTab && window.bootstrap) {
            bootstrap.Tab.getOrCreateInstance(firstTab).show();
        }
        const cutiTabs = document.getElementById('cutiTabs');
        if (cutiTabs && !cutiTabs._navBound) {
            cutiTabs.addEventListener('shown.bs.tab', (event) => {
                const target = event.target.getAttribute('data-bs-target');
                if (target === '#cuti-tab-riwayat') {
                    if (typeof renderTabelRiwayatCuti === 'function') {
                        renderTabelRiwayatCuti(true).then(() => {
                            requestAnimationFrame(() => {
                                const table = document.getElementById('tblCutiRiwayat');
                                if (table?.isConnected && $.fn.DataTable.isDataTable(table)) {
                                    $('#tblCutiRiwayat').DataTable().columns.adjust().draw(false);
                                }
                            });
                        });
                    }
                } else {
                    const tableId = target === '#cuti-tab-pns' ? '#tblCutiPNS'
                        : target === '#cuti-tab-pppk' ? '#tblCutiPPPK'
                            : '#tblCutiPPPKPW';
                    requestAnimationFrame(() => {
                        if ($.fn.DataTable.isDataTable(tableId)) {
                            $(tableId).DataTable().columns.adjust().draw(false);
                        }
                    });
                }
            });
            cutiTabs._navBound = true;
        }
        if (typeof renderTabelUsulCuti === 'function') renderTabelUsulCuti();
        if (typeof renderTabelRiwayatCuti === 'function') renderTabelRiwayatCuti(true);
    }

    // Pastikan seluruh tabel aktif menyesuaikan lebar kolom secara presisi
    requestAnimationFrame(() => {
        if (window.$ && $.fn && $.fn.dataTable) {
            $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
        }
    });
}

async function logoutSSO() {
    const result = await Swal.fire({
        title: 'Keluar?',
        text: 'Anda akan keluar dari SiMPeEL',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Keluar'
    });
    if (result.isConfirmed) {
        if (typeof window.restoreModalPegawaiDOM === 'function') window.restoreModalPegawaiDOM();
        if (isElectron && window.electronAPI?.logout) await window.electronAPI.logout();
        else if (localStorage.getItem(TOKEN_KEY)) await apiCall('logout');
        localStorage.removeItem(TOKEN_KEY);
        if (isElectron) localStorage.removeItem(CACHE_KEY);
        recordSimpeelActivity('Logout', 'success', 'Pengguna keluar dari aplikasi.');
        checkSSOSession();
    }
}

async function initApp() {
    // Sembunyikan tombol sinkronisasi jika online
    if (!isElectron) {
        const syncBtn = document.querySelector('button[onclick="bukaModalSync()"]');
        if (syncBtn) syncBtn.classList.add('d-none');
        const connStatus = document.getElementById('connectionStatus');
        if (connStatus) {
            connStatus.classList.remove('bg-danger');
            connStatus.classList.add('bg-success');
            connStatus.innerHTML = '<i class="fas fa-wifi"></i> Online';
        }
    }

    const allPegawaiResult = await dbManager.getAllPegawai();
    const allPegawai = Array.isArray(allPegawaiResult) ? allPegawaiResult : [];
    const counts = { pns: 0, pppk: 0, pppkpw: 0, honorer: 0 };
    const isActive = pegawai => {
        const status = String(pegawai.statusKepegawaian || pegawai.status || '').trim().toLowerCase();
        return !status || status === 'aktif' || status === 'undefined';
    };

    allPegawai.forEach(pegawai => {
        if (!isActive(pegawai)) return;
        const type = String(pegawai.statusPegawai || pegawai.jenisPegawai || '').trim().toUpperCase();
        if (type === 'PNS' || type.startsWith('PNS ')) counts.pns++;
        else if (type.includes('PPPK') && (type.includes('PARUH') || /\bPW\b/.test(type))) counts.pppkpw++;
        else if (type.includes('PPPK')) counts.pppk++;
        else if (['HONOR', 'GTT', 'PTT', 'NON', 'KONTRAK'].some(marker => type.includes(marker))) counts.honorer++;
    });

    const elPns = document.getElementById('count-pns');
    const elPppk = document.getElementById('count-pppk');
    const elPppkpw = document.getElementById('count-pppkpw');
    const elHonorer = document.getElementById('count-honorer');

    if (elPns) elPns.innerText = counts.pns;
    if (elPppk) elPppk.innerText = counts.pppk;
    if (elPppkpw) elPppkpw.innerText = counts.pppkpw;
    if (elHonorer) elHonorer.innerText = counts.honorer;

    const ctx = document.getElementById('pegawaiChart');
    if (ctx) {
        if (typeof Chart === 'undefined') {
            console.error('[SiMPEEL Dashboard] Chart.js tidak tersedia; grafik tidak dapat ditampilkan.');
        } else {
            if (window.myPieChart) window.myPieChart.destroy();
            const chartValues = [counts.pns, counts.pppk, counts.pppkpw, counts.honorer];
            const hasActiveEmployees = chartValues.some(value => value > 0);
            window.myPieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: hasActiveEmployees ? ['PNS', 'PPPK', 'PPPK PW', 'Honorer'] : ['Belum ada data pegawai aktif'],
                    datasets: [{
                        data: hasActiveEmployees ? chartValues : [1],
                        backgroundColor: hasActiveEmployees ? ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'] : ['#e5eaf2'],
                        hoverBackgroundColor: hasActiveEmployees ? ['#2e59d9', '#17a673', '#2c9faf', '#dda20a'] : ['#d7deea'],
                        hoverBorderColor: "rgba(234, 236, 244, 1)",
                    }],
                },
                options: {
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom' } }
                },
            });
        }
    }

    const sidebarToggle = document.getElementById('sidebarToggleTop');
    if (sidebarToggle && !sidebarToggle.dataset.bound) {
        sidebarToggle.dataset.bound = "true";
        sidebarToggle.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.toggle('toggled');
        });
    }

    const kgbContainer = document.getElementById('kgb-notifications');
    if (kgbContainer) {
        kgbContainer.innerHTML = '';
        let countNotif = 0;
        const currDate = new Date();
        allPegawai.forEach(p => {
            if (isActive(p) && p.tmtKgbBaru) {
                const kgbDate = new Date(p.tmtKgbBaru);
                const diffTime = Math.abs(kgbDate - currDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 90 && kgbDate > currDate) {
                    countNotif++;
                    const typeClass = diffDays <= 30 ? 'alert-danger' : 'alert-warning';
                    kgbContainer.innerHTML += `
                        <div class="alert ${typeClass}">
                            <i class="fas fa-bell"></i> <b>${p.nama}</b> (${p.statusPegawai}) - Gaji Berkala dalam ${diffDays} hari.
                        </div>
                    `;
                }
            }
        });

        if (countNotif === 0) {
            kgbContainer.innerHTML = `<div class="alert alert-success">Tidak ada pengingat KGB dalam waktu dekat.</div>`;
        }
        kgbContainer.innerHTML += `<button class="btn btn-outline-primary btn-sm w-100 mt-2" onclick="nav('gaji')">Lihat Semua Data</button>`;
    }
}

/**
 * Global Tab Listener: Memastikan DataTables selalu menyesuaikan lebar kolom saat tab dibuka
 */
if (typeof document !== 'undefined') {
    document.addEventListener('shown.bs.tab', function () {
        if (window.$ && $.fn && $.fn.dataTable) {
            requestAnimationFrame(() => {
                $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
            });
        }
    });
}

/**
 * Segarkan Halaman Aktif:
 * Menarik data terbaru dan me-render ulang halaman aktif saat ini secara instan,
 * baik di versi online maupun offline tanpa perlu reload browser / app.
 */
async function segarkanHalamanAktif() {
    const refreshBtns = document.querySelectorAll('.btn-segarkan-halaman, button[onclick*="segarkanHalamanAktif"]');
    refreshBtns.forEach(btn => {
        const icon = btn.querySelector('.fa-sync-alt, .fa-sync');
        if (icon) icon.classList.add('fa-spin');
        btn.disabled = true;
    });

    try {
        const activePageView = document.querySelector('.page-view:not(.d-none)');
        const activePageId = activePageView ? activePageView.id : 'view-dashboard';

        // 1. Tarik data terbaru dari DB / server jika online atau refresh cache lokal
        if (typeof dbManager !== 'undefined') {
            if (!isElectron && API_URL && typeof dbManager.forceFetchFromServer === 'function') {
                let refreshResult;
                try {
                    refreshResult = await dbManager.forceFetchFromServer({ refreshUI: false });
                } catch (error) {
                    refreshResult = { success: false, message: error.message };
                }
                if (!Array.isArray(refreshResult)) {
                    if (activePageId === 'view-usul-cuti') {
                        throw new Error(refreshResult?.message || 'Data pegawai gagal dimuat dari server.');
                    }
                    console.warn('[Segarkan] Gagal mengambil data terbaru; halaman akan memakai cache:', refreshResult?.message);
                }
            } else if (typeof dbManager.getAllPegawai === 'function') {
                await dbManager.getAllPegawai();
            }
        }

        // 2. Deteksi halaman aktif saat ini
        switch (activePageId) {
            case 'view-dashboard':
                if (typeof initApp === 'function') await initApp();
                break;
            case 'view-data-induk':
                const activeDITab = document.querySelector('#dataIndukTabs .nav-link.active');
                if (activeDITab && activeDITab.getAttribute('data-bs-target') === '#di-pegawai') {
                    if (typeof renderTabelPNS === 'function') await renderTabelPNS();
                } else {
                    if (typeof renderTabelAkun === 'function') await renderTabelAkun();
                }
                break;
            case 'view-status-pegawai':
                if (typeof renderTabelRekap === 'function') await renderTabelRekap();
                if (typeof renderTabelRiwayat === 'function') await renderTabelRiwayat();
                if (typeof renderTabelPensiun === 'function') await renderTabelPensiun();
                break;
            case 'view-monitor':
                if (typeof renderTabelDUK === 'function') await renderTabelDUK();
                if (typeof renderTabelKGB === 'function') await renderTabelKGB();
                if (typeof renderTabelGuruSertif === 'function') await renderTabelGuruSertif();
                if (typeof renderTabelSKUMPTK === 'function') await renderTabelSKUMPTK();
                break;
            case 'view-usul-cuti':
                if (typeof renderTabelUsulCuti === 'function' && await renderTabelUsulCuti() === false) {
                    throw new Error('Daftar pegawai cuti gagal ditampilkan.');
                }
                if (typeof renderTabelRiwayatCuti === 'function' && await renderTabelRiwayatCuti(true) === false) {
                    throw new Error('Riwayat cuti gagal ditampilkan.');
                }
                break;
            case 'view-pengaturan':
                if (typeof loadPengaturan === 'function') await loadPengaturan();
                break;
            case 'view-profil-pegawai':
                if (typeof renderProfilPegawai === 'function') await renderProfilPegawai();
                break;
            case 'view-dashboard-pegawai':
                if (typeof renderDashboardPegawai === 'function') await renderDashboardPegawai();
                break;
            case 'view-pegawai-input':
                if (typeof loadInputDataPegawai === 'function') await loadInputDataPegawai();
                break;
            default:
                if (typeof initApp === 'function') await initApp();
                break;
        }

        // 3. Pastikan penyesuaian lebar kolom DataTables
        if (window.$ && $.fn && $.fn.dataTable) {
            requestAnimationFrame(() => {
                $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
            });
        }

        // 4. Toast Notifikasi Ringan
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            Toast.fire({
                icon: 'success',
                title: 'Data berhasil diperbarui!'
            });
        }
    } catch (err) {
        console.error('[Segarkan] Gagal menyegarkan data:', err);
    } finally {
        setTimeout(() => {
            refreshBtns.forEach(btn => {
                const icon = btn.querySelector('.fa-sync-alt, .fa-spin');
                if (icon) icon.classList.remove('fa-spin');
                btn.disabled = false;
            });
        }, 400);
    }
}
if (typeof window !== 'undefined') {
    window.segarkanHalamanAktif = segarkanHalamanAktif;
}
