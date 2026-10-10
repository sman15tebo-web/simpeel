function bukaModalTambahAkun() {
    try {
        const m = document.getElementById('modalTambahAkun');
        if (m) {
            const form = document.getElementById('formTambahAkun');
            if (form) form.reset();

            // Clear edit mode metadata
            delete m.dataset.mode;
            delete m.dataset.originalNip;
            const nipFeedback = document.getElementById('akun_nip_feedback');
            if (nipFeedback) {
                nipFeedback.textContent = '';
                nipFeedback.className = '';
            }
            const nikFeedback = document.getElementById('akun_nik_feedback');
            if (nikFeedback) {
                nikFeedback.textContent = '';
                nikFeedback.className = '';
            }

            const title = m.querySelector('.modal-title');
            if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> Tambah Akun Baru';
            const header = m.querySelector('.modal-header');
            if (header) {
                header.classList.remove('bg-warning', 'text-dark');
                header.classList.add('bg-primary', 'text-white');
            }
            const btn = m.querySelector('button[onclick="simpanAkunPegawai()"]');
            if (btn) {
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-primary');
                btn.innerHTML = '<i class="fas fa-save"></i> Simpan Akun';
            }

            const pwField = document.getElementById('akun_password');
            if (pwField) {
                pwField.readOnly = false;
                pwField.placeholder = 'Masukkan Password';
            }

            const modal = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m);
            modal.show();
        } else {
            console.error('modalTambahAkun not found');
            alert('Error: Modal Tambah Akun tidak ditemukan di halaman.');
        }
    } catch (e) {
        console.error('Error bukaModalTambahAkun:', e);
        alert('Gagal membuka modal: ' + e.message);
    }
}

window.editAkun = async function (nip) {
    try {
        const res = await dbManager.getAllAkun();
        const akunList = Array.isArray(res) ? res : [];
        if (!Array.isArray(res) && res && res.success === false) {
            return Swal.fire('Error', 'Gagal memuat data akun', 'error');
        }

        let akun = akunList.find(a => a.nip === nip);
        if (!akun) {
            const allPeg = await dbManager.getAllPegawai();
            const pegList = Array.isArray(allPeg) ? allPeg : [];
            akun = pegList.find(a => a.nip === nip);
            if (!akun) return Swal.fire('Error', 'Akun tidak ditemukan', 'error');
        }

        document.getElementById('akun_nip').value = akun.nip || '';
        document.getElementById('akun_nama').value = (akun.nama || '').toUpperCase();
        document.getElementById('akun_nik').value = akun.nik || '';
        document.getElementById('akun_tglLahir').value = akun.tglLahir || '';
        if (akun.statusPegawai) document.getElementById('akun_statusPegawai').value = akun.statusPegawai;

        const pwField = document.getElementById('akun_password');
        if (pwField) {
            pwField.value = '';
            pwField.placeholder = '(Gunakan tombol Reset Password)';
            pwField.readOnly = true;
        }

        const m = document.getElementById('modalTambahAkun');
        // Simpan NIP asli untuk deteksi mode edit dan cascade update
        m.dataset.originalNip = nip;
        m.dataset.mode = 'edit';

        const title = m.querySelector('.modal-title');
        if (title) title.innerHTML = '<i class="fas fa-user-edit"></i> Edit Akun';
        const header = m.querySelector('.modal-header');
        if (header) {
            header.classList.remove('bg-primary', 'text-white');
            header.classList.add('bg-warning', 'text-dark');
        }
        const btn = m.querySelector('button[onclick="simpanAkunPegawai()"]');
        if (btn) {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-warning');
            btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
        }

        const modal = bootstrap.Modal.getInstance(m) || new bootstrap.Modal(m);
        modal.show();
    } catch (e) {
        console.error('Error editAkun:', e);
    }
}

async function simpanAkunPegawai() {
    const m = document.getElementById('modalTambahAkun');
    const isEditMode = m && m.dataset.mode === 'edit';
    const originalNip = m ? m.dataset.originalNip : null;

    const statusPegawai = document.getElementById('akun_statusPegawai').value;
    const nip = document.getElementById('akun_nip').value.trim();
    const password = document.getElementById('akun_password').value;
    const nama = document.getElementById('akun_nama').value.trim().toUpperCase();
    const nik = document.getElementById('akun_nik').value.trim();
    const tglLahir = document.getElementById('akun_tglLahir').value;

    if (!statusPegawai || !nip || !nama || !nik || !tglLahir) {
        Swal.fire('Peringatan', 'Harap isi semua kolom wajib (*) kecuali password jika tidak ingin mengubah', 'warning');
        return;
    }
    if (!isEditMode && !password) {
        Swal.fire('Peringatan', 'Password wajib diisi untuk akun baru', 'warning');
        return;
    }

    // Ambil data akun lama jika edit mode (untuk preservasi createdAt dan role)
    let existingAkun = null;
    if (isEditMode && originalNip) {
        const allAkun = await dbManager.getAllAkun();
        const akunList = Array.isArray(allAkun) ? allAkun : [];
        existingAkun = akunList.find(a => a.nip === originalNip || a.nip === nip) || null;
    }

    const now = new Date().toISOString();
    const payload = {
        nip: nip,
        nama: nama,
        namaLengkap: nama,
        nik: nik,
        tglLahir: tglLahir,
        statusPegawai: statusPegawai,
        aktif: 1,
        role: existingAkun?.role || 'pegawai',
        createdAt: existingAkun?.createdAt || now,
        updatedAt: now
    };
    if (password) payload.password = password;

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

    try {
        // Jika edit mode dan NIP berubah, perlu cascade update
        if (isEditMode && originalNip && originalNip !== nip) {
            // 1. Hapus akun lama dengan NIP lama
            await dbManager.deleteAkun(originalNip).catch(e => console.warn('deleteAkun lama:', e));
            // 2. Ambil data pegawai lama dan update NIP-nya
            const allPeg = await dbManager.getAllPegawai();
            if (allPeg) {
                const pegLama = allPeg.find(p => p.nip === originalNip);
                if (pegLama) {
                    pegLama.nip = nip;
                    pegLama.nama = nama;
                    pegLama.nik = nik;
                    pegLama.tglLahir = tglLahir;
                    pegLama.statusPegawai = statusPegawai;
                    pegLama.updatedAt = now;
                    // Hapus data pegawai lama, simpan dengan NIP baru
                    await dbManager.deletePegawai(originalNip).catch(e => console.warn('deletePegawai lama:', e));
                    await dbManager.savePegawai(pegLama).catch(e => console.warn('savePegawai cascade:', e));
                }
            }
        }

        // Simpan akun (REPLACE akan update jika NIP sudah ada)
        const result = await dbManager.saveAkun(payload);
        const success = result && (result === true || result.success === true);

        if (success) {
            if (!isEditMode) {
                // Mode tambah: buat juga entri data pegawai minimal
                // Dibungkus try/catch sendiri agar kegagalan ini tidak menghalangi refresh tabel akun
                try {
                    const pegPayload = {
                        nip: nip, nama: nama, nik: nik,
                        statusPegawai: statusPegawai, tglLahir: tglLahir,
                        statusKepegawaian: 'Aktif',
                        updatedAt: now
                    };
                    await dbManager.savePegawai(pegPayload);
                } catch (pegErr) {
                    console.warn('savePegawai saat tambah akun gagal (akun tetap tersimpan):', pegErr);
                }
            } else {
                // Mode edit: update data pegawai juga jika NIP tidak berubah
                if (originalNip === nip) {
                    try {
                        const allPeg = await dbManager.getAllPegawai();
                        if (allPeg) {
                            const peg = allPeg.find(p => p.nip === nip);
                            if (peg) {
                                peg.nama = nama; peg.nik = nik;
                                peg.tglLahir = tglLahir; peg.statusPegawai = statusPegawai;
                                peg.updatedAt = now;
                                await dbManager.savePegawai(peg);
                            }
                        }
                    } catch (pegErr) {
                        console.warn('savePegawai saat edit akun gagal (akun tetap diperbarui):', pegErr);
                    }
                }
            }

            Swal.fire('Berhasil', isEditMode ? 'Akun berhasil diperbarui' : 'Akun berhasil ditambahkan', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalTambahAkun'));
            if (modal) modal.hide();
            if (m) { delete m.dataset.originalNip; delete m.dataset.mode; }
            renderTabelAkun();
        } else {
            Swal.fire('Gagal', (result && result.message) || 'Gagal menyimpan akun', 'error');
        }
    } catch (e) {
        console.error('simpanAkunPegawai error:', e);
        Swal.fire('Gagal', e.message || 'Terjadi kesalahan', 'error');
    }
}

async function renderTabelAkun() {
    if (!document.getElementById('tblAkun')) return;

    if ($.fn.DataTable.isDataTable('#tblAkun')) {
        try { $('#tblAkun').DataTable().clear().destroy(); } catch (e) { }
    }

    let dataAkun = [];
    try {
        const res = await dbManager.getAllAkun();
        dataAkun = Array.isArray(res) ? res : [];
        if (!Array.isArray(res)) {
            console.warn('renderTabelAkun received non-array data:', res);
        }
    } catch (e) {
        console.error("Gagal mengambil data akun:", e);
    }

    const formatted = [];
    dataAkun.forEach(a => {
        const nip = String(a.nip || a.username || '').trim();
        const nama = String(a.nama || a.namaLengkap || '').trim();
        const aksi = `
            <button class="btn btn-sm btn-info me-1" title="Reset Password" onclick="resetPasswordAkun('${nip}')"><i class="fas fa-key text-white"></i></button>
            <button class="btn btn-sm btn-warning me-1" title="Edit Akun" onclick="editAkun('${nip}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger" title="Hapus Akun" onclick="hapusAkun('${nip}')"><i class="fas fa-trash"></i></button>
        `;
        const roleBadge = a.role === 'admin'
            ? '<span class="badge bg-danger">Admin</span>'
            : '<span class="badge bg-secondary">Pegawai</span>';

        formatted.push([
            nip || '-',
            nama || '-',
            a.statusPegawai || '-',
            a.createdAt ? new Date(a.createdAt).toLocaleDateString('id-ID') : '-',
            roleBadge,
            aksi
        ]);
    });

    $('#tblAkun').DataTable({
        destroy: true,
        data: formatted,
        pageLength: 10,
        columns: [
            { title: 'NIP / Username' },
            { title: 'Nama' },
            { title: 'Status Pegawai' },
            { title: 'Tanggal Daftar' },
            { title: 'Role' },
            { title: 'Aksi', orderable: false }
        ]
    });
}

async function hapusAkun(nip) {
    const { value: text } = await Swal.fire({
        title: 'Hapus Akun & Data Pegawai?',
        html: 'Aksi ini akan menghapus akun dan <b>SELURUH DATA</b> pegawai terkait.<br><br>Ketik <b>HAPUS</b> untuk melanjutkan:',
        input: 'text',
        inputPlaceholder: 'Ketik HAPUS disini',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });

    if (text === 'HAPUS') {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            // Hapus akun dan data pegawai - abaikan error individual
            await dbManager.deleteAkun(nip).catch(() => { });
            await dbManager.deletePegawai(nip).catch(() => { });
            Swal.fire('Terhapus!', 'Akun dan seluruh data pegawai terkait telah dihapus.', 'success');
            renderTabelAkun();
            renderTabelPNS();
            renderTabelPPPK();
            renderTabelPPPKPW();
            renderTabelHonorer();
        } catch (e) {
            console.error(e);
            // Refresh tabel dulu, karena data mungkin sudah terhapus
            renderTabelAkun();
            renderTabelPNS();
            renderTabelPPPK();
            renderTabelPPPKPW();
            renderTabelHonorer();
            Swal.fire('Peringatan', 'Data mungkin sudah terhapus. Silakan periksa tabel.', 'warning');
        }
    } else if (text !== undefined) {
        Swal.fire('Dibatalkan', 'Konfirmasi tidak sesuai. Data aman.', 'info');
    }
}

async function resetPasswordAkun(nip) {
    const { value: text } = await Swal.fire({
        title: 'Reset Password?',
        html: 'Password akun ini akan dikembalikan ke standar yaitu <b>sama dengan NIP/Username</b>.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#17a2b8',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Reset',
        cancelButtonText: 'Batal'
    });

    if (text) {
        Swal.fire({ title: 'Meriset...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            const allAkun = await dbManager.getAllAkun();
            const akun = allAkun.find(a => a.nip === nip);
            if (!akun) throw new Error('Akun tidak ditemukan');

            akun.password = nip;
            await dbManager.saveAkun(akun);

            Swal.fire('Berhasil!', 'Password telah direset menjadi NIP/Username.', 'success');
        } catch (e) {
            Swal.fire('Gagal', e.message || 'Terjadi kesalahan', 'error');
        }
    }
}


async function toggleKunciData(nip) {
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const allPeg = await dbManager.getAllPegawai();
        const peg = allPeg.find(p => p.nip === nip);
        if (!peg) {
            Swal.fire('Error', 'Data pegawai tidak ditemukan', 'error');
            return;
        }

        peg.isLocked = !peg.isLocked;
        await dbManager.savePegawai(peg);

        Swal.fire({
            icon: 'success',
            title: peg.isLocked ? 'Data Terkunci' : 'Kunci Terbuka',
            text: peg.isLocked ? 'Data pegawai telah dikunci dan tidak dapat diedit.' : 'Data pegawai kini dapat diedit kembali.',
            timer: 1500,
            showConfirmButton: false
        });
        renderTabelPNS(); // Memuat ulang semua tabel PNS, PPPK, dll.
    } catch (e) {
        Swal.fire('Error', 'Gagal mengubah status kunci', 'error');
    }
}

async function validasiNipAkun(nip, inputEl) {
    if (!inputEl) inputEl = document.getElementById('akun_nip');
    const feedbackEl = document.getElementById('akun_nip_feedback');
    const m = document.getElementById('modalTambahAkun');
    const isEditMode = m && m.dataset.mode === 'edit';
    const originalNip = m ? m.dataset.originalNip : null;

    // Reset
    inputEl.classList.remove('is-invalid', 'is-valid');
    if (feedbackEl) feedbackEl.textContent = '';

    if (!nip || nip.trim() === '') return;

    const nipBersih = nip.trim();

    // Cek panjang
    if (nipBersih.length !== 18) {
        inputEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = 'NIP harus 18 digit. Saat ini: ' + nipBersih.length + ' digit.';
        return false;
    }

    // Cek duplikat HANYA jika mode tambah baru, atau jika NIP berubah dari NIP asli saat edit
    const nipBerubah = !isEditMode || (originalNip && originalNip !== nipBersih);
    if (nipBerubah) {
        try {
            const allAkun = await dbManager.getAllAkun();
            if (Array.isArray(allAkun)) {
                const existing = allAkun.find(a => a.nip === nipBersih);
                if (existing) {
                    inputEl.classList.add('is-invalid');
                    if (feedbackEl) feedbackEl.textContent = 'NIP ini sudah terdaftar atas nama: ' + (existing.nama || existing.nip) + '. Harap cek kembali.';
                    return false;
                }
            }
        } catch (e) {
            // Jika gagal cek DB, cukup lolos validasi panjang
        }
    }

    inputEl.classList.add('is-valid');
    if (isEditMode && originalNip !== nipBersih) {
        if (feedbackEl) feedbackEl.textContent = 'NIP akan diubah dari ' + originalNip + ' → ' + nipBersih + ' (semua data terkait akan ikut berubah)';
        feedbackEl.className = 'valid-feedback d-block text-info small';
    }
    return true;
}

async function validasiNikAkun(nik, inputEl) {
    if (!inputEl) inputEl = document.getElementById('akun_nik');
    const feedbackEl = document.getElementById('akun_nik_feedback');

    // Reset
    inputEl.classList.remove('is-invalid', 'is-valid');
    if (feedbackEl) feedbackEl.textContent = '';

    if (!nik || nik.trim() === '') return;

    const nikBersih = nik.trim();

    // Cek panjang
    if (nikBersih.length !== 16) {
        inputEl.classList.add('is-invalid');
        if (feedbackEl) feedbackEl.textContent = 'NIK harus 16 digit. Saat ini: ' + nikBersih.length + ' digit.';
        return false;
    }

    // Cek duplikat
    try {
        const allPegawai = await dbManager.getAllPegawai();
        const existing = allPegawai.find(p => p.nik === nikBersih);
        if (existing) {
            inputEl.classList.add('is-invalid');
            if (feedbackEl) feedbackEl.textContent = 'NIK ini sudah terdaftar atas nama: ' + (existing.nama || existing.nip) + '. Harap cek kembali.';
            return false;
        }
    } catch (e) {
        // Jika gagal cek DB, cukup lolos validasi panjang
    }

    inputEl.classList.add('is-valid');
    return true;
}

function toggleNipPasangan() {
    const pekerjaan = document.getElementById('peg_pasangan_pekerjaan').value;
    const divNip = document.getElementById('div_pasangan_nip');
    if (pekerjaan === 'ASN PNS' || pekerjaan === 'ASN PPPK' || pekerjaan === 'TNI/POLRI') {
        divNip.classList.remove('d-none');
    } else {
        divNip.classList.add('d-none');
        document.getElementById('peg_pasangan_nip').value = '';
    }
}


async function renderTabelSKUMPTK() {
    if ($.fn.DataTable.isDataTable('#tblSkumptkPns')) { try { $('#tblSkumptkPns').DataTable().clear().destroy(); } catch (e) { } }
    if ($.fn.DataTable.isDataTable('#tblSkumptkPppk')) { try { $('#tblSkumptkPppk').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();

    const processData = (statusFilter) => {
        const dataFilter = allPegawai.filter(p => p.statusKepegawaian === 'Aktif' && p.statusPegawai === statusFilter);
        let no = 1;
        return dataFilter.map(p => {
            return [
                no++,
                p.nama,
                p.nip,
                p.jabatan || '-',
                p.golongan || '-',
                "<button class='btn btn-sm btn-info text-white' title='Cetak SKUMPTK' onclick='cetakSkumptk(\"" + p.nip + "\")'><i class='fas fa-print'></i> Cetak</button>"
            ];
        });
    };

    const dataPNS = processData('PNS');
    const dataPPPK = processData('PPPK');

    $('#tblSkumptkPns').DataTable({ destroy: true, data: dataPNS, pageLength: 20 });
    $('#tblSkumptkPppk').DataTable({ destroy: true, data: dataPPPK, pageLength: 20 });
}

async function cetakSkumptk(nip) {
    Swal.fire({ title: 'Memuat data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    const allPegawai = await dbManager.getAllPegawai();
    const data = allPegawai.find(x => x.nip === nip);
    const pengaturan = await dbManager.getPengaturan() || {};

    if (!data) return Swal.fire('Error', 'Data Pegawai tidak ditemukan.', 'error');
    Swal.close();
    await new Promise(r => setTimeout(r, 200));

    // Helper hitung masa kerja dari riwayat pangkat
    const hitungMasaKerja = () => {
        if (!data.riwayatPangkat || data.riwayatPangkat.length === 0) return { thnGol: '-', blnGol: '-', thnTotal: '-', blnTotal: '-', tmt: '' };
        const lastPangkat = getLatestRiwayat(data.riwayatPangkat, 1) || data.riwayatPangkat[data.riwayatPangkat.length - 1];
        const tmtGol = lastPangkat[1] || '';
        const mkThnSK = parseInt(lastPangkat[5] || 0);
        const mkBlnSK = parseInt(lastPangkat[6] || 0);
        if (!tmtGol) return { thnGol: '-', blnGol: '-', thnTotal: '-', blnTotal: '-', tmt: '' };
        const now = new Date();
        const tmt = new Date(tmtGol);
        let elThn = now.getFullYear() - tmt.getFullYear();
        let elBln = now.getMonth() - tmt.getMonth();
        if (elBln < 0) { elThn--; elBln += 12; }
        // MK Golongan
        let totalBlnGol = mkBlnSK + elBln;
        let addThnGol = Math.floor(totalBlnGol / 12);
        let remBlnGol = totalBlnGol % 12;
        let thnGol = mkThnSK + elThn + addThnGol;
        // MK Keseluruhan (perkiraan dari tmtCpns jika ada)
        let thnTotal = '-', blnTotal = '-';
        if (data.tmtCpns) {
            const cpns = new Date(data.tmtCpns);
            let yT = now.getFullYear() - cpns.getFullYear();
            let mT = now.getMonth() - cpns.getMonth();
            if (mT < 0) { yT--; mT += 12; }
            thnTotal = yT < 0 ? 0 : yT;
            blnTotal = mT < 0 ? 0 : mT;
        }
        return {
            thnGol: String(thnGol).padStart(2, '0'),
            blnGol: String(remBlnGol).padStart(2, '0'),
            thnTotal: thnTotal === '-' ? '-' : String(thnTotal).padStart(2, '0'),
            blnTotal: blnTotal === '-' ? '-' : String(blnTotal).padStart(2, '0'),
            tmt: tmtGol
        };
    };

    const mk = hitungMasaKerja();

    // Helper format tanggal Indonesia
    const fmtTgl = (tgl) => {
        if (!tgl) return '-';
        try {
            return new Date(tgl).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) { return tgl; }
    };

    // Helper format tanggal singkat (DD - MM - YYYY)
    const fmtTglSingkat = (tgl) => {
        if (!tgl) return '-';
        try {
            const d = new Date(tgl);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd} - ${mm} - ${yyyy}`;
        } catch (e) { return tgl; }
    };

    // Default gaji dari data pegawai
    const defaultGaji = data.gajiPokok || '';
    const defaultTmtGol = mk.tmt ? fmtTgl(mk.tmt) : '';

    // Hitung jumlah keluarga tertanggung
    const jumlahAnak = Array.isArray(data.riwayatAnak) ? data.riwayatAnak.filter(a => a && a[0]).length : 0;
    const jumlahKeluarga = (data.pasanganNama ? 1 : 0) + jumlahAnak;

    // Nama bergelar
    const namaLengkap = generateNamaBergelar(data.nama || '', data.riwayatPendidikan);

    const { value: formValues } = await Swal.fire({
        title: '📄 Lengkapi Data SKUMPTK',
        width: '750px',
        html: `
        <div class="text-start" style="font-size:12px;">
            <p class="text-muted small mb-2"><i class="fas fa-info-circle"></i> Data di bawah ini mengambil data terbaru. Kolom abu-abu terisi otomatis dari database. Kolom kuning perlu Anda lengkapi secara manual jika kosong.</p>
            <div class="row g-2">
                <div class="col-12 mt-2"><div class="fw-bold text-primary border-bottom pb-1 mb-1">🏢 Instansi & Bendahara</div></div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Nama Instansi</label>
                    <input id="sk_instansi_nama" class="form-control form-control-sm ${pengaturan.sekolah ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.sekolah || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Instansi Induk</label>
                    <input id="sk_instansi_induk" class="form-control form-control-sm ${pengaturan.instansi ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.instansi || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Alamat Instansi</label>
                    <input id="sk_instansi_alamat" class="form-control form-control-sm ${pengaturan.alamat ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.alamat || ''}">
                </div>
                <div class="col-md-6">
                    <label class="form-label small mb-0 fw-semibold">Bendahara Pengeluaran</label>
                    <input id="sk_bendahara" class="form-control form-control-sm ${pengaturan.bendaharaNama ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.bendaharaNama || ''}">
                </div>

                <div class="col-12 mt-2"><div class="fw-bold text-primary border-bottom pb-1 mb-1">👤 Kepegawaian & Gaji</div></div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">TMT Golongan</label>
                    <input id="sk_tmt_gol" class="form-control form-control-sm ${defaultTmtGol ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${defaultTmtGol}" placeholder="01 April 2019">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">TMT CPNS</label>
                    <input id="sk_tmt_cpns" class="form-control form-control-sm ${data.tmtCpns ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${data.tmtCpns ? fmtTgl(data.tmtCpns) : ''}" placeholder="01 Maret 2015">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Eselon</label>
                    <input id="sk_eselon" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="" placeholder="Cth: IV.b">
                </div>
                
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">PP/SK Penggajian</label>
                    <input id="sk_pp_sk" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="" placeholder="Cth: PP No 5/2024">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Gaji Pokok</label>
                    <input id="sk_gaji_pokok" class="form-control form-control-sm format-rupiah ${defaultGaji ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${defaultGaji}" placeholder="Rp. 3.390.500,-">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Gaji Bersih</label>
                    <input id="sk_gaji_bersih" class="form-control form-control-sm format-rupiah bg-warning bg-opacity-10 border-warning" value="" placeholder="Cth: Rp. 4.292.100,-">
                </div>
                
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Jenis Kepeg</label>
                    <input id="sk_jenis_kepeg" class="form-control form-control-sm bg-light text-secondary" value="Pegawai Negeri Sipil Daerah">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Status Kepeg</label>
                    <input id="sk_status_kepeg" class="form-control form-control-sm bg-light text-secondary" value="Pegawai Negeri Sipil Provinsi">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">SK Terakhir</label>
                    <input id="sk_terakhir" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="SK Berkala" placeholder="SK Berkala">
                </div>
                
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">Jml Keluarga</label>
                    <input id="sk_jml_keluarga" class="form-control form-control-sm bg-light text-secondary" value="${jumlahKeluarga}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">MK Golongan</label>
                    <input id="sk_mk_gol" class="form-control form-control-sm ${mk.thnGol !== '-' ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${mk.thnGol !== '-' ? mk.thnGol + ' Tahun ' + mk.blnGol + ' Bulan' : ''}">
                </div>
                <div class="col-md-4">
                    <label class="form-label small mb-0 fw-semibold">MK Total</label>
                    <input id="sk_mk_total" class="form-control form-control-sm ${mk.thnTotal !== '-' ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${mk.thnTotal !== '-' ? mk.thnTotal + ' Tahun ' + mk.blnTotal + ' Bulan' : ''}">
                </div>

                <div class="col-12 mt-2"><div class="fw-bold text-primary border-bottom pb-1 mb-1">✍️ Penandatangan</div></div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Tempat TTD</label>
                    <input id="sk_tempat" class="form-control form-control-sm ${data.tempatLahir ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${data.tempatLahir || ''}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Tgl TTD</label>
                    <input type="date" id="sk_tanggal" class="form-control form-control-sm bg-warning bg-opacity-10 border-warning" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Atasan Nama</label>
                    <input id="sk_atasan_nama" class="form-control form-control-sm ${pengaturan.kepsekNama ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.kepsekNama || ''}">
                </div>
                <div class="col-md-3">
                    <label class="form-label small mb-0 fw-semibold">Atasan NIP</label>
                    <input id="sk_atasan_nip" class="form-control form-control-sm ${pengaturan.kepsekNip ? 'bg-light text-secondary' : 'bg-warning bg-opacity-10 border-warning'}" value="${pengaturan.kepsekNip || ''}">
                </div>
            </div>
        </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-file-word"></i> Cetak Dokumen Word',
        cancelButtonText: 'Batal',
        preConfirm: () => ({
            instansiNama: document.getElementById('sk_instansi_nama').value || '...',
            instansiAlamat: document.getElementById('sk_instansi_alamat').value || '...',
            instansiInduk: document.getElementById('sk_instansi_induk').value || '...',
            bendahara: document.getElementById('sk_bendahara').value || '...',
            tmtGol: document.getElementById('sk_tmt_gol').value || '...',
            tmtCpns: document.getElementById('sk_tmt_cpns').value || '...',
            jenisKepeg: document.getElementById('sk_jenis_kepeg').value || 'Pegawai Negeri Sipil Daerah',
            statusKepeg: document.getElementById('sk_status_kepeg').value || 'Pegawai Negeri Sipil Provinsi',
            ppSk: document.getElementById('sk_pp_sk').value || '...',
            eselon: document.getElementById('sk_eselon').value || '...',
            gajiPokok: document.getElementById('sk_gaji_pokok').value || '...',
            gajiBersih: document.getElementById('sk_gaji_bersih').value || '...',
            skTerakhir: document.getElementById('sk_terakhir').value || 'SK Berkala',
            jmlKeluarga: document.getElementById('sk_jml_keluarga').value || '...',
            mkGol: document.getElementById('sk_mk_gol').value || '...',
            mkTotal: document.getElementById('sk_mk_total').value || '...',
            atasanNama: document.getElementById('sk_atasan_nama').value || '...',
            atasanNip: document.getElementById('sk_atasan_nip').value || '...',
            tempat: document.getElementById('sk_tempat').value || '...',
            tanggal: document.getElementById('sk_tanggal').value || '',
        })
    });

    if (!formValues) return;

    const tglCetak = formValues.tanggal ? fmtTgl(formValues.tanggal) : '...';
    downloadSkumptkDocument(data, formValues, tglCetak, namaLengkap, fmtTgl, fmtTglSingkat);
}
