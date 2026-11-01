const SIMPEEL_SOP_KEY = 'simpeel_sop_pdf';
const SIMPEEL_LAW_KEY = 'simpeel_dasar_hukum';
const SIMPEEL_DEFAULT_LAWS = [
    {
        type: 'Konstitusi RI',
        number: 'UUD Negara Republik Indonesia Tahun 1945',
        title: 'Pasal 31 ayat (1) dan ayat (3) tentang hak pendidikan dan sistem pendidikan nasional',
        relation: 'Landasan hak warga negara atas pendidikan serta penyelenggaraan sistem pendidikan nasional.',
        url: 'https://jdih.bp2mi.go.id/uploads/20191011/20191011093525_6_UUD45_Tahun_1945_Tentang_Perubahan_Keempat_UUD45.pdf'
    },
    {
        type: 'Undang-Undang',
        number: 'UU No. 20 Tahun 2003',
        title: 'Sistem Pendidikan Nasional',
        relation: 'Landasan penyelenggaraan pendidikan, termasuk pengelolaan pendidik dan tenaga kependidikan di satuan pendidikan.',
        url: 'https://peraturan.bpk.go.id/Details/43920/uu-no-20-tahun-2003'
    },
    {
        type: 'Peraturan Presiden',
        number: 'Perpres No. 95 Tahun 2018',
        title: 'Sistem Pemerintahan Berbasis Elektronik (SPBE)',
        relation: 'Landasan umum transformasi layanan dan tata kelola administrasi pemerintahan berbasis elektronik.',
        url: 'https://peraturan.bpk.go.id/Details/95328/perpres-no-95-tahun-2018'
    },
    {
        type: 'Undang-Undang',
        number: 'UU No. 27 Tahun 2022',
        title: 'Pelindungan Data Pribadi',
        relation: 'Menjadi acuan perlindungan data pribadi pegawai, termasuk identitas, riwayat pekerjaan, dan informasi keluarga.',
        url: 'https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022'
    },
    {
        type: 'Undang-Undang',
        number: 'UU No. 11 Tahun 2008 sebagaimana diubah dengan UU No. 1 Tahun 2024',
        title: 'Informasi dan Transaksi Elektronik',
        relation: 'Landasan umum pengelolaan informasi dan dokumen elektronik pada administrasi kepegawaian.',
        url: 'https://peraturan.bpk.go.id/Details/274494/uu-no-1-tahun-2024'
    },
    {
        type: 'Undang-Undang',
        number: 'UU No. 20 Tahun 2023',
        title: 'Aparatur Sipil Negara',
        relation: 'Mendasari pengelolaan data dan rekam jejak ASN/PPPK, termasuk riwayat kepangkatan dan pengembangan karier berbasis merit.',
        url: 'https://peraturan.bpk.go.id/Details/269470/uu-no-20-tahun-2023'
    },
    {
        type: 'Undang-Undang',
        number: 'UU No. 14 Tahun 2005',
        title: 'Guru dan Dosen',
        relation: 'Menjadi acuan data kualifikasi pendidik, sertifikasi, hak profesi, dan beban kerja guru.',
        url: 'https://peraturan.bpk.go.id/Details/40266/uu-no-14-tahun-2005'
    },
    {
        type: 'Keputusan Menteri PAN-RB',
        number: 'KepmenPAN-RB No. 282 Tahun 2025',
        title: 'Nomenklatur Jabatan Pelaksana ASN di Lingkungan Instansi Pemerintah',
        relation: 'Acuan nomenklatur dan klasifikasi jabatan pelaksana tenaga kependidikan.',
        url: 'https://peraturan.bpk.go.id/Details/353243/kemen-panrb-no-282-tahun-2025'
    },
    {
        type: 'Permendikdasmen',
        number: 'Permendikdasmen No. 23 Tahun 2026',
        title: 'Standar Tenaga Kependidikan pada PAUD, Pendidikan Dasar, dan Pendidikan Menengah',
        relation: 'Acuan standar pendidik dan tenaga kependidikan, termasuk kualifikasi, kompetensi, dan formasi kepegawaian sekolah.',
        url: 'https://peraturan.go.id/id/permendikdasmen-no-23-tahun-2026'
    },
    {
        type: 'Permendikbudristek',
        number: 'Permendikbudristek No. 19 Tahun 2024',
        title: 'Pendidikan Profesi Guru dan Sertifikasi Pendidik',
        relation: 'Landasan pencatatan pendidikan profesi, sertifikat pendidik, dan Nomor Registrasi Guru.',
        url: 'https://peraturan.bpk.go.id/Details/287342/permendikbudriset-no-19-tahun-2024'
    },
    {
        type: 'Permendikdasmen',
        number: 'Permendikdasmen No. 10 Tahun 2026',
        title: 'Petunjuk Teknis Tunjangan Profesi, Tunjangan Khusus, dan Tambahan Penghasilan Guru ASN Daerah',
        relation: 'Acuan administrasi tunjangan profesi, tunjangan khusus, dan tambahan penghasilan guru ASN daerah.',
        url: 'https://peraturan.go.id/id/permendikdasmen-no-10-tahun-2026'
    }
].map((law, index) => ({ id: index + 1, ...law }));

let pendingSimpeelSop = null;
let simpeelSopObjectUrl = null;

function getSimpeelSopRecord() {
    try {
        const settings = window.cachedPengaturan || {};
        let record = settings.simpeelSop || null;
        if (typeof record === 'string') record = JSON.parse(record);
        if (record && typeof record === 'object' && (
            (typeof record.data === 'string' && record.data.startsWith('data:application/pdf;base64,')) ||
            record.driveUrl || record.url || record.localPath
        )) return record;

        const legacyRecord = JSON.parse(localStorage.getItem(SIMPEEL_SOP_KEY) || 'null');
        return legacyRecord && typeof legacyRecord.data === 'string' && legacyRecord.data.startsWith('data:application/pdf;base64,')
            ? legacyRecord
            : null;
    } catch (error) {
        console.warn('[SiMPEEL SOP] Gagal membaca data SOP tersimpan:', error);
        return null;
    }
}

function formatSimpeelSopDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleString('id-ID');
}

async function saveSimpeelSopSettings(record) {
    let settings = window.cachedPengaturan || {};
    if (typeof dbManager !== 'undefined') {
        const current = await dbManager.getPengaturan(false);
        if (current?.success === false) {
            throw new Error(current.message || 'Pengaturan SiMPEEL tidak dapat dibaca.');
        }
        if (current && typeof current === 'object') settings = current;
    }

    const nextSettings = {
        ...settings,
        simpeelSop: JSON.stringify(record),
        updatedAt: new Date().toISOString()
    };
    const result = await dbManager.savePengaturan(nextSettings);
    if (!result || !result.success) {
        throw new Error(result?.message || 'Referensi SOP gagal disimpan ke pengaturan SiMPEEL.');
    }
    window.cachedPengaturan = nextSettings;
    return nextSettings;
}

function getSimpeelLawList() {
    try {
        const list = JSON.parse(localStorage.getItem(SIMPEEL_LAW_KEY) || 'null');
        if (Array.isArray(list)) return list;
    } catch (error) {
        console.warn('[SiMPEEL Dasar Hukum] Gagal membaca regulasi tersimpan:', error);
    }
    return SIMPEEL_DEFAULT_LAWS.map(law => ({ ...law }));
}

function saveSimpeelLawList(list) {
    localStorage.setItem(SIMPEEL_LAW_KEY, JSON.stringify(list));
}

function getSafeSimpeelLawUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' ? url.toString() : '';
    } catch (_) {
        return '';
    }
}

function renderSimpeelLawTable() {
    const tbody = document.getElementById('simpeelLawTable');
    if (!tbody) return;
    const laws = getSimpeelLawList();
    if (!laws.length) {
        tbody.innerHTML = '<tr><td class="text-center text-muted py-4" colspan="5">Belum ada regulasi. Tambahkan regulasi atau reset ke daftar standar.</td></tr>';
        return;
    }
    tbody.innerHTML = laws.map((law, index) => `
        <tr>
            <td class="text-center text-muted">${index + 1}</td>
            <td><small class="d-block text-muted">${escapeHtml(law.type)}</small><span class="fw-semibold">${escapeHtml(law.number)}</span></td>
            <td>${escapeHtml(law.title)}</td>
            <td>${escapeHtml(law.relation)}</td>
            <td class="text-center">
                ${getSafeSimpeelLawUrl(law.url) ? `<a class="btn btn-sm btn-outline-info border-0" href="${escapeHtml(getSafeSimpeelLawUrl(law.url))}" target="_blank" rel="noopener noreferrer" title="Buka referensi"><i class="fas fa-external-link-alt"></i></a>` : ''}
                <button class="btn btn-sm btn-outline-primary border-0" onclick="openSimpeelLawModal(${index})" type="button" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteSimpeelLaw(${index})" type="button" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
}

function renderSimpeelSopStatus() {
    const record = getSimpeelSopRecord();
    const badge = document.getElementById('simpeelSopBadge');
    const meta = document.getElementById('simpeelSopMeta');
    const viewButton = document.getElementById('simpeelSopView');
    const deleteButton = document.getElementById('simpeelSopDelete');
    const viewColumn = document.getElementById('simpeelSopViewColumn');
    const deleteColumn = document.getElementById('simpeelSopDeleteColumn');
    if (badge) {
        badge.textContent = record ? 'SOP Aktif' : 'Belum ada SOP';
        badge.className = `badge rounded-pill border ${record ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'}`;
    }
    if (meta) {
        const location = record?.driveUrl && record?.localPath
            ? 'Google Drive · tersimpan di laptop'
            : record?.driveUrl
                ? 'Google Drive'
                : record?.localPath
                    ? 'Laptop ini'
                    : record?.data
                        ? 'Penyimpanan lokal'
                        : '';
        const size = record?.sizeText || (record?.sizeBytes ? `${(Number(record.sizeBytes) / 1024).toFixed(1)} KB` : '');
        meta.textContent = record ? `${record.name || 'SOP_Kepegawaian.pdf'} · ${size} · ${location}${record.updatedAt ? ` · Disimpan ${formatSimpeelSopDate(record.updatedAt)}` : ''}` : '';
        meta.classList.toggle('d-none', !record);
    }
    if (viewColumn) viewColumn.classList.toggle('d-none', !record);
    else if (viewButton) viewButton.classList.toggle('d-none', !record);
    if (deleteColumn) deleteColumn.classList.toggle('d-none', !record);
    else if (deleteButton) deleteButton.classList.toggle('d-none', !record);
}

window.bukaHelpdeskSimpeel = async function () {
    let settings = window.cachedPengaturan || {};
    if (typeof dbManager !== 'undefined') {
        try {
            const latestSettings = await dbManager.getPengaturan(true);
            if (latestSettings && typeof latestSettings === 'object' && !latestSettings.success) {
                settings = latestSettings;
                window.cachedPengaturan = latestSettings;
            }
        } catch (error) {
            console.warn('[SiMPEEL Helpdesk] Gagal memuat kontak pengaturan terbaru:', error);
        }
    }
    const adminName = String(settings.helpdeskNama || 'Admin Sekolah');
    const contactNumber = String(
        settings.hp ||
        settings.telepon ||
        settings.noHp ||
        settings.no_hp ||
        settings.telp ||
        settings.nomorTelepon ||
        settings.nomorHp ||
        document.getElementById('set_hp')?.value ||
        ''
    ).trim();
    const digits = contactNumber.replace(/\D/g, '');
    const internationalDigits = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    const telNumber = digits.startsWith('0') ? `+62${digits.slice(1)}` : (contactNumber.replace(/[^\d+]/g, ''));
    const email = String(settings.email || '').trim();
    const numberText = contactNumber ? escapeHtml(contactNumber) : 'Belum diatur pada Pengaturan';
    const emailText = email ? escapeHtml(email) : 'Belum diatur pada Pengaturan';

    Swal.fire({
        title: 'Helpdesk SiMPEEL',
        html: `<div class="text-start mt-3">
            <p><i class="fas fa-user-circle text-secondary me-2"></i><strong>Nama Admin:</strong><br>${escapeHtml(adminName)}</p>
            <p><i class="fab fa-whatsapp text-success me-2"></i><strong>WhatsApp Admin:</strong><br>
                ${internationalDigits ? `<a href="https://wa.me/${internationalDigits}" target="_blank" rel="noopener noreferrer">${numberText}</a>` : numberText}
            </p>
            <p><i class="fas fa-phone text-primary me-2"></i><strong>No. Telepon:</strong><br>
                ${telNumber ? `<a href="tel:${escapeHtml(telNumber)}">${numberText}</a>` : numberText}
            </p>
            <p class="mb-0"><i class="fas fa-envelope text-info me-2"></i><strong>Email:</strong><br>
                ${email ? `<a href="mailto:${encodeURIComponent(email)}">${emailText}</a>` : emailText}
            </p>
        </div>`,
        icon: 'info',
        confirmButtonText: 'Tutup'
    });
};

window.loadSimpeelSopLawTab = async function () {
    if (typeof dbManager !== 'undefined') {
        try {
            const settings = await dbManager.getPengaturan(false);
            if (settings && typeof settings === 'object' && settings.success !== false) {
                window.cachedPengaturan = settings;
            }
        } catch (error) {
            console.error('[SiMPEEL SOP] Gagal memuat status SOP dari pengaturan:', error);
        }
    }
    const hint = document.getElementById('simpeelSopHint');
    if (hint) {
        hint.textContent = window.electronAPI
            ? 'Di desktop, SOP disimpan di laptop dan ikut diunggah ke Drive saat sinkronisasi.'
            : 'SOP diunggah ke folder SiMPeEL_Uploads pada Drive yang sama dengan spreadsheet.';
    }
    if (!localStorage.getItem(SIMPEEL_LAW_KEY)) {
        try {
            saveSimpeelLawList(SIMPEEL_DEFAULT_LAWS);
        } catch (error) {
            console.error('[SiMPEEL Dasar Hukum] Gagal menginisialisasi regulasi standar:', error);
        }
    }
    renderSimpeelSopStatus();
    renderSimpeelLawTable();
};

window.handleSimpeelSopSelected = async function (event) {
    const file = event.target.files && event.target.files[0];
    const saveButton = document.getElementById('simpeelSopSave');
    const hint = document.getElementById('simpeelSopHint');
    pendingSimpeelSop = null;
    if (saveButton) saveButton.disabled = true;
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        event.target.value = '';
        Swal.fire('Format Tidak Valid', 'Pilih dokumen dengan format PDF.', 'warning');
        return;
    }
    if (file.size > 500 * 1024) {
        event.target.value = '';
        Swal.fire('Ukuran Terlalu Besar', 'Ukuran file SOP maksimal 500 KB.', 'warning');
        return;
    }
    try {
        const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        if (new TextDecoder().decode(header) !== '%PDF-') {
            event.target.value = '';
            Swal.fire('PDF Tidak Valid', 'Isi file tidak terdeteksi sebagai dokumen PDF.', 'error');
            return;
        }
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('File SOP gagal dibaca.'));
            reader.readAsDataURL(file);
        });
        pendingSimpeelSop = {
            name: file.name,
            sizeBytes: file.size,
            sizeText: `${(file.size / 1024).toFixed(1)} KB`,
            mimeType: 'application/pdf',
            data,
            updatedAt: new Date().toISOString()
        };
        if (saveButton) saveButton.disabled = false;
        if (hint) hint.textContent = `File siap disimpan: ${file.name} (${pendingSimpeelSop.sizeText}).`;
    } catch (error) {
        console.error('[SiMPEEL SOP] Gagal membaca file:', error);
        Swal.fire('Gagal Membaca File', error.message || 'File SOP tidak dapat dibaca.', 'error');
    }
};

window.saveSimpeelSop = async function () {
    if (!pendingSimpeelSop) {
        Swal.fire('Pilih File', 'Pilih dokumen PDF SOP terlebih dahulu.', 'info');
        return;
    }
    const saveButton = document.getElementById('simpeelSopSave');
    if (saveButton) saveButton.disabled = true;
    try {
        const record = { ...pendingSimpeelSop };
        const electronAPI = window.electronAPI;
        if (electronAPI) {
            const result = await electronAPI.saveFile(record.name, record.data);
            if (!result?.success || !result.filePath) {
                throw new Error(result?.message || 'File SOP gagal disimpan ke laptop.');
            }
            record.fileId = result.fileId;
            record.localPath = result.filePath;
            record.data = '';
        } else {
            const base64Data = record.data.split(',')[1] || '';
            const upload = await apiCall('uploadFile', {
                filename: record.name,
                mimeType: 'application/pdf',
                base64Data,
                publicAccess: true
            });
            if (!upload?.success || !upload.data?.url) {
                throw new Error(upload?.message || 'File SOP gagal diunggah ke Google Drive.');
            }
            record.driveUrl = upload.data.url;
            record.fileId = upload.data.fileId || '';
            record.data = '';
        }
        await saveSimpeelSopSettings(record);
        localStorage.removeItem(SIMPEEL_SOP_KEY);
        pendingSimpeelSop = null;
        const input = document.getElementById('simpeelSopInput');
        if (input) input.value = '';
        const hint = document.getElementById('simpeelSopHint');
        if (hint) hint.textContent = electronAPI
            ? 'Dokumen tersimpan di laptop ini. Login Admin Cloud lalu sinkronkan agar diunggah ke Drive dan tersedia di laptop lain.'
            : 'Dokumen tersimpan di folder SiMPeEL_Uploads pada Drive yang sama dengan spreadsheet.';
        renderSimpeelSopStatus();
        Swal.fire(
            electronAPI ? 'Tersimpan di Laptop' : 'Berhasil Diunggah',
            electronAPI
                ? 'SOP tersimpan secara lokal dan akan diunggah saat sinkronisasi berikutnya.'
                : 'SOP berhasil diunggah ke Google Drive pada folder yang sama dengan spreadsheet.',
            'success'
        );
    } catch (error) {
        console.error('[SiMPEEL SOP] Gagal menyimpan SOP:', error);
        Swal.fire('Gagal Menyimpan SOP', error.message || 'File SOP tidak dapat disimpan.', 'error');
    } finally {
        if (saveButton) saveButton.disabled = !pendingSimpeelSop;
    }
};

window.previewSimpeelSop = async function () {
    let record = getSimpeelSopRecord();
    if (!record && typeof dbManager !== 'undefined') {
        try {
            const settings = await dbManager.getPengaturan(false);
            if (settings?.success === false) throw new Error(settings.message || 'Pengaturan SiMPEEL tidak dapat dibaca.');
            if (settings && typeof settings === 'object') {
                window.cachedPengaturan = settings;
                record = getSimpeelSopRecord();
            }
        } catch (error) {
            console.error('[SiMPEEL SOP] Gagal memuat SOP dari pengaturan:', error);
            Swal.fire('Gagal Memuat SOP', error.message || 'Pengaturan SOP tidak dapat dibaca.', 'error');
            return;
        }
    }
    if (!record) {
        Swal.fire('SOP Tidak Ditemukan', 'Unggah kembali dokumen SOP untuk melihatnya.', 'warning');
        renderSimpeelSopStatus();
        return;
    }
    const modalElement = document.getElementById('simpeelSopPreviewModal');
    const frame = document.getElementById('simpeelSopFrame');
    const download = document.getElementById('simpeelSopDownload');
    if (!modalElement || !frame || !download) return;
    if (simpeelSopObjectUrl) URL.revokeObjectURL(simpeelSopObjectUrl);
    try {
        let dataUri = record.data || '';
        if (!dataUri && record.localPath && window.electronAPI) {
            const localFile = window.electronAPI.getPublicSopData
                ? await window.electronAPI.getPublicSopData()
                : await window.electronAPI.getFileData(record.localPath);
            if (localFile?.success && localFile.dataUri) dataUri = localFile.dataUri;
        }

        if (dataUri.startsWith('data:')) {
            const base64 = dataUri.split(',')[1] || '';
            const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
            simpeelSopObjectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
            frame.src = simpeelSopObjectUrl;
            download.href = simpeelSopObjectUrl;
        } else if (record.driveUrl) {
            const driveId = record.driveUrl.match(/[-\w]{25,}/)?.[0];
            const previewUrl = driveId
                ? `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`
                : record.driveUrl;
            frame.src = previewUrl;
            download.href = driveId
                ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`
                : record.driveUrl;
        } else {
            throw new Error('File SOP tidak ditemukan di laptop. Jalankan sinkronisasi untuk mengunduhnya dari Drive.');
        }
        download.download = record.name || 'SOP_Kepegawaian.pdf';
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalElement.addEventListener('hidden.bs.modal', () => {
            frame.src = 'about:blank';
            if (simpeelSopObjectUrl) URL.revokeObjectURL(simpeelSopObjectUrl);
            simpeelSopObjectUrl = null;
        }, { once: true });
        modal.show();
    } catch (error) {
        console.error('[SiMPEEL SOP] Gagal membuka pratinjau:', error);
        Swal.fire('Gagal Membuka SOP', error.message || 'Dokumen SOP tidak dapat dibuka.', 'error');
    }
};

window.deleteSimpeelSop = async function () {
    const result = await Swal.fire({
        title: 'Hapus SOP?',
        text: 'Referensi SOP di aplikasi akan dihapus. Salinan file yang sudah ada di Google Drive tidak ikut dihapus.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;
    try {
        const settings = await dbManager.getPengaturan(false);
        if (settings?.success === false) throw new Error(settings.message || 'Pengaturan SiMPEEL tidak dapat dibaca.');
        const nextSettings = { ...settings };
        delete nextSettings.simpeelSop;
        nextSettings.updatedAt = new Date().toISOString();
        const saved = await dbManager.savePengaturan(nextSettings);
        if (!saved?.success) throw new Error(saved?.message || 'Referensi SOP gagal dihapus.');
        window.cachedPengaturan = nextSettings;
        localStorage.removeItem(SIMPEEL_SOP_KEY);
        renderSimpeelSopStatus();
        Swal.fire('Terhapus', 'Referensi SOP dihapus dari pengaturan. Salinan file yang sudah terunggah tetap berada di Drive.', 'success');
    } catch (error) {
        console.error('[SiMPEEL SOP] Gagal menghapus referensi SOP:', error);
        Swal.fire('Gagal Menghapus SOP', error.message || 'Referensi SOP tidak dapat dihapus.', 'error');
    }
};

window.openSimpeelLawModal = function (index = -1) {
    const laws = getSimpeelLawList();
    const law = index >= 0 ? laws[index] : null;
    document.getElementById('simpeelLawEditIndex').value = String(index);
    document.getElementById('simpeelLawModalTitle').textContent = law ? 'Edit Dasar Hukum' : 'Tambah Dasar Hukum';
    document.getElementById('simpeelLawType').value = law?.type || '';
    document.getElementById('simpeelLawNumber').value = law?.number || '';
    document.getElementById('simpeelLawTitle').value = law?.title || '';
    document.getElementById('simpeelLawRelation').value = law?.relation || '';
    document.getElementById('simpeelLawUrl').value = law?.url || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('simpeelLawModal')).show();
};

window.saveSimpeelLaw = function (event) {
    event.preventDefault();
    const index = Number(document.getElementById('simpeelLawEditIndex').value);
    const laws = getSimpeelLawList();
    const lawUrl = document.getElementById('simpeelLawUrl').value.trim();
    if (lawUrl && !getSafeSimpeelLawUrl(lawUrl)) {
        Swal.fire('Tautan Tidak Valid', 'Gunakan tautan referensi dengan protokol HTTPS.', 'warning');
        return;
    }
    const law = {
        id: index >= 0 && laws[index] ? laws[index].id : Date.now(),
        type: document.getElementById('simpeelLawType').value.trim(),
        number: document.getElementById('simpeelLawNumber').value.trim(),
        title: document.getElementById('simpeelLawTitle').value.trim(),
        relation: document.getElementById('simpeelLawRelation').value.trim(),
        url: lawUrl
    };
    if (index >= 0 && laws[index]) laws[index] = law;
    else laws.push(law);
    try {
        saveSimpeelLawList(laws);
        bootstrap.Modal.getInstance(document.getElementById('simpeelLawModal'))?.hide();
        renderSimpeelLawTable();
        Swal.fire('Berhasil', 'Regulasi berhasil disimpan.', 'success');
    } catch (error) {
        console.error('[SiMPEEL Dasar Hukum] Gagal menyimpan regulasi:', error);
        Swal.fire('Gagal', 'Regulasi tidak dapat disimpan ke penyimpanan lokal.', 'error');
    }
};

window.deleteSimpeelLaw = async function (index) {
    const laws = getSimpeelLawList();
    const law = laws[index];
    if (!law) return;
    const result = await Swal.fire({
        title: 'Hapus Regulasi?',
        text: `Hapus ${law.number} — ${law.title}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;
    laws.splice(index, 1);
    try {
        saveSimpeelLawList(laws);
        renderSimpeelLawTable();
        Swal.fire('Terhapus', 'Regulasi berhasil dihapus.', 'success');
    } catch (error) {
        console.error('[SiMPEEL Dasar Hukum] Gagal menghapus regulasi:', error);
        Swal.fire('Gagal', 'Regulasi tidak dapat disimpan ke penyimpanan lokal.', 'error');
    }
};

window.resetSimpeelLaws = async function () {
    const result = await Swal.fire({
        title: 'Reset Dasar Hukum?',
        text: 'Daftar akan dikembalikan ke regulasi standar portal SiKoBaELah untuk SiMPEEL.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Reset Standar',
        cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;
    try {
        saveSimpeelLawList(SIMPEEL_DEFAULT_LAWS);
        renderSimpeelLawTable();
        Swal.fire('Berhasil', 'Daftar dasar hukum standar telah dipulihkan.', 'success');
    } catch (error) {
        console.error('[SiMPEEL Dasar Hukum] Gagal mereset regulasi:', error);
        Swal.fire('Gagal', 'Daftar standar tidak dapat disimpan.', 'error');
    }
};
