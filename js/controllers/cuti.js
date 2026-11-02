/**
 * SiMPeEL - Modul Usul Cuti Pegawai (PNS, PPPK, PPPK Paruh Waktu)
 * Menghasilkan Dokumen Word 2 Lembar Sesuai Format Resmi BKN:
 * - Lembar 1: Formulir Permintaan dan Pemberian Cuti
 * - Lembar 2: Surat Permohonan Cuti kepada Kepala Perangkat Daerah
 */

let cachedPegawaiCuti = [];
let cutiTableRenderRequest = 0;
let cutiHistoryRenderRequest = 0;

const TEMPLATE_ALASAN_CUTI = {
  'Cuti Tahunan': 'Untuk keperluan istirahat tahunan, pemulihan kondisi fisik dan pikiran, serta meluangkan waktu bersama keluarga.',
  'Cuti Besar': 'Telah memenuhi masa kerja untuk menunaikan kewajiban keagamaan / keperluan penting keluarga serta penyegaran fisik dan mental.',
  'Cuti Sakit': 'Sedang dalam kondisi sakit dan memerlukan istirahat serta perawatan medis secara intensif sesuai anjuran dan surat keterangan dokter terlampir.',
  'Cuti Melahirkan': 'Untuk keperluan persalinan/melahirkan anak, masa pemulihan kondisi kesehatan ibu, serta perawatan intensif bagi bayi yang baru lahir.',
  'Cuti Karena Alasan Penting': 'Menghadiri serta mengurus kepentingan keluarga yang sangat mendesak dan penting yang memerlukan kehadiran langsung oleh pemohon.',
  'Cuti Diluar Tanggungan Negara': 'Mendampingi suami/istri yang menjalankan tugas kedinasan / pendidikan / keperluan mendesak lainnya di luar tanggungan negara.'
};

/** Hitung Hari Kerja (Senin - Jumat) di antara dua tanggal */
function hitungHariKerja(tglMulaiStr, tglSelesaiStr) {
  if (!tglMulaiStr || !tglSelesaiStr) return 1;
  const start = new Date(tglMulaiStr + 'T00:00:00');
  const end = new Date(tglSelesaiStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  if (end < start) return 1;

  let count = 0;
  let cur = new Date(start.getTime());
  while (cur <= end) {
    const day = cur.getDay(); // 0 = Minggu, 6 = Sabtu
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

/** Handler saat Tanggal Mulai Cuti Diubah */
function onTglMulaiCutiChanged() {
  const elMulai = document.getElementById('cuti_tgl_mulai');
  const elSelesai = document.getElementById('cuti_tgl_selesai');
  if (!elMulai || !elSelesai) return;

  const tglMulai = elMulai.value;
  if (tglMulai) {
    // Tanggal akhir tidak boleh kurang dari tanggal mulai
    elSelesai.min = tglMulai;
    if (elSelesai.value && elSelesai.value < tglMulai) {
      elSelesai.value = tglMulai;
    }
  }

  if (elMulai.value && elSelesai.value) {
    const hariKerja = hitungHariKerja(elMulai.value, elSelesai.value);
    const elLama = document.getElementById('cuti_lama_hari');
    if (elLama) elLama.value = hariKerja;
  }
  updateNarasiCutiOtomatis();
}

/** Handler saat Tanggal Selesai Cuti Diubah */
function onTglSelesaiCutiChanged() {
  const elMulai = document.getElementById('cuti_tgl_mulai');
  const elSelesai = document.getElementById('cuti_tgl_selesai');
  if (!elMulai || !elSelesai) return;

  const tglMulai = elMulai.value;
  if (tglMulai && elSelesai.value && elSelesai.value < tglMulai) {
    elSelesai.value = tglMulai;
  }

  if (elMulai.value && elSelesai.value) {
    const hariKerja = hitungHariKerja(elMulai.value, elSelesai.value);
    const elLama = document.getElementById('cuti_lama_hari');
    if (elLama) elLama.value = hariKerja;
  }
  updateNarasiCutiOtomatis();
}

/** Handler saat Jenis Cuti Diubah di Dropdown */
function onJenisCutiChanged() {
  const elJenis = document.getElementById('cuti_jenis');
  const elAlasan = document.getElementById('cuti_alasan');
  if (!elJenis || !elAlasan) return;

  const jenis = elJenis.value;
  if (TEMPLATE_ALASAN_CUTI[jenis]) {
    elAlasan.value = TEMPLATE_ALASAN_CUTI[jenis];
  }
  sesuaikanInputCatatanCuti();
  updateNarasiCutiOtomatis();
}

/** Menyesuaikan input Accordion V secara cerdas sesuai jenis cuti */
function sesuaikanInputCatatanCuti() {
  const elJenis = document.getElementById('cuti_jenis');
  const jenis = elJenis ? elJenis.value : 'Cuti Tahunan';
  const isTahunan = jenis === 'Cuti Tahunan';

  // Badge Mode
  const badgeMode = document.getElementById('badge_catatan_mode');
  if (badgeMode) {
    badgeMode.textContent = isTahunan ? 'Cuti Tahunan' : `${jenis} Aktif`;
    badgeMode.className = isTahunan
      ? 'badge bg-primary-subtle text-primary border border-primary-subtle ms-2 px-2 py-0'
      : 'badge bg-info-subtle text-info border border-info-subtle ms-2 px-2 py-0';
  }

  // Label Status Tahunan
  const lblTahunan = document.getElementById('lbl_status_tahunan');
  if (lblTahunan) {
    lblTahunan.textContent = isTahunan ? 'Aktif' : 'Terkunci (Default)';
    lblTahunan.className = isTahunan ? 'badge bg-success-subtle text-success border py-0 px-2' : 'badge bg-light text-muted border py-0 px-2';
  }

  // Box Cuti Tahunan
  const boxTahunan = document.getElementById('box_catatan_tahunan');
  if (boxTahunan) {
    if (isTahunan) boxTahunan.classList.remove('opacity-50');
    else boxTahunan.classList.add('opacity-50');
  }

  // Inputs Cuti Tahunan
  ['cuti_sisa_n2', 'cuti_ket_n2', 'cuti_sisa_n1', 'cuti_ket_n1', 'cuti_sisa_n', 'cuti_ket_n'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.readOnly = !isTahunan;
      if (!isTahunan) el.classList.add('bg-light');
      else el.classList.remove('bg-light');
    }
  });

  // Inputs Cuti Lainnya
  const mapLain = {
    'Cuti Besar': { wrap: 'wrap_ket_besar', input: 'cuti_ket_besar' },
    'Cuti Sakit': { wrap: 'wrap_ket_sakit', input: 'cuti_ket_sakit' },
    'Cuti Melahirkan': { wrap: 'wrap_ket_melahirkan', input: 'cuti_ket_melahirkan' },
    'Cuti Karena Alasan Penting': { wrap: 'wrap_ket_alasan_penting', input: 'cuti_ket_alasan_penting' },
    'Cuti Diluar Tanggungan Negara': { wrap: 'wrap_ket_cltn', input: 'cuti_ket_cltn' }
  };

  Object.entries(mapLain).forEach(([namaJenis, config]) => {
    const wrapEl = document.getElementById(config.wrap);
    const inputEl = document.getElementById(config.input);
    if (!inputEl) return;

    if (jenis === namaJenis) {
      inputEl.readOnly = false;
      inputEl.disabled = false;
      inputEl.classList.remove('bg-light');
      inputEl.classList.add('border-primary', 'fw-semibold');
      if (wrapEl) wrapEl.classList.remove('opacity-50');
    } else {
      inputEl.readOnly = true;
      inputEl.classList.remove('border-primary', 'fw-semibold');
      inputEl.classList.add('bg-light');
      if (wrapEl) {
        if (!isTahunan) wrapEl.classList.add('opacity-50');
        else wrapEl.classList.remove('opacity-50');
      }
    }
  });
}

/**
 * Format tanggal ke format bahasa Indonesia (Contoh: 15 November 2026)
 */
function fmtTglIndo(tglStr) {
  if (!tglStr || tglStr === '-') return '-';
  try {
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return tglStr;
  }
}

/**
 * Konversi angka hari menjadi kata terbilang Indonesia
 */
function terbilangAngka(n) {
  n = parseInt(n) || 0;
  const angka = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  if (n < 12) return angka[n];
  if (n < 20) return terbilangAngka(n - 10) + ' belas';
  if (n < 100) return terbilangAngka(Math.floor(n / 10)) + ' puluh' + (n % 10 !== 0 ? ' ' + terbilangAngka(n % 10) : '');
  if (n < 200) return 'seratus' + (n - 100 !== 0 ? ' ' + terbilangAngka(n - 100) : '');
  if (n < 1000) return terbilangAngka(Math.floor(n / 100)) + ' ratus' + (n % 100 !== 0 ? ' ' + terbilangAngka(n % 100) : '');
  return String(n);
}

/**
 * Hitung Masa Kerja Pegawai (Tahun dan Bulan)
 */
function hitungMasaKerjaPegawai(p) {
  let thn = 0;
  let bln = 0;
  try {
    const now = new Date();
    const hitungMK = (tmtStr, thnSK = 0, blnSK = 0) => {
      if (!tmtStr || tmtStr === '-') return { thn: parseInt(thnSK) || 0, bln: parseInt(blnSK) || 0 };
      const tmt = new Date(tmtStr);
      if (isNaN(tmt.getTime())) return { thn: parseInt(thnSK) || 0, bln: parseInt(blnSK) || 0 };
      let years = now.getFullYear() - tmt.getFullYear();
      let months = now.getMonth() - tmt.getMonth();
      if (months < 0) { years--; months += 12; }
      years = Math.max(0, years);
      months = Math.max(0, months);
      let totalBln = (parseInt(blnSK) || 0) + months;
      let addThn = Math.floor(totalBln / 12);
      let remBln = totalBln % 12;
      let totalThn = (parseInt(thnSK) || 0) + years + addThn;
      return { thn: totalThn, bln: remBln };
    };

    if (p && Array.isArray(p.riwayatPangkat) && p.riwayatPangkat.length > 0) {
      const lastPangkat = typeof getLatestRiwayat === 'function'
        ? (getLatestRiwayat(p.riwayatPangkat, 1) || p.riwayatPangkat[p.riwayatPangkat.length - 1])
        : p.riwayatPangkat[p.riwayatPangkat.length - 1];
      if (Array.isArray(lastPangkat)) {
        const res = hitungMK(lastPangkat[1], lastPangkat[5] || 0, lastPangkat[6] || 0);
        thn = res.thn;
        bln = res.bln;
      }
    } else if (p && Array.isArray(p.riwayatKontrak) && p.riwayatKontrak.length > 0) {
      const lastKontrak = typeof getLatestRiwayat === 'function'
        ? (getLatestRiwayat(p.riwayatKontrak, 2) || p.riwayatKontrak[p.riwayatKontrak.length - 1])
        : p.riwayatKontrak[p.riwayatKontrak.length - 1];
      if (Array.isArray(lastKontrak)) {
        const res = hitungMK(lastKontrak[2], lastKontrak[7] || 0, lastKontrak[8] || 0);
        thn = res.thn;
        bln = res.bln;
      }
    } else if (p && p.tmtCpns) {
      const res = hitungMK(p.tmtCpns, 0, 0);
      thn = res.thn;
      bln = res.bln;
    }
  } catch (err) {
    console.warn('[Cuti] Gagal hitung masa kerja pegawai:', err);
  }
  return { thn, bln };
}

/**
 * Render Tabel Daftar Pegawai untuk Usul Cuti (PNS, PPPK, PPPK Paruh Waktu)
 */
async function renderTabelUsulCuti(forceRefresh = false) {
  const renderRequest = ++cutiTableRenderRequest;
  try {
    if (forceRefresh && !isElectron && typeof dbManager.forceFetchFromServer === 'function') {
      const refreshResult = await dbManager.forceFetchFromServer({ refreshUI: false });
      if (!Array.isArray(refreshResult)) {
        throw new Error(refreshResult?.message || 'Server tidak mengembalikan daftar pegawai yang valid.');
      }
    }
    const allPegawai = await dbManager.getAllPegawai();
    if (renderRequest !== cutiTableRenderRequest) return;
    cachedPegawaiCuti = Array.isArray(allPegawai) ? allPegawai.filter(p => p && typeof p === 'object') : [];

    const pengaturan = (typeof dbManager.getPengaturan === 'function' ? await dbManager.getPengaturan() : null) || {};
    if (renderRequest !== cutiTableRenderRequest) return;
    const namaSekolah = pengaturan.namaSekolah || pengaturan.sekolah || 'SMA/SMK/SLB';

    const isMatchStatus = (pStatus, filter) => {
      const s = String(pStatus || '').trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
      const f = String(filter || '').trim().toUpperCase();
      const isParuhWaktu = /\bPARUH\b|\bPW\b/.test(s);
      if (f === 'PNS') return !s || s === 'PNS' || s.startsWith('PNS ') || s.startsWith('CPNS');
      if (f === 'PPPK') return s.includes('PPPK') && !isParuhWaktu;
      if (f === 'PPPK PARUH WAKTU') return s.includes('PPPK') && isParuhWaktu;
      return s === f;
    };

    const isAktif = (p) => {
      const sk = String(p.statusKepegawaian ?? p.statusAktif ?? p.status ?? '').trim().toLowerCase();
      return !/\b(non[\s_-]*aktif|tidak aktif|pensiun|meninggal|berhenti|keluar)\b/.test(sk);
    };

    const buildRows = (list) => {
      return (list || []).map((p, idx) => {
        const mk = hitungMasaKerjaPegawai(p);
        const namaLengkap = typeof generateNamaBergelar === 'function' ? generateNamaBergelar(p.nama, p.riwayatPendidikan) : p.nama;
        const nipStr = typeof escapeHtml === 'function' ? escapeHtml(p.nip || '-') : (p.nip || '-');
        const golStr = typeof escapeHtml === 'function' ? escapeHtml(p.golongan || p.pangkat || '-') : (p.golongan || p.pangkat || '-');
        const jabStr = typeof escapeHtml === 'function' ? escapeHtml(p.jabatan || 'Guru') : (p.jabatan || 'Guru');
        const mkStr = `${mk.thn} Thn ${mk.bln} Bln`;
        const unitStr = typeof escapeHtml === 'function' ? escapeHtml(p.unitKerja || namaSekolah) : (p.unitKerja || namaSekolah);
        const nipEscaped = typeof escapeHtmlJsArgument === 'function' ? escapeHtmlJsArgument(p.nip) : `'${p.nip}'`;

        const btnAksi = `
          <button class="btn btn-sm btn-primary fw-semibold px-2 py-1 shadow-sm" onclick="bukaModalUsulCuti(${nipEscaped})" title="Ajukan Usul Cuti Pegawai">
              <i class="fas fa-calendar-plus me-1"></i>Usul Cuti
          </button>`;

        return [
          idx + 1,
          `<b>${typeof escapeHtml === 'function' ? escapeHtml(namaLengkap) : namaLengkap}</b>`,
          nipStr,
          golStr,
          jabStr,
          mkStr,
          unitStr,
          btnAksi
        ];
      });
    };

    const renderCutiTable = (tableId, filterId, rows, emptyText) => {
      const tableNode = document.getElementById(tableId);
      if (!tableNode || !tableNode.isConnected) return;

      const hasDataTable = $.fn.DataTable.isDataTable(tableNode);
      const dt = hasDataTable
        ? $(tableNode).DataTable()
        : $(tableNode).DataTable({
            data: rows,
            pageLength: 10,
            autoWidth: false,
            dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/id.json', emptyTable: emptyText }
          });

      if (hasDataTable) {
        dt.clear();
        dt.rows.add(rows);
        dt.draw();
      }

      const filter = document.getElementById(filterId);
      if (filter) {
        $(filter).off('keyup').on('keyup', function () { dt.search(this.value).draw(); });
      }
    };

    renderCutiTable(
      'tblCutiPNS',
      'filterCutiPNS',
      buildRows(cachedPegawaiCuti.filter(p => isAktif(p) && isMatchStatus(p.statusPegawai || p.jenisPegawai || p.status, 'PNS'))),
      'Tidak ada data pegawai PNS aktif'
    );
    if (renderRequest !== cutiTableRenderRequest) return;
    renderCutiTable(
      'tblCutiPPPK',
      'filterCutiPPPK',
      buildRows(cachedPegawaiCuti.filter(p => isAktif(p) && isMatchStatus(p.statusPegawai || p.jenisPegawai || p.status, 'PPPK'))),
      'Tidak ada data pegawai PPPK aktif'
    );
    if (renderRequest !== cutiTableRenderRequest) return;
    renderCutiTable(
      'tblCutiPPPKPW',
      'filterCutiPPPKPW',
      buildRows(cachedPegawaiCuti.filter(p => isAktif(p) && isMatchStatus(p.statusPegawai || p.jenisPegawai || p.status, 'PPPK PARUH WAKTU'))),
      'Tidak ada data pegawai PPPK Paruh Waktu aktif'
    );

    requestAnimationFrame(() => {
      ['#tblCutiPNS', '#tblCutiPPPK', '#tblCutiPPPKPW'].forEach(tableId => {
        if ($.fn.DataTable.isDataTable(tableId) && $(tableId).is(':visible')) {
          $(tableId).DataTable().columns.adjust().draw(false);
        }
      });
    });
    return true;

  } catch (err) {
    if (renderRequest !== cutiTableRenderRequest) return true;
    console.error('[Cuti] Gagal merender tabel usul cuti:', err);
    Swal.fire('Gagal Memuat Data Cuti', err.message || 'Data pegawai tidak dapat dimuat.', 'error');
    return false;
  }
}

/**
 * Buka Modal Usul Cuti dan Isi Nilai Form Secara Otomatis
 */
async function bukaModalUsulCuti(nip) {
  try {
    if (!cachedPegawaiCuti || cachedPegawaiCuti.length === 0) {
      cachedPegawaiCuti = await dbManager.getAllPegawai();
    }

    let p = cachedPegawaiCuti.find(x => String(x.nip) === String(nip));
    if (!p) {
      if (!isElectron && typeof dbManager.forceFetchFromServer === 'function') {
        const refreshResult = await dbManager.forceFetchFromServer({ refreshUI: false });
        if (!Array.isArray(refreshResult)) {
          throw new Error(refreshResult?.message || 'Data pegawai gagal dimuat dari server.');
        }
      } else {
        const fresh = await apiCall('getAllPegawai');
        if (!Array.isArray(fresh)) throw new Error(fresh?.message || 'Data pegawai gagal dimuat.');
        cachedPegawaiCuti = fresh;
        dbManager.localData = fresh;
      }
      const refreshed = await dbManager.getAllPegawai();
      cachedPegawaiCuti = Array.isArray(refreshed) ? refreshed : [];
      p = cachedPegawaiCuti.find(x => String(x.nip) === String(nip));
    }
    if (!p) {
      Swal.fire('Data Tidak Ditemukan', 'Pegawai dengan NIP ' + nip + ' tidak ditemukan.', 'warning');
      return;
    }

    const pengaturan = (typeof dbManager.getPengaturan === 'function' ? await dbManager.getPengaturan() : null) || {};
    const namaSekolah = pengaturan.namaSekolah || pengaturan.sekolah || 'SMA/SMK/SLB';
    const namaInstansi = pengaturan.instansiInduk || pengaturan.instansi || 'Dinas Pendidikan Provinsi Jambi';
    const kotaSekolah = pengaturan.kabKota || pengaturan.tempat || 'Jambi';
    const kepsekNama = pengaturan.kepsekNama || '';
    const kepsekNip = pengaturan.kepsekNip || '';

    // Ambil data jabatan dan pangkat terakhir
    const latestJabatan = typeof getLatestRiwayat === 'function' ? getLatestRiwayat(p.riwayatJabatan, 4) : (p.riwayatJabatan?.length ? p.riwayatJabatan[p.riwayatJabatan.length - 1] : null);
    const latestPangkat = typeof getLatestRiwayat === 'function' ? getLatestRiwayat(p.riwayatPangkat, 1) : (p.riwayatPangkat?.length ? p.riwayatPangkat[p.riwayatPangkat.length - 1] : null);
    const latestKontrak = typeof getLatestRiwayat === 'function' ? getLatestRiwayat(p.riwayatKontrak, 2) : (p.riwayatKontrak?.length ? p.riwayatKontrak[p.riwayatKontrak.length - 1] : null);

    let namaJabatanTerakhir = p.jabatan || 'Guru';
    if (latestJabatan && latestJabatan[2]) {
      namaJabatanTerakhir = latestJabatan[2];
    } else if (latestKontrak && latestKontrak[0]) {
      namaJabatanTerakhir = latestKontrak[0];
    }

    let golStr = p.golongan || (p.pangkat ? p.pangkat : '-');
    if (latestPangkat && latestPangkat[0]) {
      golStr = (p.pangkat ? p.pangkat + ' / ' : '') + latestPangkat[0];
    } else if (latestKontrak && latestKontrak[1]) {
      golStr = latestKontrak[1];
    }

    const mk = hitungMasaKerjaPegawai(p);
    const namaLengkap = typeof generateNamaBergelar === 'function' ? generateNamaBergelar(p.nama, p.riwayatPendidikan) : p.nama;

    // Set hidden & badge
    document.getElementById('cuti_id_pegawai').value = p.nip;
    const badge = document.getElementById('cuti_badge_status');
    if (badge) {
      badge.textContent = p.statusPegawai || 'PNS';
      badge.className = p.statusPegawai === 'PPPK' ? 'badge bg-success fw-bold px-2 py-1' : (p.statusPegawai?.includes('Paruh') ? 'badge bg-warning text-dark fw-bold px-2 py-1' : 'badge bg-primary text-white fw-bold px-2 py-1');
    }

    // Section 1: Data Pegawai (Read-only Display & Hidden Values)
    document.getElementById('cuti_nama').value = namaLengkap;
    const dNama = document.getElementById('cuti_nama_display');
    if (dNama) dNama.textContent = namaLengkap;

    document.getElementById('cuti_nip').value = p.nip || '-';
    const dNip = document.getElementById('cuti_nip_display');
    if (dNip) dNip.textContent = p.nip || '-';

    document.getElementById('cuti_golongan').value = golStr;
    const dGol = document.getElementById('cuti_golongan_display');
    if (dGol) dGol.textContent = golStr;

    document.getElementById('cuti_jabatan').value = namaJabatanTerakhir;
    const dJab = document.getElementById('cuti_jabatan_display');
    if (dJab) dJab.textContent = namaJabatanTerakhir;

    document.getElementById('cuti_mk_tahun').value = mk.thn;
    document.getElementById('cuti_mk_bulan').value = mk.bln;
    const dMk = document.getElementById('cuti_mk_display');
    if (dMk) dMk.textContent = `${mk.thn} Tahun ${mk.bln} Bulan`;

    const unitKerjaStr = p.unitKerja || namaSekolah;
    document.getElementById('cuti_unit_kerja').value = unitKerjaStr;
    const dUnit = document.getElementById('cuti_unit_kerja_display');
    if (dUnit) dUnit.textContent = unitKerjaStr;

    // Section 2: Detail Cuti (Jenis, Tanggal, Lama Hari Kerja, Alasan)
    const defaultJenis = 'Cuti Tahunan';
    document.getElementById('cuti_jenis').value = defaultJenis;
    document.getElementById('cuti_alasan').value = TEMPLATE_ALASAN_CUTI[defaultJenis];

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Cari tanggal selesai yang menghasilkan 3 hari kerja awal
    let tempDate = new Date(now.getTime());
    let countedDays = 0;
    while (countedDays < 3) {
      const dDay = tempDate.getDay();
      if (dDay !== 0 && dDay !== 6) countedDays++;
      if (countedDays < 3) tempDate.setDate(tempDate.getDate() + 1);
    }
    const finishStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;

    const elMulai = document.getElementById('cuti_tgl_mulai');
    const elSelesai = document.getElementById('cuti_tgl_selesai');
    elMulai.value = todayStr;
    elSelesai.value = finishStr;
    elSelesai.min = todayStr; // Validasi: tanggal selesai tidak boleh kurang dari tanggal mulai

    const hariKerjaAwal = hitungHariKerja(todayStr, finishStr);
    document.getElementById('cuti_lama_hari').value = hariKerjaAwal;

    // Section 3: Kontak & Alamat Cuti
    document.getElementById('cuti_alamat_cuti').value = p.alamat || kotaSekolah;
    document.getElementById('cuti_telepon').value = p.noHp || p.telepon || '-';

    // Section 4: Catatan Cuti (N-2, N-1, N)
    const curYear = now.getFullYear();
    document.getElementById('cuti_lbl_n2').textContent = `N-2 (${curYear - 2})`;
    document.getElementById('cuti_lbl_n1').textContent = `N-1 (${curYear - 1})`;
    document.getElementById('cuti_lbl_n').textContent = `N (${curYear})`;

    document.getElementById('cuti_sisa_n2').value = 0;
    document.getElementById('cuti_ket_n2').value = '-';
    document.getElementById('cuti_sisa_n1').value = 6;
    document.getElementById('cuti_ket_n1').value = 'Sisa cuti tahun lalu';
    document.getElementById('cuti_sisa_n').value = 12;
    document.getElementById('cuti_ket_n').value = 'Hak cuti tahun berjalan';
    document.getElementById('cuti_ket_besar').value = '-';
    document.getElementById('cuti_ket_sakit').value = '-';
    document.getElementById('cuti_ket_melahirkan').value = '-';
    document.getElementById('cuti_ket_alasan_penting').value = '-';
    document.getElementById('cuti_ket_cltn').value = '-';

    // Section 5: Tempat, Tgl & Pejabat
    document.getElementById('cuti_kota_surat').value = kotaSekolah;
    document.getElementById('cuti_tgl_surat').value = todayStr;
    let tujuanRekomendasi = 'Kepala Dinas Pendidikan Provinsi Jambi';
    if (pengaturan.opd && pengaturan.opd.toLowerCase().includes('pendidikan')) {
      tujuanRekomendasi = `Kepala ${pengaturan.opd}`;
    } else if (pengaturan.instansi && pengaturan.instansi.toLowerCase().includes('pendidikan')) {
      tujuanRekomendasi = `Kepala ${pengaturan.instansi}`;
    }
    document.getElementById('cuti_tujuan_surat').value = tujuanRekomendasi;
    document.getElementById('cuti_nama_atasan').value = kepsekNama;
    document.getElementById('cuti_nip_atasan').value = kepsekNip;
    document.getElementById('cuti_nama_pejabat').value = pengaturan.pejabatNama || '';
    document.getElementById('cuti_nip_pejabat').value = pengaturan.pejabatNip || '';

    // Sesuaikan input Accordion V secara cerdas
    sesuaikanInputCatatanCuti();

    // Update narasi surat otomatis
    updateNarasiCutiOtomatis();

    // Tampilkan modal
    const modalEl = document.getElementById('modalUsulCuti');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();

  } catch (err) {
    console.error('[Cuti] Gagal membuka modal usul cuti:', err);
    Swal.fire('Error', 'Gagal memuat formulir usul cuti: ' + err.message, 'error');
  }
}

/** Otomatis menyusun narasi permohonan surat lembar ke-2 (sinkron dengan Tabel III Alasan Cuti) */
function updateNarasiCutiOtomatis() {
  try {
    const jenis = document.getElementById('cuti_jenis')?.value || 'Cuti Tahunan';
    const lamaHari = parseInt(document.getElementById('cuti_lama_hari')?.value) || 1;
    const terbilangHari = terbilangAngka(lamaHari);
    const tglMulai = document.getElementById('cuti_tgl_mulai')?.value;
    const tglSelesai = document.getElementById('cuti_tgl_selesai')?.value;
    const alasan = document.getElementById('cuti_alasan')?.value?.trim() || TEMPLATE_ALASAN_CUTI[jenis] || 'keperluan keluarga';

    const tglMulaiIndo = fmtTglIndo(tglMulai);
    const tglSelesaiIndo = fmtTglIndo(tglSelesai);

    // Narasi resmi dan profesional sesuai format baku surat permohonan cuti BKN
    const cleanAlasan = alasan.replace(/\.+$/, '');
    const narasi = `Bermaksud untuk mengajukan ${jenis} selama ${lamaHari} (${terbilangHari}) hari kerja, terhitung mulai tanggal ${tglMulaiIndo} sampai dengan tanggal ${tglSelesaiIndo}, dikarenakan ${cleanAlasan}.`;

    const elNarasi = document.getElementById('cuti_narasi_surat');
    if (elNarasi) {
      elNarasi.value = narasi;
    }
  } catch (e) {
    console.warn('[Cuti] Gagal memperbarui narasi cuti:', e);
  }
}

function kumpulkanDataCuti() {
  const lamaHari = parseInt(document.getElementById('cuti_lama_hari').value) || 1;
  const curYear = new Date().getFullYear();

  return {
    nama: document.getElementById('cuti_nama').value || '-',
    nip: document.getElementById('cuti_nip').value || '-',
    golongan: document.getElementById('cuti_golongan').value || '-',
    jabatan: document.getElementById('cuti_jabatan').value || '-',
    mkTahun: document.getElementById('cuti_mk_tahun').value || '0',
    mkBulan: document.getElementById('cuti_mk_bulan').value || '0',
    unitKerja: document.getElementById('cuti_unit_kerja').value || '-',

    jenisCuti: document.getElementById('cuti_jenis').value || 'Cuti Tahunan',
    lamaHari: lamaHari,
    terbilangHari: terbilangAngka(lamaHari),
    tglMulai: document.getElementById('cuti_tgl_mulai').value,
    tglMulaiIndo: fmtTglIndo(document.getElementById('cuti_tgl_mulai').value),
    tglSelesai: document.getElementById('cuti_tgl_selesai').value,
    tglSelesaiIndo: fmtTglIndo(document.getElementById('cuti_tgl_selesai').value),
    alasan: document.getElementById('cuti_alasan').value || '-',

    alamatCuti: document.getElementById('cuti_alamat_cuti').value || '-',
    telepon: document.getElementById('cuti_telepon').value || '-',

    curYear: curYear,
    sisaN2: document.getElementById('cuti_sisa_n2').value || '0',
    ketN2: document.getElementById('cuti_ket_n2').value || '-',
    sisaN1: document.getElementById('cuti_sisa_n1').value || '0',
    ketN1: document.getElementById('cuti_ket_n1').value || '-',
    sisaN: document.getElementById('cuti_sisa_n').value || '0',
    ketN: document.getElementById('cuti_ket_n').value || '-',
    ketBesar: document.getElementById('cuti_ket_besar').value || '-',
    ketSakit: document.getElementById('cuti_ket_sakit').value || '-',
    ketMelahirkan: document.getElementById('cuti_ket_melahirkan').value || '-',
    ketAlasanPenting: document.getElementById('cuti_ket_alasan_penting').value || '-',
    ketCltn: document.getElementById('cuti_ket_cltn').value || '-',

    kotaSurat: document.getElementById('cuti_kota_surat').value || 'Jambi',
    tglSurat: document.getElementById('cuti_tgl_surat').value,
    tglSuratIndo: fmtTglIndo(document.getElementById('cuti_tgl_surat').value),
    tujuanSurat: document.getElementById('cuti_tujuan_surat').value || 'Kepala Dinas Pendidikan Provinsi Jambi',
    namaAtasan: document.getElementById('cuti_nama_atasan').value || '...........................................',
    nipAtasan: document.getElementById('cuti_nip_atasan').value || '...........................................',
    namaPejabat: document.getElementById('cuti_nama_pejabat').value || '...........................................',
    nipPejabat: document.getElementById('cuti_nip_pejabat').value || '....................................',

    narasiSurat: document.getElementById('cuti_narasi_surat').value || ''
  };
}

/**
 * Bangun Dokumen Word HTML 2 Lembar Tepat Sesuai Format Referensi BKN
 */
function generateHtmlDokumenCuti(d) {
  const isJenis = (nama) => d.jenisCuti.toLowerCase() === nama.toLowerCase() ? '&#10003;' : '&nbsp;';

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>Formulir Permintaan dan Pemberian Cuti - ${d.nama}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  body {
    font-family: "Times New Roman", serif;
    font-size: 10pt;
    color: #000;
    margin: 0;
    line-height: 1.15;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 4px;
    font-size: 10pt;
  }
  td, th {
    padding: 2px 4px;
    vertical-align: middle;
    font-size: 10pt;
  }
  .border-table, .border-table td, .border-table th {
    border: 1px solid black;
  }
  .header-tbl {
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: left;
    font-size: 10pt;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  p { margin: 0; padding: 0; font-size: 10pt; }
  .surat-p { font-size: 11pt; line-height: 1.5; font-family: "Times New Roman", serif; }
  .surat-table td { font-size: 11pt; padding: 1.5px 0; line-height: 1.25; }
  
  @page Section1 {
    size: 21.59cm 33.02cm;
    margin: 0.8cm 1.2cm 0.6cm 1.4cm;
    mso-header-margin: 18pt;
    mso-footer-margin: 18pt;
  }
  div.Section1 {
    page: Section1;
  }

  @page Section2 {
    size: 21.59cm 33.02cm;
    margin: 1.8cm 1.8cm 1.5cm 2.2cm;
    mso-header-margin: 36pt;
    mso-footer-margin: 36pt;
  }
  div.Section2 {
    page: Section2;
  }
</style>
</head>
<body>

<!-- ======================================================== -->
<!-- LEMBAR 1: FORMULIR LENGKAP BKN (TABEL I - VIII GABUNG 1 LEMBAR) -->
<!-- ======================================================== -->
<div class="Section1">

  <!-- Bagian Atas: Tujuan Surat Form & Tempat Tanggal Otomatis -->
  <table style="width: 100%; border: none; margin-bottom: 12px; font-size: 10pt;">
    <tr>
      <td style="width: 50%;"></td>
      <td style="width: 50%; font-size: 10pt; line-height: 1.25; vertical-align: top; padding-left: 10px;">
        ${d.kotaSurat}, ${d.tglSuratIndo || d.tglSurat || '.................... 20...'}<br>
        Kepada<br>
        Yth. ${d.tujuanSurat}<br>
        di –<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${d.kotaSurat}
      </td>
    </tr>
  </table>

  <!-- Judul Dokumen (12pt / 12px Tebal) -->
  <div style="text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 6px; letter-spacing: 0.5px;">
    FORMULIR PERMINTAAN DAN PEMBERIAN CUTI
  </div>

  <!-- TABEL I: DATA PEGAWAI -->
  <table class="border-table">
    <tr class="header-tbl">
      <td colspan="4">I. DATA PEGAWAI</td>
    </tr>
    <tr>
      <td style="width: 18%;">Nama</td>
      <td style="width: 42%; font-weight: bold;">${d.nama}</td>
      <td style="width: 15%;">NIP</td>
      <td style="width: 25%; font-weight: bold;">${d.nip}</td>
    </tr>
    <tr>
      <td>Jabatan</td>
      <td>${d.jabatan}</td>
      <td>Masa Kerja</td>
      <td>${d.mkTahun} Tahun &nbsp; ${d.mkBulan} Bulan</td>
    </tr>
    <tr>
      <td>Unit Kerja</td>
      <td colspan="3">${d.unitKerja}</td>
    </tr>
  </table>

  <!-- TABEL II: CUTI YANG DIAMBIL -->
  <table class="border-table">
    <tr class="header-tbl">
      <td colspan="4">II. JENIS CUTI YANG DIAMBIL</td>
    </tr>
    <tr>
      <td style="width: 40%;">1. Cuti Tahunan</td>
      <td style="width: 10%; text-align: center; font-weight: bold; font-size: 10pt;">${isJenis('Cuti Tahunan')}</td>
      <td style="width: 40%;">2. Cuti Besar</td>
      <td style="width: 10%; text-align: center; font-weight: bold; font-size: 10pt;">${isJenis('Cuti Besar')}</td>
    </tr>
    <tr>
      <td>3. Cuti Sakit</td>
      <td style="text-align: center; font-weight: bold; font-size: 10pt;">${isJenis('Cuti Sakit')}</td>
      <td>4. Cuti Melahirkan</td>
      <td style="text-align: center; font-weight: bold; font-size: 10pt;">${isJenis('Cuti Melahirkan')}</td>
    </tr>
    <tr>
      <td>5. Cuti Karena Alasan Penting</td>
      <td style="text-align: center; font-weight: bold; font-size: 10pt;">${isJenis('Cuti Karena Alasan Penting')}</td>
      <td>6. Cuti Diluar Tanggungan Negara</td>
      <td style="text-align: center; font-weight: bold; font-size: 10pt;">${isJenis('Cuti Diluar Tanggungan Negara')}</td>
    </tr>
  </table>

  <!-- TABEL III: ALASAN CUTI (KIRA-KIRA 3 BARIS, FLEKSIBEL JIKA LEBIH PANJANG) -->
  <table class="border-table">
    <tr class="header-tbl">
      <td>III. ALASAN CUTI</td>
    </tr>
    <tr>
      <td style="padding: 4px 6px; height: 48px; min-height: 48px; vertical-align: top; font-size: 10pt; line-height: 1.35;">
        ${d.alasan}
      </td>
    </tr>
  </table>

  <!-- TABEL IV: LAMANYA CUTI -->
  <table class="border-table">
    <tr class="header-tbl">
      <td colspan="6">IV. LAMANYA CUTI</td>
    </tr>
    <tr>
      <td style="width: 10%;">Selama</td>
      <td style="width: 28%; font-weight: bold;">${d.lamaHari} (${d.terbilangHari}) hari kerja</td>
      <td style="width: 15%;">Mulai tanggal</td>
      <td style="width: 20%; text-align: center;">${d.tglMulaiIndo}</td>
      <td style="width: 5%; text-align: center;">s/d</td>
      <td style="width: 22%; text-align: center;">${d.tglSelesaiIndo}</td>
    </tr>
  </table>

  <!-- TABEL V: CATATAN CUTI -->
  <table class="border-table">
    <tr class="header-tbl">
      <td colspan="5">V. CATATAN CUTI</td>
    </tr>
    <tr>
      <td colspan="3" style="text-align: center; font-weight: bold; width: 50%;">1. CUTI TAHUNAN</td>
      <td style="width: 35%; font-weight: bold;">2. CUTI BESAR</td>
      <td style="width: 15%; text-align: center;">${d.ketBesar}</td>
    </tr>
    <tr style="text-align: center; font-size: 10pt; font-weight: bold; background-color: #fafafa;">
      <td style="width: 15%;">Tahun</td>
      <td style="width: 15%;">Sisa (Hari)</td>
      <td style="width: 20%;">Keterangan</td>
      <td style="text-align: left; font-size: 10pt; font-weight: bold;">3. CUTI SAKIT</td>
      <td style="text-align: center;">${d.ketSakit}</td>
    </tr>
    <tr>
      <td style="text-align: center;">N-2</td>
      <td style="text-align: center;">${d.sisaN2}</td>
      <td>${d.ketN2}</td>
      <td style="font-weight: bold;">4. CUTI MELAHIRKAN</td>
      <td style="text-align: center;">${d.ketMelahirkan}</td>
    </tr>
    <tr>
      <td style="text-align: center;">N-1</td>
      <td style="text-align: center;">${d.sisaN1}</td>
      <td>${d.ketN1}</td>
      <td style="font-weight: bold;">5. CUTI KARENA ALASAN PENTING</td>
      <td style="text-align: center;">${d.ketAlasanPenting}</td>
    </tr>
    <tr>
      <td style="text-align: center;">N</td>
      <td style="text-align: center;">${d.sisaN}</td>
      <td>${d.ketN}</td>
      <td style="font-weight: bold;">6. CUTI DI LUAR TANGGUNGAN NEGARA</td>
      <td style="text-align: center;">${d.ketCltn}</td>
    </tr>
  </table>

  <!-- TABEL VI: ALAMAT SELAMA MENJALANKAN CUTI -->
  <table class="border-table">
    <tr class="header-tbl">
      <td colspan="3">VI. ALAMAT SELAMA MENJALANKAN CUTI</td>
    </tr>
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 3px;" rowspan="2">
        ${d.alamatCuti}
      </td>
      <td style="width: 12%;">TELP.</td>
      <td style="width: 38%;">${d.telepon}</td>
    </tr>
    <tr>
      <td colspan="2" style="text-align: center; vertical-align: bottom; padding: 4px; height: 55px;">
        Hormat Saya,<br><br><br><br>
        <b><u>${d.nama}</u></b><br>
        NIP. ${d.nip}
      </td>
    </tr>
  </table>

  <!-- TABEL VII: PERTIMBANGAN ATASAN LANGSUNG -->
  <table class="border-table">
    <tr class="header-tbl">
      <td colspan="4">VII. PERTIMBANGAN ATASAN LANGSUNG</td>
    </tr>
    <tr style="text-align: center; font-weight: bold; font-size: 10pt;">
      <td style="width: 25%;">DISETUJUI</td>
      <td style="width: 25%;">PERUBAHAN</td>
      <td style="width: 25%;">DITANGGUHKAN</td>
      <td style="width: 25%;">TIDAK DISETUJUI</td>
    </tr>
    <tr style="height: 12px;">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr>
      <td colspan="3" style="border-right: none;"></td>
      <td style="text-align: center; vertical-align: bottom; border-left: none; padding: 4px; height: 55px;">
        Tertanda,<br><br><br><br>
        <b><u>${d.namaAtasan}</u></b><br>
        NIP. ${d.nipAtasan}
      </td>
    </tr>
  </table>

  <!-- TABEL VIII: KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI -->
  <table class="border-table" style="margin-bottom: 0;">
    <tr class="header-tbl">
      <td colspan="4">VIII. KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI</td>
    </tr>
    <tr style="text-align: center; font-weight: bold; font-size: 10pt;">
      <td style="width: 25%;">DISETUJUI</td>
      <td style="width: 25%;">PERUBAHAN</td>
      <td style="width: 25%;">DITANGGUHKAN</td>
      <td style="width: 25%;">TIDAK DISETUJUI</td>
    </tr>
    <tr style="height: 12px;">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
    <tr>
      <td colspan="3" style="border-right: none;"></td>
      <td style="text-align: center; vertical-align: bottom; border-left: none; padding: 4px; height: 55px;">
        Tertanda,<br><br><br><br>
        <b><u>${d.namaPejabat}</u></b><br>
        NIP. ${d.nipPejabat}
      </td>
    </tr>
  </table>

</div>

<!-- SEPARATOR HALAMAN MS WORD (STANDAR RESMI MSO SECTION BREAK) -->
<br clear="all" style="page-break-before:always; mso-break-type:section-break">

<!-- ========================================== -->
<!-- LEMBAR 2: SURAT PERMOHONAN RESMI KE KADIS -->
<!-- ========================================== -->
<div class="Section2">

  <p class="surat-p" style="margin: 0 0 16pt 0; line-height: 1.3;">
    Kepada Yth.<br>
    <b>${d.tujuanSurat}</b><br>
    di &ndash;<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Tempat
  </p>

  <p class="surat-p" style="margin: 0 0 12pt 0; line-height: 1.3;">
    Assalamu&rsquo;alaikum Wr. Wb.<br>
    Dengan Hormat,
  </p>

  <p class="surat-p" style="margin: 0 0 8pt 0; line-height: 1.3;">
    Saya yang bertanda tangan di bawah ini:
  </p>

  <!-- BIODATA PEMOHON (KOMPAK, RAPI, JARAK DEKAT DENGAN TITIK DUA) -->
  <table class="surat-table" style="border: none; margin: 0 0 12pt 24pt; width: 90%; font-size: 11pt; line-height: 1.25;">
    <tr>
      <td style="width: 125px; padding: 1.5px 0; vertical-align: top;">Nama</td>
      <td style="padding: 1.5px 0; vertical-align: top;">:&nbsp;&nbsp;<b>${d.nama}</b></td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0; vertical-align: top;">N I P</td>
      <td style="padding: 1.5px 0; vertical-align: top;">:&nbsp;&nbsp;<b>${d.nip}</b></td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0; vertical-align: top;">Pangkat/Gol</td>
      <td style="padding: 1.5px 0; vertical-align: top;">:&nbsp;&nbsp;${d.golongan}</td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0; vertical-align: top;">Jabatan</td>
      <td style="padding: 1.5px 0; vertical-align: top;">:&nbsp;&nbsp;${d.jabatan}</td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0; vertical-align: top;">Masa Kerja</td>
      <td style="padding: 1.5px 0; vertical-align: top;">:&nbsp;&nbsp;${d.mkTahun} Tahun ${d.mkBulan} Bulan</td>
    </tr>
    <tr>
      <td style="padding: 1.5px 0; vertical-align: top;">Unit Kerja</td>
      <td style="padding: 1.5px 0; vertical-align: top;">:&nbsp;&nbsp;${d.unitKerja}</td>
    </tr>
  </table>

  <p class="surat-p" style="text-align: justify; text-indent: 36pt; margin: 0 0 12pt 0;">
    ${d.narasiSurat}
  </p>

  <p class="surat-p" style="text-align: justify; text-indent: 36pt; margin: 0 0 12pt 0;">
    Selama menjalankan ${d.jenisCuti}, alamat saya adalah di <b>${d.alamatCuti}</b> (No. Telp/WA: <b>${d.telepon}</b>).
  </p>

  <p class="surat-p" style="text-align: justify; text-indent: 36pt; margin: 0 0 14pt 0;">
    Demikian surat permohonan ini saya sampaikan, atas perhatian dan perkenan Bapak/Ibu saya ucapkan terima kasih.
  </p>

  <p class="surat-p" style="margin: 0 0 18pt 0; line-height: 1.3;">
    Wassalamu&rsquo;alaikum Wr. Wb.
  </p>

  <table class="surat-table" style="width: 100%; border: none;">
    <tr>
      <td style="width: 50%;"></td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        ${d.kotaSurat}, ${d.tglSuratIndo}<br>
        Pemohon,<br><br><br><br><br>
        <b><u>${d.nama}</u></b><br>
        NIP. ${d.nip}
      </td>
    </tr>
  </table>

</div>

</body>
</html>`;
}

/**
 * Styling Khusus Pratinjau Cuti di Layar (Folio Portrait untuk Section1 dan Section2)
 */
function cutiPreviewHtml(html) {
  const previewStyles = `<style>
    @media screen {
      html { background: #525659; }
      body { margin: 0 !important; padding: 20px !important; background: #525659 !important; }
      .Section1, .Section2 {
        box-sizing: border-box !important;
        background: #fff !important;
        margin: 0 auto 25px !important;
        padding: 10mm 15mm !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
        width: 215.9mm !important;
        min-height: 330.2mm !important;
      }
    }
    @media print {
      body { padding: 0 !important; background: #fff !important; }
      .Section1, .Section2 { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
    }
  </style>`;
  return html.includes('</head>') ? html.replace('</head>', `${previewStyles}</head>`) : `${previewStyles}${html}`;
}

function pratinjauDokumenCuti(dataCustom = null) {
  try {
    const d = dataCustom || kumpulkanDataCuti();
    const html = generateHtmlDokumenCuti(d);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const cleanNama = (d.nama || d.nip).replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `FORMULIR_CUTI_${cleanNama}.doc`;

    if (typeof openFilePreview === 'function') {
      const previewHtml = cutiPreviewHtml(html);
      openFilePreview({ fileName, blob, html: previewHtml, mimeType: 'application/msword' });
    } else {
      // Fallback pratinjau dalam jendela baru
      const win = window.open('', '_blank');
      win.document.write(cutiPreviewHtml(html));
      win.document.close();
    }
  } catch (err) {
    console.error('[Cuti] Gagal membuat pratinjau dokumen cuti:', err);
    Swal.fire('Error', 'Gagal memproses pratinjau: ' + err.message, 'error');
  }
}

/**
 * Unduh Dokumen Word (.doc) 2 Lembar Secara Langsung
 */
function unduhDokumenCutiWord(dataCustom = null) {
  try {
    const d = dataCustom || kumpulkanDataCuti();
    const html = generateHtmlDokumenCuti(d);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const cleanNama = (d.nama || d.nip).replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `FORMULIR_CUTI_${cleanNama}.doc`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);

    if (typeof recordSimpeelActivity === 'function') {
      recordSimpeelActivity('Unduh Dokumen Cuti', 'success', `Unduh dokumen formulir cuti untuk ${d.nama}`);
    }
  } catch (err) {
    console.error('[Cuti] Gagal mengunduh dokumen cuti:', err);
    Swal.fire('Error', 'Gagal mengunduh file: ' + err.message, 'error');
  }
}

/**
 * Cetak Dokumen Cuti Langsung / Simpan Sebagai PDF
 */
function cetakDokumenCuti() {
  try {
    const d = kumpulkanDataCuti();
    const html = generateHtmlDokumenCuti(d);

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '215.9mm';
    printFrame.style.height = '330.2mm';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument.document || printFrame.contentDocument;
    frameDoc.document.open();
    frameDoc.document.write(html);
    frameDoc.document.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        printFrame.remove();
      }, 2000);
    }, 500);
  } catch (err) {
    console.error('[Cuti] Gagal mencetak dokumen cuti:', err);
    Swal.fire('Error', 'Gagal mencetak dokumen: ' + err.message, 'error');
  }
}


// ============================================================
// FITUR RIWAYAT USULAN CUTI (PERSISTENCE & PREVIEW/DOWNLOAD)
// ============================================================
const STORAGE_KEY_RIWAYAT_CUTI = "SIMPEEL_RIWAYAT_CUTI";

async function getDaftarRiwayatCuti(forceRefresh = false) {
  try {
    if (typeof dbManager !== 'undefined' && typeof dbManager.getRiwayatCuti === 'function') {
      const list = await dbManager.getRiwayatCuti(forceRefresh);
      if (Array.isArray(list)) return list;
      if (forceRefresh) throw new Error(list?.message || 'Riwayat cuti tidak dapat dimuat dari server.');
    }
  } catch (e) {
    if (forceRefresh) throw e;
    console.warn('[Cuti] Gagal load riwayat dari database:', e);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RIWAYAT_CUTI);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

async function simpanUsulanCuti() {
  try {
    const d = kumpulkanDataCuti();
    if (!d.nip || d.nip === "-") {
      Swal.fire("Data Belum Lengkap", "Pilih pegawai terlebih dahulu sebelum menyimpan usulan cuti.", "warning");
      return;
    }

    const badgeStatus = document.getElementById("cuti_badge_status")?.textContent?.trim() || "PNS";

    const item = {
      id: "CUTI_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      savedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tglSuratIndo: d.tglSuratIndo || d.tglSurat || '-',
      tglSurat: d.tglSurat || '-',
      nama: d.nama,
      nip: d.nip,
      statusPegawai: badgeStatus,
      golongan: d.golongan,
      jabatan: d.jabatan,
      unitKerja: d.unitKerja,
      jenisCuti: d.jenisCuti,
      lamaHari: d.lamaHari,
      terbilangHari: d.terbilangHari,
      tglMulaiIndo: d.tglMulaiIndo || d.tglMulai || '-',
      tglMulai: d.tglMulai || '-',
      tglSelesaiIndo: d.tglSelesaiIndo || d.tglSelesai || '-',
      tglSelesai: d.tglSelesai || '-',
      alasan: d.alasan,
      dataLengkap: d
    };

    // Tampilkan loading saat menyimpan ke database
    Swal.fire({
      title: 'Menyimpan Usulan Cuti...',
      text: 'Menyimpan ke database...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    if (typeof dbManager !== 'undefined' && typeof dbManager.saveRiwayatCuti === 'function') {
      const result = await dbManager.saveRiwayatCuti(item);
      if (!result || result.success !== true) {
        throw new Error(result?.message || 'Usulan cuti gagal disimpan.');
      }
    } else {
      let list = JSON.parse(localStorage.getItem(STORAGE_KEY_RIWAYAT_CUTI) || '[]') || [];
      list.unshift(item);
      localStorage.setItem(STORAGE_KEY_RIWAYAT_CUTI, JSON.stringify(list));
    }

    const modalEl = document.getElementById("modalUsulCuti");
    if (modalEl) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }

    Swal.fire({
      icon: "success",
      title: "Usulan Cuti Berhasil Disimpan!",
      html: `Usulan <b>${typeof escapeHtml === "function" ? escapeHtml(d.jenisCuti) : d.jenisCuti}</b> (${d.lamaHari} hari kerja) untuk <b>${typeof escapeHtml === "function" ? escapeHtml(d.nama) : d.nama}</b> telah tersimpan permanen di database.`,
      confirmButtonText: '<i class="fas fa-history me-1"></i> Buka Riwayat Cuti',
      showCancelButton: true,
      cancelButtonText: "Selesai"
    }).then((res) => {
      renderTabelRiwayatCuti(true);
      if (res.isConfirmed) {
        const tabBtn = document.getElementById("tab-cuti-riwayat");
        if (tabBtn && window.bootstrap) {
          bootstrap.Tab.getOrCreateInstance(tabBtn).show();
        }
      }
    });

  } catch (err) {
    console.error("[Cuti] Gagal menyimpan usulan cuti:", err);
    Swal.fire("Error", "Gagal menyimpan usulan cuti: " + err.message, "error");
  }
}

/** Render Tabel Riwayat Usulan Cuti */
async function renderTabelRiwayatCuti(forceRefresh = false) {
  const renderRequest = ++cutiHistoryRenderRequest;
  try {
    const list = await getDaftarRiwayatCuti(forceRefresh);
    if (renderRequest !== cutiHistoryRenderRequest) return;
    const tblEl = $("#tblCutiRiwayat");
    if (!tblEl.length) return;
    const tableNode = tblEl[0];
    if (!tableNode.isConnected) return true;
    const hasDataTable = $.fn.DataTable.isDataTable(tableNode);

    const rows = (list || []).map((item, idx) => {
      const badgeClass = item.statusPegawai === "PPPK"
        ? "badge bg-success"
        : (String(item.statusPegawai || '').includes("Paruh") ? "badge bg-warning text-dark" : "badge bg-primary");

      const jenisBadgeClass = item.jenisCuti === "Cuti Tahunan" ? "badge bg-info text-dark" : "badge bg-secondary";
      const escNama = typeof escapeHtml === "function" ? escapeHtml(item.nama) : item.nama;
      const escAlasan = typeof escapeHtml === "function" ? escapeHtml(item.alasan) : item.alasan;
      const escStatus = typeof escapeHtml === "function" ? escapeHtml(item.statusPegawai || "PNS") : item.statusPegawai;
      const escJenis = typeof escapeHtml === "function" ? escapeHtml(item.jenisCuti) : item.jenisCuti;

      const aksi = `
        <div class="d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-info text-white px-2 py-1 shadow-sm" onclick="pratinjauRiwayatCuti('${item.id}')" title="Pratinjau Dokumen">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-success px-2 py-1 shadow-sm" onclick="unduhRiwayatCutiWord('${item.id}')" title="Unduh File Word (.doc)">
            <i class="fas fa-file-word"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger px-2 py-1 shadow-sm" onclick="hapusRiwayatCuti('${item.id}')" title="Hapus Riwayat">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      `;

      return [
        idx + 1,
        `<span class="small text-muted text-nowrap">${item.tglSuratIndo || item.tglSurat || "-"}</span>`,
        `<div class="d-flex flex-column"><span class="simpeel-nama-bold">${escNama || "-"}</span><span class="text-muted">${escapeHtml(item.nip || "-")}</span></div>`,
        `<span class="${badgeClass} fw-normal">${escStatus}</span>`,
        `<div class="d-flex flex-column"><span class="${jenisBadgeClass} fw-normal align-self-center">${escJenis}</span><span class="text-muted">${escapeHtml(item.lamaHari || 1)} Hari Kerja</span></div>`,
        `<div class="d-flex flex-column small text-nowrap"><span>${escapeHtml(item.tglMulaiIndo || item.tglMulai || "-")}</span><span class="text-muted">s/d ${escapeHtml(item.tglSelesaiIndo || item.tglSelesai || "-")}</span></div>`,
        `<span class="small" style="display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; white-space: normal; max-width: 160px;" title="${escAlasan}">${escAlasan}</span>`,
        aksi
      ];
    });

    const columns = [
        { width: "4%", className: "text-center" },
        { className: "text-center text-nowrap" },
        { className: "text-start" },
        { className: "text-center" },
        { className: "text-center text-nowrap" },
        { className: "text-center text-nowrap" },
        { className: "text-start" },
        { width: "14%", className: "text-center", orderable: false }
    ];
    const dt = hasDataTable
      ? $(tableNode).DataTable()
      : $(tableNode).DataTable({
          data: rows,
          pageLength: 10,
          autoWidth: false,
          columns,
          order: [[0, "asc"]],
          dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" + "<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
          language: { url: "//cdn.datatables.net/plug-ins/1.13.4/i18n/id.json", emptyTable: "Belum ada riwayat usulan cuti yang tersimpan" }
        });

    if (hasDataTable) {
      dt.clear();
      dt.rows.add(rows);
      dt.draw();
    }

    $("#filterCutiRiwayat").off("keyup").on("keyup", function () { dt.search(this.value).draw(); });

    requestAnimationFrame(() => {
      if (tableNode.isConnected && $.fn.DataTable.isDataTable(tableNode)) {
        $(tableNode).DataTable().columns.adjust();
      }
    });
    return true;

  } catch (err) {
    if (renderRequest !== cutiHistoryRenderRequest) return true;
    console.error("[Cuti] Gagal render tabel riwayat cuti:", err);
    if (forceRefresh) {
      Swal.fire('Gagal Memuat Riwayat Cuti', err.message || 'Riwayat cuti tidak dapat dimuat.', 'error');
    }
    return false;
  }
}

async function pratinjauRiwayatCuti(id) {
  const list = await getDaftarRiwayatCuti();
  const item = list.find(x => x.id === id);
  if (!item || !item.dataLengkap) {
    Swal.fire("Data Tidak Ditemukan", "Dokumen usulan cuti tidak dapat ditemukan.", "warning");
    return;
  }
  pratinjauDokumenCuti(item.dataLengkap);
}

async function unduhRiwayatCutiWord(id) {
  const list = await getDaftarRiwayatCuti();
  const item = list.find(x => x.id === id);
  if (!item || !item.dataLengkap) {
    Swal.fire("Data Tidak Ditemukan", "Dokumen usulan cuti tidak dapat ditemukan.", "warning");
    return;
  }
  unduhDokumenCutiWord(item.dataLengkap);
}

async function hapusRiwayatCuti(id) {
  const list = await getDaftarRiwayatCuti();
  const item = list.find(x => x.id === id);
  if (!item) return;

  const escNama = typeof escapeHtml === "function" ? escapeHtml(item.nama) : item.nama;
  const escJenis = typeof escapeHtml === "function" ? escapeHtml(item.jenisCuti) : item.jenisCuti;

  Swal.fire({
    title: "Hapus Riwayat Cuti?",
    html: `Apakah Anda yakin ingin menghapus arsip usulan cuti <b>${escNama}</b> (${escJenis}) dari database?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal"
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        if (typeof dbManager !== 'undefined' && typeof dbManager.deleteRiwayatCuti === 'function') {
          const result = await dbManager.deleteRiwayatCuti(id);
          if (!result || result.success !== true) throw new Error(result?.message || 'Riwayat cuti gagal dihapus.');
        }
        await renderTabelRiwayatCuti();
        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Riwayat usulan cuti berhasil dihapus dari database.",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire('Gagal Menghapus', error.message || 'Riwayat cuti gagal dihapus.', 'error');
      }
    }
  });
}

async function bersihkanSemuaRiwayatCuti() {
  const list = await getDaftarRiwayatCuti();
  if (!list || list.length === 0) {
    Swal.fire("Riwayat Kosong", "Tidak ada riwayat usulan cuti yang tersimpan.", "info");
    return;
  }

  Swal.fire({
    title: "Kosongkan Semua Riwayat?",
    text: "Seluruh arsip riwayat usulan cuti yang tersimpan akan dihapus secara permanen dari database.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Ya, Kosongkan",
    cancelButtonText: "Batal"
  }).then(async (res) => {
    if (res.isConfirmed) {
      try {
        if (typeof dbManager !== 'undefined' && typeof dbManager.clearRiwayatCuti === 'function') {
          const result = await dbManager.clearRiwayatCuti();
          if (!result || result.success !== true) throw new Error(result?.message || 'Riwayat cuti gagal dikosongkan.');
        }
        await renderTabelRiwayatCuti();
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Seluruh riwayat usulan cuti telah dibersihkan dari database.",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire('Gagal Mengosongkan Riwayat', error.message || 'Riwayat cuti gagal dikosongkan.', 'error');
      }
    }
  });
}

/** Inisialisasi Modul Usul Cuti */
function initCutiModule() {
  if (typeof renderTabelUsulCuti === 'function') renderTabelUsulCuti();
  if (typeof renderTabelRiwayatCuti === 'function') renderTabelRiwayatCuti();
}

// Window Exposures for HTML inline event handlers
if (typeof window !== "undefined") {
  window.initCutiModule = initCutiModule;
  window.renderTabelUsulCuti = renderTabelUsulCuti;
  window.bukaModalUsulCuti = bukaModalUsulCuti;
  window.onJenisCutiChanged = onJenisCutiChanged;
  window.onJenisCutiChange = onJenisCutiChanged;
  window.onTglMulaiCutiChanged = onTglMulaiCutiChanged;
  window.onTglSelesaiCutiChanged = onTglSelesaiCutiChanged;
  window.updateNarasiCutiOtomatis = updateNarasiCutiOtomatis;
  window.sesuaikanInputCatatanCuti = sesuaikanInputCatatanCuti;
  window.pratinjauDokumenCuti = pratinjauDokumenCuti;
  window.unduhDokumenCutiWord = unduhDokumenCutiWord;
  window.cetakDokumenCuti = cetakDokumenCuti;
  window.simpanUsulanCuti = simpanUsulanCuti;
  window.renderTabelRiwayatCuti = renderTabelRiwayatCuti;
  window.pratinjauRiwayatCuti = pratinjauRiwayatCuti;
  window.unduhRiwayatCutiWord = unduhRiwayatCutiWord;
  window.hapusRiwayatCuti = hapusRiwayatCuti;
  window.bersihkanSemuaRiwayatCuti = bersihkanSemuaRiwayatCuti;
}
