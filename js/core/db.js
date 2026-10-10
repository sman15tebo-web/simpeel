const SETTINGS_CACHE_KEY = "SIMPEEL_SETTINGS_CACHE";

const dbManager = {
    // Cache Lokal HANYA untuk kecepatan BACA data di layar
    localData: JSON.parse(localStorage.getItem(CACHE_KEY)) || [],

    init: async function () {
        // Jalankan pengambilan data terbaru di latar belakang secara asynchronous agar halaman utama terbuka instan
        if (API_URL) {
            this.forceFetchFromServer().catch(e => console.warn('Background sync error:', e));
        }
        return true;
    },

    // Tarik data terbaru dari Server secara Background
    forceFetchFromServer: async function () {
        if (!API_URL) return;
        const res = await apiCall('getAllPegawai');
        if (Array.isArray(res)) {
            this.localData = res;
            localStorage.setItem(CACHE_KEY, JSON.stringify(res));
            // Otomatis refresh UI jika berada di dalam dashboard
            if (document.getElementById('wrapper').classList.contains('d-none') === false) {
                initApp();
            }
        }
    },

    getAllPegawai: async function () {
        return this.localData; // Baca dari memori agar pindah menu tidak ada loading
    },

    // Simpan data pegawai ke SQLite (offline)
    savePegawai: async function (data) {
        const savedData = {
            ...data,
            updatedAt: data.updatedAt || new Date().toISOString()
        };
        const res = await apiCall('savePegawai', savedData);

        if (res && res.success) {
            // Update memori lokal agar UI ikut terupdate saat refresh tabel
            let index = this.localData.findIndex(p => p.nip === savedData.nip);
            if (index !== -1) this.localData[index] = savedData;
            else this.localData.push(savedData);
            localStorage.setItem(CACHE_KEY, JSON.stringify(this.localData));
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
            localStorage.setItem(CACHE_KEY, JSON.stringify(this.localData));
            return res;
        } else {
            throw new Error((res && res.message) ? res.message : "Gagal menghapus dari database");
        }
    },

    // Pengaturan & Logo (Stale-While-Revalidate: baca instan dari localStorage, update di background)
    getPengaturan: async function (useCache = true) {
        if (useCache) {
            const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Lakukan refresh senyap di latar belakang jika online
                    this.refreshPengaturanInBackground();
                    return parsed;
                } catch (e) {}
            }
        }
        if (!API_URL) return { success: false };
        const fresh = await apiCall('getPengaturan');
        if (fresh && typeof fresh === 'object' && !fresh.message) {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(fresh));
            window.cachedPengaturan = fresh;
        }
        return fresh;
    },

    refreshPengaturanInBackground: async function () {
        if (!API_URL) return;
        try {
            const fresh = await apiCall('getPengaturan');
            if (fresh && typeof fresh === 'object' && !fresh.message) {
                const oldCache = localStorage.getItem(SETTINGS_CACHE_KEY);
                const freshStr = JSON.stringify(fresh);
                if (oldCache !== freshStr) {
                    localStorage.setItem(SETTINGS_CACHE_KEY, freshStr);
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
            updatedAt: data.updatedAt || new Date().toISOString()
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
            updatedAt: data.updatedAt || new Date().toISOString()
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
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
        window.cachedPengaturan = data;
        return await apiCall('savePengaturan', data);
    }
};
