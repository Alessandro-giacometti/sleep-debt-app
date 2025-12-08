// Sleep Debt Tracker v2 - Main App Logic (Core)

const API_BASE_URL = window.location.origin;

// Stato applicazione
let currentChartType = 'line';
let currentWindow = 7;
let sleepData = null;

// Esponi variabili globalmente per altri moduli
window.sleepData = sleepData;
window.currentChartType = currentChartType;
window.currentWindow = currentWindow;

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof updateHeaderDate === 'function') {
        updateHeaderDate();
    }
    // Carica settings PRIMA di loadSleepStatus, perché il backend usa le settings
    // per decidere se includere dati dummy o reali
    await loadSettings();
    await loadSleepStatus();
    if (typeof initNavigation === 'function') {
        initNavigation();
    }
});

/**
 * Carica impostazioni utente dall'API
 */
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const settings = await response.json();
        
        console.log('Settings loaded:', settings);
        
        // Aggiorna finestra giorni corrente
        window.currentWindow = settings.stats_window_days || 7;
        
        // Aggiorna UI delle impostazioni
        if (typeof updateSettingsUI === 'function') {
            updateSettingsUI(settings);
        }
        
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        // Non mostriamo errore all'utente, usiamo valori di default
        return null;
    }
}

/**
 * Carica dati sleep status dall'API
 */
async function loadSleepStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/status`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        console.log('Sleep status loaded:', {
            current_debt: data.current_debt,
            days_tracked: data.days_tracked,
            total_sleep_hours: data.total_sleep_hours,
            recent_data_count: data.recent_data ? data.recent_data.length : 0
        });
        
        sleepData = data;
        window.sleepData = data; // Esponi globalmente per altri moduli
        
        // Aggiorna UI
        if (typeof updateUI === 'function') {
            updateUI(data);
        }
        
        // Inizializza grafico dopo un breve delay per assicurarsi che charts.js sia caricato
        setTimeout(() => {
            if (typeof initChart === 'function') {
                initChart(data);
            }
        }, 100);
    } catch (error) {
        console.error('Error loading sleep status:', error);
        showError('Errore nel caricamento dei dati');
    }
}

/**
 * Calcola info debito basato sulle soglie
 */
function getDebtInfo(debtHours) {
    if (debtHours < 0) {
        return {
            class: 'optimal',
            color: 'var(--color-green)',
            zone: 'Ottimale'
        };
    } else if (debtHours < 6) {
        return {
            class: 'optimal',
            color: 'var(--color-green)',
            zone: 'Ottimale'
        };
    } else if (debtHours < 13) {
        return {
            class: 'slight',
            color: 'var(--color-yellow)',
            zone: 'Lieve deficit'
        };
    } else if (debtHours < 24) {
        return {
            class: 'large',
            color: 'var(--color-orange)',
            zone: 'Deficit moderato'
        };
    } else {
        return {
            class: 'critical',
            color: 'var(--color-red)',
            zone: 'Deficit elevato'
        };
    }
}

/**
 * Formatta debito in "X h e Y min"
 */
function formatDebt(hours) {
    if (hours < 0) {
        return '0 h e 0 min';
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h} h e ${m} min`;
}

/**
 * Formatta ore in "Xh Ym"
 */
function formatHoursMinutes(hours) {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) - h) * 60);
    
    if (h === 0 && m === 0) {
        return '0h';
    }
    
    if (m === 0) {
        return `${h}h`;
    }
    
    return `${h}h ${m}m`;
}

/**
 * Formatta solo le ore (per target giornaliero)
 */
function formatHoursOnly(hours) {
    const h = Math.floor(Math.abs(hours));
    return `${h}h`;
}

// Esponi utility functions globalmente
window.getDebtInfo = getDebtInfo;
window.formatDebt = formatDebt;
window.formatHoursMinutes = formatHoursMinutes;
window.formatHoursOnly = formatHoursOnly;

/**
 * Sync sleep data from Garmin
 */
async function syncData() {
    const syncBtn = document.getElementById('sync-btn');
    
    // Disable button
    syncBtn.disabled = true;
    syncBtn.textContent = '⏳';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Reload status after successful sync
            await loadSleepStatus();
            showSuccess(`Sync completato: ${result.records_synced} record sincronizzati`);
        } else {
            throw new Error(result.message || 'Sync fallito');
        }
    } catch (error) {
        console.error('Error syncing data:', error);
        showError('Errore durante la sincronizzazione: ' + error.message);
    } finally {
        // Re-enable button
        syncBtn.disabled = false;
        syncBtn.textContent = '🔄';
    }
}

// Esponi funzione globalmente
window.syncData = syncData;

/**
 * Mostra errore (semplificato)
 */
function showError(message) {
    console.error(message);
    // TODO: Implementare toast notification
    alert(message);
}

/**
 * Mostra successo (semplificato)
 */
function showSuccess(message) {
    console.log(message);
    // TODO: Implementare toast notification
    alert(message);
}

// Esponi error handling globalmente
window.showError = showError;
window.showSuccess = showSuccess;

// Esponi funzioni API globalmente per altri moduli
window.loadSettings = loadSettings;
window.loadSleepStatus = loadSleepStatus;
