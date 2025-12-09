// Sleep Debt Tracker v2 - Daily Sleep Page Logic

let dailySleepChart = null;
let currentDailySleepDays = 10; // Default a 10 giorni

/**
 * Mostra pagina Daily Sleep
 */
function showDailySleepPage() {
    // Nascondi homepage
    document.getElementById('homepage').classList.add('hidden');
    // Mostra pagina daily sleep
    const dailySleepPage = document.getElementById('daily-sleep-page');
    dailySleepPage.classList.remove('hidden');
    dailySleepPage.classList.add('active');
    
    // Inizializza con la finestra temporale corrente o default
    if (!currentDailySleepDays) {
        currentDailySleepDays = window.sleepData?.stats_window_days || 10;
    }
    
    // Aggiorna UI selettore giorni
    const defaultDays = window.sleepData?.stats_window_days || 10;
    const selectedDays = currentDailySleepDays || defaultDays;
    currentDailySleepDays = selectedDays;
    
    document.querySelectorAll('.daily-sleep-selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Attiva il bottone corrispondente ai giorni selezionati
    const btnId = `daily-sleep-btn-${selectedDays}`;
    const selectedBtn = document.getElementById(btnId);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    } else {
        // Fallback: attiva il bottone 10 giorni se non trovato
        const defaultBtn = document.getElementById('daily-sleep-btn-10');
        if (defaultBtn) {
            defaultBtn.classList.add('active');
        }
    }
    
    // Carica e mostra i dati
    loadDailySleepData();
}

/**
 * Chiudi pagina Daily Sleep
 */
function closeDailySleepPage() {
    const dailySleepPage = document.getElementById('daily-sleep-page');
    dailySleepPage.classList.remove('active');
    // Mostra homepage
    document.getElementById('homepage').classList.remove('hidden');
}

/**
 * Carica dati per il grafico Daily Sleep
 */
async function loadDailySleepData(days = null) {
    try {
        // Usa il numero di giorni specificato o quello corrente
        const daysToLoad = days || currentDailySleepDays || 10;
        
        // Carica dati dall'API chart-data per ottenere il range specificato
        const response = await fetch(`/api/sleep/chart-data?days=${daysToLoad}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        // Se non ci sono dati sufficienti, usa i dati disponibili
        const chartData = result.data || [];
        
        // Carica anche il target dall'API sleep status
        const statusResponse = await fetch('/api/sleep/status');
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const targetHours = statusData.target_sleep_hours || 0;
            updateDailySleepTarget(targetHours);
            
            // Aggiorna grafico con i dati e il target
            updateDailySleepChart(chartData, targetHours);
        } else {
            // Fallback: usa target default
            updateDailySleepTarget(8);
            updateDailySleepChart(chartData, 8);
        }
    } catch (error) {
        console.error('Error loading daily sleep data:', error);
    }
}

/**
 * Selettore giorni nel grafico Daily Sleep
 */
async function selectDailySleepDays(days) {
    // Aggiorna UI
    document.querySelectorAll('.daily-sleep-selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const btnId = `daily-sleep-btn-${days}`;
    const selectedBtn = document.getElementById(btnId);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Aggiorna giorni corrente
    currentDailySleepDays = days;
    
    // Ricarica dati per il nuovo range
    await loadDailySleepData(days);
}

/**
 * Aggiorna target sonno sopra il grafico
 */
function updateDailySleepTarget(targetHours) {
    const targetValueEl = document.getElementById('daily-sleep-target-value');
    if (targetValueEl) {
        targetValueEl.textContent = window.formatHoursMinutes ? window.formatHoursMinutes(targetHours) : `${targetHours}h`;
    }
}

/**
 * Aggiorna grafico Daily Sleep con i dati
 */
function updateDailySleepChart(data, targetHours = 8) {
    const ctx = document.getElementById('daily-sleep-chart');
    if (!ctx) return;
    
    // Distruggi grafico esistente se presente
    if (dailySleepChart) {
        dailySleepChart.destroy();
        dailySleepChart = null;
    }
    
    if (!data || data.length === 0) {
        return;
    }
    
    // Ordina per data (più vecchia a più recente)
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB; // Ordine crescente (più vecchia prima)
    });
    
    // Prepara dati per il grafico
    const labels = sortedData.map(item => {
        const date = new Date(item.date);
        // Formato più compatto: "Lun 15" invece di "15/12"
        const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
        const day = date.toLocaleDateString('it-IT', { day: '2-digit' });
        return `${dayName} ${day}`;
    });
    
    const sleepHours = sortedData.map(item => item.sleep_hours || 0);
    // Usa il target passato come parametro o default 8
    const target = targetHours || 8;
    
    // Colori più saturi e vivaci (meno pastello) stile iPhone moderno
    // Verde iOS più saturo: rgba(52, 199, 89, 0.7) - più vivace
    // Rosso iOS più saturo: rgba(255, 59, 48, 0.7) - più vivace
    const backgroundColors = sleepHours.map(hours => {
        return hours >= target ? 'rgba(52, 199, 89, 0.7)' : 'rgba(255, 59, 48, 0.7)';
    });
    
    // Colori bordi più scuri e saturi
    const borderColors = sleepHours.map(hours => {
        return hours >= target ? 'rgba(52, 199, 89, 0.9)' : 'rgba(255, 59, 48, 0.9)';
    });
    
    // Crea array di target per la linea tratteggiata (stesso valore per tutti i punti)
    const targetLineData = new Array(sleepHours.length).fill(target);
    
    dailySleepChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ore dormite',
                    data: sleepHours,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                    barThickness: 'flex',
                    maxBarThickness: 40,
                    categoryPercentage: 0.7,
                    barPercentage: 0.8
                },
                {
                    label: 'Target',
                    data: targetLineData,
                    type: 'line',
                    borderColor: 'rgba(128, 128, 128, 0.6)',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 12
                    },
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                // Tooltip per le barre (ore dormite)
                                const hours = context.parsed.y || 0;
                                const formatted = window.formatHoursMinutes ? window.formatHoursMinutes(hours) : `${hours}h`;
                                const diff = hours - target;
                                const diffFormatted = window.formatHoursMinutes ? window.formatHoursMinutes(Math.abs(diff)) : `${Math.abs(diff)}h`;
                                const diffSign = diff >= 0 ? '+' : '-';
                                const targetFormatted = window.formatHoursMinutes ? window.formatHoursMinutes(target) : `${target}h`;
                                return [
                                    `Ore dormite: ${formatted}`,
                                    `Target: ${targetFormatted}`,
                                    `Differenza: ${diffSign}${diffFormatted}`
                                ];
                            } else {
                                // Tooltip per la linea target
                                const targetFormatted = window.formatHoursMinutes ? window.formatHoursMinutes(target) : `${target}h`;
                                return `Target: ${targetFormatted}`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return window.formatHoursMinutes ? window.formatHoursMinutes(value) : `${value}h`;
                        },
                        font: {
                            size: 11,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        },
                        color: 'rgba(0, 0, 0, 0.6)',
                        padding: 8
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
                            size: 11,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        },
                        color: 'rgba(0, 0, 0, 0.6)',
                        padding: 8
                    }
                }
            }
        }
    });
}

// Esponi funzioni globalmente
window.showDailySleepPage = showDailySleepPage;
window.closeDailySleepPage = closeDailySleepPage;
window.loadDailySleepData = loadDailySleepData;
window.selectDailySleepDays = selectDailySleepDays;

