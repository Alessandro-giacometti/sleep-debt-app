// Sleep Debt Tracker v2 - Navigation Logic

/**
 * Inizializza navigazione
 */
function initNavigation() {
    showHomepage();
}

/**
 * Mostra homepage
 */
function showHomepage() {
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('settings-page').classList.remove('active');
    
    // Chiudi tutte le sub-pagine delle impostazioni
    document.querySelectorAll('.settings-subpage').forEach(subpage => {
        subpage.classList.remove('active');
    });
    
    const zonePage = document.getElementById('zone-page');
    if (zonePage) {
        zonePage.classList.remove('active');
    }
    const chartFullscreen = document.getElementById('chart-fullscreen');
    if (chartFullscreen) {
        chartFullscreen.classList.remove('active');
    }
    const dailyChangePage = document.getElementById('daily-change-page');
    if (dailyChangePage) {
        dailyChangePage.classList.remove('active');
    }
    const dailySleepPage = document.getElementById('daily-sleep-page');
    if (dailySleepPage) {
        dailySleepPage.classList.remove('active');
    }
    
    // Scrolla in alto per evitare scroll automatico verso il basso
    // Ora che la pagina è position: fixed, scrolliamo l'elemento della pagina
    requestAnimationFrame(() => {
        const homepageEl = document.getElementById('homepage');
        if (homepageEl) {
            homepageEl.scrollTop = 0;
        }
        // Doppio check dopo un breve delay per mobile
        setTimeout(() => {
            if (homepageEl) {
                homepageEl.scrollTop = 0;
            }
        }, 50);
    });
    
    // Aggiorna navbar
    document.querySelectorAll('.navbar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.navbar-item')[0].classList.add('active');
}

/**
 * Mostra pagina impostazioni
 */
function showSettings() {
    // Chiudi tutte le pagine overlay
    const zonePage = document.getElementById('zone-page');
    if (zonePage) {
        zonePage.classList.remove('active');
    }
    const chartFullscreen = document.getElementById('chart-fullscreen');
    if (chartFullscreen) {
        chartFullscreen.classList.remove('active');
    }
    const dailyChangePage = document.getElementById('daily-change-page');
    if (dailyChangePage) {
        dailyChangePage.classList.remove('active');
    }
    const dailySleepPage = document.getElementById('daily-sleep-page');
    if (dailySleepPage) {
        dailySleepPage.classList.remove('active');
    }
    
    // Chiudi tutte le sub-pagine delle impostazioni (torna alla pagina principale delle impostazioni)
    document.querySelectorAll('.settings-subpage').forEach(subpage => {
        subpage.classList.remove('active');
    });
    
    document.getElementById('homepage').classList.add('hidden');
    const settingsPageEl = document.getElementById('settings-page');
    settingsPageEl.classList.add('active');
    
    // Scrolla in alto per evitare scroll automatico verso il basso
    // Ora che la pagina è position: fixed, scrolliamo l'elemento della pagina
    requestAnimationFrame(() => {
        if (settingsPageEl) {
            settingsPageEl.scrollTop = 0;
        }
        // Doppio check dopo un breve delay per mobile
        setTimeout(() => {
            if (settingsPageEl) {
                settingsPageEl.scrollTop = 0;
            }
        }, 50);
    });
    
    // Aggiorna navbar
    document.querySelectorAll('.navbar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.navbar-item')[1].classList.add('active');
}

// Esponi funzioni globalmente
window.initNavigation = initNavigation;
window.showHomepage = showHomepage;
window.showSettings = showSettings;

