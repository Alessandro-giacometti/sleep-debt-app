// Sleep Debt Tracker v2 - Chart Fullscreen Logic

/**
 * Gestione grafico fullscreen
 */
function openChartFullscreen() {
    document.getElementById('chart-fullscreen').classList.add('active');
    if (typeof initFullscreenChart === 'function') {
        initFullscreenChart();
    }
}

function closeChartFullscreen() {
    document.getElementById('chart-fullscreen').classList.remove('active');
}

/**
 * Selettore giorni nel grafico fullscreen (solo UI)
 */
function selectDays(days) {
    document.querySelectorAll('.chart-fullscreen-selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    // TODO: Aggiornare grafico quando backend sarà pronto
}

/**
 * Switch tipo grafico (linea/barre) - toggle tra i due
 */
function switchChartType(type) {
    // Se type non è specificato, toggle tra line e bar
    if (!type) {
        type = window.currentChartType === 'line' ? 'bar' : 'line';
    }
    window.currentChartType = type;
    
    // Aggiorna grafico
    if (typeof updateChartType === 'function') {
        updateChartType(type);
    }
}

// Esponi funzioni globalmente
window.openChartFullscreen = openChartFullscreen;
window.closeChartFullscreen = closeChartFullscreen;
window.selectDays = selectDays;
window.switchChartType = switchChartType;

