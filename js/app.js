
// ==========================================
// 🚀 VIEW LOADER & INITIALIZATION
// ==========================================
async function loadViews() {
    const includes = Array.from(document.querySelectorAll('[data-include]'));
    
    // Muat semua view secara paralel agar landing page dan seluruh UI terbuka secepat kilat
    await Promise.all(includes.map(async (el) => {
        const file = el.getAttribute('data-include');
        let html = '';
        try {
            if (typeof isElectron !== 'undefined' && isElectron) {
                const fs = window.require ? window.require('fs') : require('fs');
                const path = window.require ? window.require('path') : require('path');
                const res = await fetch(file);
                if (res.ok) {
                    html = await res.text();
                } else {
                    const absPath = path.join(process.cwd(), 'src', file);
                    html = fs.readFileSync(absPath, 'utf8');
                }
            } else {
                const res = await fetch(file);
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

// Modify window.onload to load views before initApp
window.addEventListener('DOMContentLoaded', async () => {
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
        if (e.ctrlKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                const current = parseFloat(document.body.style.zoom || 1);
                document.body.style.zoom = Math.min(current + 0.1, 2.5).toFixed(1);
            } else if (e.key === '-') {
                e.preventDefault();
                const current = parseFloat(document.body.style.zoom || 1);
                document.body.style.zoom = Math.max(current - 0.1, 0.5).toFixed(1);
            } else if (e.key === '0') {
                e.preventDefault();
                document.body.style.zoom = '1';
            }
        }
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
                const result = await apiCall('login', { username: user, password: pass });

                if (result && result.success) {
                    // Simpan sesi termasuk role dan nip jika login sebagai pegawai
                    const resData = result.data || result;
                    const sessionData = {
                        displayName: resData.nama || user,
                        role: resData.role || 'admin',
                        nip: resData.nip || null
                    };
                    localStorage.setItem(TOKEN_KEY, JSON.stringify(sessionData));
                    document.getElementById('inputUsername').value = '';
                    document.getElementById('inputPassword').value = '';
                    Swal.close();
                    checkSSOSession();
                } else {
                    Swal.fire('Gagal!', result ? (result.message || 'Username atau Password salah!') : 'Gagal terhubung ke API Server', 'error');
                }
            } else {
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
        if (wrapper) wrapper.classList.add('d-none');
        if (loginView) loginView.classList.add('d-none');
        if (landingView) landingView.classList.remove('d-none');
        return;
    }

    try {
        const data = JSON.parse(ssoToken);
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

            if (syncBtnParent) syncBtnParent.classList.remove('d-none');
            document.querySelectorAll('[data-admin-only]').forEach(el => el.classList.remove('d-none'));
            setTimeout(() => nav('dashboard'), 200);
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

function nav(page) {
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
        const activeTab = dataIndukTabs?.querySelector('.nav-link.active');
        if (activeTab?.getAttribute('data-bs-target') === '#di-pegawai') renderTabelPNS();
        else renderTabelAkun();
    }
    if (page === 'status-pegawai') {
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
    }

    // OLD (backward compat)
    if (page === 'pegawai') renderTabelPNS();
    if (page === 'duk') renderTabelDUK();
    if (page === 'gaji') renderTabelKGB();
    if (page === 'rekap') renderTabelRekap();
    if (page === 'riwayat') renderTabelRiwayat();
    if (page === 'pensiun') renderTabelPensiun();
    if (page === 'guru-sertif') renderTabelGuruSertif();
    if (page === 'akun') renderTabelAkun();
    if (page === 'profil-pegawai') { if(typeof renderProfilPegawai === 'function') renderProfilPegawai(); }
    if (page === 'pegawai-input') { if(typeof loadInputDataPegawai === 'function') loadInputDataPegawai(); }
    if (page === 'dashboard-pegawai') { if(typeof renderDashboardPegawai === 'function') renderDashboardPegawai(); }
    if (page === 'update-data') { if(typeof bukaFormUpdateData === 'function') bukaFormUpdateData(); }
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
        localStorage.removeItem(TOKEN_KEY);
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

    const allPegawai = await dbManager.getAllPegawai();
    let pns = 0, pppk = 0, pppkpw = 0, honorer = 0;

    allPegawai.forEach(p => {
        if (p.statusKepegawaian !== 'Aktif') return;
        if (p.statusPegawai === 'PNS') pns++;
        else if (p.statusPegawai === 'PPPK') pppk++;
        else if (p.statusPegawai === 'PPPK Paruh Waktu') pppkpw++;
        else if (p.statusPegawai === 'Honorer') honorer++;
    });

    const elPns = document.getElementById('count-pns');
    const elPppk = document.getElementById('count-pppk');
    const elPppkpw = document.getElementById('count-pppkpw');
    const elHonorer = document.getElementById('count-honorer');

    if (elPns) elPns.innerText = pns;
    if (elPppk) elPppk.innerText = pppk;
    if (elPppkpw) elPppkpw.innerText = pppkpw;
    if (elHonorer) elHonorer.innerText = honorer;

    const ctx = document.getElementById('pegawaiChart');
    if (ctx) {
        if (window.myPieChart) window.myPieChart.destroy();
        window.myPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['PNS', 'PPPK', 'PPPK PW', 'Honorer'],
                datasets: [{
                    data: [pns, pppk, pppkpw, honorer],
                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'],
                    hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf', '#dda20a'],
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
            if (p.statusKepegawaian === 'Aktif' && p.tmtKgbBaru) {
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
