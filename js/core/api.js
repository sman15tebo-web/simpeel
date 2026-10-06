const isElectron = (() => {
    try {
        if (typeof window !== 'undefined' && typeof window.require === 'function') return true;
        if (typeof require === 'function') return true;
    } catch(e) {}
    return false;
})();

const TOKEN_KEY = isElectron ? "SIMPEEL_TOKEN_OFFLINE" : "SIMPEEL_TOKEN_ONLINE";
const CACHE_KEY = isElectron ? "SIMPEEL_CACHE_OFFLINE" : "SIMPEEL_CACHE_ONLINE";

// Online Config
const TENANT_CONFIG = {
    "sman15tebo": "https://script.google.com/macros/s/AKfycbwvCnvmAiV6rb3OP7gU-P2RYRc-oCQhyKuOlLKw_Knr0ttdZ2dbuV8_a2sr1okogEz5/exec",
    "sekolah2": "https://script.google.com/macros/s/AKfycb..._link_sekolah2/exec",
    "dinas": "https://script.google.com/macros/s/AKfycb..._link_dinas/exec"
};

let API_URL = null;

if (isElectron) {
    API_URL = "OFFLINE_MODE";
} else {
    const urlParams = new URLSearchParams(window.location.search);
    let currentTenantId = urlParams.get('id');

    if (!currentTenantId) {
        currentTenantId = localStorage.getItem('SIMPEEL_ACTIVE_ID');
    }

    if (!currentTenantId || !TENANT_CONFIG[currentTenantId]) {
        document.body.innerHTML = '<h2 style="text-align:center; margin-top:50px; font-family:sans-serif;">Akses Ditolak. Harap sertakan ID Instansi yang valid di URL (contoh: ?id=demo).</h2>';
        throw new Error("Invalid Tenant ID");
    }

    localStorage.setItem('SIMPEEL_ACTIVE_ID', currentTenantId);
    API_URL = TENANT_CONFIG[currentTenantId];
}

async function apiCall(action, data = null) {
    if (isElectron) {
        try {
            const { ipcRenderer } = window.require ? window.require('electron') : require('electron');
            switch(action) {
                case 'login': return await ipcRenderer.invoke('simpeel-login', data);
                case 'getAllPegawai': return await ipcRenderer.invoke('simpeel-get-all-pegawai');
                case 'savePegawai': return await ipcRenderer.invoke('simpeel-save-pegawai', data);
                case 'deletePegawai': return await ipcRenderer.invoke('simpeel-delete-pegawai', data);
                case 'getPengaturan': return await ipcRenderer.invoke('simpeel-get-pengaturan');
                case 'getAllAkun': return await ipcRenderer.invoke('simpeel-get-all-akun');
                case 'saveAkun': return await ipcRenderer.invoke('simpeel-save-akun', data);
                case 'batchSaveAkun': return await ipcRenderer.invoke('simpeel-batch-save-akun', data);
                case 'deleteAkun': return await ipcRenderer.invoke('simpeel-delete-akun', data);
                case 'savePengaturan': return await ipcRenderer.invoke('simpeel-save-pengaturan', data);
                case 'saveConfig': return await ipcRenderer.invoke('simpeel-save-config', data);
                case 'getConfig': return await ipcRenderer.invoke('simpeel-get-config');
                case 'saveSyncUrl': return await ipcRenderer.invoke('simpeel-save-sync-url', data);
                case 'sinkronisasi': return await ipcRenderer.invoke('simpeel-sinkronisasi', data);
                default: return null;
            }
        } catch (e) {
            console.error("IPC Call Error:", e);
            return { success: false, message: e.message };
        }
    } else {
        try {
            const payload = { 
                apiKey: 'SIMPEEL_SECURE_2026_XYZ_999',
                action: action 
            };
            if (data) payload.data = data;
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            let result = await response.json();
            
            // Normalize online response to match offline response for certain endpoints
            if (action === 'getAllPegawai' || action === 'getAllAkun') {
                if (result && result.success && Array.isArray(result.data)) {
                    return result.data;
                } else if (result && result.data) {
                    return result.data;
                }
            } else if (action === 'getPengaturan' || action === 'getConfig') {
                if (result && result.data) return result.data;
            }
            return result;
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, message: "Koneksi ke server gagal: " + error.message };
        }
    }
}
