// Sleep Debt Tracker v2 - Navigation System (Simplified)

/**
 * Sistema di navigazione semplificato
 * - Una sola pagina attiva alla volta
 * - Scroll sempre in alto al cambio pagina
 * - Navbar sempre cliccabile
 */

// Pagina corrente
let currentPage = 'homepage';

// Lista di tutte le pagine
const ALL_PAGES = [
    'homepage',
    'settings-page', 
    'zone-page',
    'daily-change-page',
    'daily-sleep-page',
    'chart-fullscreen'
];

// Lista delle sub-pagine settings
const SETTINGS_SUBPAGES = [
    'settings-subpage-target',
    'settings-subpage-window'
];

/**
 * Naviga a una pagina specifica
 * @param {string} pageId - ID della pagina (senza #)
 */
function navigateTo(pageId) {
    // Nascondi TUTTE le pagine
    ALL_PAGES.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.style.display = 'none';
            page.classList.remove('active');
        }
    });
    
    // Nascondi tutte le sub-pagine settings
    SETTINGS_SUBPAGES.forEach(id => {
        const subpage = document.getElementById(id);
        if (subpage) {
            subpage.classList.remove('active');
        }
    });
    document.querySelectorAll('.settings-subpage').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostra la pagina richiesta
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        currentPage = pageId;
    }
    
    // SCROLLA IN ALTO - semplice e diretto
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Aggiorna navbar
    updateNavbar(pageId);
}

/**
 * Aggiorna lo stato della navbar
 */
function updateNavbar(pageId) {
    const navItems = document.querySelectorAll('.navbar-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    if (pageId === 'homepage' || pageId === 'zone-page' || pageId === 'daily-change-page' || pageId === 'daily-sleep-page' || pageId === 'chart-fullscreen') {
        navItems[0]?.classList.add('active');
    } else if (pageId === 'settings-page') {
        navItems[1]?.classList.add('active');
    }
}

/**
 * Torna alla homepage
 */
function goHome() {
    navigateTo('homepage');
}

/**
 * Vai alle impostazioni
 */
function goSettings() {
    navigateTo('settings-page');
}

/**
 * Ottieni la pagina corrente
 */
function getCurrentPage() {
    return currentPage;
}

// Esponi funzioni globalmente
window.navigateTo = navigateTo;
window.goHome = goHome;
window.goSettings = goSettings;
window.getCurrentPage = getCurrentPage;
window.ALL_PAGES = ALL_PAGES;
