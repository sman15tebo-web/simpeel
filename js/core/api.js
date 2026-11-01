const isElectron = Boolean(
    (typeof window !== 'undefined' && (window.isElectron === true || typeof window.electronAPI !== 'undefined')) ||
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'))
);

const TOKEN_KEY = isElectron ? "SIMPEEL_TOKEN_OFFLINE" : "SIMPEEL_TOKEN_ONLINE";
const CACHE_KEY = isElectron ? "SIMPEEL_CACHE_OFFLINE" : "SIMPEEL_CACHE_ONLINE";

function normalizeGasExecUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password) return null;
        if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(url.pathname)) return null;
        return url.toString();
    } catch (_) {
        return null;
    }
}

// Online Config
const TENANT_CONFIG = {
    "sman15tebo": "https://script.google.com/macros/s/AKfycbxADQt0B0PllvD3ORXOXfGO0KSXgZWenHVBID-PyPM_4Nau4BMVyVZNY-e6Tx7LrEuF/exec",
    "sman1tebo": "https://script.google.com/macros/s/AKfycbz0GU8_EqeadjKiIECkgEOM4XjlYdNi_tPOeui3n0svqlzSITG9RKymCxoSuBnexh1D/exec",
    "sman2tebo": "https://script.google.com/macros/s/AKfycbw35Glj-i2zEdjY2WjsMHbzHXAcZHPGZ4img8Ywyp50UeSd0O2-wZGvz08sDGiNAICPqg/exec",
    "sman5tebo": "https://script.google.com/macros/s/AKfycbyBqII-MbMzDRAYWi1C99AJxiSOlwbFn1vduyreqoja9otAxFPCNWuLz11y_yMCs2Ge/exec",
    "sman17tebo": "https://script.google.com/macros/s/AKfycbwLlCp9e1rh8hcqAoDW5bheLSDAbmRW4cD0EVN5twxBd77mGcfLRUgZBpKSbXyUdLVa/exec",
    "sman19tebo": "https://script.google.com/macros/s/AKfycbzpysdp5rQBtGP3_bxm-lT2RVX47-NeUMJMWuvK1BM3k_VL_kk1u6B0i7dgG_vkuP5cTg/exec",
    "smkn1tebo": "https://script.",
    "smkn2tebo": "https://script.google.com/macros/s/AKfycbzAqqe7Sg2SntYcsKFXD4lVm0q6T0kJ9cJ9KHwx6yfVPQRt5DvEPyCtjmOZ_kZm4ujBxQ/exec",
    "slbntebo": "https://script.google.com/macros/s/AKfycbz44keaEWFDLd703EVm2Ziy_ldc5sBBEk__O86X-QBIVrHt6Prru82nOdY5Td5gccHWyQ/exec",
    "dinas": ""
};

let API_URL = null;

if (isElectron) {
    API_URL = "OFFLINE_MODE";
} else {
    const urlParams = new URLSearchParams(window.location.search);
    let invalidApiTarget = '';

    // Prioritas 1: Parameter langsung ?exec=...
    const paramExec = urlParams.get('exec');
    if (paramExec) {
        API_URL = normalizeGasExecUrl(paramExec);
        if (API_URL) localStorage.setItem('simpeel_custom_sync_url', API_URL);
        else invalidApiTarget = 'URL Exec tidak valid. Gunakan URL HTTPS deployment Google Apps Script.';
    }

    // Prioritas 2: Link Exec Kustom dari Pengaturan
    if (!API_URL) {
        const customUrl = localStorage.getItem('simpeel_custom_sync_url') || localStorage.getItem('customSyncLink');
        if (customUrl) API_URL = normalizeGasExecUrl(customUrl);
    }

    // Prioritas 3: Parameter ?id=...
    let currentTenantId = urlParams.get('id');
    if (!API_URL && currentTenantId) {
        const cleanTenant = currentTenantId.trim().toLowerCase();
        API_URL = normalizeGasExecUrl(TENANT_CONFIG[cleanTenant]);
        if (API_URL) {
            localStorage.setItem('SIMPEEL_ACTIVE_ID', cleanTenant);
        } else {
            invalidApiTarget = `Tenant "${cleanTenant}" belum memiliki URL Google Apps Script yang valid.`;
        }
    }

    // Prioritas 4: Memori Tenant Terakhir / Nama Sekolah
    if (!API_URL && !invalidApiTarget) {
        currentTenantId = localStorage.getItem('SIMPEEL_ACTIVE_ID');
        if (currentTenantId) {
            API_URL = normalizeGasExecUrl(TENANT_CONFIG[currentTenantId.trim().toLowerCase()]);
            if (!API_URL) invalidApiTarget = `Tenant "${currentTenantId}" belum memiliki URL Google Apps Script yang valid.`;
        } else {
            try {
                const conf = JSON.parse(localStorage.getItem('simpeel_pengaturan') || '{}');
                const sName = conf.namaInstansi || conf.namaSekolah || '';
                if (sName) {
                    const slug = sName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    API_URL = normalizeGasExecUrl(TENANT_CONFIG[slug]);
                    if (API_URL) {
                        localStorage.setItem('SIMPEEL_ACTIVE_ID', slug);
                    } else if (TENANT_CONFIG[slug] === '') {
                        invalidApiTarget = `Tenant "${slug}" belum memiliki URL Google Apps Script yang valid.`;
                    }
                }
            } catch (e) { }
        }
    }

    // Prioritas 5: Fallback Default
    if (!API_URL && !invalidApiTarget) {
        API_URL = normalizeGasExecUrl(TENANT_CONFIG["sman15tebo"]);
    }

    if (!API_URL) {
        const heading = document.createElement('h2');
        heading.style.cssText = 'text-align:center;margin:50px 20px;font-family:sans-serif';
        heading.textContent = invalidApiTarget || 'Akses ditolak. Sertakan ID instansi atau URL Exec Google Apps Script yang valid.';
        document.body.replaceChildren(heading);
        throw new Error("Invalid Tenant ID");
    }
}

async function apiCall(action, data = null) {
    if (isElectron) {
        try {
            if (window.electronAPI && typeof window.electronAPI[action] === 'function') {
                return await window.electronAPI[action](data);
            }
            return { success: false, message: 'IPC bridge tidak tersedia.' };
        } catch (e) {
            console.error("IPC Call Error:", e);
            return { success: false, message: e.message };
        }
    } else {
        try {
            const payload = {
                action: action
            };
            let sessionToken = '';
            try {
                const session = JSON.parse(localStorage.getItem(TOKEN_KEY) || '{}');
                if (session.accessToken) {
                    sessionToken = session.accessToken;
                    payload.sessionToken = sessionToken;
                }
            } catch (_) { }
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
            const responseMessage = String(result?.message || result?.error || '');
            if (
                sessionToken &&
                action !== 'login' &&
                action !== 'logout' &&
                action !== 'getPengaturan' &&
                result?.success === false &&
                /sesi tidak valid|sesi.{0,30}(berakhir|habis)|silakan login kembali/i.test(responseMessage)
            ) {
                window.handleSimpeelSessionExpired?.();
            }

            // Normalize online response to match offline response for certain endpoints
            if (action === 'getAllPegawai' || action === 'getAllAkun') {
                if (result && result.success && Array.isArray(result.data)) {
                    return result.data;
                } else if (result && result.data) {
                    return result.data;
                }
            } else if (action === 'getPengaturan' || action === 'getConfig') {
                if (result && result.data && typeof result.data === 'object') {
                    const cleaned = { ...result.data };
                    delete cleaned.apiKey;
                    delete cleaned.action;
                    if (cleaned.sekolah || cleaned.instansi || cleaned.alamat || cleaned.namaSekolah || cleaned.namaInstansi || cleaned.kepsekNama) {
                        delete cleaned.success;
                        delete cleaned.message;
                        delete cleaned.error;
                    }
                    return cleaned;
                }
            }
            return result;
        } catch (error) {
            console.error("API Error:", error);
            return { success: false, message: "Koneksi ke server gagal: " + error.message };
        }
    }
}
