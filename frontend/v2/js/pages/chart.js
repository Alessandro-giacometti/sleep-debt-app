// Sleep Debt Tracker v2 - Chart Fullscreen Logic

/**
 * Gestione grafico fullscreen
 */
async function openChartFullscreen() {
    const chartFullscreen = document.getElementById('chart-fullscreen');
    chartFullscreen.classList.add('active');
    
    // Scrolla in alto per evitare scroll automatico verso il basso
    requestAnimationFrame(() => {
        if (chartFullscreen) {
            chartFullscreen.scrollTop = 0;
        }
        setTimeout(() => {
            if (chartFullscreen) {
                chartFullscreen.scrollTop = 0;
            }
        }, 50);
    });
    
    // Inizializza con la finestra temporale corrente o default
    if (!window.currentChartDays) {
        window.currentChartDays = window.sleepData?.stats_window_days || 10;
    }
    // Aggiorna UI selettore giorni - usa sempre il valore corretto
    const defaultDays = window.sleepData?.stats_window_days || 10;
    const selectedDays = window.currentChartDays || defaultDays;
    window.currentChartDays = selectedDays; // Assicura che sia sempre settato
    
    document.querySelectorAll('.chart-fullscreen-selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Attiva il bottone corrispondente ai giorni selezionati
    const btnId = `chart-btn-${selectedDays}`;
    const selectedBtn = document.getElementById(btnId);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    } else {
        // Fallback: attiva il bottone 10 giorni se non trovato
        const defaultBtn = document.getElementById('chart-btn-10');
        if (defaultBtn) {
            defaultBtn.classList.add('active');
        }
    }
    if (typeof initFullscreenChart === 'function') {
        await initFullscreenChart();
    }
}

function closeChartFullscreen() {
    document.getElementById('chart-fullscreen').classList.remove('active');
}

/**
 * Selettore giorni nel grafico fullscreen
 */
async function selectDays(days) {
    // Aggiorna UI
    document.querySelectorAll('.chart-fullscreen-selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Salva giorni selezionati
    window.currentChartDays = days;
    
    // Carica dati per il numero di giorni selezionato
    if (typeof loadChartDataForDays === 'function') {
        await loadChartDataForDays(days);
    }
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

