// Sleep Debt Tracker v2 - Navigation Logic (Simplified)

/**
 * Inizializza navigazione
 */
function initNavigation() {
    // Mostra homepage all'avvio
    navigateTo('homepage');
}

/**
 * Mostra homepage
 */
function showHomepage() {
    navigateTo('homepage');
}

/**
 * Mostra pagina impostazioni
 */
function showSettings() {
    navigateTo('settings-page');
}

// Esponi funzioni globalmente
window.initNavigation = initNavigation;
window.showHomepage = showHomepage;
window.showSettings = showSettings;
