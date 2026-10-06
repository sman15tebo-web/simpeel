async function downloadTemplateImportAkun() {
    try {
        const headers = ['NIP', 'Nama', 'NIK', 'Tgl Lahir (YYYY-MM-DD)', 'Status Pegawai (PNS/PPPK/Honorer)', 'Password (opsional, default=NIP)'];
        const sampleRow = ['197001011990011001', 'NAMA PEGAWAI CONTOH', '3201010101700001', '1970-01-01', 'PNS', ''];

        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
            ws['!cols'] = [
                { wch: 25 },
                { wch: 30 },
                { wch: 22 },
                { wch: 25 },
                { wch: 35 },
                { wch: 35 }
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Akun Pegawai');
            const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            openFilePreview({ fileName: 'Template_Import_Akun.xlsx', blob, html: workbookPreviewHtml(wb) });
            return;
        }

        if (typeof ExcelJS !== 'undefined') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Akun Pegawai');
            const headerRow = sheet.getRow(1);
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4e73df' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });
            sheet.columns = headers.map(() => ({ width: 30 }));
            sheet.addRow(sampleRow);
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            openFilePreview({ fileName: 'Template_Import_Akun.xlsx', blob, html: workbookPreviewHtml(workbook) });
        }
    } catch (err) {
        console.error('Error downloadTemplateImportAkun:', err);
        Swal.fire('Error', 'Gagal mengunduh template akun: ' + err.message, 'error');
    }
}

async function prosesImportAkunExcel() {
    const fileInput = document.getElementById('fileImportAkunExcel');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        Swal.fire('Peringatan', 'Pilih file Excel terlebih dahulu!', 'warning');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            Swal.fire({
                title: 'Membaca File Excel...',
                text: 'Harap tunggu...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const data = new Uint8Array(e.target.result);
            if (typeof XLSX === 'undefined') {
                throw new Error("Library XLSX (SheetJS) belum termuat. Periksa koneksi atau refresh aplikasi.");
            }

            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            
            // Prioritas sheet: 'Akun Pegawai', sheet mengandung kata 'akun', atau sheet pertama
            let sheetName = workbook.SheetNames.find(n => /akun/i.test(n)) || workbook.SheetNames[0];
            let sheet = workbook.Sheets[sheetName];

            if (!sheet) {
                throw new Error("Sheet data tidak ditemukan di file Excel!");
            }

            // Jika pengguna salah mengunggah template pegawai lengkap yang ada 'Data Pribadi'
            if (workbook.Sheets['Data Pribadi'] && !workbook.Sheets['Akun Pegawai']) {
                sheet = workbook.Sheets['Data Pribadi'];
            }

            // Helper normalisasi tanggal Excel
            const formatTgl = (val) => {
                if (!val) return '';
                if (val instanceof Date) {
                    val.setMinutes(val.getMinutes() - val.getTimezoneOffset());
                    return val.toISOString().split('T')[0];
                }
                let s = String(val).trim();
                // Format serial number Excel (contoh: 32541)
                if (/^\d{4,5}$/.test(s)) {
                    try {
                        const excelDate = new Date(Math.round((parseInt(s) - 25569) * 86400 * 1000));
                        if (!isNaN(excelDate.getTime())) {
                            excelDate.setMinutes(excelDate.getMinutes() - excelDate.getTimezoneOffset());
                            return excelDate.toISOString().split('T')[0];
                        }
                    } catch(e) {}
                }
                // DD/MM/YYYY atau DD-MM-YYYY
                let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                if (m) {
                    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                }
                // YYYY-MM-DD
                let m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
                if (m2) {
                    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
                }
                return s;
            };

            // Helper membersihkan NIP / NIK dari notasi ilmiah atau spasi
            const cleanNumber = (val) => {
                if (val === null || val === undefined) return '';
                let s = String(val).trim();
                if (!s) return '';
                if (/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)$/.test(s)) {
                    try {
                        s = BigInt(Math.round(Number(s))).toString();
                    } catch(e) {}
                }
                return s.replace(/\.0+$/, '').replace(/[^0-9]/g, '');
            };

            // Baca seluruh baris dalam sheet sebagai array
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
            if (!rawRows || rawRows.length <= 1) {
                throw new Error("File Excel kosong atau tidak memiliki baris data!");
            }

            const headerRow = rawRows[0].map(h => String(h || '').trim().toLowerCase());

            // Deteksi indeks kolom berdasarkan kata kunci header
            let idxNip = headerRow.findIndex(h => h.includes('nip'));
            let idxNama = headerRow.findIndex(h => h.includes('nama'));
            let idxNik = headerRow.findIndex(h => h.includes('nik'));
            let idxTglLahir = headerRow.findIndex(h => h.includes('lahir'));
            let idxStatus = headerRow.findIndex(h => h.includes('status'));
            let idxPassword = headerRow.findIndex(h => h.includes('pass'));

            // Fallback ke posisi default (0-5) jika header tidak ditemukan
            if (idxNip === -1) idxNip = 0;
            if (idxNama === -1) idxNama = 1;
            if (idxNik === -1) idxNik = 2;
            if (idxTglLahir === -1) idxTglLahir = 3;
            if (idxStatus === -1) idxStatus = 4;
            if (idxPassword === -1) idxPassword = 5;

            const rowsToImport = [];
            for (let i = 1; i < rawRows.length; i++) {
                const r = rawRows[i];
                if (!r || r.length === 0) continue;

                const nip = cleanNumber(r[idxNip]);
                const nama = String(r[idxNama] || '').trim().toUpperCase();
                const nik = cleanNumber(r[idxNik]);
                const tglLahir = formatTgl(r[idxTglLahir]);
                let statusPegawai = String(r[idxStatus] || '').trim();
                if (!statusPegawai) statusPegawai = 'PNS';

                // Normalisasi status pegawai
                if (/pns/i.test(statusPegawai)) statusPegawai = 'PNS';
                else if (/paruh/i.test(statusPegawai)) statusPegawai = 'PPPK Paruh Waktu';
                else if (/pppk/i.test(statusPegawai)) statusPegawai = 'PPPK';
                else if (/honor/i.test(statusPegawai)) statusPegawai = 'Honorer';

                const rawPass = idxPassword > -1 ? String(r[idxPassword] || '').trim() : '';
                const password = rawPass || nip;

                if (!nip && !nama) continue; // Baris kosong dilewati
                if (!nip) {
                    console.warn(`Baris ${i + 1} dilewati karena NIP kosong:`, r);
                    continue;
                }

                rowsToImport.push({
                    nip,
                    nama: nama || 'NAMA PEGAWAI',
                    namaLengkap: nama || 'NAMA PEGAWAI',
                    nik: nik || '',
                    tglLahir: tglLahir || '',
                    statusPegawai: statusPegawai,
                    password: password,
                    aktif: 1,
                    role: 'pegawai',
                    createdAt: new Date().toISOString()
                });
            }

            if (rowsToImport.length === 0) {
                Swal.fire('Peringatan', 'Tidak ada data valid yang ditemukan di file Excel!\nPastikan kolom NIP dan Nama telah diisi.', 'warning');
                return;
            }

            Swal.fire({
                title: 'Mengimpor Akun...',
                html: `Memproses data <b>0</b> / <b>${rowsToImport.length}</b> akun...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // Ambil data pegawai yang sudah ada sekali di awal untuk cek pembuatan profil minimal
            let allPegawai = [];
            try {
                allPegawai = (await dbManager.getAllPegawai()) || [];
            } catch(e) {
                allPegawai = [];
            }
            const existingPegMap = new Set((allPegawai || []).map(p => String(p.nip)));

            let berhasil = 0, gagal = 0;
            const errorList = [];

            // Coba batch save jika didukung oleh API/Database
            let useBatch = false;
            if (typeof dbManager.batchSaveAkun === 'function') {
                try {
                    const batchRes = await dbManager.batchSaveAkun(rowsToImport);
                    if (batchRes && batchRes.success) {
                        useBatch = true;
                        berhasil = rowsToImport.length;

                        // Buat data pegawai minimal untuk NIP yang belum ada
                        for (const item of rowsToImport) {
                            if (!existingPegMap.has(item.nip)) {
                                try {
                                    await dbManager.savePegawai({
                                        nip: item.nip,
                                        nama: item.nama,
                                        nik: item.nik,
                                        tglLahir: item.tglLahir,
                                        statusPegawai: item.statusPegawai,
                                        statusKepegawaian: 'Aktif'
                                    });
                                    existingPegMap.add(item.nip);
                                } catch(pe) {}
                            }
                        }
                    }
                } catch(bErr) {
                    console.warn('Batch save akun tidak berhasil, fallback ke simpan per baris:', bErr);
                }
            }

            // Jika batch tidak digunakan / fallback per baris
            if (!useBatch) {
                for (let idx = 0; idx < rowsToImport.length; idx++) {
                    const item = rowsToImport[idx];

                    if (idx % 5 === 0 || idx === rowsToImport.length - 1) {
                        const bEl = Swal.getHtmlContainer() ? Swal.getHtmlContainer().querySelector('b') : null;
                        if (bEl) bEl.textContent = `${idx + 1}`;
                    }

                    try {
                        const resAkun = await dbManager.saveAkun(item, false);
                        if (resAkun && resAkun.success === false) {
                            throw new Error(resAkun.message || 'Gagal menyimpan akun');
                        }

                        if (!existingPegMap.has(item.nip)) {
                            try {
                                await dbManager.savePegawai({
                                    nip: item.nip,
                                    nama: item.nama,
                                    nik: item.nik,
                                    tglLahir: item.tglLahir,
                                    statusPegawai: item.statusPegawai,
                                    statusKepegawaian: 'Aktif'
                                });
                                existingPegMap.add(item.nip);
                            } catch (pegErr) {
                                console.warn(`Simpan pegawai minimal untuk NIP ${item.nip} gagal (akun tetap disimpan):`, pegErr);
                            }
                        }
                        berhasil++;
                    } catch (rowErr) {
                        gagal++;
                        errorList.push(`NIP ${item.nip} (${item.nama}): ${rowErr.message || 'Error'}`);
                    }
                }
            }

            const modalEl = document.getElementById('modalImportAkun');
            if (modalEl) {
                const m = bootstrap.Modal.getInstance(modalEl);
                if (m) m.hide();
            }
            fileInput.value = '';

            if (gagal > 0) {
                const errHtml = errorList.slice(0, 10).map(e => `<li>${e}</li>`).join('');
                const more = errorList.length > 10 ? `<li>...dan ${errorList.length - 10} baris lainnya</li>` : '';
                Swal.fire({
                    title: 'Import Selesai dengan Catatan',
                    html: `<p>Berhasil diimport: <b>${berhasil} akun</b></p>
                           <p class="text-danger mb-1">Gagal diimport: <b>${gagal} akun</b></p>
                           <ul class="text-start text-danger small" style="max-height: 150px; overflow-y: auto;">${errHtml}${more}</ul>`,
                    icon: 'warning'
                });
            } else {
                Swal.fire('Berhasil!', `Semua ${berhasil} akun pegawai berhasil diimport!`, 'success');
            }

            if (typeof renderTabelAkun === 'function') renderTabelAkun();
            if (typeof renderTabelPNS === 'function') renderTabelPNS();
            if (typeof renderTabelPPPK === 'function') renderTabelPPPK();

        } catch (err) {
            console.error('Error prosesImportAkunExcel:', err);
            Swal.fire('Error', 'Gagal memproses file Excel: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function downloadTemplateImport() {
    try {
        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const addSheet = (name, headers) => {
                const ws = XLSX.utils.aoa_to_sheet([headers]);
                ws['!cols'] = headers.map(() => ({ wch: 25 }));
                XLSX.utils.book_append_sheet(wb, ws, name);
            };

            addSheet('Data Pribadi', ['NIP', 'NIK', 'Nama Lengkap', 'Tempat Lahir', 'Tgl Lahir (YYYY-MM-DD)', 'Kelamin', 'Agama', 'Status Kawin', 'Alamat', 'NIP Lama', 'No HP', 'Email', 'Gol Darah', 'Tinggi Badan', 'Berat Badan', 'Hobby', 'Kebutuhan Khusus', 'Uraian Kebutuhan Khusus', 'No SK CPNS', 'TMT CPNS (YYYY-MM-DD)', 'No SK PNS', 'TMT PNS (YYYY-MM-DD)', 'No SK PPPK', 'TMT PPPK Mulai', 'TMT PPPK Selesai', 'No SK Honor', 'TMT Honor', 'No Karpeg', 'NPWP', 'BPJS', 'Rekening', 'Status Pegawai (PNS/PPPK/Honorer)', 'Status Aktif (Aktif/Mutasi/Pensiun/dll)']);
            addSheet('Riwayat Pangkat', ['NIP', 'Golongan / Ruang', 'TMT Pangkat (YYYY-MM-DD)', 'Nomor SK', 'Tanggal SK (YYYY-MM-DD)', 'Pejabat Penandatangan', 'MK Tahun', 'MK Bulan']);
            addSheet('Riwayat Jabatan', ['NIP', 'Jenis Jabatan (Struktural/Fungsional Umum/dll)', 'Eselon', 'Nama Jabatan', 'Unit Kerja', 'TMT Jabatan (YYYY-MM-DD)', 'No SK Jabatan']);
            addSheet('Riwayat KGB', ['NIP', 'No SK KGB', 'Tanggal SK (YYYY-MM-DD)', 'TMT KGB (YYYY-MM-DD)', 'Jumlah Gaji Pokok', 'MK Tahun', 'MK Bulan']);
            addSheet('Riwayat Pendidikan', ['NIP', 'Tingkat (SD/SMP/SMA/S1/dll)', 'Nama Sekolah/Kampus', 'Jurusan', 'Tahun Masuk', 'Tahun Lulus', 'Nama Kepala/Rektor']);
            addSheet('Riwayat Keluarga', ['NIP', 'Nama Keluarga', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Status (Anak Kandung/Suami/Istri/dll)']);
            addSheet('Riwayat Diklat', ['NIP', 'Nama Diklat/Kursus', 'Penyelenggara', 'Tahun', 'Jumlah Jam', 'Nomor Sertifikat']);
            addSheet('Riwayat Kontrak', ['NIP', 'Jabatan Kontrak', 'Golongan/Kelas', 'TMT Mulai (YYYY-MM-DD)', 'TMT Selesai (YYYY-MM-DD)', 'Nomor SK', 'Tanggal SK (YYYY-MM-DD)', 'Instansi/Penempatan', 'Gaji/Honor', 'Keterangan']);

            const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            openFilePreview({ fileName: 'Template_Import_Pegawai_Online.xlsx', blob, html: workbookPreviewHtml(wb) });
            return;
        }

        if (typeof ExcelJS !== 'undefined') {
            const workbook = new ExcelJS.Workbook();
            const addSheet = (name, headers, colorArgb) => {
                const sheet = workbook.addWorksheet(name);
                const headerRow = sheet.getRow(1);
                headers.forEach((h, i) => {
                    const cell = headerRow.getCell(i + 1);
                    cell.value = h;
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorArgb } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
                sheet.columns = headers.map(() => ({ width: 25 }));
                return sheet;
            };

            addSheet('Data Pribadi', ['NIP', 'NIK', 'Nama Lengkap', 'Tempat Lahir', 'Tgl Lahir (YYYY-MM-DD)', 'Kelamin', 'Agama', 'Status Kawin', 'Alamat', 'NIP Lama', 'No HP', 'Email', 'Gol Darah', 'Tinggi Badan', 'Berat Badan', 'Hobby', 'Kebutuhan Khusus', 'Uraian Kebutuhan Khusus', 'No SK CPNS', 'TMT CPNS (YYYY-MM-DD)', 'No SK PNS', 'TMT PNS (YYYY-MM-DD)', 'No SK PPPK', 'TMT PPPK Mulai', 'TMT PPPK Selesai', 'No SK Honor', 'TMT Honor', 'No Karpeg', 'NPWP', 'BPJS', 'Rekening', 'Status Pegawai (PNS/PPPK/Honorer)', 'Status Aktif (Aktif/Mutasi/Pensiun/dll)'], 'FF28a745');
            addSheet('Riwayat Pangkat', ['NIP', 'Golongan / Ruang', 'TMT Pangkat (YYYY-MM-DD)', 'Nomor SK', 'Tanggal SK (YYYY-MM-DD)', 'Pejabat Penandatangan', 'MK Tahun', 'MK Bulan'], 'FF007bff');
            addSheet('Riwayat Jabatan', ['NIP', 'Jenis Jabatan (Struktural/Fungsional Umum/dll)', 'Eselon', 'Nama Jabatan', 'Unit Kerja', 'TMT Jabatan (YYYY-MM-DD)', 'No SK Jabatan'], 'FFfd7e14');
            addSheet('Riwayat KGB', ['NIP', 'No SK KGB', 'Tanggal SK (YYYY-MM-DD)', 'TMT KGB (YYYY-MM-DD)', 'Jumlah Gaji Pokok', 'MK Tahun', 'MK Bulan'], 'FFe83e8c');
            addSheet('Riwayat Pendidikan', ['NIP', 'Tingkat (SD/SMP/SMA/S1/dll)', 'Nama Sekolah/Kampus', 'Jurusan', 'Tahun Masuk', 'Tahun Lulus', 'Nama Kepala/Rektor'], 'FF6f42c1');
            addSheet('Riwayat Keluarga', ['NIP', 'Nama Keluarga', 'Tempat Lahir', 'Tanggal Lahir (YYYY-MM-DD)', 'Status (Anak Kandung/Suami/Istri/dll)'], 'FFffc107');
            addSheet('Riwayat Diklat', ['NIP', 'Nama Diklat/Kursus', 'Penyelenggara', 'Tahun', 'Jumlah Jam', 'Nomor Sertifikat'], 'FF17a2b8');
            addSheet('Riwayat Kontrak', ['NIP', 'Jabatan Kontrak', 'Golongan/Kelas', 'TMT Mulai (YYYY-MM-DD)', 'TMT Selesai (YYYY-MM-DD)', 'Nomor SK', 'Tanggal SK (YYYY-MM-DD)', 'Instansi/Penempatan', 'Gaji/Honor', 'Keterangan'], 'FF6c757d');

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            openFilePreview({ fileName: 'Template_Import_Pegawai_Online.xlsx', blob, html: workbookPreviewHtml(workbook) });
        }
    } catch(err) {
        console.error('Error downloadTemplateImport:', err);
        Swal.fire('Error', 'Gagal mengunduh template pegawai: ' + err.message, 'error');
    }
}

async function prosesImportExcel() {
    const fileInput = document.getElementById('fileImportExcel');
    if (fileInput.files.length === 0) {
        Swal.fire('Peringatan', 'Harap pilih file Excel terlebih dahulu!', 'warning');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            const sheetPribadi = workbook.Sheets['Data Pribadi'];
            if (!sheetPribadi) {
                if (workbook.Sheets['Akun Pegawai'] || workbook.SheetNames.some(s => /akun/i.test(s))) {
                    throw new Error("File yang Anda upload adalah template Akun Pegawai (6 Kolom)! Harap gunakan tombol 'Import Akun' untuk mengimpor file ini.");
                }
                throw new Error("Sheet 'Data Pribadi' tidak ditemukan! Pastikan menggunakan template Data Pegawai yang baru.");
            }
            const jsonPribadi = XLSX.utils.sheet_to_json(sheetPribadi, { defval: '' });

            let successCount = 0;
            let errorRows = [];
            const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char]);

            const getDataSheet = (name) => {
                const sheet = workbook.Sheets[name];
                return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
            };

            const listPangkat = getDataSheet('Riwayat Pangkat');
            const listJabatan = getDataSheet('Riwayat Jabatan');
            const listKGB = getDataSheet('Riwayat KGB');
            const listPendidikan = getDataSheet('Riwayat Pendidikan');
            const listKeluarga = getDataSheet('Riwayat Keluarga');
            const listDiklat = getDataSheet('Riwayat Diklat');
            const listKontrak = getDataSheet('Riwayat Kontrak');

            const existingAccounts = await dbManager.getAllAkun();
            if (!Array.isArray(existingAccounts)) {
                throw new Error('Gagal memeriksa akun yang sudah ada. Periksa koneksi/database lalu coba lagi.');
            }
            const existingAccountNips = new Set(existingAccounts.map(account => String(account.nip)));
            let accountCount = 0;

            const formatDate = (val) => {
                if (!val) return '';
                if (val instanceof Date) {
                    val.setMinutes(val.getMinutes() - val.getTimezoneOffset());
                    return val.toISOString().split('T')[0];
                }
                return String(val).trim();
            };

            for (let i = 0; i < jsonPribadi.length; i++) {
                const row = jsonPribadi[i];
                const rNum = i + 2;
                let nip = String(row['NIP'] || '').trim();
                let nik = String(row['NIK'] || '').trim();
                let nama = String(row['Nama Lengkap'] || '').trim().toUpperCase();

                if (!nip && !nama) continue;
                if (!/^\d{18}$/.test(nip)) {
                    errorRows.push(`Baris ${rNum} (${nama || 'Tanpa Nama'}): NIP harus 18 digit angka.`);
                    continue;
                }

                let rPangkat = listPangkat.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Golongan / Ruang'], formatDate(r['TMT Pangkat (YYYY-MM-DD)']), r['Nomor SK'], formatDate(r['Tanggal SK (YYYY-MM-DD)']), r['Pejabat Penandatangan'], r['MK Tahun'], r['MK Bulan']
                ]);
                let rJabatan = listJabatan.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Jenis Jabatan (Struktural/Fungsional Umum/dll)'], r['Eselon'], r['Nama Jabatan'], r['Unit Kerja'], formatDate(r['TMT Jabatan (YYYY-MM-DD)']), r['No SK Jabatan']
                ]);
                let rKGB = listKGB.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['No SK KGB'], formatDate(r['Tanggal SK (YYYY-MM-DD)']), formatDate(r['TMT KGB (YYYY-MM-DD)']), r['Jumlah Gaji Pokok'], r['MK Tahun'], r['MK Bulan']
                ]);
                let rPendidikan = listPendidikan.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Tingkat (SD/SMP/SMA/S1/dll)'], r['Nama Sekolah/Kampus'], r['Jurusan'], r['Tahun Masuk'], r['Tahun Lulus'], r['Nama Kepala/Rektor']
                ]);
                let rKeluarga = listKeluarga.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Nama Keluarga'], r['Tempat Lahir'], formatDate(r['Tanggal Lahir (YYYY-MM-DD)']), r['Status (Anak Kandung/Suami/Istri/dll)']
                ]);
                let rDiklat = listDiklat.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Nama Diklat/Kursus'], r['Penyelenggara'], r['Tahun'], r['Jumlah Jam'], r['Nomor Sertifikat']
                ]);
                let rKontrak = listKontrak.filter(r => String(r.NIP).trim() === nip).map(r => [
                    r['Jabatan Kontrak'], r['Golongan/Kelas'], formatDate(r['TMT Mulai (YYYY-MM-DD)']), formatDate(r['TMT Selesai (YYYY-MM-DD)']), r['Nomor SK'], formatDate(r['Tanggal SK (YYYY-MM-DD)']), r['Instansi/Penempatan'], r['Gaji/Honor'], r['Keterangan']
                ]);

                rPangkat = sortRiwayatArray(rPangkat, 1);
                rJabatan = sortRiwayatArray(rJabatan, 4);
                rKGB = sortRiwayatArray(rKGB, 2);
                rPendidikan = sortRiwayatArray(rPendidikan, 4, true);
                rKeluarga = sortRiwayatArray(rKeluarga, 2);
                rDiklat = sortRiwayatArray(rDiklat, 2, true);
                rKontrak = sortRiwayatArray(rKontrak, 2);

                let golongan = ''; let jabatan = ''; let unitKerja = ''; let tmtJabatan = ''; let pendidikan = ''; let tmtKgbLalu = ''; let gajiPokok = '';

                const lPangkat = getLatestRiwayat(rPangkat, 1);
                const lKontrak = getLatestRiwayat(rKontrak, 2);
                if (lPangkat) golongan = lPangkat[0];
                else if (lKontrak) golongan = lKontrak[1];

                const lJabatan = getLatestRiwayat(rJabatan, 4);
                if (lJabatan) { jabatan = lJabatan[2]; unitKerja = lJabatan[3]; tmtJabatan = lJabatan[4]; }
                else if (lKontrak) { jabatan = lKontrak[0]; }

                const lPend = getLatestRiwayat(rPendidikan, 4, true);
                if (lPend) pendidikan = lPend[0];

                const lKGB = getLatestRiwayat(rKGB, 2);
                if (lKGB) { tmtKgbLalu = lKGB[2]; gajiPokok = lKGB[3]; }

                let kgbDate = tmtKgbLalu ? (parseInt(tmtKgbLalu.substring(0, 4)) + 2) + tmtKgbLalu.substring(4) : '';

                const p = {
                    nip: nip, nik: nik, nama: nama,
                    tempatLahir: row['Tempat Lahir'] || '', tglLahir: formatDate(row['Tgl Lahir (YYYY-MM-DD)']),
                    kelamin: row['Kelamin'] || 'Laki-Laki', agama: row['Agama'] || '', statusKawin: row['Status Kawin'] || '',
                    alamat: row['Alamat'] || '', nipLama: row['NIP Lama'] || '', noHp: row['No HP'] || '',
                    email: row['Email'] || '', golDarah: row['Gol Darah'] || '-', tinggiBadan: row['Tinggi Badan'] || '',
                    beratBadan: row['Berat Badan'] || '', hobby: row['Hobby'] || '', isKebutuhanKhusus: row['Kebutuhan Khusus'] || 'Tidak',
                    uraianKebutuhanKhusus: row['Uraian Kebutuhan Khusus'] || '', noSkCpns: row['No SK CPNS'] || '',
                    tmtCpns: formatDate(row['TMT CPNS (YYYY-MM-DD)']), noSkPns: row['No SK PNS'] || '',
                    tmtPns: formatDate(row['TMT PNS (YYYY-MM-DD)']), noSkPppk: row['No SK PPPK'] || '',
                    tmtPppkMulai: formatDate(row['TMT PPPK Mulai']), tmtPppkSelesai: formatDate(row['TMT PPPK Selesai']),
                    noSkHonor: row['No SK Honor'] || '', tmtHonor: formatDate(row['TMT Honor']),
                    karpeg: row['No Karpeg'] || '', npwp: row['NPWP'] || '', bpjs: row['BPJS'] || '',
                    rekening: row['Rekening'] || '', foto: '',
                    statusPegawai: row['Status Pegawai (PNS/PPPK/Honorer)'] || 'PNS',
                    statusKepegawaian: row['Status Aktif (Aktif/Mutasi/Pensiun/dll)'] || 'Aktif',
                    golongan: golongan, jabatan: jabatan, tmtJabatan: tmtJabatan, pendidikan: pendidikan, unitKerja: unitKerja || 'Dinas',
                    gajiPokok: gajiPokok, tmtKgbLalu: tmtKgbLalu, tmtKgbBaru: kgbDate, tmtPensiun: '',
                    riwayatPangkat: rPangkat, riwayatKontrak: rKontrak, riwayatJabatan: rJabatan,
                    riwayatKGB: rKGB, riwayatPendidikan: rPendidikan, riwayatAnak: rKeluarga, riwayatDiklat: rDiklat,
                    updatedAt: new Date().toISOString()
                };

                const res = await dbManager.savePegawai(p);
                if (res && res.success === false) {
                    errorRows.push(`Baris ${rNum} (${nama}): ${res.message}`);
                } else {
                    successCount++;

                    if (!existingAccountNips.has(nip)) {
                        const now = new Date().toISOString();
                        const account = {
                            nip,
                            nama,
                            namaLengkap: nama,
                            nik,
                            tglLahir: p.tglLahir,
                            statusPegawai: p.statusPegawai,
                            password: nip,
                            aktif: 1,
                            role: 'pegawai',
                            createdAt: now,
                            updatedAt: now
                        };
                        try {
                            const accountResult = await dbManager.saveAkun(account, false);
                            if (!accountResult || accountResult.success !== true) {
                                throw new Error(accountResult?.message || 'Server tidak mengonfirmasi penyimpanan akun.');
                            }
                            existingAccountNips.add(nip);
                            accountCount++;
                        } catch (accountError) {
                            errorRows.push(`Baris ${rNum} (${nama}): Data pegawai tersimpan, tetapi akun gagal dibuat: ${accountError.message}`);
                        }
                    }
                }
            }

            const modalEl = document.getElementById('modalImport');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
            fileInput.value = '';

            if (errorRows.length > 0) {
                const errorHtml = errorRows.map(e => `<li>${escapeHtml(e)}</li>`).join('');
                Swal.fire({
                    title: 'Import Selesai dengan Catatan',
                    html: `<p>Data pegawai tersimpan: <b>${successCount}</b>.</p>
                           <p>Akun baru dibuat: <b>${accountCount}</b> (password awal: NIP).</p>
                           <p class='text-danger mb-1'><b>Perlu diperiksa (${errorRows.length}):</b></p>
                           <ul class='text-start text-danger' style='max-height: 200px; overflow-y: auto; font-size: 0.85rem;'>${errorHtml}</ul>`,
                    icon: 'warning',
                    width: '600px'
                }).then(() => location.reload());
            } else {
                Swal.fire('Berhasil!', `Semua data (${successCount} pegawai) berhasil diimport. ${accountCount} akun baru dibuat dengan password awal NIP.`, 'success')
                    .then(() => location.reload());
            }

        } catch (err) {
            Swal.fire('Error', 'Terjadi kesalahan saat memproses Excel: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function lihatPegawai(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (p) {
        document.getElementById('lihat_nama').innerText = p.nama || '-';
        document.getElementById('lihat_nip').innerText = p.nip || '-';
        document.getElementById('lihat_statusPegawai').innerText = p.statusPegawai || '-';
        document.getElementById('lihat_agama').innerText = p.agama || '-';
        document.getElementById('lihat_jabatan').innerText = p.jabatan || '-';
        document.getElementById('lihat_unitKerja').innerText = p.unitKerja || '-';
        document.getElementById('lihat_golongan').innerText = p.golongan || '-';
        document.getElementById('lihat_pendidikan').innerText = p.pendidikan || '-';
        document.getElementById('lihat_tmtJabatan').innerText = p.tmtJabatan || '-';
        document.getElementById('lihat_gajiPokok').innerText = p.gajiPokok || '-';
        document.getElementById('lihat_statusKepegawaian').innerText = p.statusKepegawaian || 'Aktif';

        const modal = new bootstrap.Modal(document.getElementById('modalLihatPegawai'));
        modal.show();
    }
}

async function hapusPegawaiData(nip) {
    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: 'Data pegawai ini akan dihapus permanen!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
        try {
            await dbManager.deletePegawai(nip);
            Swal.fire({
                title: 'Terhapus!',
                text: 'Data pegawai berhasil dihapus.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            // Reload tables
            renderTabelPNS();
        } catch (error) {
            Swal.fire('Gagal!', 'Gagal menghapus data pegawai.', 'error');
        }
    }
}

async function editStatusPegawai(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) {
        Swal.fire('Error', 'Data pegawai tidak ditemukan!', 'error');
        return;
    }

    window.currentEditStatusNip = nip;
    const modalEl = document.getElementById('modalEditStatusAktif');
    if (modalEl) {
        const dropdown = document.getElementById('statusPegawaiDropdown');
        const currentStatus = p.statusKepegawaian || 'Aktif';
        if (dropdown) dropdown.value = currentStatus;

        const tanggalKhusus = document.getElementById('statusTanggalKhusus');
        const tanggalBerhenti = document.getElementById('statusTanggalBerhenti');
        const alasanBerhenti = document.getElementById('statusAlasanBerhenti');
        const tmtMutasi = document.getElementById('statusTmtMutasi');
        const tujuanMutasi = document.getElementById('statusMutasiTujuan');

        if (tanggalKhusus) {
            if (currentStatus === 'Pensiun') tanggalKhusus.value = p.tmtPensiun || '';
            else if (currentStatus === 'Meninggal') tanggalKhusus.value = p.tglMeninggal || p.tanggalMeninggal || '';
            else tanggalKhusus.value = '';
        }
        if (tanggalBerhenti) tanggalBerhenti.value = currentStatus === 'Berhenti' ? (p.tanggalBerhenti || '') : '';
        if (alasanBerhenti) alasanBerhenti.value = currentStatus === 'Berhenti' ? (p.alasanBerhenti || p.keteranganBerhenti || '') : '';
        if (tmtMutasi) tmtMutasi.value = currentStatus === 'Mutasi' ? (p.tmtMutasi || '') : '';
        if (tujuanMutasi) tujuanMutasi.value = currentStatus === 'Mutasi' ? (p.mutasiKe || p.keteranganMutasi || '') : '';

        if (typeof toggleFormStatus === 'function') toggleFormStatus(dropdown ? dropdown.value : currentStatus);

        let modalInst = bootstrap.Modal.getInstance(modalEl); if(!modalInst) modalInst = new bootstrap.Modal(modalEl); modalInst.show();
    }
}

async function simpanStatusPegawai() {
    const nip = window.currentEditStatusNip;
    const dropdown = document.getElementById('statusPegawaiDropdown');
    const statusBaru = dropdown ? dropdown.value : 'Aktif';

    if (!nip) return;

    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    p.statusKepegawaian = statusBaru;
    const tanggalKhusus = document.getElementById('statusTanggalKhusus')?.value || '';
    const tanggalBerhenti = document.getElementById('statusTanggalBerhenti')?.value || '';
    const alasanBerhenti = document.getElementById('statusAlasanBerhenti')?.value || '';
    const tmtMutasi = document.getElementById('statusTmtMutasi')?.value || '';
    const mutasiTujuan = document.getElementById('statusMutasiTujuan')?.value || '';

    p.tmtPensiun = '';
    p.tglMeninggal = '';
    p.tanggalMeninggal = '';
    p.tmtMutasi = '';
    p.tanggalBerhenti = '';
    p.alasanBerhenti = '';
    p.keteranganBerhenti = '';
    p.keteranganMutasi = '';
    p.mutasiKe = '';
    p.keteranganNonAktif = '';

    if (statusBaru === 'Pensiun') {
        p.tmtPensiun = tanggalKhusus;
        p.keteranganNonAktif = 'Pensiun';
    } else if (statusBaru === 'Meninggal') {
        p.tglMeninggal = tanggalKhusus;
        p.tanggalMeninggal = tanggalKhusus;
        p.keteranganNonAktif = 'Meninggal';
    } else if (statusBaru === 'Mutasi') {
        p.tmtMutasi = tmtMutasi;
        p.mutasiKe = mutasiTujuan;
        p.keteranganMutasi = mutasiTujuan;
        p.keteranganNonAktif = 'Mutasi';
    } else if (statusBaru === 'Berhenti' || statusBaru === 'Resign') {
        p.tanggalBerhenti = tanggalBerhenti;
        p.alasanBerhenti = alasanBerhenti;
        p.keteranganBerhenti = alasanBerhenti;
        p.keteranganNonAktif = 'Berhenti';
    } else if (statusBaru === 'Aktif') {
        p.statusKepegawaian = 'Aktif';
        p.keteranganNonAktif = '';
    }

    try {
        await dbManager.savePegawai(p);
    } catch (error) {
        Swal.fire('Gagal!', error.message || 'Status pegawai gagal disimpan.', 'error');
        return;
    }

    const modalEl = document.getElementById('modalEditStatusAktif');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    Swal.fire({
        title: 'Berhasil!',
        text: 'Status pegawai berhasil diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });

    if (typeof renderTabelRekap === 'function') renderTabelRekap();
    if (typeof renderTabelRiwayat === 'function') renderTabelRiwayat();
}

async function editKGB(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    window.currentKgbNip = nip;
    const modalEl = document.getElementById('modalEditKGB');
    if (modalEl) {
        document.getElementById('kgb_gajiPokok').value = p.gajiPokok || '';
        document.getElementById('kgbNama').value = p.nama || '';
        document.getElementById('kgbTmtTerakhir').value = p.tmtKgb || '';
        document.getElementById('kgbTmtBerikutnya').value = p.tmtKgbBaru || '';
        let modalInst = bootstrap.Modal.getInstance(modalEl); if(!modalInst) modalInst = new bootstrap.Modal(modalEl); modalInst.show();
    }
}

async function simpanKGB() {
    const nip = window.currentKgbNip;
    if (!nip) return;

    const gajiPokok = document.getElementById('kgb_gajiPokok').value;
    const tmtBaru = document.getElementById('kgbTmtBerikutnya').value;
    const tmtLama = document.getElementById('kgbTmtTerakhir').value;

    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (p) {
        p.gajiPokok = gajiPokok;
        p.tmtKgbBaru = tmtBaru;
        p.tmtKgb = tmtLama;
        await dbManager.savePegawai(p);

        const modalEl = document.getElementById('modalEditKGB');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        Swal.fire({ title: 'Berhasil!', text: 'Data KGB diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false });
        if (typeof renderTabelKGB === 'function') renderTabelKGB();
    }
}


function generateNamaBergelar(nama, riwayatPendidikan) {
    if (!riwayatPendidikan || !Array.isArray(riwayatPendidikan) || riwayatPendidikan.length === 0) return nama;

    const levelMap = { 'SD': 1, 'SMP': 2, 'SMA': 3, 'D1': 4, 'D2': 5, 'D3': 6, 'S1': 7, 'S2': 8, 'S3': 9 };
    let parsedRiwayat = riwayatPendidikan.map(r => {
        return {
            tingkat: r[0],
            level: levelMap[r[0]] || 0,
            gelarDepan: r.length > 6 ? (r[5] || '').trim() : '',
            gelarBelakang: r.length > 6 ? (r[6] || '').trim() : (r.length === 6 ? (r[5] || '').trim() : '')
        };
    }).filter(r => r.level > 0);

    if (parsedRiwayat.length === 0) return nama;

    let maxLevel = Math.max(...parsedRiwayat.map(r => r.level));

    let gelarDepanArr = [];
    let gelarBelakangArr = [];

    if (maxLevel >= 7) {
        // Collect S1, S2, S3
        let sarjana = parsedRiwayat.filter(r => r.level >= 7).sort((a, b) => a.level - b.level);
        sarjana.forEach(r => {
            if (r.gelarDepan) {
                // split by comma to avoid duplicate titles like "Dr." if typed multiple times
                r.gelarDepan.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarDepanArr.includes(tg)) gelarDepanArr.push(tg);
                });
            }
            if (r.gelarBelakang) {
                r.gelarBelakang.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarBelakangArr.includes(tg)) gelarBelakangArr.push(tg);
                });
            }
        });
    } else {
        // Highest is below S1
        let highest = parsedRiwayat.filter(r => r.level === maxLevel);
        highest.forEach(r => {
            if (r.gelarDepan) {
                r.gelarDepan.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarDepanArr.includes(tg)) gelarDepanArr.push(tg);
                });
            }
            if (r.gelarBelakang) {
                r.gelarBelakang.split(',').forEach(g => {
                    let tg = g.trim();
                    if (tg && !gelarBelakangArr.includes(tg)) gelarBelakangArr.push(tg);
                });
            }
        });
    }

    let combinedName = nama;
    if (gelarDepanArr.length > 0) {
        combinedName = gelarDepanArr.join(', ') + ' ' + combinedName;
    }
    if (gelarBelakangArr.length > 0) {
        combinedName = combinedName + ', ' + gelarBelakangArr.join(', ');
    }

    return combinedName;
}

async function cetakCV(nip) {
    const allPegawai = await dbManager.getAllPegawai();
    const p = allPegawai.find(x => x.nip === nip);
    if (!p) return;

    let settings = await dbManager.getPengaturan() || {};

    // Construct HTML
    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8">
        <meta name="ProgId" content="Word.Document">
        <meta name="Generator" content="Microsoft Word 15">
        <meta name="Originator" content="Microsoft Word 15">
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
        <style>
            @page Section1 { size: 21.0cm 29.7cm; margin: 1cm 1.5cm 1.5cm 2.0cm; }
              div.Section1 { page: Section1; }
            body { font-family: 'Arial', sans-serif; font-size: 11pt; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 5px; }
            .kop { text-align: center; margin-bottom: 20px; border-bottom: 3px solid black; padding-bottom: 10px; }
            .kop-kiri { font-size: 14pt; font-weight: bold; }
            .kop-kanan { font-size: 14pt; font-weight: bold; }
            .kop-tengah1 { font-size: 16pt; font-weight: bold; }
            .kop-tengah2 { font-size: 12pt; }
            .kop-tengah3 { font-size: 10pt; font-style: italic; }
            .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 20px 0; text-decoration: underline; }
            .section-title { font-weight: bold; margin-top: 15px; background: #eee; padding: 5px; border: 1px solid black; }
            .signature-box { width: 300px; float: right; text-align: center; margin-top: 40px; }
            .signature-box p { margin: 5px 0; }
            .signature-name { font-weight: bold; text-decoration: underline; margin-top: 100px; }
        </style>
    </head>
    <body>
<div class="Section1">
        <table style="width: 100%; border: none; margin-bottom: 5px;">
            <tr>
                <td style="width: 15%; border: none; text-align: center; vertical-align: middle;">
                    ${settings.logoInstansi && settings.logoInstansi.includes('base64,') ? '<img src="cid:logoInstansi" width="80" height="80" />' : ''}
                </td>
                <td style="width: 70%; border: none; text-align: center; vertical-align: middle; line-height: 1.2;">
                    <div style="font-size: 14pt; font-weight: bold;">${(settings.instansi || '').toUpperCase()}</div>
                    ${settings.opd ? '<div style="font-size: 14pt; font-weight: bold;">' + settings.opd.toUpperCase() + '</div>' : ''}
                    <div style="font-size: 16pt; font-weight: bold;">${(settings.sekolah || '').toUpperCase()}</div>
                    <div style="font-size: 11pt; margin-top: 5px;">Alamat: ${settings.alamat || ''}</div>
                    <div style="font-size: 11pt;">
                        ${settings.email ? 'Email: ' + settings.email + ' &nbsp;' : ''}
                        ${settings.web ? 'Web: ' + settings.web + ' &nbsp;' : ''}
                        ${settings.hp ? 'Telp: ' + settings.hp : ''}
                    </div>
                </td>
                <td style="width: 15%; border: none; text-align: center; vertical-align: middle;">
                    ${settings.logoSekolah && settings.logoSekolah.includes(',') ? '<img src="cid:logoSekolah" width="80" height="80" />' : ''}
                </td>
            </tr>
        </table>
        <hr style="border: 0; border-top: 3px solid black; margin: 0 0 15px 0; padding: 0;">
        
        <div class="title">DATA INDUK PEGAWAI</div>
        
        <div class="section-title">I. DATA PRIBADI</div>
        <table style="border: none;">
            <tr style="border: none;"><td style="border: none; width: 30%; padding-left: 20px;">1. Nama Lengkap</td><td style="border: none;">: ${p.nama}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">2. NIK</td><td style="border: none;">: ${p.nik || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">3. Tempat, Tanggal Lahir</td><td style="border: none;">: ${p.tempatLahir || ''}, ${p.tglLahir || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">4. Jenis Kelamin</td><td style="border: none;">: ${p.kelamin || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">5. Agama</td><td style="border: none;">: ${p.agama || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">6. Status Perkawinan</td><td style="border: none;">: ${p.statusKawin || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">7. Golongan Darah</td><td style="border: none;">: ${p.golDarah || '-'}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">8. Tinggi / Berat Badan</td><td style="border: none;">: ${p.tinggiBadan || '-'} cm / ${p.beratBadan || '-'} kg</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">9. Alamat Rumah</td><td style="border: none;">: ${[p.alamat, p.alamatKabKota, (p.alamatProvinsi ? 'Prov. ' + p.alamatProvinsi : '')].filter(Boolean).join(', ')}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">10. No. HP / WA</td><td style="border: none;">: ${p.noHp || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">11. Email</td><td style="border: none;">: ${p.email || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">12. Hobby</td><td style="border: none;">: ${p.hobby || ''}</td></tr>
        </table>
        <br>
        
        <div class="section-title">II. DATA PEGAWAI</div>
        <table style="border: none;">
            <tr style="border: none;"><td style="border: none; width: 30%; padding-left: 20px;">1. Status Pegawai</td><td style="border: none;">: ${p.statusPegawai || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">2. NIP / NI PPPK</td><td style="border: none;">: ${p.nip || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">3. Pangkat / Gol. Terakhir</td><td style="border: none;">: ${p.golongan || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">4. Jabatan Terakhir</td><td style="border: none;">: ${p.jabatan || ''}</td></tr>
            <tr style="border: none;"><td style="border: none; padding-left: 20px;">5. Unit Kerja / Instansi</td><td style="border: none;">: ${p.unitKerja || ''}</td></tr>
        </table>
        <br>
        
        <div class="section-title">III. RIWAYAT PANGKAT / GOLONGAN</div>
        <table>
            <tr><th>Pangkat/Golongan</th><th>TMT</th><th>Nomor SK</th><th>Tanggal SK</th><th>Masa Kerja</th></tr>
            ${(p.riwayatPangkat && p.riwayatPangkat.length > 0) ? p.riwayatPangkat.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[5]} Thn ${r[6]} Bln</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>
        
        <div class="section-title">IV. RIWAYAT JABATAN</div>
        <table>
            <tr><th>Jenis Jabatan</th><th>Eselon</th><th>Nama Jabatan</th><th>Unit Kerja</th><th>TMT</th></tr>
            ${(p.riwayatJabatan && p.riwayatJabatan.length > 0) ? p.riwayatJabatan.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>
        <div class="section-title">V. RIWAYAT PENDIDIKAN</div>
        <table>
            <tr><th>Tingkat</th><th>Nama Sekolah/Univ</th><th>Jurusan</th><th>Tahun Masuk</th><th>Tahun Lulus</th></tr>
            ${(p.riwayatPendidikan && p.riwayatPendidikan.length > 0) ? p.riwayatPendidikan.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>
        
        <div class="section-title">VI. RIWAYAT GAJI BERKALA (KGB)</div>
        <table>
            <tr><th>No SK</th><th>Tanggal SK</th><th>TMT KGB</th><th>Gaji Pokok</th><th>Masa Kerja</th></tr>
            ${(p.riwayatKGB && p.riwayatKGB.length > 0) ? p.riwayatKGB.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]} Thn ${r[5]} Bln</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>

        <div class="section-title">VII. RIWAYAT KONTRAK (PPPK/HONORER)</div>
        <table>
            <tr><th>Jabatan</th><th>TMT Mulai</th><th>TMT Selesai</th><th>No SK</th><th>Gaji/Honor</th></tr>
            ${(p.riwayatKontrak && p.riwayatKontrak.length > 0) ? p.riwayatKontrak.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td><td style="text-align: center;">${r[7]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>

        <div class="section-title">VIII. DATA KELUARGA</div>
        <table>
            <tr><th>Nama Anggota Keluarga</th><th>Tempat, Tanggal Lahir</th><th>Status Hubungan</th></tr>
            ${(p.riwayatAnak && p.riwayatAnak.length > 0) ? p.riwayatAnak.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}, ${r[2]}</td><td style="text-align: center;">${r[3]}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br>

        <div class="section-title">IX. RIWAYAT KURSUS / DIKLAT</div>
        <table>
            <tr><th>Nama Diklat</th><th>Penyelenggara</th><th>Tahun</th><th>Jumlah Jam</th><th>No Sertifikat</th></tr>
            ${(p.riwayatDiklat && p.riwayatDiklat.length > 0) ? p.riwayatDiklat.map(r => `<tr><td style="text-align: center;">${r[0]}</td><td style="text-align: center;">${r[1]}</td><td style="text-align: center;">${r[2]}</td><td style="text-align: center;">${r[3]}</td><td style="text-align: center;">${r[4]}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;">Tidak ada data</td></tr>'}
        </table>
        <br><br>

        <table style="width: 100%; border: none; margin-top: 40px;">
            <tr>
                <td style="width: 60%; border: none;"></td>
                <td style="width: 40%; border: none; text-align: center;">
                    <p style="margin: 0;">Pegawai Yang Bersangkutan,</p>
                    <br><br><br>
                    <p class="signature-name" style="font-weight: bold; text-decoration: underline; margin: 0;">${generateNamaBergelar(p.nama.toUpperCase(), p.riwayatPendidikan)}</p>
                    <p style="margin: 0;">NIP. ${p.nip}</p>
                </td>
            </tr>
        </table>
        
    </div>
</body>
    </html>
    `;

    // Convert to MHTML to support embedded base64 images
    let mhtml = `MIME-Version: 1.0\nContent-Type: multipart/related; boundary="----=_NextPart_000_0000"\n\n------=_NextPart_000_0000\nContent-Type: text/html; charset="utf-8"\nContent-Transfer-Encoding: 8bit\n\n${html}\n\n`;
    let previewHtml = html;
    if (settings.logoInstansi && settings.logoInstansi.includes('base64,')) {
        const parts = settings.logoInstansi.split(',');
        const meta = parts[0];
        const base64Data = parts[1];
        const mimeType = meta.split(':')[1].split(';')[0];
        mhtml += `------=_NextPart_000_0000\nContent-Type: ${mimeType}\nContent-Transfer-Encoding: base64\nContent-ID: <logoInstansi>\n\n${base64Data}\n`;
        previewHtml = previewHtml.replace(/cid:logoInstansi/g, settings.logoInstansi);
    }
    if (settings.logoSekolah && settings.logoSekolah.includes('base64,')) {
        const parts = settings.logoSekolah.split(',');
        const meta = parts[0];
        const base64Data = parts[1];
        const mimeType = meta.split(':')[1].split(';')[0];
        mhtml += `------=_NextPart_000_0000\nContent-Type: ${mimeType}\nContent-Transfer-Encoding: base64\nContent-ID: <logoSekolah>\n\n${base64Data}\n`;
        previewHtml = previewHtml.replace(/cid:logoSekolah/g, settings.logoSekolah);
    }
    mhtml += `------=_NextPart_000_0000--\n`;

    // Preview before downloading or printing the Word document.
    const blob = new Blob([mhtml], {
        type: 'application/msword'
    });
    openFilePreview({
        fileName: `Data_Induk_${p.nama}_${p.nip}.doc`,
        blob,
        html: documentPreviewHtml(previewHtml),
        mimeType: 'application/msword'
    });
}

async function renderTabelPensiun() {
    if ($.fn.DataTable.isDataTable('#tblEstPensiun')) { try { $('#tblEstPensiun').DataTable().clear().destroy(); } catch (e) { } }
    const allPegawai = await dbManager.getAllPegawai();
    const dataAktif = allPegawai.filter(p => p.statusKepegawaian === 'Aktif');

    const formatted = dataAktif.map((p, index) => {
        let bup = 58; // default
        let jnsJabatan = "-";

        // Cek Jenis Jabatan terakhir
        if (p.riwayatJabatan && p.riwayatJabatan.length > 0) {
            const lastJab = p.riwayatJabatan[p.riwayatJabatan.length - 1];
            jnsJabatan = lastJab[0] || "-";
            if (jnsJabatan.toLowerCase() === "fungsional umum") jnsJabatan = "Pelaksana";

            // Logika BUP
            if (jnsJabatan.toLowerCase().includes("fungsional tertentu")) {
                bup = 60;
            }
        }

        let estPensiunStr = "-";
        if (p.tglLahir) {
            const tglLahir = new Date(p.tglLahir);
            if (!isNaN(tglLahir)) {
                // Tambahkan BUP ke tahun lahir
                const thnPensiun = tglLahir.getFullYear() + bup;
                // Pensiun biasanya TMT awal bulan berikutnya, tapi kita buat Tgl/Bln/Thn sesuai lahir
                const estDate = new Date(thnPensiun, tglLahir.getMonth(), tglLahir.getDate());
                const mm = String(estDate.getMonth() + 1).padStart(2, '0');
                const dd = String(estDate.getDate()).padStart(2, '0');
                const yyyy = estDate.getFullYear();
                estPensiunStr = `${dd}-${mm}-${yyyy}`;
            }
        }

        return [
            index + 1,
            p.nip,
            p.nama,
            p.jabatan || '-',
            p.unitKerja || '-',
            bup + " Tahun",
            p.tglLahir || '-',
            `<b>${estPensiunStr}</b>`
        ];
    });

    const dtPensiun = $('#tblEstPensiun').DataTable({
        destroy: true,
        data: formatted,
        pageLength: 10,
        dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
    });

    $('#filterNamaPensiun').off('keyup').on('keyup', function () {
        dtPensiun.search(this.value).draw();
    });
}


async function handleFileUpload(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    if (file.size > 250 * 1024) {
        Swal.fire('Error', 'Ukuran file maksimal 250 KB!', 'error');
        inputElement.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const base64Data = e.target.result;
        const targetId = inputElement.getAttribute('data-target');

        let fileIdOrUrl = '';

        // Upload logic
        Swal.showLoading();
        try {
            if (typeof window.require !== 'undefined') { // Local Electron version
                const { ipcRenderer } = window.require('electron');
                const res = await ipcRenderer.invoke('simpeel-save-file', file.name, base64Data);
                if (!res || !res.success || !res.filePath) throw new Error(res?.message || 'Gagal menyimpan file secara lokal');
                fileIdOrUrl = res.filePath;
            } else if (typeof apiCall === 'function') { // Online version
                const res = await apiCall('uploadFile', {
                    filename: file.name,
                    mimeType: file.type,
                    base64Data: base64Data.split(',')[1]
                });
                if (!res || !res.success || !res.data?.url) throw new Error(res?.message || 'Gagal mengunggah file ke Drive');
                fileIdOrUrl = res.data.url;
            } else {
                throw new Error('Mode penyimpanan file tidak tersedia');
            }

            // Set target value
            let targetElement;
            if (targetId) {
                targetElement = document.getElementById(targetId);
            } else {
                // Find sibling hidden input if data-target not specified
                targetElement = inputElement.nextElementSibling;
            }

            if (targetElement) {
                targetElement.value = fileIdOrUrl;
            }

            // Show view button
            const viewBtn = inputElement.parentElement.querySelector('.btn-view-file');
            if (viewBtn) viewBtn.classList.remove('d-none');
            Swal.fire('Berhasil', typeof window.require !== 'undefined' ? 'File tersimpan di desktop' : 'File berhasil diunggah ke Drive', 'success');
        } catch (err) {
            Swal.fire('Gagal menyimpan file', err.message, 'error');
        }
    };
    reader.readAsDataURL(file);
}

function viewFileApp(fileUrlOrPath) {
    if (!fileUrlOrPath) return;
    if (typeof window.require !== 'undefined') {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('simpeel-open-file', fileUrlOrPath).then(res => {
            if (!res || !res.success) Swal.fire('File tidak dapat dibuka', res?.message || 'Terjadi kesalahan saat membuka file', 'warning');
        });
    } else if (fileUrlOrPath.startsWith('http')) {
        window.open(fileUrlOrPath, '_blank');
    }
}

function toggleSertifikasiTab(riwayatJabatan = null) {
    let showTab = false;

    if (!riwayatJabatan) {
        try {
            riwayatJabatan = extractTableData('tabelJabatan');
            if (typeof sortRiwayatArray === 'function') {
                riwayatJabatan = sortRiwayatArray(riwayatJabatan, 4);
            }
        } catch (e) { }
    }

    if (riwayatJabatan && Array.isArray(riwayatJabatan) && riwayatJabatan.length > 0) {
        for (let i = 0; i < riwayatJabatan.length; i++) {
            const row = riwayatJabatan[i];
            if (row && row[0] === 'Fungsional Tertentu' && row[2]) {
                const namaJabatan = row[2].toLowerCase();
                if (namaJabatan.includes('guru')) {
                    showTab = true;
                    break;
                }
            }
        }
    }

    const tabNav = document.getElementById('nav-sertifikasi');
    if (tabNav) {
        if (showTab) {
            tabNav.classList.remove('d-none');
            // Auto fill NUPTK
            const pegNuptk = document.getElementById('peg_nuptk');
            const certNuptk = document.getElementById('cert_nuptk');
            if (pegNuptk && certNuptk && !certNuptk.value) {
                certNuptk.value = pegNuptk.value;
            }
        } else {
            // tabNav.classList.add('d-none'); // Always show for now
            const link = tabNav.querySelector('.nav-link');
            if (link && link.classList.contains('active')) {
                const btnPribadi = document.querySelector('[data-bs-target="#f-pribadi"]');
                if (btnPribadi) btnPribadi.click();
            }
        }
    }
}

// Event Listeners for Dynamic UI
document.addEventListener('DOMContentLoaded', () => {
    // Sync NUPTK
    const pegNuptk = document.getElementById('peg_nuptk');
    if (pegNuptk) {
        pegNuptk.addEventListener('input', function () {
            const certNuptk = document.getElementById('cert_nuptk');
            if (certNuptk) certNuptk.value = this.value;
        });
    }

    // Monitor tabelJabatan changes
    const tabelJabatan = document.getElementById('tabelJabatan');
    if (tabelJabatan) {
        tabelJabatan.addEventListener('change', () => toggleSertifikasiTab());
        tabelJabatan.addEventListener('keyup', () => toggleSertifikasiTab());
    }

    // Observer to detect row deletions
    if (tabelJabatan) {
        const observer = new MutationObserver(() => toggleSertifikasiTab());
        observer.observe(tabelJabatan.querySelector('tbody'), { childList: true });
    }
});

async function renderTabelGuruSertif() {
    if ($.fn.DataTable.isDataTable('#tblGuruSertif')) { try { $('#tblGuruSertif').DataTable().clear().destroy(); } catch (e) { } }

    let allPegawai = [];
    try {
        const res = await apiCall('getAllPegawai');
        if (res && res.success) allPegawai = res.data;
    } catch (e) {
        console.error('Gagal mengambil data pegawai untuk Guru Sertif:', e);
    }

    const formatted = [];
    let no = 1;

    // Filter: hanya pegawai aktif yg punya data sertifikasi
    const guruSertif = allPegawai.filter(p => {
        if (p.statusKepegawaian !== 'Aktif') return false;
        return p.sertifikasi && (p.sertifikasi.noSertifikat || p.sertifikasi.tahunLulus);
    });

    // Urutkan: tahun sertifikasi paling lama (terkecil) di atas
    guruSertif.sort((a, b) => {
        const tA = parseInt(a.sertifikasi.tahunLulus) || 9999;
        const tB = parseInt(b.sertifikasi.tahunLulus) || 9999;
        return tA - tB;
    });

    guruSertif.forEach(p => {
        let jabatanTerakhir = '-';
        if (p.riwayatJabatan && Array.isArray(p.riwayatJabatan) && p.riwayatJabatan.length > 0) {
            const sorted = typeof sortRiwayatArray === 'function'
                ? sortRiwayatArray([...p.riwayatJabatan], 4)
                : p.riwayatJabatan;
            if (sorted[0] && sorted[0][2]) jabatanTerakhir = sorted[0][2];
        }

        formatted.push([
            no++,
            p.nama || '-',
            p.nip || '-',
            p.statusPegawai || '-',
            jabatanTerakhir,
            p.sertifikasi.noSertifikat || '-',
            p.sertifikasi.mapel || '-',
            p.sertifikasi.tahunLulus || '-'
        ]);
    });

    const dt = $('#tblGuruSertif').DataTable({
        destroy: true,
        data: formatted,
        pageLength: 10,
        dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
    });

    $('#filterNamaGuruSertif').off('keyup').on('keyup', function () {
        dt.search(this.value).draw();
    });
}
