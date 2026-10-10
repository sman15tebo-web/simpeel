// === PEGAWAI.JS - LOGIKA DATA PEGAWAI ===

function getLatestRiwayat(riwayatArray, dateIndex, isYear = false) {
    if (!riwayatArray || riwayatArray.length === 0) return null;
    return riwayatArray.reduce((latest, current) => {
        let dateLatest = latest[dateIndex];
        let dateCurrent = current[dateIndex];

        if (isYear) {
            return (parseInt(dateCurrent) || 0) >= (parseInt(dateLatest) || 0) ? current : latest;
        } else {
            let dLatest = new Date(dateLatest);
            let dCurrent = new Date(dateCurrent);
            if (isNaN(dLatest.getTime())) return current;
            if (isNaN(dCurrent.getTime())) return latest;
            return dCurrent >= dLatest ? current : latest;
        }
    });
}

function sortRiwayatArray(riwayatArray, dateIndex, isYear = false) {
    if (!riwayatArray || riwayatArray.length === 0) return riwayatArray;
    return riwayatArray.sort((a, b) => {
        let valA = a[dateIndex];
        let valB = b[dateIndex];

        if (isYear) {
            return (parseInt(valA) || 0) - (parseInt(valB) || 0);
        } else {
            let dA = new Date(valA);
            let dB = new Date(valB);
            let timeA = isNaN(dA.getTime()) ? 0 : dA.getTime();
            let timeB = isNaN(dB.getTime()) ? 0 : dB.getTime();
            return timeA - timeB;
        }
    });
}

async function getPrimaryDataLock(nip) {
    if (!nip) return null;

    // 1. Ambil dari data lokal pegawai di memori (instan 0 ms tanpa request jaringan)
    if (typeof dbManager !== 'undefined') {
        const pegList = await dbManager.getAllPegawai();
        const fromPegawai = Array.isArray(pegList) ? pegList.find(p => String(p.nip) === String(nip)) : null;
        if (fromPegawai) {
            return {
                nip: fromPegawai.nip || nip,
                nama: fromPegawai.nama || '',
                nik: fromPegawai.nik || '',
                tglLahir: fromPegawai.tglLahir || '',
                statusPegawai: fromPegawai.statusPegawai || 'PNS'
            };
        }
    }

    // 2. Fallback ke token sesi login jika belum ada di memori
    try {
        const ssoToken = localStorage.getItem('SIMPEEL_TOKEN_ONLINE') || localStorage.getItem('SIMPEEL_TOKEN_OFFLINE');
        if (ssoToken) {
            const user = JSON.parse(ssoToken);
            if (String(user.nip || user.username) === String(nip)) {
                return {
                    nip: user.nip || user.username || nip,
                    nama: user.displayName || user.nama || '',
                    nik: user.nik || '',
                    tglLahir: user.tglLahir || '',
                    statusPegawai: user.statusPegawai || 'PNS'
                };
            }
        }
    } catch (e) { }

    return null;
}

async function simpanPegawai() {
    const nipVal = (document.getElementById('peg_nip')?.value || '').trim();
    const namaVal = (document.getElementById('peg_nama')?.value || '').trim().toUpperCase();
    const tglLahir = (document.getElementById('peg_tgl_lahir')?.value || '').trim();
    const kelamin = (document.getElementById('peg_kelamin')?.value || '').trim();
    const statusPgw = (document.getElementById('statusPegawai')?.value || '').trim();

    // === PROTEKSI 5 DATA UTAMA ===
    // Nilai utama selalu diambil dari sumber data akun/pegawai yang konsisten.
    const isEditMode = !!window.currentEditUtamaNip;
    const lockedSource = isEditMode ? await getPrimaryDataLock(window.currentEditUtamaNip) : null;
    if (lockedSource && isEditMode) {
        window._p5nip = lockedSource.nip || window.currentEditUtamaNip;
        window._p5nama = lockedSource.nama || '';
        window._p5nik = lockedSource.nik || '';
        window._p5tgl = lockedSource.tglLahir || '';
        window._p5status = lockedSource.statusPegawai || '';
    }

    if (isEditMode) {
        if (document.getElementById('peg_nip')) document.getElementById('peg_nip').value = window._p5nip || window.currentEditUtamaNip;
        if (document.getElementById('peg_nama')) document.getElementById('peg_nama').value = window._p5nama || '';
        if (document.getElementById('peg_nik')) document.getElementById('peg_nik').value = window._p5nik || '';
        if (document.getElementById('peg_tgl_lahir')) document.getElementById('peg_tgl_lahir').value = window._p5tgl || '';
        if (document.getElementById('statusPegawai')) document.getElementById('statusPegawai').value = window._p5status || '';
    }

    // Validasi wajib: alert per field
    if (!nipVal) {
        Swal.fire('Peringatan', 'Kolom NIP (Baru) wajib diisi!', 'warning');
        document.getElementById('peg_nip')?.focus();
        return;
    }

    // CEK DUPLIKASI NIP / NIK
    const allPegawai = await dbManager.getAllPegawai();
    const currentNipLama = (document.getElementById('peg_nip_lama')?.value || '').trim();
    const nipValFinal = (isEditMode && window._p5nip !== undefined) ? window._p5nip : nipVal;
    const namaValFinal = (isEditMode && window._p5nama !== undefined) ? String(window._p5nama).toUpperCase() : namaVal;
    const nikVal = (isEditMode && window._p5nik !== undefined) ? window._p5nik : (document.getElementById('peg_nik')?.value || '').trim();
    const tglLahirFinal = (isEditMode && window._p5tgl !== undefined) ? window._p5tgl : tglLahir;
    const statusPgwFinal = (isEditMode && window._p5status !== undefined) ? window._p5status : statusPgw;

    if (nipValFinal) {
        const existNip = allPegawai.find(p => p.nip === nipValFinal && p.nip !== window.currentEditUtamaNip);
        if (existNip) {
            Swal.fire('Error', `NIP ${nipValFinal} sudah dipakai atas nama ${existNip.nama}. Data tidak bisa disimpan untuk mencegah tertimpa!`, 'error');
            return;
        }
    }

    if (nikVal) {
        const existNik = allPegawai.find(p => p.nik === nikVal && p.nip !== window.currentEditUtamaNip);
        if (existNik) {
            Swal.fire('Error', `NIK ${nikVal} sudah dipakai atas nama ${existNik.nama}. Data tidak bisa disimpan!`, 'error');
            return;
        }
    }

    if (!namaValFinal) {
        Swal.fire('Peringatan', 'Kolom Nama wajib diisi!', 'warning');
        document.getElementById('peg_nama')?.focus();
        return;
    }
    if (!tglLahirFinal) {
        Swal.fire('Peringatan', 'Kolom Tanggal Lahir wajib diisi!', 'warning');
        document.getElementById('peg_tgl_lahir')?.focus();
        return;
    }
    if (!kelamin) {
        Swal.fire('Peringatan', 'Kolom Jenis Kelamin wajib dipilih!', 'warning');
        document.getElementById('peg_kelamin')?.focus();
        return;
    }
    if (!statusPgwFinal) {
        Swal.fire('Peringatan', 'Kolom Status Pegawai wajib dipilih!', 'warning');
        document.getElementById('statusPegawai')?.focus();
        return;
    }

    // KONFIRMASI SEBELUM SIMPAN (MUNCUL INSTAN TANPA JEDA)
    const confirmSave = await Swal.fire({
        title: 'Konfirmasi Simpan',
        text: 'Pastikan data NIP dan data lainnya sudah benar. Yakin ingin menyimpan perubahan data Anda?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check me-1"></i> Ya, Simpan',
        cancelButtonText: 'Batal',
        reverseButtons: true
    });

    if (!confirmSave.isConfirmed) {
        return;
    }

    // TAMPILKAN LOADING SEGERA AGAR PENGGUNA TIDAK MENUNGGU DALAM KEGELAPAN
    Swal.fire({
        title: 'Menyimpan Data...',
        html: '<div class="text-muted small mt-2"><i class="fas fa-spinner fa-spin me-2 text-primary"></i>Sedang memproses dan menyimpan perubahan data ke server...</div>',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Extract array data
    const extractTableData = (tableId) => {
        const rows = document.querySelectorAll(`#${tableId} tbody tr`);
        return Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input:not([type="file"]), select');
            return Array.from(inputs).map(i => i.value);
        });
    };

    let riwayatPangkat = extractTableData('tabelPangkat');
    let riwayatKontrak = extractTableData('tabelKontrak');
    let riwayatJabatan = extractTableData('tabelJabatan');
    let riwayatKGB = extractTableData('tabelKGB');
    let riwayatPendidikan = extractTableData('tabelPendidikan');
    let riwayatAnak = extractTableData('tabelAnak');
    let riwayatDiklat = extractTableData('tabelDiklat');

    riwayatPangkat = sortRiwayatArray(riwayatPangkat, 1);
    riwayatKontrak = sortRiwayatArray(riwayatKontrak, 2);
    riwayatJabatan = sortRiwayatArray(riwayatJabatan, 4);
    riwayatKGB = sortRiwayatArray(riwayatKGB, 2);
    riwayatPendidikan = sortRiwayatArray(riwayatPendidikan, 4, true);
    riwayatAnak = sortRiwayatArray(riwayatAnak, 2).map(r => {
        if (r[0]) r[0] = r[0].toUpperCase();
        return r;
    });
    riwayatDiklat = sortRiwayatArray(riwayatDiklat, 2, true);

    // Get latest data for main table
    let golongan = '';
    let jabatan = '';
    let tmtJabatan = '';
    let tmtKgbLalu = '';
    let gajiPokok = '';

    let unitKerja = '';
    const latestPendidikan = getLatestRiwayat(riwayatPendidikan, 4, true);
    if (latestPendidikan) {
        pendidikan = latestPendidikan[0];
    }

    const latestPangkat = getLatestRiwayat(riwayatPangkat, 1);
    const latestKontrak = getLatestRiwayat(riwayatKontrak, 2);

    if (latestPangkat) {
        golongan = latestPangkat[0]; // Golongan
    } else if (latestKontrak) {
        golongan = latestKontrak[1]; // Golongan Kontrak
    }

    const latestJabatan = getLatestRiwayat(riwayatJabatan, 4);
    if (latestJabatan) {
        jabatan = latestJabatan[2]; // Nama Jabatan
        unitKerja = latestJabatan[3]; // Unit Kerja
        tmtJabatan = latestJabatan[4]; // TMT Jabatan
    } else if (latestKontrak) {
        jabatan = latestKontrak[0]; // Nama Jabatan Kontrak
    }

    const latestKGB = getLatestRiwayat(riwayatKGB, 2);
    if (latestKGB) {
        tmtKgbLalu = latestKGB[2]; // TMT KGB
        gajiPokok = latestKGB[3]; // Jumlah Gaji Pokok
    }
    let kgbDate = tmtKgbLalu
        ? (parseInt(tmtKgbLalu.substring(0, 4)) + 2) + tmtKgbLalu.substring(4)
        : '';

    // --- FOTO PROCESSING ---
    const imgEl = document.getElementById('previewFotoPegawai');
    let fotoData = '';
    if (imgEl && !imgEl.src.includes('placeholder.com')) {
        if (imgEl.src.startsWith('data:image/')) {
            try {
                // Compress photo to ensure it stays < 50,000 chars for Google Sheets
                fotoData = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        let width = img.width;
                        let height = img.height;
                        const MAX_SIZE = 250;
                        if (width > height) {
                            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                        } else {
                            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to highly compressed JPEG
                        let compressed = canvas.toDataURL('image/jpeg', 0.7);
                        resolve(compressed);
                    };
                    img.onerror = () => resolve(imgEl.src);
                    img.src = imgEl.src;
                });
            } catch (e) {
                fotoData = imgEl.src;
            }
        } else {
            fotoData = imgEl.src; // if it's already a link/path
        }
    }

    const data = {
        foto: fotoData,
        nip: nipValFinal,
        nik: nikVal,
        nama: namaValFinal,
        tempatLahir: document.getElementById('peg_tempat_lahir')?.value || '',
        tglLahir: tglLahirFinal,
        kelamin: kelamin,
        agama: document.getElementById('peg_agama')?.value || '',
        statusKawin: document.getElementById('peg_status_kawin')?.value || '',
        alamat: document.getElementById('peg_alamat')?.value || '',
        alamatProvinsi: document.getElementById('peg_alamat_provinsi')?.value || '',
        alamatKabKota: document.getElementById('peg_alamat_kabkota')?.value || '',
        nipLama: document.getElementById('peg_nip_lama')?.value || '',
        noHp: document.getElementById('peg_no_hp')?.value || '',
        email: document.getElementById('peg_email')?.value || '',
        golDarah: document.getElementById('peg_gol_darah')?.value || '',
        tinggiBadan: document.getElementById('peg_tinggi_badan')?.value || '',
        beratBadan: document.getElementById('peg_berat_badan')?.value || '',
        hobby: document.getElementById('peg_hobby')?.value || '',
        isKebutuhanKhusus: document.getElementById('peg_is_kebutuhan_khusus')?.value || 'Tidak',
        uraianKebutuhanKhusus: document.getElementById('peg_uraian_kebutuhan_khusus')?.value || '',
        statusPegawai: statusPgwFinal,
        golongan: golongan,
        jabatan: jabatan,
        tmtJabatan: tmtJabatan,
        pendidikan: pendidikan,
        unitKerja: unitKerja || 'Dinas',
        statusKepegawaian: 'Aktif',
        gajiPokok: gajiPokok,
        tmtKgbLalu: tmtKgbLalu,
        tmtKgbBaru: kgbDate,
        tmtPensiun: '',
        pasanganNama: document.getElementById('peg_pasangan_nama')?.value || '',
        pasanganNik: document.getElementById('peg_pasangan_nik')?.value || '',
        pasanganTmptLahir: document.getElementById('peg_pasangan_tmpt_lahir')?.value || '',
        pasanganTglLahir: document.getElementById('peg_pasangan_tgl_lahir')?.value || '',
        pasanganPekerjaan: document.getElementById('peg_pasangan_pekerjaan')?.value || '',
        pasanganNip: document.getElementById('peg_pasangan_nip')?.value || '',
        pasanganBukuNikah: document.getElementById('file_buku_nikah')?.value || '',
        riwayatPangkat: riwayatPangkat,
        riwayatKontrak: riwayatKontrak,
        riwayatJabatan: riwayatJabatan,
        riwayatKGB: riwayatKGB,
        riwayatPendidikan: riwayatPendidikan,
        riwayatAnak: riwayatAnak,
        riwayatDiklat: riwayatDiklat,

        certNo: (document.getElementById('cert_no')?.value || ''),
        certTgl: (document.getElementById('cert_tgl')?.value || ''),
        certNrg: (document.getElementById('cert_nrg')?.value || ''),
        certNuptk: (document.getElementById('cert_nuptk')?.value || ''),
        certTahun: (document.getElementById('cert_tahun')?.value || ''),
        certMapel: (document.getElementById('cert_mapel')?.value || ''),
        certLptk: (document.getElementById('cert_lptk')?.value || ''),
        certPejabat: (document.getElementById('cert_pejabat')?.value || ''),
        certFileData: (document.getElementById('cert_file_data')?.value || '')
    };

    try {
        const res = await dbManager.savePegawai(data);
        if (res && res.success === false) {
            Swal.fire('Error', 'Gagal menyimpan data: ' + res.message, 'error');
            return;
        }

        const ssoToken = localStorage.getItem('SIMPEEL_TOKEN_ONLINE') || localStorage.getItem('SIMPEEL_TOKEN_OFFLINE');
        let session = null;
        if (ssoToken) {
            try { session = JSON.parse(ssoToken); } catch (e) { }
        }
        const isPegawai = session && session.role === 'pegawai';

        Swal.fire('Berhasil!', 'Data Kepegawaian berhasil disimpan!', 'success');

        if (isPegawai) {
            if (typeof renderDashboardPegawai === 'function') renderDashboardPegawai();
            if (typeof nav === 'function') nav('dashboard-pegawai');
        } else {
            // Tutup modal jika mode admin
            const modal = bootstrap?.Modal?.getInstance(document.getElementById('modalTambahPegawai'))
                || bootstrap?.Modal?.getInstance(document.getElementById('modalPegawai'));
            if (modal) modal.hide();
            // Refresh semua tabel admin
            if (typeof renderTabelPNS === 'function') renderTabelPNS();
            if (typeof renderTabelDUK === 'function') renderTabelDUK();
            if (typeof renderTabelKGB === 'function') renderTabelKGB();
            if (typeof renderTabelRekap === 'function') renderTabelRekap();
            if (typeof renderTabelRiwayat === 'function') renderTabelRiwayat();
        }
    } catch (e) {
        Swal.fire('Gagal!', 'Gagal menyimpan data: ' + e.message, 'error');
    }
}

async function hapusPegawaiData(nip) {
    const result = await Swal.fire({
        title: 'Hapus Pegawai?',
        text: 'Data akan dihapus permanen!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!'
    });
    if (result.isConfirmed) {
        await dbManager.deletePegawai(nip);
        Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
        renderTabelPNS();
        renderTabelDUK();
        renderTabelKGB();
        renderTabelRekap();
        renderTabelRiwayat();
    }
}

function toggleKebutuhanKhusus() {
    const isKhusus = document.getElementById('peg_is_kebutuhan_khusus')?.value;
    const div = document.getElementById('div_kebutuhan_khusus');
    if (div) {
        if (isKhusus === 'Ya') {
            div.classList.remove('d-none');
        } else {
            div.classList.add('d-none');
            const ur = document.getElementById('peg_uraian_kebutuhan_khusus');
            if (ur) ur.value = '';
        }
    }
}

async function renderTabelPNS() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabelInduk = (id, statusPegawaiFilter) => {
        if ($.fn.DataTable.isDataTable(id)) { try { $(id).DataTable().clear().destroy(); $(id + " tbody").empty(); } catch (e) { } }
        const data = allPegawai.filter(p => p.statusPegawai === statusPegawaiFilter && p.statusKepegawaian === 'Aktif');

        const formatted = data.map(p => {
            const isLocked = p.isLocked === true;
            const lockBtnClass = isLocked ? 'btn-secondary text-white' : 'btn-success text-white';
            const lockIcon = isLocked ? 'fa-lock' : 'fa-lock-open';
            const lockTitle = isLocked ? 'Buka Kunci Data' : 'Kunci Data';
            return [
                p.nip, p.nama, p.golongan, p.jabatan, p.unitKerja,
                `<button class='btn btn-sm btn-warning text-dark me-1' title='Edit Data' onclick='editPegawai("${p.nip}")'><i class='fas fa-edit'></i></button>
                 <button class='btn btn-sm ${lockBtnClass} me-1' title='${lockTitle}' onclick='toggleKunciData("${p.nip}")'><i class='fas ${lockIcon}'></i></button>
                 <button class='btn btn-sm btn-info text-white' title='Cetak CV (Word)' onclick='cetakCV("${p.nip}")'><i class='fas fa-print'></i></button>`
            ];
        });

        const dt = $(id).DataTable({ destroy: true, data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
        return dt;
    };

    const dtPNS = renderTabelInduk('#tblPNS', 'PNS');
    $('#filterNamaPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolPNS').off('change').on('change', function () { dtPNS.column(2).search(this.value).draw(); });

    const dtPPPK = renderTabelInduk('#tblPPPK', 'PPPK');
    $('#filterNamaPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });

    const dtPPPKPW = renderTabelInduk('#tblPPPKPW', 'PPPK Paruh Waktu');
    $('#filterNamaPPPKPW').off('keyup').on('keyup', function () { dtPPPKPW.search(this.value).draw(); });

    const dtHonorer = renderTabelInduk('#tblHonorer', 'Honorer');
    $('#filterNamaHonorer').off('keyup').on('keyup', function () { dtHonorer.search(this.value).draw(); });
}

async function renderTabelDUK() {
    if ($.fn.DataTable.isDataTable('#tblDUKPNS')) { try { $('#tblDUKPNS').DataTable().clear().destroy(); } catch (e) { } }
    if ($.fn.DataTable.isDataTable('#tblDUKPPPK')) { try { $('#tblDUKPPPK').DataTable().clear().destroy(); } catch (e) { } }
    if ($.fn.DataTable.isDataTable('#tblDUKPPPKPW')) { try { $('#tblDUKPPPKPW').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();

    const hitungMK = (tmtStr, thnSK = 0, blnSK = 0) => {
        if (!tmtStr || tmtStr === '-') return { thn: thnSK, bln: blnSK, elThn: 0, elBln: 0 };
        const tmt = new Date(tmtStr);
        if (isNaN(tmt)) return { thn: thnSK, bln: blnSK, elThn: 0, elBln: 0 };
        const now = new Date();
        let years = now.getFullYear() - tmt.getFullYear();
        let months = now.getMonth() - tmt.getMonth();
        if (months < 0) { years--; months += 12; }
        years = years < 0 ? 0 : years;
        months = months < 0 ? 0 : months;
        let totalBln = parseInt(blnSK) + months;
        let addThn = Math.floor(totalBln / 12);
        let remBln = totalBln % 12;
        let totalThn = parseInt(thnSK) + years + addThn;
        return { thn: totalThn, bln: remBln, elThn: years, elBln: months };
    };

    const processData = (statusFilter) => {
        const dataFilter = allPegawai.filter(p => p.statusKepegawaian === 'Aktif' && p.statusPegawai === statusFilter);
        let no = 1;
        return dataFilter.map(p => {
            let mkKeseluruhan = "-";
            let mkGolRuang = "-";
            let tmtPangkat = "-";
            let golTmt = p.golongan || '-';

            if (p.riwayatPangkat && p.riwayatPangkat.length > 0) {
                const lastPangkat = getLatestRiwayat(p.riwayatPangkat, 1) || p.riwayatPangkat[p.riwayatPangkat.length - 1];
                tmtPangkat = lastPangkat[1] || '-';
                const res = hitungMK(tmtPangkat, lastPangkat[5] || '0', lastPangkat[6] || '0');
                mkKeseluruhan = `${res.thn} Thn ${res.bln} Bln`;
                mkGolRuang = `${res.elThn} Thn ${res.elBln} Bln`;
                golTmt = `${p.golongan || '-'}<br><small>${tmtPangkat}</small>`;
            } else if (p.riwayatKontrak && p.riwayatKontrak.length > 0) {
                const lastKontrak = getLatestRiwayat(p.riwayatKontrak, 2) || p.riwayatKontrak[p.riwayatKontrak.length - 1];
                tmtPangkat = lastKontrak[2] || '-'; // TMT Mulai
                const res = hitungMK(tmtPangkat, lastKontrak[7] || '0', lastKontrak[8] || '0');
                mkKeseluruhan = `${res.thn} Thn ${res.bln} Bln`;
                mkGolRuang = `${res.elThn} Thn ${res.elBln} Bln`;
                golTmt = `${p.golongan || '-'}<br><small>${tmtPangkat}</small>`;
            }

            let usia = "-";
            if (p.tglLahir) {
                const diff = new Date() - new Date(p.tglLahir);
                usia = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + " Thn";
            }

            return [
                no++, `${p.nama}<br><small>${p.nip}</small>`, p.jabatan || '-', golTmt, mkKeseluruhan, mkGolRuang, usia
            ];
        });
    };

    const dtPNS = $('#tblDUKPNS').DataTable({ destroy: true, data: processData('PNS'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolDUKPNS').off('keyup').on('keyup', function () { dtPNS.column(3).search(this.value).draw(); });

    const dtPPPK = $('#tblDUKPPPK').DataTable({ destroy: true, data: processData('PPPK'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });
    $('#filterGolDUKPPPK').off('keyup').on('keyup', function () { dtPPPK.column(3).search(this.value).draw(); });

    const dtPPPKPW = $('#tblDUKPPPKPW').DataTable({ destroy: true, data: processData('PPPK Paruh Waktu'), pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaDUKPPPKPW').off('keyup').on('keyup', function () { dtPPPKPW.search(this.value).draw(); });
}

async function renderTabelKGB() {
    if ($.fn.DataTable.isDataTable('#tblKGB')) { try { $('#tblKGB').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();
    const dataAktif = allPegawai.filter(p => p.statusKepegawaian === 'Aktif');

    const currDate = new Date();

    const formatted = dataAktif.map(p => {
        let statusBadge = `<span class='badge bg-warning text-dark'><i class='fas fa-clock'></i> Menunggu</span>`;
        if (p.tmtKgbBaru) {
            const kgbDate = new Date(p.tmtKgbBaru);
            const diffTime = kgbDate - currDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 90 && diffDays >= 0) {
                statusBadge = `<span class='badge bg-danger'><i class='fas fa-exclamation-triangle'></i> Segera Proses</span>`;
            } else if (diffDays < 0) {
                statusBadge = `<span class='badge bg-danger'><i class='fas fa-times-circle'></i> Terlewat</span>`;
            }
        }

        return [
            p.nama,
            `<span class='badge bg-primary'>${p.statusPegawai}</span>`,
            p.gajiPokok || '-',
            p.tmtKgbLalu || '-',
            `<b>${p.tmtKgbBaru || '-'}</b>`,
            statusBadge,
            `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${p.nip}")'><i class='fas fa-eye'></i></button>`
        ];
    });

    const dt = $('#tblKGB').DataTable({ destroy: true, data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
    $('#filterNamaKGB').off('keyup').on('keyup', function () { dt.search(this.value).draw(); });
    $('#filterStatusKGB').off('change').on('change', function () { dt.column(1).search(this.value).draw(); });
}

async function renderTabelRekap() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabelAktif = (id, statusFilter) => {
        if ($.fn.DataTable.isDataTable(id)) { try { $(id).DataTable().clear().destroy(); $(id + " tbody").empty(); } catch (e) { } }
        const data = allPegawai.filter(p => p.statusPegawai === statusFilter && p.statusKepegawaian === 'Aktif');

        const getPendidikan = (p) => {
            if (p.pendidikan) return p.pendidikan;
            // Fallback: baca dari riwayatPendidikan untuk data lama
            if (Array.isArray(p.riwayatPendidikan) && p.riwayatPendidikan.length > 0) {
                const latest = getLatestRiwayat(p.riwayatPendidikan, 4, true);
                if (latest && latest[0]) return latest[0];
            }
            return '-';
        };

        const formatted = data.map(p => [
            p.nama, p.nip, p.golongan || '-', p.jabatan || '-', getPendidikan(p), `<span class='badge bg-success'>Aktif</span>`,
            `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${p.nip}")'><i class='fas fa-eye'></i></button>
             <button class='btn btn-sm btn-secondary text-white me-1' title='Edit Status' onclick='editStatusPegawai("${p.nip}")'><i class='fas fa-user-edit'></i></button>`
        ]);

        const dt = $(id).DataTable({ destroy: true, data: formatted, pageLength: 5, dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>" });
        return dt;
    };

    const dtPNS = renderTabelAktif('#tblRekapPNS', 'PNS');
    $('#filterNamaAktifPNS').off('keyup').on('keyup', function () { dtPNS.search(this.value).draw(); });
    $('#filterGolAktifPNS').off('change').on('change', function () { dtPNS.column(2).search(this.value).draw(); });

    const dtPPPK = renderTabelAktif('#tblRekapPPPK', 'PPPK');
    $('#filterNamaRekapPPPK').off('keyup').on('keyup', function () { dtPPPK.search(this.value).draw(); });

    const dtPPPKPW = renderTabelAktif('#tblRekapPPPKPW', 'PPPK Paruh Waktu');
    $('#filterNamaRekapPPPKPW').off('keyup').on('keyup', function () { dtPPPKPW.search(this.value).draw(); });

    const dtHonorer = renderTabelAktif('#tblRekapHonorer', 'Honorer');
    $('#filterNamaRekapHonorer').off('keyup').on('keyup', function () { dtHonorer.search(this.value).draw(); });
}

async function renderTabelRiwayat() {
    const allPegawai = await dbManager.getAllPegawai();

    const renderTabel = (id, statusFilter, mapFn) => {
        if ($.fn.DataTable.isDataTable(id)) { try { $(id).DataTable().clear().destroy(); $(id + " tbody").empty(); } catch (e) { } }
        const data = allPegawai.filter(p => p.statusKepegawaian === statusFilter);
        const formatted = data.map(mapFn);
        $(id).DataTable({ destroy: true, data: formatted, pageLength: 5 });
    };

    const badgeMap = { PNS: 'bg-primary', PPPK: 'bg-success', Honorer: 'bg-warning' };
    const getBadge = (s) => `<span class='badge ${badgeMap[s] || 'bg-secondary'}'>${s || '-'}</span>`;
    const getAksi = (nip) => `<button class='btn btn-sm btn-info text-white me-1' title='Lihat Profil' onclick='lihatPegawai("${nip}")'><i class='fas fa-eye'></i></button><button class='btn btn-sm btn-secondary text-white' title='Edit Status' onclick='editStatusPegawai("${nip}")'><i class='fas fa-user-edit'></i></button>`;

    renderTabel('#tblPensiun', 'Pensiun', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tmtPensiun || '-', p.jabatan || '-', getAksi(p.nip)]);
    renderTabel('#tblMutasi', 'Mutasi', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tmtMutasi || '-', p.mutasiKe || p.keteranganMutasi || '-', p.jabatan || '-', getAksi(p.nip)]);
    renderTabel('#tblMeninggal', 'Meninggal', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.jabatan || '-', p.tglMeninggal || p.tanggalMeninggal || '-', getAksi(p.nip)]);
    renderTabel('#tblBerhenti', 'Berhenti', p => [p.nip, p.nama, getBadge(p.statusPegawai), p.tanggalBerhenti || '-', p.alasanBerhenti || p.keteranganBerhenti || '-', p.jabatan || '-', getAksi(p.nip)]);

    const oldTglMeninggalLabel = document.querySelector('#tblMeninggal thead th:nth-child(5)');
    if (oldTglMeninggalLabel) oldTglMeninggalLabel.textContent = 'Tanggal Meninggal';
}

function tambahBaris(tabelId) {
    let tr = document.createElement('tr');

    if (tabelId === 'tabelPangkat') {
        tr.innerHTML = `
            <td>
                <select class='form-select form-select-sm'>
                    <option>Juru Muda / I/a</option>
                    <option>Juru Muda Tk. I / I/b</option>
                    <option>Juru / I/c</option>
                    <option>Juru Tk. I / I/d</option>
                    <option>Pengatur Muda / II/a</option>
                    <option>Pengatur Muda Tk. I / II/b</option>
                    <option>Pengatur / II/c</option>
                    <option>Pengatur Tk. I / II/d</option>
                    <option>Penata Muda / III/a</option>
                    <option>Penata Muda Tk. I / III/b</option>
                    <option>Penata / III/c</option>
                    <option>Penata Tk. I / III/d</option>
                    <option>Pembina / IV/a</option>
                    <option>Pembina Tk. I / IV/b</option>
                    <option>Pembina Utama Muda / IV/c</option>
                    <option>Pembina Utama Madya / IV/d</option>
                    <option>Pembina Utama / IV/e</option>
                </select>
            </td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: Gubernur'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelJabatan') {
        tr.innerHTML = `
            <td>
                <select class='form-select form-select-sm' onchange='toggleEselon(this)'>
                    <option value="Struktural">Struktural</option>
                    <option value="Fungsional Tertentu">Fungsional Tertentu</option>
                    <option value="Fungsional Umum">Fungsional Umum</option>
                </select>
            </td>
            <td>
                <select class='form-select form-select-sm eselon-select'>
                    <option>Eselon I.a</option><option>Eselon I.b</option>
                    <option>Eselon II.a</option><option>Eselon II.b</option>
                    <option>Eselon III.a</option><option>Eselon III.b</option>
                    <option>Eselon IV.a</option><option>Eselon IV.b</option>
                    <option>Eselon V.a</option>
                    <option value="-">-</option>
                </select>
            </td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: Setda...'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelPendidikan') {
        tr.innerHTML = `
            <td><select class='form-select form-select-sm'><option>SD</option><option>SMP</option><option>SMA</option><option>D3</option><option>S1</option><option>S2</option><option>S3</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2006'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2010'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Gelar Depan'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Gelar Belakang'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelDiklat') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='2020'></td>
            <td><input type='text' class='form-control form-control-sm' placeholder='Contoh: 40 Jam'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelAnak') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Laki-laki</option><option>Perempuan</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Kandung</option><option>Tiri</option><option>Angkat</option></select></td>
            <td><select class='form-select form-select-sm'><option value=''>Pilih</option><option value='1'>1</option><option value='2'>2</option><option value='3'>3</option><option value='4'>4</option><option value='5'>5</option><option value='6'>6</option></select></td>
            <td><select class='form-select form-select-sm'><option>Tidak</option><option>Ya</option></select></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><select class='form-select form-select-sm'><option>Belum</option><option>Sudah</option></select></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelKontrak') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td>
                <select class='form-select form-select-sm'>
                    <option>Golongan I</option><option>Golongan II</option><option>Golongan III</option>
                    <option>Golongan IV</option><option>Golongan V</option><option>Golongan VI</option>
                    <option>Golongan VII</option><option>Golongan VIII</option><option>Golongan IX</option>
                    <option>Golongan X</option><option>Golongan XI</option><option>Golongan XII</option>
                    <option>Golongan XIII</option><option>Golongan XIV</option><option>Golongan XV</option>
                    <option>Golongan XVI</option><option>Golongan XVII</option>
                </select>
            </td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    } else if (tabelId === 'tabelKGB') {
        tr.innerHTML = `
            <td><input type='text' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='date' class='form-control form-control-sm'></td>
            <td><input type='text' class='form-control form-control-sm format-rupiah'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Thn'></td>
            <td><input type='number' class='form-control form-control-sm' placeholder='Bln'></td>
            <td><div class='d-flex'><input type='file' class='form-control form-control-sm' accept='application/pdf' onchange='handleFileUpload(this)'><input type='hidden' class='row-file-data'><button type='button' class='btn btn-sm btn-info ms-1 d-none btn-view-file' onclick='viewFileApp(this.previousElementSibling.value)'><i class='fas fa-eye'></i></button></div></td><td><button type='button' class='btn btn-sm btn-danger' onclick='this.parentElement.parentElement.remove()'><i class='fas fa-trash'></i></button></td>
        `;
    }

    document.querySelector(`#${tabelId} tbody`).appendChild(tr);
}

function toggleEselon(selectElement) {
    const eselonSelect = selectElement.closest('tr').querySelector('.eselon-select');
    if (selectElement.value.includes('Fungsional')) {
        eselonSelect.value = '-';
        eselonSelect.disabled = true;
    } else {
        eselonSelect.disabled = false;
        if (eselonSelect.value === '-') eselonSelect.selectedIndex = 0;
    }
}

function toggleSKFields(status) {
    document.getElementById('sk-pns-fields').classList.add('d-none');
    document.getElementById('sk-pppk-fields').classList.add('d-none');
    document.getElementById('sk-honorer-fields').classList.add('d-none');

    if (status === 'PNS') {
        document.getElementById('sk-pns-fields').classList.remove('d-none');
    } else if (status === 'PPPK' || status === 'PPPK Paruh Waktu') {
        document.getElementById('sk-pppk-fields').classList.remove('d-none');
    } else if (status === 'Honorer') {
        document.getElementById('sk-honorer-fields').classList.remove('d-none');
    }
}

function hitungKGBBerikutnya() {
    const tmtTerakhir = document.getElementById('kgbTmtTerakhir').value;
    if (tmtTerakhir) {
        let date = new Date(tmtTerakhir);
        date.setFullYear(date.getFullYear() + 2); // Umumnya 2 tahun
        document.getElementById('kgbTmtBerikutnya').value = date.toISOString().split('T')[0];
    }
}

function simpanKGB() {
    Swal.fire('Berhasil!', 'Data Gaji Berkala berhasil diperbarui!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalEditKGB')).hide();
}

function lihatKGB(btn) {
    const row = btn.closest('tr');
    document.getElementById('lihatKgbNama').innerText = row.cells[0].innerText;
    document.getElementById('lihatKgbStatus').innerHTML = row.cells[1].innerHTML;
    document.getElementById('lihatKgbGapok').innerText = row.cells[2].innerText;
    document.getElementById('lihatKgbTmtLama').innerText = row.cells[3].innerText;
    document.getElementById('lihatKgbTmtBaru').innerHTML = row.cells[4].innerHTML;
    document.getElementById('lihatKgbStatusKGB').innerHTML = row.cells[5].innerHTML;
    var myModal = new bootstrap.Modal(document.getElementById('modalLihatKGB'));
    myModal.show();
}

function toggleFormStatus(status) {
    const formPensiun = document.getElementById('form-pensiun-meninggal');
    const formResign = document.getElementById('form-resign');
    const formMutasi = document.getElementById('form-mutasi');
    if (formPensiun) formPensiun.classList.add('d-none');
    if (formResign) formResign.classList.add('d-none');
    if (formMutasi) formMutasi.classList.add('d-none');

    if (status === 'Pensiun' || status === 'Meninggal') {
        if (formPensiun) formPensiun.classList.remove('d-none');
        const label = document.getElementById('labelTglPensiunMeninggal');
        if (label) label.innerText = status === 'Pensiun' ? 'Tanggal Pensiun' : 'Tanggal Meninggal';
    } else if (status === 'Berhenti') {
        if (formResign) formResign.classList.remove('d-none');
    } else if (status === 'Mutasi') {
        if (formMutasi) formMutasi.classList.remove('d-none');
    }
}

async function validasiNIK(el) {
    const val = el.value.trim();
    if (val === '') {
        el.classList.remove('is-invalid');
        return;
    }
    if (!/^\d+$/.test(val)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIK harus berupa angka!', showConfirmButton: false, timer: 3000 });
        el.value = '';
        el.classList.add('is-invalid');
        return;
    } else if (val.length !== 16) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIK harus pas 16 digit!', showConfirmButton: false, timer: 3000 });
        el.classList.add('is-invalid');
        return;
    }

    if (typeof dbManager !== 'undefined') {
        const allPegawai = await dbManager.getAllPegawai();
        const existing = allPegawai.find(p => p.nik === val && p.nip !== window.currentEditUtamaNip);
        if (existing) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `NIK ini sudah ada atas nama ${existing.nama}`, showConfirmButton: false, timer: 4000 });
            el.classList.add('is-invalid');
        } else {
            el.classList.remove('is-invalid');
        }
    }
}

async function validasiNIP(el) {
    const val = el.value.trim();
    if (val === '') {
        el.classList.remove('is-invalid');
        return;
    }

    if (!/^\d+$/.test(val)) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIP harus berupa angka!', showConfirmButton: false, timer: 3000 });
        el.value = '';
        el.classList.add('is-invalid');
        return;
    } else if (val.length !== 18) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'NIP harus pas 18 digit!', showConfirmButton: false, timer: 3000 });
        el.classList.add('is-invalid');
        return;
    }

    if (typeof dbManager !== 'undefined') {
        const allPegawai = await dbManager.getAllPegawai();
        const existing = allPegawai.find(p => p.nip === val && p.nip !== window.currentEditUtamaNip);
        if (existing) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `NIP ini sudah ada atas nama ${existing.nama}`, showConfirmButton: false, timer: 4000 });
            el.classList.add('is-invalid');
        } else {
            el.classList.remove('is-invalid');
        }
    }
}

function bukaModalTambah() {
    window.currentEditUtamaNip = null;
    // Kosongkan form secara manual karena tidak ada tag <form>
    const modalEl = document.getElementById('modalPegawai');
    if (modalEl) {
        modalEl.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else {
                el.value = '';
            }
            if (el.id === 'statusPegawai') {
                el.disabled = false;
                el.removeAttribute('disabled');
            }
        });
    }

    document.getElementById('peg_nik')?.classList.remove('is-invalid');
    document.getElementById('peg_nip')?.classList.remove('is-invalid');

    const preview = document.getElementById('previewFotoPegawai');
    if (preview) preview.src = 'logo-simpeel.png';

    ['tabelPangkat', 'tabelKontrak', 'tabelJabatan', 'tabelKGB', 'tabelPendidikan', 'tabelAnak', 'tabelDiklat'].forEach(id => {
        const tbody = document.querySelector(`#${id} tbody`);
        if (tbody) tbody.innerHTML = '';
    });

    // Reset combo alamat (karena wilayah.js mengubah struktur DOM saat kosong)
    const selKab = document.getElementById('peg_alamat_kabkota');
    if (selKab) selKab.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';

    // Enable NIP input
    const nipInput = document.getElementById('peg_nip');
    if (nipInput) nipInput.readOnly = false;

    const modal = new bootstrap.Modal(document.getElementById('modalPegawai'));
    modal.show();
}

async function editPegawai(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) {
        Swal.fire('Error', 'Data pegawai tidak ditemukan!', 'error');
        return;
    }

    window.currentEditUtamaNip = p.nip;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    // Populate Data
    setVal('peg_nip', p.nip || '');
    setVal('peg_nip_lama', p.nipLama || ''); // Opsional, bisa diisi NIP lama jika ada
    const nipInput = document.getElementById('peg_nip');
    if (nipInput) nipInput.readOnly = true; // NIP baru tidak bisa diedit

    setVal('peg_no_hp', p.noHp || '');
    setVal('peg_email', p.email || '');
    setVal('peg_gol_darah', p.golDarah || '-');
    setVal('peg_tinggi_badan', p.tinggiBadan || '');
    setVal('peg_berat_badan', p.beratBadan || '');
    setVal('peg_hobby', p.hobby || '');
    setVal('peg_is_kebutuhan_khusus', p.isKebutuhanKhusus || 'Tidak');
    setVal('peg_uraian_kebutuhan_khusus', p.uraianKebutuhanKhusus || '');
    if (typeof toggleKebutuhanKhusus === 'function') toggleKebutuhanKhusus();
    setVal('peg_nik', p.nik || '');
    setVal('peg_nama', p.nama || '');
    setVal('peg_tempat_lahir', p.tempatLahir || '');
    setVal('peg_tgl_lahir', p.tglLahir || '');
    setVal('peg_kelamin', p.kelamin || 'Laki-Laki');
    setVal('peg_agama', p.agama || 'Islam');
    setVal('peg_status_kawin', p.statusKawin || 'Kawin');

    setVal('peg_pasangan_nama', p.pasanganNama || '');
    setVal('peg_pasangan_nik', p.pasanganNik || '');
    setVal('peg_pasangan_tmpt_lahir', p.pasanganTmptLahir || '');
    setVal('peg_pasangan_tgl_lahir', p.pasanganTglLahir || '');
    setVal('peg_pasangan_pekerjaan', p.pasanganPekerjaan || '');
    setVal('peg_pasangan_nip', p.pasanganNip || '');
    if (typeof toggleNipPasangan === 'function') toggleNipPasangan();

    setVal('peg_alamat', p.alamat || '');
    setVal('peg_alamat_provinsi', p.alamatProvinsi || '');
    const selProv = document.getElementById('peg_alamat_provinsi');
    const selKab = document.getElementById('peg_alamat_kabkota');
    if (selProv && p.alamatProvinsi) {
        selProv.value = p.alamatProvinsi;
        // Populate kab/kota sesuai provinsi
        if (selKab && typeof dataWilayah !== 'undefined' && dataWilayah[p.alamatProvinsi]) {
            selKab.innerHTML = '<option value="">-- Pilih Kab/Kota --</option>';
            dataWilayah[p.alamatProvinsi].forEach(kab => {
                if (!kab.endsWith('(PROV)')) {
                    const opt = document.createElement('option');
                    opt.value = kab;
                    opt.textContent = kab;
                    selKab.appendChild(opt);
                }
            });
            selKab.value = p.alamatKabKota || '';
        }
    }

    setVal('statusPegawai', p.statusPegawai || 'PNS');
    if (typeof toggleSKFields === 'function') toggleSKFields(p.statusPegawai || 'PNS');

    // === KUNCI UI: 5 Data Utama read-only saat Edit Data Lengkap ===
    try {
        var _ro = ['peg_nama', 'peg_nik', 'peg_tgl_lahir'];
        _ro.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { el.readOnly = true; el.style.backgroundColor = '#e9ecef'; el.title = 'Ubah via Manajemen Akun - Edit Akun'; }
        });
        var _sSt = document.getElementById('statusPegawai');
        if (_sSt) {
            _sSt.disabled = true;
            _sSt.setAttribute('disabled', 'disabled');
            _sSt.style.backgroundColor = '#e9ecef';
            _sSt.title = 'Ubah via Manajemen Akun - Edit Akun';
        }
        if (!document.getElementById('_alert5data')) {
            var _mb = document.querySelector('#modalPegawai .modal-body');
            if (_mb) {
                var ssoToken = localStorage.getItem('SIMPEEL_TOKEN_ONLINE') || localStorage.getItem('SIMPEEL_TOKEN_OFFLINE'); var role = 'admin'; if (ssoToken) { try { role = JSON.parse(ssoToken).role; } catch (e) {} } if (role === 'pegawai') return; var _a = document.createElement('div');
                _a.id = '_alert5data';
                _a.className = 'alert alert-info py-2 px-3 mb-2';
                _a.style.fontSize = '0.82rem';
                _a.innerHTML = '<strong>5 Data Utama terkunci:</strong> NIP, Nama, NIK, Tgl Lahir & Status Pegawai hanya bisa diubah melalui <strong>Manajemen Akun - Edit Akun</strong>.';
                _mb.insertBefore(_a, _mb.firstChild);
            }
        }
    } catch (e) { console.warn('Kunci UI error:', e); }
    setVal('peg_gelar_depan', p.gelarDepan || '');
    setVal('peg_gelar_belakang', p.gelarBelakang || '');
    setVal('peg_pendidikan', p.pendidikan || 'S1');

    // Populate Tables from Arrays
    const populateTable = (tableId, dataArray) => {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';
        if (dataArray && Array.isArray(dataArray)) {
            dataArray.forEach(rowData => {
                tambahBaris(tableId);
                const tr = tbody.lastElementChild;
                const inputs = tr.querySelectorAll('input:not([type="file"]), select');
                rowData.forEach((val, index) => {
                    if (inputs[index]) {
                        inputs[index].value = val;
                        if (inputs[index].classList.contains('format-rupiah') && val) {
                            let cleanVal = String(val).replace(/\D/g, '');
                            if (cleanVal) inputs[index].value = new Intl.NumberFormat('id-ID').format(cleanVal);
                        }
                        // Show view button if it's the hidden file input and has value
                        if (inputs[index].type === 'hidden' && val) {
                            const btn = inputs[index].nextElementSibling;
                            if (btn && btn.classList.contains('btn-view-file')) {
                                btn.classList.remove('d-none');
                            }
                        }
                        // trigger onchange event for toggleEselon etc
                        if (inputs[index].tagName === 'SELECT') {
                            inputs[index].dispatchEvent(new Event('change'));
                        }
                    }
                });
            });
        }
    };

    // Shim for tabelPendidikan (added Gelar Belakang at index 6, old length 7)
    if (p.riwayatPendidikan) {
        p.riwayatPendidikan = p.riwayatPendidikan.map(r => {
            if (r.length === 7) return [r[0], r[1], r[2], r[3], r[4], r[5], '', r[6]];
            return r;
        });
    }

    // Shim for tabelAnak (added NIK at 1, JK at 2, old length 5) (added IstriKe, Tunjangan, Kerja, Sekolah, old length 7)
    if (p.riwayatAnak) {
        p.riwayatAnak = p.riwayatAnak.map(r => {
            if (r.length === 5) return [r[0], '', 'Laki-laki', r[1], r[2], r[3], '', 'Tidak', '', 'Belum', r[4]];
            if (r.length === 7) return [r[0], r[1], r[2], r[3], r[4], r[5], '', 'Tidak', '', 'Belum', r[6]];
            return r;
        });
    }

    populateTable('tabelPangkat', p.riwayatPangkat);
    populateTable('tabelKontrak', p.riwayatKontrak);
    populateTable('tabelJabatan', p.riwayatJabatan);
    populateTable('tabelKGB', p.riwayatKGB);
    populateTable('tabelPendidikan', p.riwayatPendidikan);
    populateTable('tabelAnak', p.riwayatAnak);
    populateTable('tabelDiklat', p.riwayatDiklat);

    setVal('cert_no', p.certNo || '');
    setVal('cert_tgl', p.certTgl || '');
    setVal('cert_nrg', p.certNrg || '');
    setVal('cert_nuptk', p.certNuptk || '');
    setVal('cert_tahun', p.certTahun || '');
    setVal('cert_mapel', p.certMapel || '');
    setVal('cert_lptk', p.certLptk || '');
    setVal('cert_pejabat', p.certPejabat || '');
    setVal('cert_file_data', p.certFileData || '');

    if (p.certFileData) {
        const btnFile = document.querySelector('#cert_file_data').nextElementSibling;
        if (btnFile && btnFile.classList.contains('btn-view-file')) btnFile.classList.remove('d-none');
    }

    // Foto
    const imgEl = document.getElementById('previewFotoPegawai');
    if (imgEl) {
        if (p.foto && p.foto.startsWith('data:')) {
            imgEl.src = p.foto;
        } else {
            imgEl.src = 'logo-simpeel.png';
        }
    }

    // Show Modal
    const modalEl = document.getElementById('modalPegawai');
    if (modalEl) {
        // Lock logic
        const isLocked = p.isLocked === true;
        const allInputs = modalEl.querySelectorAll('input, select, textarea, button');
        allInputs.forEach(el => {
            if (el.dataset.bsDismiss === 'modal') return; // Jangan disable tombol close

            if (el.tagName === 'BUTTON') {
                if (el.onclick && (el.onclick.toString().includes('tambahBaris') || el.onclick.toString().includes('hapusBaris') || el.onclick.toString().includes('remove()'))) {
                    el.disabled = isLocked;
                }
                if (el.onclick && el.onclick.toString().includes('simpanPegawai')) {
                    el.disabled = isLocked;
                    el.style.display = isLocked ? 'none' : 'inline-block';
                }
                if (el.id === 'btnUploadFoto' || el.id === 'btnCaptureFoto') el.disabled = isLocked;
            } else {
                if (el.id === 'peg_nip') el.readOnly = true;
                else el.disabled = isLocked;
            }
        });

        const ssoToken = localStorage.getItem('SIMPEEL_TOKEN_ONLINE') || localStorage.getItem('SIMPEEL_TOKEN_OFFLINE');
        let session = null;
        if (ssoToken) {
            try { session = JSON.parse(ssoToken); } catch (e) { }
        }
        const isPegawai = session && session.role === 'pegawai';

        const titleEl = modalEl.querySelector('.modal-title');
        if (titleEl) {
            titleEl.innerHTML = isLocked
                ? '<i class="fas fa-lock text-danger"></i> Edit Data Pegawai <span class="badge bg-danger ms-2">TERKUNCI</span>'
                : '<i class="fas fa-user-edit"></i> Edit Data Pegawai';
        }

        if (!isPegawai) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    } else {
        Swal.fire('Error', 'Modal edit tidak ditemukan di HTML.', 'error');
    }
}
