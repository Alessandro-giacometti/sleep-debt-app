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
 * Rileva se siamo su Chrome mobile
 */
function isChromeMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /android.*chrome/i.test(ua) || /chrome/i.test(ua) && /mobile/i.test(ua);
}

/**
 * Forza lo scroll a 0 in modo aggressivo
 * Compatibile con Chrome mobile
 */
function forceScrollToTop() {
    // Chrome mobile richiede un approccio diverso
    if (isChromeMobile()) {
        // Per Chrome mobile, usa solo metodi sincroni senza behavior
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (document.scrollingElement) {
            document.scrollingElement.scrollTop = 0;
        }
    } else {
        // Per altri browser, usa behavior: 'instant' se supportato
        try {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } catch (e) {
            window.scrollTo(0, 0);
        }
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (document.scrollingElement) {
            document.scrollingElement.scrollTop = 0;
        }
    }
    
    // Forza anche sulle pagine principali che potrebbero avere scroll
    ALL_PAGES.forEach(id => {
        const page = document.getElementById(id);
        if (page && page.scrollTop > 0) {
            page.scrollTop = 0;
        }
    });
}

/**
 * Naviga a una pagina specifica
 * @param {string} pageId - ID della pagina (senza #)
 */
function navigateTo(pageId) {
    // APPROCCIO PER MOBILE: blocca lo scroll con position: fixed
    const isMobile = isChromeMobile() || /mobile/i.test(navigator.userAgent);
    let bodyFixed = false;
    
    if (isMobile) {
        const savedScrollY = window.scrollY || document.documentElement.scrollTop;
        // Blocca lo scroll con position: fixed
        document.body.style.position = 'fixed';
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.width = '100%';
        bodyFixed = true;
    }
    
    // Nascondi tutte le pagine
    ALL_PAGES.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.style.display = 'none';
            page.classList.remove('active');
            page.scrollTop = 0;
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
    
    // Forza scroll a 0 prima di mostrare la nuova pagina
    forceScrollToTop();
    
    // Mostra la pagina richiesta
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        currentPage = pageId;
        targetPage.scrollTop = 0;
    }
    
    // Trova l'header della nuova pagina
    const headerEl = targetPage
        ? targetPage.querySelector(
            '.header, .page-header, .daily-change-page-header, .daily-sleep-page-header, .zone-page-header, .chart-fullscreen-header, .settings-header, .settings-subpage-header'
        )
        : null;
    
    // Forza scroll dopo che la pagina è stata mostrata
    const performScrollReset = () => {
        forceScrollToTop();
        
        if (headerEl) {
            try {
                if (isChromeMobile()) {
                    headerEl.scrollIntoView({ block: 'start' });
                } else {
                    headerEl.scrollIntoView({ behavior: 'instant', block: 'start' });
                }
            } catch (e) {
                forceScrollToTop();
            }
        }
    };
    
    // Esegui immediatamente
    performScrollReset();
    
    // Poi con requestAnimationFrame
    requestAnimationFrame(() => {
        performScrollReset();
        requestAnimationFrame(performScrollReset);
    });
    
    // Retry con timeout
    const retryDelays = isChromeMobile() 
        ? [0, 10, 25, 50, 75, 100, 150, 200, 300, 500] 
        : [0, 10, 50, 100, 200];
    
    retryDelays.forEach(delay => {
        setTimeout(performScrollReset, delay);
    });
    
    // Se abbiamo usato position: fixed, rimuovilo dopo che la pagina è stata mostrata
    if (bodyFixed) {
        setTimeout(() => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            forceScrollToTop();
        }, 100);
        
        setTimeout(() => {
            forceScrollToTop();
        }, 200);
    }
    
    // Aggiorna navbar e assicura che sia cliccabile
    updateNavbar(pageId);
    
    const navbar = document.querySelector('.navbar-bottom');
    if (navbar) {
        navbar.style.pointerEvents = 'auto';
        navbar.style.zIndex = '10000';
    }
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

/**
 * Inizializza il sistema di navigazione
 * Aggiunge listener per gestire lo scroll e assicurare che il navbar sia sempre cliccabile
 */
function initNavigationSystem() {
    // Assicura che il navbar sia sempre cliccabile
    const navbar = document.querySelector('.navbar-bottom');
    if (navbar) {
        navbar.style.pointerEvents = 'auto';
        navbar.style.zIndex = '10000';
        
        // Assicura che i pulsanti del navbar siano sempre cliccabili
        const navItems = navbar.querySelectorAll('.navbar-item');
        navItems.forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.cursor = 'pointer';
        });
    }
    
    // Assicura che il navbar sia sempre cliccabile anche dopo scroll
    document.addEventListener('scroll', () => {
        if (navbar) {
            navbar.style.pointerEvents = 'auto';
            navbar.style.zIndex = '10000';
        }
    }, { passive: true });
}

// Esponi funzioni globalmente
window.navigateTo = navigateTo;
window.goHome = goHome;
window.goSettings = goSettings;
window.getCurrentPage = getCurrentPage;
window.ALL_PAGES = ALL_PAGES;
window.initNavigationSystem = initNavigationSystem;
window.forceScrollToTop = forceScrollToTop; // Esponi per uso nelle funzioni di navigazione
