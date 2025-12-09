// Sleep Debt Tracker v2 - Zone Page Logic

/**
 * Mostra pagina Zone
 */
function showZonePage() {
    // Nascondi homepage
    document.getElementById('homepage').classList.add('hidden');
    // Mostra pagina zone
    const zonePage = document.getElementById('zone-page');
    zonePage.classList.remove('hidden');
    zonePage.classList.add('active');
    
    // Scrolla in alto per evitare scroll automatico verso il basso
    requestAnimationFrame(() => {
        if (zonePage) {
            zonePage.scrollTop = 0;
        }
        setTimeout(() => {
            if (zonePage) {
                zonePage.scrollTop = 0;
            }
        }, 50);
    });
    
    // Aggiorna valore debito nella pagina zone
    if (window.sleepData) {
        const debtHours = window.sleepData.current_debt || 0;
        const debtValueEl = document.getElementById('zone-main-value');
        if (debtValueEl) {
            debtValueEl.textContent = window.formatDebt(debtHours);
            // Aggiorna posizione slider
            updateZoneProgress(debtHours);
        }
    }
}

/**
 * Chiudi pagina Zone
 */
function closeZonePage() {
    const zonePage = document.getElementById('zone-page');
    zonePage.classList.remove('active');
    // Mostra homepage
    document.getElementById('homepage').classList.remove('hidden');
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

