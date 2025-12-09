// Sleep Debt Tracker v2 - Daily Change Page Logic

/**
 * Mostra pagina Daily Change
 */
function showDailyChangePage() {
    // Nascondi homepage
    document.getElementById('homepage').classList.add('hidden');
    // Mostra pagina daily change
    const dailyChangePage = document.getElementById('daily-change-page');
    dailyChangePage.classList.remove('hidden');
    dailyChangePage.classList.add('active');
    
    // Carica e mostra i dati
    loadDailyChangeData();
}

/**
 * Chiudi pagina Daily Change
 */
function closeDailyChangePage() {
    const dailyChangePage = document.getElementById('daily-change-page');
    dailyChangePage.classList.remove('active');
    // Mostra homepage
    document.getElementById('homepage').classList.remove('hidden');
}

/**
 * Carica dati per la tabella Daily Change
 */
async function loadDailyChangeData() {
    const tbody = document.getElementById('daily-change-table-body');
    
    // Mostra loading
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: var(--color-text-secondary);">
                Caricamento dati...
            </td>
        </tr>
    `;
    
    try {
        // Carica dati dall'API sleep status (contiene recent_data e target_sleep_hours)
        const response = await fetch('/api/sleep/status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Aggiorna target
        updateDailyChangeTarget(data.target_sleep_hours || 0);
        
        // Aggiorna tabella con i dati
        updateDailyChangeTable(data.recent_data || []);
    } catch (error) {
        console.error('Error loading daily change data:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: var(--color-error);">
                    Errore nel caricamento dei dati
                </td>
            </tr>
        `;
    }
}

/**
 * Aggiorna target sonno sopra la tabella
 */
function updateDailyChangeTarget(targetHours) {
    const targetValueEl = document.getElementById('daily-change-target-value');
    if (targetValueEl) {
        targetValueEl.textContent = formatHoursMinutes(targetHours);
    }
}

/**
 * Aggiorna tabella Daily Change con i dati
 */
function updateDailyChangeTable(data) {
    const tbody = document.getElementById('daily-change-table-body');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: var(--color-text-secondary);">
                    Nessun dato disponibile
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordina per data (più vecchia a più recente per calcolare debito cumulativo correttamente)
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB; // Ordine crescente (più vecchia prima)
    });
    
    // Calcola debito cumulativo progressivo per ogni elemento (in ordine cronologico)
    let cumulativeDebt = 0;
    const dataWithCumulative = sortedData.map(item => {
        cumulativeDebt += (item.debt || 0);
        return {
            ...item,
            cumulativeDebt: Math.max(0, cumulativeDebt) // Il debito cumulativo non può essere negativo
        };
    });
    
    // Inverti per mostrare più recente prima nella tabella
    const reversedData = [...dataWithCumulative].reverse();
    
    tbody.innerHTML = reversedData.map(item => {
        const cumulativeDebtDisplay = item.cumulativeDebt || 0;
        
        // Formatta data
        const date = new Date(item.date);
        const dateFormatted = date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Formatta durata sonno
        const sleepHours = formatHoursMinutes(item.sleep_hours || 0);
        
        // Formatta differenza (debt giornaliero)
        const debt = item.debt || 0;
        const debtFormatted = formatHoursMinutes(debt);
        const debtClass = debt > 0 ? 'daily-change-increment-positive' : 
                         debt < 0 ? 'daily-change-increment-negative' : 
                         'daily-change-increment-neutral';
        const debtSign = debt > 0 ? '+' : '';
        
        // Formatta debito cumulativo
        const cumulativeDebtFormatted = formatHoursMinutes(cumulativeDebtDisplay);
        
        // Calcola classe per debito cumulativo basato sulle soglie
        const debtInfo = window.getDebtInfo ? window.getDebtInfo(cumulativeDebtDisplay) : null;
        const cumulativeDebtClass = debtInfo ? `debt-${debtInfo.class}` : '';
        
        // Badge per dati esempio
        const exampleBadge = item.is_example ? 
            '<span class="daily-change-example-badge">ESEMPIO</span>' : '';
        
        return `
            <tr>
                <td>
                    ${dateFormatted}
                    ${exampleBadge}
                </td>
                <td>${sleepHours}</td>
                <td>
                    <span class="daily-change-increment ${debtClass}">
                        ${debtSign}${debtFormatted}
                    </span>
                </td>
                <td>
                    <span class="daily-change-cumulative-debt ${cumulativeDebtClass}">
                        ${cumulativeDebtFormatted}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Formatta ore (decimali) come ore e minuti (es. 4.82 -> "4h 49m")
 */
function formatHoursMinutes(hours) {
    const h = parseFloat(hours);
    const hoursInt = Math.floor(Math.abs(h));
    const minutes = Math.round((Math.abs(h) - hoursInt) * 60);
    
    // Gestisci valori negativi (per debito)
    const sign = h < 0 ? '-' : '';
    
    // Se ore è 0 e minuti è 0, mostra 0h
    if (hoursInt === 0 && minutes === 0) {
        return '0h';
    }
    
    // Formato: "Xh Ym" o solo "Xh" se minuti è 0
    if (minutes === 0) {
        return `${sign}${hoursInt}h`;
    } else {
        return `${sign}${hoursInt}h ${minutes}m`;
    }
}

// Esponi funzioni globalmente
window.showDailyChangePage = showDailyChangePage;
window.closeDailyChangePage = closeDailyChangePage;
window.loadDailyChangeData = loadDailyChangeData;

