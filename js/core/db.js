const SETTINGS_CACHE_KEY = "SIMPEEL_SETTINGS_CACHE";

function safeSetStorage(key, value) {
    if (isElectron && key === CACHE_KEY) return;
    try {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, str);
    } catch (e) {
        console.warn(`[dbManager] Gagal menyimpan cache ke localStorage ("${key}"):`, e);
        try {
            if (key === CACHE_KEY && Array.isArray(value)) {
                // Buat versi ringan tanpa foto / berkas base64 besar untuk menghemat kuota localStorage
                const lightData = value.map(item => {
                    const copy = { ...item };
                    if (copy.foto && copy.foto.startsWith('data:') && copy.foto.length > 500) copy.foto = '';
                    if (copy.certFileData && copy.certFileData.length > 500) copy.certFileData = '';
                    if (copy.pasanganBukuNikah && copy.pasanganBukuNikah.length > 500) copy.pasanganBukuNikah = '';
                    return copy;
                });
                localStorage.setItem(key, JSON.stringify(lightData));
            } else if (key === SETTINGS_CACHE_KEY && value && typeof value === 'object') {
                const lightPeng = { ...value };
                if (lightPeng.logoSekolah && lightPeng.logoSekolah.length > 500) delete lightPeng.logoSekolah;
                if (lightPeng.logoInstansi && lightPeng.logoInstansi.length > 500) delete lightPeng.logoInstansi;
                if (lightPeng.kopSurat && lightPeng.kopSurat.length > 500) delete lightPeng.kopSurat;
                if (lightPeng.stempel && lightPeng.stempel.length > 500) delete lightPeng.stempel;
                if (lightPeng.ttdKepsek && lightPeng.ttdKepsek.length > 500) delete lightPeng.ttdKepsek;
                localStorage.setItem(key, JSON.stringify(lightPeng));
            }
        } catch (e2) {
            console.warn(`[dbManager] Quota localStorage penuh, mengabaikan cache disk (data tetap tersimpan aman di database):`, e2);
        }
    }
}

const dbManager = {
    // Cache Lokal HANYA untuk kecepatan BACA data di layar
    localData: (() => {
        if (isElectron) return [];
        try {
            return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') || [];
        } catch (_) {
            return [];
        }
    })(),

    init: async function () {
        // Jalankan pengambilan data terbaru di latar belakang secara asynchronous agar halaman utama terbuka instan
        if (isElectron) {
            try {
                const res = await apiCall('getAllPegawai');
                if (Array.isArray(res)) {
                    this.localData = res;
                    safeSetStorage(CACHE_KEY, res);
                }
            } catch (e) {
                console.warn('[dbManager] Electron init load error:', e);
            }
        } else if (API_URL) {
            this.forceFetchFromServer().catch(e => console.warn('Background sync error:', e));
        }
        return true;
    },

    // Tarik data terbaru dari Server secara Background
    forceFetchFromServer: async function (options = {}) {
        if (!API_URL) return { success: false, message: 'URL server belum dikonfigurasi.' };
        const res = await apiCall('getAllPegawai');
        if (Array.isArray(res)) {
            this.localData = res;
            safeSetStorage(CACHE_KEY, res);
            // Otomatis refresh UI jika berada di dalam dashboard
            if (options.refreshUI !== false && document.getElementById('wrapper').classList.contains('d-none') === false) {
                initApp();
            }
        }
        if (!Array.isArray(res)) return res;
        // Refresh pengaturan dari server/SQLite
        try {
            const freshPeng = await apiCall('getPengaturan');
            if (this.isValidPengaturan(freshPeng)) {
                this.sanitizePengaturan(freshPeng);
                safeSetStorage(SETTINGS_CACHE_KEY, freshPeng);
                window.cachedPengaturan = freshPeng;
                if (typeof applyPengaturanToDOM === 'function') {
                    applyPengaturanToDOM(freshPeng);
                }
            }
        } catch (ePeng) {}
        return res;
    },

    isValidPengaturan: function (data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        // Objek valid jika memiliki properti data instansi/sekolah atau key pengaturan utama
        return Boolean(
            data.sekolah || data.instansi || data.alamat || data.kepsekNama ||
            data.namaSekolah || data.namaInstansi || data.email || data.hp ||
            data.logoInstansi || data.logoSekolah || data.warnaTema
        );
    },

    sanitizePengaturan: function (data) {
        if (!data || typeof data !== 'object') return data;
        delete data.apiKey;
        delete data.action;
        delete data.error;
        if (data.sekolah || data.instansi || data.namaSekolah || data.namaInstansi || data.alamat) {
            delete data.success;
            delete data.message;
        }
        return data;
    },

    getAllPegawai: async function () {
        if ((!this.localData || this.localData.length === 0) && API_URL) {
            try {
                const res = await apiCall('getAllPegawai');
                if (Array.isArray(res)) {
                    this.localData = res;
                    safeSetStorage(CACHE_KEY, res);
                }
            } catch (e) {}
        }
        return this.localData || []; // Baca dari memori agar pindah menu tidak ada loading
    },

    // Simpan data pegawai ke SQLite (offline)
    savePegawai: async function (data) {
        const savedData = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        const res = await apiCall('savePegawai', savedData);

        if (res && res.success) {
            // Update memori lokal agar UI ikut terupdate saat refresh tabel
            let index = this.localData.findIndex(p => p.nip === savedData.nip);
            if (index !== -1) this.localData[index] = savedData;
            else this.localData.push(savedData);
            safeSetStorage(CACHE_KEY, this.localData);
            return res;
        } else {
            throw new Error((res && res.message) ? res.message : "Gagal menyimpan ke database");
        }
    },

    // Hapus data pegawai dari SQLite (offline)
    deletePegawai: async function (nip) {
        const res = await apiCall('deletePegawai', nip);

        if (res && res.success) {
            // Hapus dari memori lokal
            this.localData = this.localData.filter(p => p.nip !== nip);
            safeSetStorage(CACHE_KEY, this.localData);
            return res;
        } else {
            throw new Error((res && res.message) ? res.message : "Gagal menghapus dari database");
        }
    },

    // Pengaturan & Logo (Stale-While-Revalidate: baca instan dari localStorage jika valid, update di background)
    getPengaturan: async function (useCache = true) {
        if (useCache) {
            const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (this.isValidPengaturan(parsed)) {
                        // Lakukan refresh senyap di latar belakang jika online
                        this.refreshPengaturanInBackground();
                        return parsed;
                    }
                } catch (e) {}
            }
        }
        if (!API_URL) return { success: false };
        const fresh = await apiCall('getPengaturan');
        if (this.isValidPengaturan(fresh)) {
            this.sanitizePengaturan(fresh);
            safeSetStorage(SETTINGS_CACHE_KEY, fresh);
            window.cachedPengaturan = fresh;
            return fresh;
        }
        return fresh;
    },

    refreshPengaturanInBackground: async function () {
        if (!API_URL) return;
        try {
            const fresh = await apiCall('getPengaturan');
            if (this.isValidPengaturan(fresh)) {
                this.sanitizePengaturan(fresh);
                const oldCache = localStorage.getItem(SETTINGS_CACHE_KEY);
                const freshStr = JSON.stringify(fresh);
                if (oldCache !== freshStr) {
                    safeSetStorage(SETTINGS_CACHE_KEY, freshStr);
                    window.cachedPengaturan = fresh;
                    if (typeof applyPengaturanToDOM === 'function') {
                        applyPengaturanToDOM(fresh);
                    }
                }
            }
        } catch (e) {}
    },

    getAllAkun: async function () {
        if (!API_URL) return [];
        const res = await apiCall('getAllAkun');
        return Array.isArray(res) ? res : [];
    },
    saveAkun: async function (data, showLoading = true) {
        if (!API_URL) return { success: false, message: "API URL tidak terdefinisi" };
        const savedData = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        if (showLoading) {
            Swal.fire({ title: 'Menyimpan Akun...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        }
        return await apiCall('saveAkun', savedData);
    },
    batchSaveAkun: async function (dataArr) {
        if (!API_URL) return { success: false, message: "API URL tidak terdefinisi" };
        const savedData = dataArr.map(data => ({
            ...data,
            updatedAt: new Date().toISOString()
        }));
        return await apiCall('batchSaveAkun', savedData);
    },
    deleteAkun: async function (nip) {
        if (!API_URL) return { success: false };
        Swal.fire({ title: 'Menghapus Akun...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        return await apiCall('deleteAkun', nip);
    },

    savePengaturan: async function (data) {
        if (!API_URL) return { success: false };
        // Segera perbarui cache lokal agar UI seketika terupdate tanpa tunggu roundtrip jaringan
        safeSetStorage(SETTINGS_CACHE_KEY, data);
        window.cachedPengaturan = data;
        return await apiCall('savePengaturan', data);
    },

    // Manajemen Database Riwayat Cuti (Online Google Sheets / Offline SQLite)
    getRiwayatCuti: async function (forceRefresh = false) {
        try {
            const res = await apiCall('getRiwayatCuti');
            if (Array.isArray(res)) {
                safeSetStorage('SIMPEEL_RIWAYAT_CUTI', res);
                return res;
            }
            if (res && res.success && Array.isArray(res.data)) {
                safeSetStorage('SIMPEEL_RIWAYAT_CUTI', res.data);
                return res.data;
            }
            if (forceRefresh) {
                return res || { success: false, message: 'Server tidak mengembalikan data riwayat cuti.' };
            }
        } catch (e) {
            console.warn('[dbManager] getRiwayatCuti network error, membaca dari cache disk:', e);
            if (forceRefresh) return { success: false, message: e.message || 'Gagal mengambil riwayat cuti dari server.' };
        }
        try {
            return JSON.parse(localStorage.getItem('SIMPEEL_RIWAYAT_CUTI') || '[]') || [];
        } catch (_) {
            return [];
        }
    },

    saveRiwayatCuti: async function (item) {
        try {
            const res = await apiCall('saveRiwayatCuti', item);
            if (!res || res.success !== true) {
                return res || { success: false, message: 'Server tidak mengonfirmasi penyimpanan riwayat cuti.' };
            }
            try {
                let list = JSON.parse(localStorage.getItem('SIMPEEL_RIWAYAT_CUTI') || '[]') || [];
                const idx = list.findIndex(x => x.id === item.id);
                if (idx !== -1) list[idx] = item;
                else list.unshift(item);
                safeSetStorage('SIMPEEL_RIWAYAT_CUTI', list);
            } catch (_) {}
            return res;
        } catch (e) {
            console.error('[dbManager] saveRiwayatCuti error:', e);
            return { success: false, message: e.message };
        }
    },

    deleteRiwayatCuti: async function (id) {
        try {
            const res = await apiCall('deleteRiwayatCuti', { id });
            if (!res || res.success !== true) {
                return res || { success: false, message: 'Server tidak mengonfirmasi penghapusan riwayat cuti.' };
            }
            try {
                let list = JSON.parse(localStorage.getItem('SIMPEEL_RIWAYAT_CUTI') || '[]') || [];
                list = list.filter(x => x.id !== id);
                safeSetStorage('SIMPEEL_RIWAYAT_CUTI', list);
            } catch (_) {}
            return res;
        } catch (e) {
            console.error('[dbManager] deleteRiwayatCuti error:', e);
            return { success: false, message: e.message };
        }
    },

    clearRiwayatCuti: async function () {
        try {
            const res = await apiCall('clearRiwayatCuti');
            if (!res || res.success !== true) {
                return res || { success: false, message: 'Server tidak mengonfirmasi pengosongan riwayat cuti.' };
            }
            safeSetStorage('SIMPEEL_RIWAYAT_CUTI', []);
            return res;
        } catch (e) {
            console.error('[dbManager] clearRiwayatCuti error:', e);
            return { success: false, message: e.message };
        }
    }
};
