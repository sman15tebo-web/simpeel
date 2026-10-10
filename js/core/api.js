const isElectron = Boolean(
    (typeof window !== 'undefined' && (window.isElectron === true || typeof window.electronAPI !== 'undefined' || typeof window.require === 'function')) ||
    (typeof require === 'function') ||
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'))
);

const TOKEN_KEY = isElectron ? "SIMPEEL_TOKEN_OFFLINE" : "SIMPEEL_TOKEN_ONLINE";
const CACHE_KEY = isElectron ? "SIMPEEL_CACHE_OFFLINE" : "SIMPEEL_CACHE_ONLINE";

// Online Config
const TENANT_CONFIG = {
    "sman15tebo": "https://script.google.com/macros/s/AKfycbyLSfL6mIS4mVyB1D1KoTq49PPYMWAm8-VFJ78U4Y5EN2ZoByp27V7bLdh3roFIzQ7U/exec",
    "sekolah2": "https://script.google.com/macros/s/AKfycb..._link_sekolah2/exec",
    "dinas": "https://script.google.com/macros/s/AKfycb..._link_dinas/exec"
};

let API_URL = null;

if (isElectron) {
    API_URL = "OFFLINE_MODE";
} else {
    const urlParams = new URLSearchParams(window.location.search);

    // Prioritas 1: Parameter langsung ?exec=...
    const paramExec = urlParams.get('exec');
    if (paramExec && paramExec.startsWith('http')) {
        API_URL = paramExec;
        localStorage.setItem('simpeel_custom_sync_url', paramExec);
    }

    // Prioritas 2: Link Exec Kustom dari Pengaturan
    if (!API_URL) {
        const customUrl = localStorage.getItem('simpeel_custom_sync_url') || localStorage.getItem('customSyncLink');
        if (customUrl && customUrl.startsWith('http')) {
            API_URL = customUrl;
        }
    }

    // Prioritas 3: Parameter ?id=...
    let currentTenantId = urlParams.get('id');
    if (!API_URL && currentTenantId) {
        const cleanTenant = currentTenantId.trim().toLowerCase();
        if (TENANT_CONFIG[cleanTenant]) {
            API_URL = TENANT_CONFIG[cleanTenant];
            localStorage.setItem('SIMPEEL_ACTIVE_ID', cleanTenant);
        }
    }

    // Prioritas 4: Memori Tenant Terakhir / Nama Sekolah
    if (!API_URL) {
        currentTenantId = localStorage.getItem('SIMPEEL_ACTIVE_ID');
        if (currentTenantId && TENANT_CONFIG[currentTenantId]) {
            API_URL = TENANT_CONFIG[currentTenantId];
        } else {
            try {
                const conf = JSON.parse(localStorage.getItem('simpeel_pengaturan') || '{}');
                const sName = conf.namaInstansi || conf.namaSekolah || '';
                if (sName) {
                    const slug = sName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (TENANT_CONFIG[slug]) {
                        API_URL = TENANT_CONFIG[slug];
                        localStorage.setItem('SIMPEEL_ACTIVE_ID', slug);
                    }
                }
            } catch (e) { }
        }
    }

    // Prioritas 5: Fallback Default
    if (!API_URL) {
        API_URL = TENANT_CONFIG["sman15tebo"] || Object.values(TENANT_CONFIG)[0] || "";
    }

    if (!API_URL) {
        document.body.innerHTML = '<h2 style="text-align:center; margin-top:50px; font-family:sans-serif;">Akses Ditolak. Harap sertakan ID Instansi atau URL Exec yang valid di URL (contoh: ?id=sman15tebo atau ?exec=https://...).</h2>';
        throw new Error("Invalid Tenant ID");
    }
}

async function apiCall(action, data = null) {
    if (isElectron) {
        try {
            if (window.electronAPI && typeof window.electronAPI[action] === 'function') {
                return await window.electronAPI[action](data);
            }
            const { ipcRenderer } = window.require ? window.require('electron') : (typeof require === 'function' ? require('electron') : {});
            if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
                switch (action) {
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
            }
            return { success: false, message: 'IPC bridge tidak tersedia.' };
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
            const controller = new AbortController();
            const timeoutMs = (action === 'uploadFile' || action === 'batchSync') ? 90000 : 45000;
            const timeoutId = setTimeout(() => {
                controller.abort(new Error(`Waktu request habis (${timeoutMs / 1000} detik). Periksa koneksi internet.`));
            }, timeoutMs);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
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
