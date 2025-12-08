// Sleep Debt Tracker v2 - Charts Logic

let mainChart = null;
let fullscreenChart = null;

// Usa currentChartType e sleepData da app.js (esposti globalmente)

/**
 * Inizializza grafico principale
 */
function initChart(data) {
    const ctx = document.getElementById('main-chart');
    if (!ctx) return;
    
    const chartData = prepareChartData(data);
    
    mainChart = new Chart(ctx, {
        type: window.currentChartType || 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return formatHoursMinutes(context.parsed.y || context.parsed);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatHoursMinutes(value);
                        },
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                // Apri fullscreen al click sul grafico
                if (window.openChartFullscreen) {
                    window.openChartFullscreen();
                }
            }
        }
    });
}

/**
 * Inizializza grafico fullscreen
 */
function initFullscreenChart() {
    const ctx = document.getElementById('fullscreen-chart');
    if (!ctx) return;
    
    // Usa stesso tipo di grafico della homepage
    // sleepData viene passato da app.js
    const data = window.sleepData;
    const chartData = prepareChartData(data);
    
    if (fullscreenChart) {
        fullscreenChart.destroy();
    }
    
    fullscreenChart = new Chart(ctx, {
        type: window.currentChartType || 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return formatHoursMinutes(context.parsed.y || context.parsed);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatHoursMinutes(value);
                        },
                        font: {
                            size: 14
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

/**
 * Prepara dati per il grafico
 */
function prepareChartData(data) {
    if (!data || !data.recent_data || data.recent_data.length === 0) {
        return {
            labels: [],
            datasets: [{
                label: 'Debito',
                data: [],
                borderColor: 'var(--color-green)',
                backgroundColor: 'rgba(90, 200, 90, 0.1)'
            }]
        };
    }
    
    // Ordina per data (più vecchia a più recente)
    const sortedData = [...data.recent_data].reverse();
    
    const labels = sortedData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    });
    
    const debtData = sortedData.map(item => item.debt);
    
    // Gradient verde → arancione
    const colors = generateGradientColors(debtData.length);
    
    return {
        labels: labels,
        datasets: [{
            label: 'Debito di sonno',
            data: debtData,
            borderColor: (window.currentChartType || 'line') === 'line' ? '#667eea' : undefined,
            backgroundColor: (window.currentChartType || 'line') === 'bar' ? colors : 'rgba(102, 126, 234, 0.2)',
            borderWidth: (window.currentChartType || 'line') === 'line' ? 2 : 0,
            fill: (window.currentChartType || 'line') === 'line',
            tension: 0.4,
            pointRadius: (window.currentChartType || 'line') === 'line' ? 3 : 0,
            pointHoverRadius: 5
        }]
    };
}

/**
 * Genera gradient colori viola → verde (palette v1)
 */
function generateGradientColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const ratio = i / (count - 1 || 1);
        // Gradiente da viola (#667eea) a verde (#5AC85A)
        const r1 = 102, g1 = 126, b1 = 234; // Viola
        const r2 = 90, g2 = 200, b2 = 90;   // Verde
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return colors;
}

/**
 * Aggiorna tipo grafico
 */
function updateChartType(type) {
    window.currentChartType = type;
    
    if (mainChart) {
        mainChart.destroy();
        const data = window.sleepData;
        if (data) {
            initChart(data);
        }
    }
    
    if (fullscreenChart) {
        fullscreenChart.destroy();
        initFullscreenChart();
    }
}

// Esponi funzioni globalmente
window.initChart = initChart;
window.initFullscreenChart = initFullscreenChart;
window.updateChartType = updateChartType;

/**
 * Formatta ore in "Xh Ym" (helper)
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

