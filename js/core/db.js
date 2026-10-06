const dbManager = {
    // Cache Lokal HANYA untuk kecepatan BACA data di layar
    localData: JSON.parse(localStorage.getItem(CACHE_KEY)) || [],

    init: async function () {
        if (API_URL) await this.forceFetchFromServer();
        return true;
    },

    // Tarik data terbaru dari Server secara Background
    forceFetchFromServer: async function () {
        if (!API_URL) return;
        const res = await apiCall('getAllPegawai');
        if (Array.isArray(res)) {
            this.localData = res;
            localStorage.setItem(CACHE_KEY, JSON.stringify(res));
            // Otomatis refresh UI 
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

    // Pengaturan & Keamanan (Langsung ke Server)
    getPengaturan: async function () {
        if (!API_URL) return { success: false };
        return await apiCall('getPengaturan');
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
        return await apiCall('savePengaturan', data);
    }
};
