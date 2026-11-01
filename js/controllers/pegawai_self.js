/**
 * Toggle visibility password field dengan ikon mata
 */
window.togglePassVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
};

/**
 * Render halaman Profil Saya - isi nama dan NIP dari session
 */
window.renderProfilPegawai = async function() {
    try {
        const ssoToken = localStorage.getItem(TOKEN_KEY);
        if (!ssoToken) return;
        const session = JSON.parse(ssoToken);
        const nama = session.displayName || '-';
        const nip = session.nip || session.username || '-';

        const elNama = document.getElementById('profil-nama');
        const elNip = document.getElementById('profil-nip');
        const elDisplay = document.getElementById('profil-nama-display');

        if (elNama) elNama.value = nama;
        if (elNip) elNip.value = nip;
        if (elDisplay) elDisplay.textContent = nama;

        // Tampilkan foto profil wajah di frame bulat
        const imgEl = document.getElementById('profil-foto-img');
        const iconEl = document.getElementById('profil-foto-icon');

        if (typeof dbManager !== 'undefined' && nip && nip !== '-') {
            const allPegawai = await dbManager.getAllPegawai();
            const pegawai = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;

            const resolvedFoto = typeof setSimpeelImageAsset === 'function'
                ? await setSimpeelImageAsset(imgEl, pegawai?.foto, '')
                : (typeof resolveImageAssetSrc === 'function' ? resolveImageAssetSrc(pegawai?.foto, '') : (pegawai?.foto || ''));
            if (resolvedFoto && !resolvedFoto.includes('placeholder.com') && !resolvedFoto.includes('logo-simpeel.png')) {
                if (imgEl) {
                    imgEl.classList.remove('d-none');
                }
                if (iconEl) iconEl.classList.add('d-none');

                const topImg = document.getElementById('topAvatarImg');
                const topIcon = document.getElementById('topAvatarIcon');
                if (topImg) {
                    if (typeof setSimpeelImageAsset === 'function') await setSimpeelImageAsset(topImg, pegawai?.foto, '');
                    else topImg.src = resolvedFoto;
                    topImg.classList.remove('d-none');
                }
                if (topIcon) topIcon.classList.add('d-none');
            } else {
                if (imgEl) {
                    imgEl.src = '';
                    imgEl.classList.add('d-none');
                }
                if (iconEl) iconEl.classList.remove('d-none');
            }
        }

        // Clear password fields
        const elPass = document.getElementById('profil-password-baru');
        const elKonfirm = document.getElementById('profil-password-konfirm');
        if (elPass) elPass.value = '';
        if (elKonfirm) elKonfirm.value = '';
    } catch(e) { console.error('renderProfilPegawai error', e); }
};

/**
 * Simpan password baru dari halaman Profil Saya
 */
window.simpanUbahPassword = async function() {
    const passBaru = document.getElementById('profil-password-baru').value.trim();
    const passKonfirm = document.getElementById('profil-password-konfirm').value.trim();

    if (!passBaru) return Swal.fire('Peringatan', 'Password baru tidak boleh kosong!', 'warning');
    if (passBaru !== passKonfirm) return Swal.fire('Peringatan', 'Password baru dan konfirmasi tidak cocok!', 'warning');
    if (passBaru.length < 6) return Swal.fire('Peringatan', 'Password minimal 6 karakter!', 'warning');

    try {
        const ssoToken = localStorage.getItem(TOKEN_KEY);
        if (!ssoToken) return;
        const session = JSON.parse(ssoToken);
        const nip = session.nip;
        if (!nip) return Swal.fire('Error', 'Sesi tidak valid, silakan login ulang.', 'error');

        // Ambil data akun yang ada
        const allAkun = await apiCall('getAllAkun');
        const akun = allAkun ? allAkun.find(a => String(a.nip) === String(nip)) : null;
        if (!akun) return Swal.fire('Error', 'Data akun tidak ditemukan!', 'error');

        // Simpan dengan password baru (akan di-hash oleh main.js)
        const dataUpdate = { ...akun, password: passBaru, updatedAt: new Date().toISOString() };
        const res = await apiCall('saveAkun', dataUpdate);

        if (res && res.success) {
            Swal.fire('Berhasil!', 'Password berhasil diubah.', 'success');
            document.getElementById('profil-password-baru').value = '';
            document.getElementById('profil-password-konfirm').value = '';
        } else {
            Swal.fire('Gagal', (res && res.message) ? res.message : 'Gagal mengubah password.', 'error');
        }
    } catch(e) {
        Swal.fire('Error', e.message, 'error');
    }
};

/**
 * Load data pegawai ke dalam form Input Data Saya (dialihkan ke form Update Data terpadu)
 */
window.loadInputDataPegawai = async function() {
    if (typeof bukaFormUpdateData === 'function') {
        bukaFormUpdateData();
    }
};

/**
 * Simpan data pegawai yang diisi oleh diri sendiri (self-edit)
 */
window.simpanDataPegawaiSelf = async function() {
    const container = document.getElementById('pegawai-input-container');
    const nip = container ? container.dataset.nip : null;
    if (!nip) return Swal.fire('Error', 'Data NIP tidak ditemukan. Refresh halaman.', 'error');

    const allPegawai = await apiCall('getAllPegawai');
    const pegawaiAsli = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;
    if (!pegawaiAsli) return Swal.fire('Error', 'Data pegawai tidak ditemukan!', 'error');

    // Cek apakah dikunci
    const isLocked = pegawaiAsli.isLocked === true || pegawaiAsli.isLocked === 'true' || pegawaiAsli.kunciData === true || pegawaiAsli.kunciData === 1 || String(pegawaiAsli.kunciData) === '1';
    if (isLocked) {
        return Swal.fire('Terkunci', 'Data Anda dikunci oleh Admin. Tidak dapat menyimpan.', 'warning');
    }

    const getValue = (id) => { const el = document.getElementById(id); return el ? el.value : (pegawaiAsli[id.replace('self-','')] || ''); };

    const jkVal = getValue('self-jenisKelamin');
    const nikahVal = getValue('self-statusNikah');
    const pasanganVal = getValue('self-namaPasangan');

    const dataUpdate = {
        ...pegawaiAsli,
        nama: getValue('self-nama'),
        nik: getValue('self-nik'),
        tempatLahir: getValue('self-tempatLahir'),
        tglLahir: getValue('self-tglLahir'),
        jenisKelamin: jkVal,
        kelamin: jkVal,
        agama: getValue('self-agama'),
        noHp: getValue('self-noHp'),
        alamat: getValue('self-alamat'),
        pendidikan: getValue('self-pendidikan'),
        jurusan: getValue('self-jurusan'),
        namaSekolah: getValue('self-namaSekolah'),
        tahunLulus: getValue('self-tahunLulus'),
        namaIbu: getValue('self-namaIbu'),
        statusNikah: nikahVal,
        statusKawin: nikahVal,
        namaPasangan: pasanganVal,
        pasanganNama: pasanganVal,
        npwp: getValue('self-npwp'),
        bpjsKes: getValue('self-bpjsKes'),
        bpjsTK: getValue('self-bpjsTK'),
        updatedAt: new Date().toISOString()
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const res = await apiCall('savePegawai', dataUpdate);
    if (res && res.success) {
        await dbManager.forceFetchFromServer();
        Swal.fire('Berhasil!', 'Data Anda berhasil disimpan.', 'success');
    } else {
        Swal.fire('Gagal', (res && res.message) || 'Gagal menyimpan data.', 'error');
    }
};

window.bukaInputDataSendiri = async function() {
    if (typeof bukaFormUpdateData === 'function') {
        bukaFormUpdateData();
    }
};


async function exportAllToExcel(type) {
    if (typeof dbManager === 'undefined') {
        Swal.fire('Error', 'Sistem belum siap', 'error');
        return;
    }

    try {
        const allPegawai = await dbManager.getAllPegawai();
        if (!allPegawai || allPegawai.length === 0) {
            Swal.fire('Info', 'Tidak ada data pegawai.', 'info');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        let fileName = "";
        let sheetsConfig = [];

        if (type === 'Aktif') {
            fileName = "Data_Pegawai_Aktif";
            sheetsConfig = [
                { name: 'PNS', statusFilter: 'Aktif', statusPegawai: 'PNS' },
                { name: 'PPPK', statusFilter: 'Aktif', statusPegawai: 'PPPK' },
                { name: 'PPPK Paruh Waktu', statusFilter: 'Aktif', statusPegawai: 'PPPK Paruh Waktu' },
                { name: 'Honorer', statusFilter: 'Aktif', statusPegawai: 'Honorer' }
            ];
        } else if (type === 'NonAktif') {
            fileName = "Data_Pegawai_Non_Aktif";
            sheetsConfig = [
                { name: 'Pensiun', statusFilter: 'Pensiun', statusPegawai: null },
                { name: 'Mutasi', statusFilter: 'Mutasi', statusPegawai: null },
                { name: 'Meninggal', statusFilter: 'Meninggal', statusPegawai: null },
                { name: 'Berhenti', statusFilter: 'Berhenti', statusPegawai: null }
            ];
        }

        const getPendidikanRow = (p) => {
            if (p.riwayatPendidikan && p.riwayatPendidikan.length > 0) {
                return p.riwayatPendidikan[0][0];
            }
            return p.pendidikan || '-';
        };

        const getMk = (p) => {
            let mk = '-';
            if (p.riwayatPangkat && p.riwayatPangkat.length > 0) {
                const lp = p.riwayatPangkat[0];
                if (lp && lp.length >= 7) mk = `${lp[5]} Thn ${lp[6]} Bln`;
            }
            if (mk === '-' && p.riwayatKGB && p.riwayatKGB.length > 0) {
                const lk = p.riwayatKGB[0];
                if (lk && lk.length >= 6) mk = `${lk[4]} Thn ${lk[5]} Bln`;
            }
            return mk;
        };

        const instansiName = document.getElementById('textSekolah')?.innerText || "INSTANSI / SEKOLAH";
        const currentYear = new Date().getFullYear();

        sheetsConfig.forEach(config => {
            let filtered = [];
            if (type === 'Aktif') {
                filtered = allPegawai.filter(p => p.statusKepegawaian === 'Aktif' && p.statusPegawai === config.statusPegawai);
            } else {
                filtered = allPegawai.filter(p => p.statusKepegawaian === config.statusFilter);
            }

            const worksheet = workbook.addWorksheet(config.name);
            
            let headers = [];
            if (type === 'Aktif') {
                headers = ['No.', 'Nama', 'NIP', 'Golongan', 'Jabatan', 'Pendidikan', 'Status Pegawai', 'Tempat Tanggal Lahir', 'Jenis Kelamin', 'Masa Kerja'];
            } else {
                if (config.name === 'Pensiun') {
                    headers = ['No.', 'NIP', 'Nama', 'Status', 'TMT Pensiun', 'Jabatan Terakhir', 'Pendidikan', 'Masa Kerja'];
                } else if (config.name === 'Mutasi') {
                    headers = ['No.', 'NIP', 'Nama', 'Status', 'TMT Mutasi', 'Keterangan Mutasi', 'Jabatan Terakhir', 'Pendidikan'];
                } else if (config.name === 'Meninggal') {
                    headers = ['No.', 'NIP', 'Nama', 'Status', 'Jabatan Terakhir', 'Tanggal Meninggal', 'Pendidikan'];
                } else if (config.name === 'Berhenti') {
                    headers = ['No.', 'NIP', 'Nama', 'Status', 'Tanggal Berhenti', 'Alasan Berhenti', 'Jabatan Terakhir', 'Pendidikan'];
                }
            }

            const totalCols = headers.length;
            const lastColLetter = typeof getExcelColumnName === 'function' ? getExcelColumnName(totalCols) : 'Z';

            worksheet.mergeCells(`A1:${lastColLetter}1`);
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `${fileName.toUpperCase().replace(/_/g, ' ')} - ${config.name.toUpperCase()}`;
            titleCell.font = { name: 'Arial', size: 14, bold: true };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            worksheet.mergeCells(`A2:${lastColLetter}2`);
            const schoolCell = worksheet.getCell('A2');
            schoolCell.value = instansiName;
            schoolCell.font = { name: 'Arial', size: 12, bold: true };
            schoolCell.alignment = { vertical: 'middle', horizontal: 'center' };

            worksheet.mergeCells(`A3:${lastColLetter}3`);
            const yearCell = worksheet.getCell('A3');
            yearCell.value = `TAHUN ${currentYear}`;
            yearCell.font = { name: 'Arial', size: 12, bold: true };
            yearCell.alignment = { vertical: 'middle', horizontal: 'center' };

            const headerRow = worksheet.getRow(5);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            let urut = 1;
            filtered.forEach(p => {
                let rowData = [];
                if (type === 'Aktif') {
                    const ttl = (p.tempatLahir || '') + (p.tempatLahir && p.tglLahir ? ', ' : '') + (p.tglLahir || '-');
                    rowData = [
                        urut++, p.nama, p.nip, p.golongan || '-', p.jabatan || '-', getPendidikanRow(p), p.statusPegawai || '-', ttl, p.kelamin || '-', getMk(p)
                    ];
                } else {
                    if (config.name === 'Pensiun') {
                        rowData = [urut++, p.nip, p.nama, p.statusPegawai || '-', p.tmtPensiun || '-', p.jabatan || '-', getPendidikanRow(p), getMk(p)];
                    } else if (config.name === 'Mutasi') {
                        rowData = [urut++, p.nip, p.nama, p.statusPegawai || '-', p.tmtMutasi || '-', p.mutasiKe || p.keteranganMutasi || '-', p.jabatan || '-', getPendidikanRow(p)];
                    } else if (config.name === 'Meninggal') {
                        rowData = [urut++, p.nip, p.nama, p.statusPegawai || '-', p.jabatan || '-', p.tglMeninggal || p.tanggalMeninggal || '-', getPendidikanRow(p)];
                    } else if (config.name === 'Berhenti') {
                        rowData = [urut++, p.nip, p.nama, p.statusPegawai || '-', p.tanggalBerhenti || '-', p.alasanBerhenti || p.keteranganBerhenti || '-', p.jabatan || '-', getPendidikanRow(p)];
                    }
                }
                const newRow = worksheet.addRow(rowData);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                });
            });

            worksheet.columns.forEach((column, i) => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    if (rowNumber >= 5) {
                        const val = cell.value ? cell.value.toString() : '';
                        const lines = val.split('\n');
                        lines.forEach(line => {
                            if (line.length > maxLength) {
                                maxLength = line.length;
                            }
                        });
                    }
                });
                if (i === 0) {
                    column.width = 6;
                } else {
                    column.width = Math.min(maxLength + 2, 100);
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        openFilePreview({
            fileName: `${fileName}.xlsx`,
            blob,
            html: workbookPreviewHtml(workbook),
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

    } catch (error) {
        console.error("Export Error:", error);
        Swal.fire('Error', 'Gagal mengekspor data ke Excel.', 'error');
    }
}


document.addEventListener('input', function(e) {
    if (e.target && e.target.classList.contains('format-rupiah')) {
        let val = e.target.value.replace(/\D/g, '');
        if (val) {
            e.target.value = new Intl.NumberFormat('id-ID').format(val);
        } else {
            e.target.value = '';
        }
    }
});

function bukaFormUpdateData() {
    // Sembunyikan semua page-view
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('d-none'));

    // Buat wadah view-update-data jika belum ada
    let viewUpdate = document.getElementById('view-update-data');
    if (!viewUpdate) {
        viewUpdate = document.createElement('div');
        viewUpdate.id = 'view-update-data';
        viewUpdate.className = 'page-view animate-fade-in p-2';
        const container = document.querySelector('#content-wrapper .container-fluid');
        if (container) container.appendChild(viewUpdate);
    }

    // Pindahkan konten modalPegawai ke view ini
    const modalContent = document.querySelector('#modalPegawai .modal-content') ||
                         document.querySelector('#pegawai-input-container .modal-content, #pegawai-input-container .card') ||
                         viewUpdate.querySelector('.modal-content, .card');
    if (modalContent) {
        modalContent.style.boxShadow = 'none';
        modalContent.style.border = 'none';
        modalContent.style.borderRadius = '0.5rem';
        const closeBtn = modalContent.querySelector('.btn-close');
        if (closeBtn) closeBtn.style.display = 'none';
        
        if (modalContent.parentElement !== viewUpdate) {
            viewUpdate.appendChild(modalContent);
        }
    }

    viewUpdate.classList.remove('d-none');
    
    // Muat data pegawai yang sedang login (tanpa popup karena isPegawai = true)
    const ssoToken = localStorage.getItem(TOKEN_KEY);
    let sessionNip = window.currentSessionNip;
    if (ssoToken) {
        try {
            const user = JSON.parse(ssoToken);
            sessionNip = user.username || user.nip || window.currentSessionNip;
        } catch(e) {}
    }
    if (sessionNip && typeof editPegawai === 'function') {
        editPegawai(sessionNip);
    }
}
window.bukaFormUpdateData = bukaFormUpdateData;

async function renderDashboardPegawai() {
    const container = document.getElementById('dashboard-pegawai-content');
    if (!container) return;
    const ssoToken = localStorage.getItem(TOKEN_KEY);
    if (!ssoToken) return;
    const user = JSON.parse(ssoToken);
    
    // Ambil NIP Pegawai dari token
    const nip = user.username || user.nip; // menyesuaikan field dari token

    // Cari riwayat KGB dari dbManager untuk pegawai ini
    let kgbInfo = "Belum ada data KGB.";
    let kgbDateStr = "-";
    let gajiPokok = "-";
    
    let fotoPegawai = null;
    try {
        if (typeof dbManager !== 'undefined' && nip) {
            const allPegawai = await dbManager.getAllPegawai();
            const pegawaiData = allPegawai.find(p => p.nip === nip);
            const resolvedFoto = typeof setSimpeelImageAsset === 'function'
                ? await setSimpeelImageAsset(document.getElementById('topAvatarImg'), pegawaiData?.foto, '')
                : (typeof resolveImageAssetSrc === 'function' ? resolveImageAssetSrc(pegawaiData?.foto, '') : (pegawaiData?.foto || ''));
            if (resolvedFoto && !resolvedFoto.includes('placeholder.com') && !resolvedFoto.includes('logo-simpeel.png')) {
                fotoPegawai = resolvedFoto;
                const topImg = document.getElementById('topAvatarImg');
                const topIcon = document.getElementById('topAvatarIcon');
                if (topImg) { topImg.src = fotoPegawai; topImg.classList.remove('d-none'); }
                if (topIcon) topIcon.classList.add('d-none');
            }
            if (pegawaiData && pegawaiData.riwayatKGB && pegawaiData.riwayatKGB.length > 0) {
                // Ambil data terbaru (terakhir di array jika sudah disort)
                const riwayatKGB = pegawaiData.riwayatKGB;
                // Asumsi indeks: [0] No SK, [1] Tgl SK, [2] TMT KGB, [3] Gaji Pokok, [4] Masa Kerja
                // Format tanggal: YYYY-MM-DD
                let latestKGB = riwayatKGB[riwayatKGB.length - 1]; // jika disort ascending, atau ambil yang ada if descending
                
                // Urutkan berdasarkan TMT KGB (indeks 2)
                const sortedKGB = [...riwayatKGB].sort((a, b) => {
                    const dateA = new Date(a[2]);
                    const dateB = new Date(b[2]);
                    return dateB - dateA; // descending, indeks 0 adalah yang terbaru
                });
                
                latestKGB = sortedKGB[0];
                const tmtKgbLalu = latestKGB[2];
                gajiPokok = latestKGB[3];
                
                let kgbDate = tmtKgbLalu ? (parseInt(tmtKgbLalu.substring(0, 4)) + 2) + tmtKgbLalu.substring(4) : '';
                kgbDateStr = kgbDate || "-";
                
                if (kgbDate) {
                    const kDate = new Date(kgbDate);
                    const currDate = new Date();
                    const diffTime = kDate - currDate;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 30 && diffDays > 0) {
                        kgbInfo = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> KGB Anda berikutnya jatuh pada <b>${escapeHtml(kgbDate)}</b> (dalam ${diffDays} hari). Segera persiapkan berkas pengajuan!</div>`;
                    } else if (diffDays <= 0) {
                         kgbInfo = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Waktu KGB Anda <b>${escapeHtml(kgbDate)}</b> sudah tiba/lewat. Harap segera lapor!</div>`;
                    } else {
                        kgbInfo = `<div class="alert alert-info"><i class="fas fa-info-circle"></i> Waktu pengajuan KGB Anda berikutnya: <b>${escapeHtml(kgbDate)}</b></div>`;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error fetching KGB for dashboard", e);
    }

    const safePhoto = fotoPegawai ? escapeHtml(fotoPegawai) : '';
    const nipArg = escapeHtmlJsArgument(nip);
    
    const html = `
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card shadow-sm border-left-primary py-2 custom-card">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-primary text-uppercase mb-1">Selamat Datang,</div>
                                <div class="h5 mb-0 fw-bold text-gray-800">${escapeHtml(user.displayName || 'Pegawai')}</div>
                                <div class="mt-2 text-sm text-muted">Akses informasi data kepegawaian Anda di sini.</div>
                            </div>
                            <div class="col-auto">
                                ${safePhoto
                                    ? `<img src="${safePhoto}" alt="Foto Profil" class="rounded-circle shadow-sm border border-3 border-primary" style="width:65px;height:65px;object-fit:cover;object-position:center top;">`
                                    : `<i class="fas fa-user-circle fa-3x text-gray-300"></i>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-4">
                <div class="card shadow-sm h-100">
                    <div class="card-header py-3">
                        <h6 class="m-0 fw-bold text-primary">Informasi Kenaikan Gaji Berkala (KGB)</h6>
                    </div>
                    <div class="card-body">
                        ${kgbInfo}
                        <ul class="list-group list-group-flush mt-3">
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0">
                                Jadwal KGB Berikutnya
                                <span class="badge bg-primary text-white rounded-pill" style="font-size:0.9rem;">${escapeHtml(kgbDateStr)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-bottom-0">
                                Gaji Pokok Saat Ini
                                <span class="badge bg-success text-white rounded-pill" style="font-size:0.9rem;">Rp ${escapeHtml(gajiPokok)}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-4">
                <div class="card shadow-sm h-100">
                    <div class="card-header py-3">
                        <h6 class="m-0 fw-bold text-primary">Cetak SKUMPTK</h6>
                    </div>
                    <div class="card-body text-center d-flex flex-column justify-content-center">
                        <p style="font-size:0.9rem;" class="text-muted mb-4">Silakan cetak/unduh formulir SKUMPTK (Surat Keterangan Untuk Mendapatkan Pembayaran Tunjangan Keluarga) langsung melalui tombol di bawah ini.</p>
                        <div>
                            <button class="btn btn-primary shadow-sm px-4" onclick="if(typeof cetakSkumptk === 'function') { cetakSkumptk(${nipArg}); } else { Swal.fire('Error', 'Fungsi cetak belum siap', 'error'); }">
                                <i class="fas fa-print me-1"></i> Cetak Dokumen SKUMPTK
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}
