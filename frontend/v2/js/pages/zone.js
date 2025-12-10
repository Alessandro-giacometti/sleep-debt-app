// Sleep Debt Tracker v2 - Zone Page Logic

/**
 * Mostra pagina Zone
 */
function showZonePage() {
    // Forza scroll a 0 PRIMA di navigare
    if (typeof forceScrollToTop === 'function') {
        forceScrollToTop();
    }
    navigateTo('zone-page');
    
    // Aggiorna valore debito nella pagina zone
    if (window.sleepData) {
        const debtHours = window.sleepData.current_debt || 0;
        const debtValueEl = document.getElementById('zone-main-value');
        if (debtValueEl) {
            debtValueEl.textContent = window.formatDebt ? window.formatDebt(debtHours) : `${debtHours}h`;
            updateZoneProgress(debtHours);
        }
    }
}

/**
 * Chiudi pagina Zone (torna alla homepage)
 */
function closeZonePage() {
    navigateTo('homepage');
}

/**
 * Aggiorna progress bar zone
 */
function updateZoneProgress(debtHours) {
    // Calcola posizione slider (0-100% basato su max 30h)
    const maxDebt = 30;
    const position = Math.min((debtHours / maxDebt) * 100, 100);
    const slider = document.getElementById('zone-progress-slider');
    if (slider) {
        slider.style.left = `${position}%`;
    }
}

/**
 * Toggle espansione item zona
 */
function toggleZoneItem(item) {
    item.classList.toggle('expanded');
}

// Esponi funzioni globalmente
window.showZonePage = showZonePage;
window.closeZonePage = closeZonePage;
window.updateZoneProgress = updateZoneProgress;
window.toggleZoneItem = toggleZoneItem;
