async function simpanPengaturan() {
    const existingData = await dbManager.getPengaturan();
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
        logoInstansi: document.getElementById('previewLogoInstansi').src,
        logoSekolah: document.getElementById('previewLogoSekolah').src,
        updatedAt: new Date().toISOString()
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    await dbManager.savePengaturan(data);
    loadPengaturan();
    Swal.fire('Berhasil!', 'Pengaturan berhasil disimpan ke Server!', 'success');
}

async function simpanTemaBackground() {
    const existingData = await dbManager.getPengaturan();
    const bgImg = document.getElementById('previewBgLanding').src;
    const bgToSave = bgImg.includes('logo-simpeel.png') ? '' : bgImg;

    const data = {
        ...existingData,
        warnaTema: document.getElementById('set_warna_tema').value,
        warnaTema2: document.getElementById('set_warna_tema2').value,
        warnaTema3: document.getElementById('set_warna_tema3').value,
        bgLanding: bgToSave,
        updatedAt: new Date().toISOString()
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    await dbManager.savePengaturan(data);
    applyTheme(data.warnaTema, data.bgLanding, data.warnaTema2, data.warnaTema3);
    Swal.fire('Berhasil!', 'Tema dan Background berhasil disimpan ke Server!', 'success');
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
    const data = await dbManager.getPengaturan();
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
    if (data.logoInstansi && data.logoInstansi.startsWith('data:')) {
        document.getElementById('previewLogoInstansi').src = data.logoInstansi;
        const imgInst = document.getElementById('imgInstansi');
        if (imgInst) imgInst.src = data.logoInstansi;
    }
    if (data.logoSekolah && data.logoSekolah.startsWith('data:')) {
        document.getElementById('previewLogoSekolah').src = data.logoSekolah;
        const imgSek = document.getElementById('imgSekolah');
        if (imgSek) imgSek.src = data.logoSekolah;
        const sideLogo = document.getElementById('sidebar-sekolah-logo');
        if (sideLogo) sideLogo.src = data.logoSekolah;
        const mobTopLogo = document.getElementById('mobile-top-sekolah-logo');
        if (mobTopLogo) mobTopLogo.src = data.logoSekolah;
    }

    if (data.warnaTema) document.getElementById('set_warna_tema').value = data.warnaTema;
    if (data.bgLanding && data.bgLanding.startsWith('data:')) document.getElementById('previewBgLanding').src = data.bgLanding;

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
