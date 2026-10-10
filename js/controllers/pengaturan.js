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
            instansi: document.getElementById('set_instansi').value,
            opd: document.getElementById('set_opd').value,
            sekolah: document.getElementById('set_sekolah').value,
            hp: document.getElementById('set_hp').value,
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

async function loadPengaturan() {
    const data = await dbManager.getPengaturan() || {};
    window.cachedPengaturan = data;
    if (data.instansi) {
        document.getElementById('set_instansi').value = data.instansi;
        const txtInstansi = document.getElementById('textInstansi');
        if (txtInstansi) txtInstansi.innerText = data.instansi;
    }
    if (data.opd) document.getElementById('set_opd').value = data.opd;
    if (data.sekolah) {
        document.getElementById('set_sekolah').value = data.sekolah;
        const txtSekolah = document.getElementById('textSekolah');
        if (txtSekolah) txtSekolah.innerText = data.sekolah;
        const sideNama = document.getElementById('sidebar-sekolah-nama');
        if (sideNama) sideNama.innerText = data.sekolah;
        const mobTopNama = document.getElementById('mobile-top-sekolah-nama');
        if (mobTopNama) mobTopNama.innerText = data.sekolah;
    }
    if (data.hp) document.getElementById('set_hp').value = data.hp;
    if (data.alamat) {
        const el = document.getElementById('set_alamat_text') || document.getElementById('set_alamat');
        if (el) el.value = data.alamat;
    }
    if (data.email && document.getElementById('set_email')) document.getElementById('set_email').value = data.email;
    if (data.web && document.getElementById('set_web')) document.getElementById('set_web').value = data.web;
    if (data.kepsekNama && document.getElementById('set_kepsek_nama')) document.getElementById('set_kepsek_nama').value = data.kepsekNama;
    if (data.kepsekNip && document.getElementById('set_kepsek_nip')) document.getElementById('set_kepsek_nip').value = data.kepsekNip;
    if (data.bendaharaNama && document.getElementById('set_bendahara_nama')) document.getElementById('set_bendahara_nama').value = data.bendaharaNama;
    if (data.bendaharaNip && document.getElementById('set_bendahara_nip')) document.getElementById('set_bendahara_nip').value = data.bendaharaNip;
    if (data.email) document.getElementById('set_email').value = data.email;
    if (data.web) document.getElementById('set_web').value = data.web;
    // Tampilkan Logo Instansi
    const defLogo = 'logo-simpeel.png';
    const isInstansiValid = data.logoInstansi && (data.logoInstansi.startsWith('data:') || data.logoInstansi.startsWith('http'));
    const finalInstLogo = isInstansiValid ? data.logoInstansi : defLogo;
    const prevInst = document.getElementById('previewLogoInstansi');
    if (prevInst) prevInst.src = finalInstLogo;
    const imgInst = document.getElementById('imgInstansi');
    if (imgInst) imgInst.src = finalInstLogo;

    // Tampilkan Logo Sekolah
    const isSekolahValid = data.logoSekolah && (data.logoSekolah.startsWith('data:') || data.logoSekolah.startsWith('http'));
    const finalSekLogo = isSekolahValid ? data.logoSekolah : defLogo;
    const prevSek = document.getElementById('previewLogoSekolah');
    if (prevSek) prevSek.src = finalSekLogo;
    const imgSek = document.getElementById('imgSekolah');
    if (imgSek) imgSek.src = finalSekLogo;
    const sideLogo = document.getElementById('sidebar-sekolah-logo');
    if (sideLogo) sideLogo.src = finalSekLogo;
    const mobTopLogo = document.getElementById('mobile-top-sekolah-logo');
    if (mobTopLogo) mobTopLogo.src = finalSekLogo;

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

    if (data.warnaTema) document.getElementById('set_warna_tema').value = data.warnaTema;
    if (data.bgLanding && (data.bgLanding.startsWith('data:') || data.bgLanding.startsWith('http'))) {
        const prevBg = document.getElementById('previewBgLanding');
        if (prevBg) prevBg.src = data.bgLanding;
    }

    applyTheme(data.warnaTema, data.bgLanding, data.warnaTema2, data.warnaTema3);

    if (API_URL) {
        const config = await apiCall('getConfig');
        if (config && config.username) {
            document.getElementById('set_username').value = config.username;
            document.getElementById('set_password').value = config.password;
        }
        if (config && config.defaultSyncUrl) {
            const defUrlEl = document.getElementById('defaultSyncUrlReadonly');
            if (defUrlEl) defUrlEl.value = config.defaultSyncUrl;
        }
    }
}
