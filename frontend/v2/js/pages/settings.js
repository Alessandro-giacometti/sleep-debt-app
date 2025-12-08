// Sleep Debt Tracker v2 - Settings Page Logic

/**
 * Selettore finestra giorni (solo UI)
 */
function selectWindow(days) {
    // currentWindow è definito in app.js
    if (window.currentWindow !== undefined) {
        window.currentWindow = days;
    }
    document.querySelectorAll('.pill-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

/**
 * Toggle "Valuta di più gli ultimi giorni"
 */
function toggleWeight() {
    const toggle = document.getElementById('weight-toggle');
    if (toggle) {
        toggle.classList.toggle('active');
    }
}

/**
 * Salva impostazioni (solo UI per ora)
 */
function saveSettings() {
    // TODO: Implementare salvataggio quando backend sarà pronto
    alert('Impostazioni salvate! (UI only - backend integration pending)');
}

/**
 * Mostra sotto-pagina impostazioni
 */
function showSettingsSubpage(type) {
    if (type === 'window') {
        document.getElementById('settings-window-subpage').classList.add('active');
    } else if (type === 'target') {
        document.getElementById('settings-target-subpage').classList.add('active');
    }
}

/**
 * Chiudi sotto-pagina impostazioni
 */
function closeSettingsSubpage() {
    document.querySelectorAll('.settings-subpage').forEach(page => {
        page.classList.remove('active');
    });
}

// Esponi funzioni globalmente
window.selectWindow = selectWindow;
window.toggleWeight = toggleWeight;
window.saveSettings = saveSettings;
window.showSettingsSubpage = showSettingsSubpage;
window.closeSettingsSubpage = closeSettingsSubpage;

