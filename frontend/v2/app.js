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
document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateHeaderDate === 'function') {
        updateHeaderDate();
    }
    loadSleepStatus();
    if (typeof initNavigation === 'function') {
        initNavigation();
    }
});

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
