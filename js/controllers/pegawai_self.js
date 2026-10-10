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

            if (pegawai && pegawai.foto && !pegawai.foto.includes('placeholder.com') && !pegawai.foto.includes('logo-simpeel.png') && (pegawai.foto.startsWith('data:image/') || pegawai.foto.startsWith('http'))) {
                if (imgEl) {
                    imgEl.src = pegawai.foto;
                    imgEl.classList.remove('d-none');
                }
                if (iconEl) iconEl.classList.add('d-none');

                const topImg = document.getElementById('topAvatarImg');
                const topIcon = document.getElementById('topAvatarIcon');
                if (topImg) {
                    topImg.src = pegawai.foto;
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
 * Load data pegawai ke dalam form Input Data Saya
 */
window.loadInputDataPegawai = async function() {
    const container = document.getElementById('pegawai-input-container');
    if (!container) return;

    try {
        const ssoToken = localStorage.getItem(TOKEN_KEY);
        if (!ssoToken) return;
        const session = JSON.parse(ssoToken);
        const nip = session.nip;
        if (!nip) { container.innerHTML = '<div class="alert alert-warning">Sesi tidak valid.</div>'; return; }

        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Memuat data pegawai...</p></div>';

        let allPegawai = await dbManager.getAllPegawai();
        if (!allPegawai || allPegawai.length === 0) {
            allPegawai = await apiCall('getAllPegawai');
        }
        const pegawai = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;

        if (!pegawai) {
            container.innerHTML = `<div class="alert alert-info text-center">
                <i class="fas fa-info-circle fa-2x mb-2 d-block"></i>
                <strong>Data belum ada.</strong><br>
                Data pegawai Anda belum terdaftar di sistem. Hubungi admin untuk mendaftarkan data Anda.
            </div>`;
            return;
        }

        // Cek apakah data dikunci admin
        const isKunci = pegawai.kunciData === true || pegawai.kunciData === 1 || String(pegawai.kunciData) === '1';
        const readonlyAttr = isKunci ? 'readonly' : '';
        const disabledAttr = isKunci ? 'disabled' : '';
        const kunciInfo = isKunci ? '<div class="alert alert-warning mb-3"><i class="fas fa-lock me-2"></i><strong>Data dikunci oleh Admin.</strong> Anda tidak dapat mengubah data saat ini. Hubungi admin untuk membuka kunci.</div>' : '';

        const formatDate = (str) => {
            if(!str) return '-';
            try {
                const d = new Date(str);
                if(isNaN(d.getTime())) return str;
                return d.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
            } catch(e) { return str; }
        };

        // Render form pegawai (tabs seperti modal admin)
        container.innerHTML = `
            ${kunciInfo}
            <ul class="nav nav-tabs mb-3" id="inputDataTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#idt-identitas" type="button">📋 Identitas</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#idt-kepegawaian" type="button">🏢 Kepegawaian</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#idt-pendidikan" type="button">🎓 Pendidikan</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#idt-lainnya" type="button">📁 Lainnya</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold text-danger" data-bs-toggle="tab" data-bs-target="#idt-kgb" type="button"><i class="fas fa-money-bill-wave me-1"></i> KGB</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold text-success" data-bs-toggle="tab" data-bs-target="#idt-skumptk" type="button"><i class="fas fa-file-word me-1"></i> SKUMPTK</button>
                </li>
            </ul>
            <div class="tab-content">
                <!-- TAB IDENTITAS -->
                <div class="tab-pane fade show active" id="idt-identitas">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">NIP</label><input class="form-control" id="self-nip" value="${pegawai.nip||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Lengkap</label><input class="form-control" id="self-nama" value="${pegawai.nama||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">NIK</label><input class="form-control" id="self-nik" value="${pegawai.nik||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Tempat Lahir</label><input class="form-control" id="self-tempatLahir" value="${pegawai.tempatLahir||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Tanggal Lahir</label><input type="date" class="form-control" id="self-tglLahir" value="${pegawai.tglLahir||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Jenis Kelamin</label>
                            <select class="form-select" id="self-jenisKelamin" ${disabledAttr}>
                                <option value="">-- Pilih --</option>
                                <option value="Laki-laki" ${pegawai.jenisKelamin==='Laki-laki'?'selected':''}>Laki-laki</option>
                                <option value="Perempuan" ${pegawai.jenisKelamin==='Perempuan'?'selected':''}>Perempuan</option>
                            </select>
                        </div>
                        <div class="col-md-6"><label class="form-label fw-bold">Agama</label><input class="form-control" id="self-agama" value="${pegawai.agama||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No HP</label><input class="form-control" id="self-noHp" value="${pegawai.noHp||''}" ${readonlyAttr}></div>
                        <div class="col-12"><label class="form-label fw-bold">Alamat</label><textarea class="form-control" id="self-alamat" rows="2" ${readonlyAttr}>${pegawai.alamat||''}</textarea></div>
                    </div>
                </div>
                <!-- TAB KEPEGAWAIAN -->
                <div class="tab-pane fade" id="idt-kepegawaian">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">Status Pegawai</label><input class="form-control" value="${pegawai.statusPegawai||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Status Kepegawaian</label><input class="form-control" value="${pegawai.statusKepegawaian||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Golongan</label><input class="form-control" value="${pegawai.golongan||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Jabatan</label><input class="form-control" value="${pegawai.jabatan||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Unit Kerja</label><input class="form-control" value="${pegawai.unitKerja||''}" readonly></div>
                        <div class="col-md-6"><label class="form-label fw-bold">TMT CPNS/PPPK</label><input type="date" class="form-control" value="${pegawai.tmtCpns||''}" readonly></div>
                    </div>
                    <p class="text-muted mt-3 small"><i class="fas fa-info-circle"></i> Data kepegawaian hanya dapat diubah oleh Admin.</p>
                </div>
                <!-- TAB PENDIDIKAN -->
                <div class="tab-pane fade" id="idt-pendidikan">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">Pendidikan Terakhir</label><input class="form-control" id="self-pendidikan" value="${pegawai.pendidikan||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Jurusan/Prodi</label><input class="form-control" id="self-jurusan" value="${pegawai.jurusan||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Sekolah/Universitas</label><input class="form-control" id="self-namaSekolah" value="${pegawai.namaSekolah||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Tahun Lulus</label><input class="form-control" id="self-tahunLulus" value="${pegawai.tahunLulus||''}" ${readonlyAttr}></div>
                    </div>
                </div>
                <!-- TAB LAINNYA -->
                <div class="tab-pane fade" id="idt-lainnya">
                    <div class="row g-3">
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Ibu Kandung</label><input class="form-control" id="self-namaIbu" value="${pegawai.namaIbu||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">Status Pernikahan</label>
                            <select class="form-select" id="self-statusNikah" ${disabledAttr}>
                                <option value="">-- Pilih --</option>
                                <option value="Belum Menikah" ${pegawai.statusNikah==='Belum Menikah'?'selected':''}>Belum Menikah</option>
                                <option value="Menikah" ${pegawai.statusNikah==='Menikah'?'selected':''}>Menikah</option>
                                <option value="Cerai" ${pegawai.statusNikah==='Cerai'?'selected':''}>Cerai</option>
                            </select>
                        </div>
                        <div class="col-md-6"><label class="form-label fw-bold">Nama Pasangan</label><input class="form-control" id="self-namaPasangan" value="${pegawai.namaPasangan||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No NPWP</label><input class="form-control" id="self-npwp" value="${pegawai.npwp||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No BPJS Kesehatan</label><input class="form-control" id="self-bpjsKes" value="${pegawai.bpjsKes||''}" ${readonlyAttr}></div>
                        <div class="col-md-6"><label class="form-label fw-bold">No BPJS Ketenagakerjaan</label><input class="form-control" id="self-bpjsTK" value="${pegawai.bpjsTK||''}" ${readonlyAttr}></div>
                    </div>
                </div>
                <!-- TAB KGB -->
                <div class="tab-pane fade" id="idt-kgb">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-primary mb-0"><i class="fas fa-history me-1"></i> Monitor Riwayat KGB</h5>
                        <span class="badge bg-info"><i class="fas fa-info-circle me-1"></i> Mode Read-Only</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-bordered table-striped table-sm" style="font-size: 13px;">
                            <thead class="table-light">
                                <tr>
                                    <th>Nomor SK KGB</th>
                                    <th>Tgl SK</th>
                                    <th>TMT KGB</th>
                                    <th>Jumlah Gaji Pokok</th>
                                    <th>Masa Kerja (Thn)</th>
                                    <th>Masa Kerja (Bln)</th>
                                    <th>File (PDF)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Array.isArray(pegawai.riwayatKGB) && pegawai.riwayatKGB.length > 0 ? 
                                    pegawai.riwayatKGB.map(r => {
                                        if(!r || !r[0]) return '';
                                        const fileBtn = r[6] ? `<button type="button" class="btn btn-sm btn-info text-white" onclick="viewFileApp('${r[6]}')"><i class="fas fa-eye"></i> Lihat PDF</button>` : '-';
                                        return `<tr>
                                            <td>${r[0]}</td>
                                            <td>${formatDate(r[1])}</td>
                                            <td>${formatDate(r[2])}</td>
                                            <td>${r[3] || '-'}</td>
                                            <td>${r[4] || '0'}</td>
                                            <td>${r[5] || '0'}</td>
                                            <td>${fileBtn}</td>
                                        </tr>`;
                                    }).join('') : `<tr><td colspan="7" class="text-center py-3 text-muted">Belum ada riwayat KGB.</td></tr>`
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                <!-- TAB SKUMPTK -->
                <div class="tab-pane fade" id="idt-skumptk">
                    <div class="card border-success">
                        <div class="card-header bg-success text-white">
                            <h5 class="card-title mb-0"><i class="fas fa-print me-1"></i> Cetak SKUMPTK Mandiri</h5>
                        </div>
                        <div class="card-body">
                            <p class="card-text">Anda dapat mencetak Surat Keterangan Untuk Mendapatkan Pembayaran Tunjangan Keluarga (SKUMPTK) secara mandiri. Data akan diambil secara otomatis dari profil Anda di database.</p>
                            <button type="button" class="btn btn-success animate__animated animate__pulse animate__infinite" onclick="cetakSkumptk('${pegawai.nip}')">
                                <i class="fas fa-file-word me-1"></i> Buka Form & Cetak SKUMPTK
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        // Simpan NIP sementara untuk disimpan nanti
        container.dataset.nip = nip;
    } catch(e) {
        console.error('loadInputDataPegawai error', e);
        if (container) container.innerHTML = '<div class="alert alert-danger">Gagal memuat data: ' + e.message + '</div>';
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
    if (pegawaiAsli.kunciData === true || pegawaiAsli.kunciData === 1 || String(pegawaiAsli.kunciData) === '1') {
        return Swal.fire('Terkunci', 'Data Anda dikunci oleh Admin. Tidak dapat menyimpan.', 'warning');
    }

    const getValue = (id) => { const el = document.getElementById(id); return el ? el.value : (pegawaiAsli[id.replace('self-','')] || ''); };

    const dataUpdate = {
        ...pegawaiAsli,
        nama: getValue('self-nama'),
        nik: getValue('self-nik'),
        tempatLahir: getValue('self-tempatLahir'),
        tglLahir: getValue('self-tglLahir'),
        jenisKelamin: getValue('self-jenisKelamin'),
        agama: getValue('self-agama'),
        noHp: getValue('self-noHp'),
        alamat: getValue('self-alamat'),
        pendidikan: getValue('self-pendidikan'),
        jurusan: getValue('self-jurusan'),
        namaSekolah: getValue('self-namaSekolah'),
        tahunLulus: getValue('self-tahunLulus'),
        namaIbu: getValue('self-namaIbu'),
        statusNikah: getValue('self-statusNikah'),
        namaPasangan: getValue('self-namaPasangan'),
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
    const ssoToken = localStorage.getItem(TOKEN_KEY);
    if (!ssoToken) return Swal.fire('Error', 'Sesi tidak valid.', 'error');
    const session = JSON.parse(ssoToken);
    const nip = session.nip;
    if (!nip) return;

    if (typeof dbManager !== 'undefined') {
        const allPegawai = await dbManager.getAllPegawai();
        const pegawai = Array.isArray(allPegawai) ? allPegawai.find(p => String(p.nip) === String(nip)) : null;

        if (!pegawai) {
            Swal.fire('Info', 'Data pegawai belum terdaftar di sistem. Hubungi admin.', 'info');
            return;
        }

        if (pegawai.kunciData === true || pegawai.kunciData === 1 || String(pegawai.kunciData) === '1') {
            Swal.fire('Terkunci', 'Data Anda dikunci oleh Admin. Tidak dapat diedit.', 'warning');
            return;
        }
    }

    if (typeof editPegawai === 'function') {
        const modalEl = document.getElementById('modalPegawai');
        if (modalEl) {
            const content = modalEl.querySelector('.modal-content');
            if (content) {
                const container = document.getElementById('pegawai-input-container');
                if (container && !container.contains(content)) {
                    container.innerHTML = '';
                    container.appendChild(content);
                    content.classList.remove('modal-content');
                    content.classList.add('card', 'shadow-sm', 'border-0', 'w-100');
                    const header = content.querySelector('.modal-header');
                    if(header) header.style.display = 'none';
                    const footer = content.querySelector('.modal-footer');
                    if(footer) footer.classList.replace('modal-footer', 'card-footer');
                    const closeBtn = content.querySelector('button[data-bs-dismiss="modal"]');
                    if(closeBtn) closeBtn.style.display = 'none';
                }
            }
        }
        editPegawai(nip);
        if (typeof nav === 'function') nav('pegawai-input');
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
            const lastColLetter = String.fromCharCode(64 + totalCols);

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
        if(container) container.appendChild(viewUpdate);
    }

    // Pindahkan konten modalPegawai ke view ini
    const modalContent = document.querySelector('#modalPegawai .modal-content');
    if (modalContent) {
        modalContent.style.boxShadow = 'none';
        modalContent.style.border = 'none';
        modalContent.style.borderRadius = '0.5rem';
        const closeBtn = modalContent.querySelector('.btn-close');
        if (closeBtn) closeBtn.style.display = 'none';
        
        viewUpdate.appendChild(modalContent);
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
            if (pegawaiData && pegawaiData.foto && !pegawaiData.foto.includes('placeholder.com') && !pegawaiData.foto.includes('logo-simpeel.png') && (pegawaiData.foto.startsWith('data:image/') || pegawaiData.foto.startsWith('http'))) {
                fotoPegawai = pegawaiData.foto;
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
                        kgbInfo = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> KGB Anda berikutnya jatuh pada <b>${kgbDate}</b> (dalam ${diffDays} hari). Segera persiapkan berkas pengajuan!</div>`;
                    } else if (diffDays <= 0) {
                         kgbInfo = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle"></i> Waktu KGB Anda <b>${kgbDate}</b> sudah tiba/lewat. Harap segera lapor!</div>`;
                    } else {
                        kgbInfo = `<div class="alert alert-info"><i class="fas fa-info-circle"></i> Waktu pengajuan KGB Anda berikutnya: <b>${kgbDate}</b></div>`;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error fetching KGB for dashboard", e);
    }
    
    const html = `
        <div class="row">
            <div class="col-12 mb-4">
                <div class="card shadow-sm border-left-primary py-2 custom-card">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-primary text-uppercase mb-1">Selamat Datang,</div>
                                <div class="h5 mb-0 fw-bold text-gray-800">${user.displayName || 'Pegawai'}</div>
                                <div class="mt-2 text-sm text-muted">Akses informasi data kepegawaian Anda di sini.</div>
                            </div>
                            <div class="col-auto">
                                ${fotoPegawai 
                                    ? `<img src="${fotoPegawai}" alt="Foto Profil" class="rounded-circle shadow-sm border border-3 border-primary" style="width:65px;height:65px;object-fit:cover;object-position:center top;">`
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
                                <span class="badge bg-primary text-white rounded-pill" style="font-size:0.9rem;">${kgbDateStr}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-bottom-0">
                                Gaji Pokok Saat Ini
                                <span class="badge bg-success text-white rounded-pill" style="font-size:0.9rem;">Rp ${gajiPokok}</span>
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
                            <button class="btn btn-primary shadow-sm px-4" onclick="if(typeof cetakSkumptk === 'function') { cetakSkumptk('${nip}'); } else { Swal.fire('Error', 'Fungsi cetak belum siap', 'error'); }">
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
