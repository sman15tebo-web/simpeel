async function simpanPengaturan() {
    // 1. TAMPILKAN MODAL LOADING INSTAN (Detik ke-0 saat tombol diklik!)
    Swal.fire({
        title: 'Menyimpan Pengaturan...',
        text: 'Memproses data dan mengompresi logo Base64...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const existingData = window.cachedPengaturan || await dbManager.getPengaturan() || {};

        // 1. Proses Logo Instansi (Wajib Base64 murni PNG 250x250 transparan)
        const rawLogoInstansi = document.getElementById('previewLogoInstansi')?.src || '';
        let finalLogoInstansi = existingData.logoInstansi || '';
        if (rawLogoInstansi.startsWith('data:image/')) {
            finalLogoInstansi = (typeof convertImageToBase64 === 'function')
                ? await convertImageToBase64(rawLogoInstansi, 250, 'image/png')
                : rawLogoInstansi;
        } else if (rawLogoInstansi.startsWith('http') && !rawLogoInstansi.includes('logo-simpeel.png')) {
            // Jika berupa link Drive / Web, konversi ke Base64 agar offline mode bisa membaca
            const converted = (typeof convertImageToBase64 === 'function')
                ? await convertImageToBase64(rawLogoInstansi, 250, 'image/png')
                : '';
            if (converted) finalLogoInstansi = converted;
        } else if (rawLogoInstansi.includes('logo-simpeel.png') && (!existingData.logoInstansi || existingData.logoInstansi.includes('logo-simpeel.png'))) {
            finalLogoInstansi = '';
        }

        // 2. Proses Logo Sekolah (Wajib Base64 murni PNG 250x250 transparan)
        const rawLogoSekolah = document.getElementById('previewLogoSekolah')?.src || '';
        let finalLogoSekolah = existingData.logoSekolah || '';
        if (rawLogoSekolah.startsWith('data:image/')) {
            finalLogoSekolah = (typeof convertImageToBase64 === 'function')
                ? await convertImageToBase64(rawLogoSekolah, 250, 'image/png')
                : rawLogoSekolah;
        } else if (rawLogoSekolah.startsWith('http') && !rawLogoSekolah.includes('logo-simpeel.png')) {
            // Jika berupa link Drive / Web, konversi ke Base64 agar offline mode bisa membaca
            const converted = (typeof convertImageToBase64 === 'function')
                ? await convertImageToBase64(rawLogoSekolah, 250, 'image/png')
                : '';
            if (converted) finalLogoSekolah = converted;
        } else if (rawLogoSekolah.includes('logo-simpeel.png') && (!existingData.logoSekolah || existingData.logoSekolah.includes('logo-simpeel.png'))) {
            finalLogoSekolah = '';
        }

        const data = {
            ...existingData,
            instansi: document.getElementById('set_instansi')?.value || '',
            opd: document.getElementById('set_opd')?.value || '',
            sekolah: document.getElementById('set_sekolah')?.value || '',
            hp: document.getElementById('set_hp')?.value || '',
            alamat: (document.getElementById('set_alamat_text') || document.getElementById('set_alamat'))?.value || '',
            email: document.getElementById('set_email')?.value || '',
            web: document.getElementById('set_web')?.value || '',
            kepsekNama: document.getElementById('set_kepsek_nama')?.value || '',
            kepsekNip: document.getElementById('set_kepsek_nip')?.value || '',
            bendaharaNama: document.getElementById('set_bendahara_nama')?.value || '',
            bendaharaNip: document.getElementById('set_bendahara_nip')?.value || '',
            logoInstansi: finalLogoInstansi,
            logoSekolah: finalLogoSekolah,
            updatedAt: new Date().toISOString()
        };

        // Bersihkan key kotor/error agar tidak tersimpan ke database/spreadsheet
        delete data.success;
        delete data.message;
        delete data.error;
        delete data.data;
        delete data.apiKey;
        delete data.action;

        window.cachedPengaturan = data;
        await dbManager.savePengaturan(data);
        await loadPengaturan();
        Swal.fire('Berhasil!', 'Pengaturan dan Logo (Base64) berhasil disimpan!', 'success');
    } catch (err) {
        console.error('Error simpan pengaturan:', err);
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan pengaturan: ' + (err.message || err), 'error');
    }
}

async function simpanTemaBackground() {
    // TAMPILKAN MODAL LOADING INSTAN
    Swal.fire({
        title: 'Menyimpan Tema...',
        text: 'Memproses tema dan gambar latar belakang...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const existingData = window.cachedPengaturan || await dbManager.getPengaturan() || {};
        const bgImg = document.getElementById('previewBgLanding')?.src || '';
        let bgToSave = '';

        if (bgImg && !bgImg.includes('logo-simpeel.png')) {
            if (bgImg.startsWith('data:image/')) {
                bgToSave = (typeof convertImageToBase64 === 'function')
                    ? await convertImageToBase64(bgImg, 800, 'image/jpeg')
                    : bgImg;
            } else if (bgImg.startsWith('http')) {
                bgToSave = (typeof convertImageToBase64 === 'function')
                    ? await convertImageToBase64(bgImg, 800, 'image/jpeg')
                    : '';
            }
        }

        const data = {
            ...existingData,
            warnaTema: document.getElementById('set_warna_tema').value,
            warnaTema2: document.getElementById('set_warna_tema2').value,
            warnaTema3: document.getElementById('set_warna_tema3').value,
            bgLanding: bgToSave,
            updatedAt: new Date().toISOString()
        };

        window.cachedPengaturan = data;
        await dbManager.savePengaturan(data);
        applyTheme(data.warnaTema, data.bgLanding, data.warnaTema2, data.warnaTema3);
        Swal.fire('Berhasil!', 'Tema dan Background berhasil disimpan!', 'success');
    } catch (err) {
        console.error('Error simpan tema:', err);
        Swal.fire('Gagal', 'Terjadi kesalahan saat menyimpan tema: ' + (err.message || err), 'error');
    }
}

function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function applyTheme(warnaTema, bgLanding, warnaTema2, warnaTema3) {
    if (warnaTema) {
        document.documentElement.style.setProperty('--primary', warnaTema);
        document.documentElement.style.setProperty('--primary-dark', adjustColor(warnaTema, -40));
    }
    if (warnaTema2) {
        document.documentElement.style.setProperty('--primary2', warnaTema2);
    } else if (warnaTema) {
        document.documentElement.style.setProperty('--primary2', adjustColor(warnaTema, -20));
    }
    if (warnaTema3) {
        document.documentElement.style.setProperty('--primary3', warnaTema3);
    } else if (warnaTema) {
        document.documentElement.style.setProperty('--primary3', adjustColor(warnaTema, -40));
    }

    const landingBackground = bgLanding && bgLanding.startsWith('data:')
        ? `url("${bgLanding}")`
        : 'var(--gradient-primary)';
    document.documentElement.style.setProperty('--landing-background', landingBackground);
    const landingView = document.getElementById('spa-landing-view');
    if (landingView) landingView.style.background = 'transparent';
}

async function simpanKeamanan() {
    const data = {
        username: document.getElementById('set_username').value,
        password: document.getElementById('set_password').value
    };
    if (API_URL) {
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const res = await apiCall('saveConfig', data);
        if (res && res.success) {
            Swal.fire('Berhasil!', 'Data keamanan tersimpan di Server!', 'success');
        } else {
            Swal.fire('Gagal!', 'Gagal menyimpan keamanan', 'error');
        }
    } else {
        Swal.fire('Offline', 'Anda tidak terhubung ke API', 'warning');
    }
}

function togglePasswordVisibility() {
    const p = document.getElementById('set_password');
    p.type = (p.type === 'password') ? 'text' : 'password';
}

function applyPengaturanToDOM(data) {
    if (!data || typeof data !== 'object') return;
    window.cachedPengaturan = data;

    const instansi = data.instansi || data.namaInstansi || '';
    if (instansi) {
        const el = document.getElementById('set_instansi');
        if (el) el.value = instansi;
        const txtInstansi = document.getElementById('textInstansi');
        if (txtInstansi) txtInstansi.innerText = instansi;
    }

    const opd = data.opd || data.namaOpd || data.dinas || '';
    if (opd) {
        const el = document.getElementById('set_opd');
        if (el) el.value = opd;
    }

    const sekolah = data.sekolah || data.namaSekolah || '';
    if (sekolah) {
        const el = document.getElementById('set_sekolah');
        if (el) el.value = sekolah;
        const txtSekolah = document.getElementById('textSekolah');
        if (txtSekolah) txtSekolah.innerText = sekolah;
        const sideNama = document.getElementById('sidebar-sekolah-nama');
        if (sideNama) sideNama.innerText = sekolah;
        const mobTopNama = document.getElementById('mobile-top-sekolah-nama');
        if (mobTopNama) mobTopNama.innerText = sekolah;
    }

    const hp = data.hp || data.telepon || data.noHp || '';
    if (hp) {
        const el = document.getElementById('set_hp');
        if (el) el.value = hp;
    }

    const alamat = data.alamat || data.alamatSekolah || '';
    if (alamat) {
        const el = document.getElementById('set_alamat_text') || document.getElementById('set_alamat');
        if (el) el.value = alamat;
    }

    const email = data.email || '';
    if (email) {
        const el = document.getElementById('set_email');
        if (el) el.value = email;
    }

    const web = data.web || data.website || '';
    if (web) {
        const el = document.getElementById('set_web');
        if (el) el.value = web;
    }

    const kepsekNama = data.kepsekNama || data.kepalaSekolah || data.namaKepsek || '';
    if (kepsekNama) {
        const el = document.getElementById('set_kepsek_nama');
        if (el) el.value = kepsekNama;
    }

    const kepsekNip = data.kepsekNip || data.nipKepsek || data.nipKepalaSekolah || '';
    if (kepsekNip) {
        const el = document.getElementById('set_kepsek_nip');
        if (el) el.value = kepsekNip;
    }

    const bendaharaNama = data.bendaharaNama || data.namaBendahara || '';
    if (bendaharaNama) {
        const el = document.getElementById('set_bendahara_nama');
        if (el) el.value = bendaharaNama;
    }

    const bendaharaNip = data.bendaharaNip || data.nipBendahara || '';
    if (bendaharaNip) {
        const el = document.getElementById('set_bendahara_nip');
        if (el) el.value = bendaharaNip;
    }

    // Tampilkan Logo Instansi
    const defLogo = 'logo-simpeel.png';
    const logoInstansi = data.logoInstansi || '';
    const isInstansiValid = logoInstansi && (logoInstansi.startsWith('data:') || logoInstansi.startsWith('http'));
    const finalInstLogo = isInstansiValid ? logoInstansi : defLogo;
    const prevInst = document.getElementById('previewLogoInstansi');
    if (prevInst) prevInst.src = finalInstLogo;
    const imgInst = document.getElementById('imgInstansi');
    if (imgInst) imgInst.src = finalInstLogo;

    // Tampilkan Logo Sekolah
    const logoSekolah = data.logoSekolah || '';
    const isSekolahValid = logoSekolah && (logoSekolah.startsWith('data:') || logoSekolah.startsWith('http'));
    const finalSekLogo = isSekolahValid ? logoSekolah : defLogo;
    const prevSek = document.getElementById('previewLogoSekolah');
    if (prevSek) prevSek.src = finalSekLogo;
    const imgSek = document.getElementById('imgSekolah');
    if (imgSek) imgSek.src = finalSekLogo;
    const sideLogo = document.getElementById('sidebar-sekolah-logo');
    if (sideLogo) sideLogo.src = finalSekLogo;
    const mobTopLogo = document.getElementById('mobile-top-sekolah-logo');
    if (mobTopLogo) mobTopLogo.src = finalSekLogo;

    if (data.warnaTema) {
        const el = document.getElementById('set_warna_tema');
        if (el) el.value = data.warnaTema;
    }
    if (data.bgLanding && (data.bgLanding.startsWith('data:') || data.bgLanding.startsWith('http'))) {
        const prevBg = document.getElementById('previewBgLanding');
        if (prevBg) prevBg.src = data.bgLanding;
    }

    if (typeof applyTheme === 'function') {
        applyTheme(data.warnaTema, data.bgLanding, data.warnaTema2, data.warnaTema3);
    }
}

async function loadPengaturan() {
    // 1. Terapkan seketika dari cache jika ada (0 ms render)
    const cached = localStorage.getItem('SIMPEEL_SETTINGS_CACHE');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
                applyPengaturanToDOM(parsed);
            }
        } catch(e) {}
    }

    // 2. Ambil data terbaru dari Server/DB (force refresh live untuk halaman pengaturan agar data spreadsheet selalu tampil)
    let data = null;
    try {
        data = await dbManager.getPengaturan(false);
    } catch(err) {
        data = await dbManager.getPengaturan(true);
    }
    if (data && typeof data === 'object') {
        applyPengaturanToDOM(data);
    }

    // Auto-convert link web/Drive legacy ke Base64 secara senyap jika online
    if (data.logoInstansi && data.logoInstansi.startsWith('http') && !data.logoInstansi.includes('logo-simpeel.png') && typeof convertImageToBase64 === 'function') {
        convertImageToBase64(data.logoInstansi, 250, 'image/png').then(b64 => {
            if (b64 && b64.startsWith('data:')) {
                dbManager.savePengaturan({ ...data, logoInstansi: b64, updatedAt: new Date().toISOString() });
            }
        }).catch(() => {});
    }
    if (data.logoSekolah && data.logoSekolah.startsWith('http') && !data.logoSekolah.includes('logo-simpeel.png') && typeof convertImageToBase64 === 'function') {
        convertImageToBase64(data.logoSekolah, 250, 'image/png').then(b64 => {
            if (b64 && b64.startsWith('data:')) {
                dbManager.savePengaturan({ ...data, logoSekolah: b64, updatedAt: new Date().toISOString() });
            }
        }).catch(() => {});
    }

    // Isi Standar Sync URL bawaan secara instan dari cache / pengaturan / APP_CONFIG
    const defUrlEl = document.getElementById('defaultSyncUrlReadonly');
    const immediateSyncUrl = (window.APP_CONFIG && (window.APP_CONFIG.defaultSyncUrl || window.APP_CONFIG.OFFLINE_EXEC_LINK || window.APP_CONFIG.syncUrl)) || data.syncUrl || data.gasUrl || data.linkExec || '';
    if (defUrlEl && immediateSyncUrl) {
        defUrlEl.value = immediateSyncUrl;
    }

    if (API_URL) {
        apiCall('getConfig').then(config => {
            if (config) {
                const u = config.username || config.OFFLINE_ADMIN_USER || (config.admin && config.admin.username);
                const p = config.password || config.OFFLINE_ADMIN_PASS || (config.admin && config.admin.password);
                if (u) {
                    const uEl = document.getElementById('set_username');
                    if (uEl) uEl.value = u;
                }
                if (p) {
                    const pEl = document.getElementById('set_password');
                    if (pEl) pEl.value = p;
                }
                const syncUrl = config.defaultSyncUrl || config.OFFLINE_EXEC_LINK || config.syncUrl || config.gasUrl || config.linkExec || immediateSyncUrl;
                if (defUrlEl && syncUrl) {
                    defUrlEl.value = syncUrl;
                }
            }
        }).catch(() => {});
    }
}
