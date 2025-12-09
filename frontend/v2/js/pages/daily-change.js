// Sleep Debt Tracker v2 - Daily Change Page Logic

/**
 * Mostra pagina Daily Change
 */
function showDailyChangePage() {
    navigateTo('daily-change-page');
    loadDailyChangeData();
}

/**
 * Chiudi pagina Daily Change (torna alla homepage)
 */
function closeDailyChangePage() {
    navigateTo('homepage');
}

/**
 * Carica dati per la tabella Daily Change
 */
async function loadDailyChangeData() {
    const tbody = document.getElementById('daily-change-table-body');
    const targetInfoEl = document.getElementById('daily-change-target-info');
    
    if (!tbody) return;
    
    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Caricamento...</td></tr>';
        
        const response = await fetch(`${window.location.origin}/api/sleep/chart-data?days=30`);
        if (!response.ok) throw new Error('Errore nel caricamento dati');
        
        const data = await response.json();
        
        // Ottieni target ore sonno
        const statusResponse = await fetch(`${window.location.origin}/api/sleep/status`);
        const statusData = await statusResponse.json();
        const targetHours = statusData.target_sleep_hours || 8;
        
        // Aggiorna info target (con formato ore e minuti)
        if (targetInfoEl) {
            targetInfoEl.textContent = `Target giornaliero: ${formatHoursMinutesLocal(targetHours)}`;
        }
        
        updateDailyChangeTable(data.data || [], targetHours);
        
    } catch (error) {
        console.error('Errore caricamento dati daily change:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--color-red);">Errore nel caricamento</td></tr>';
    }
}

/**
 * Aggiorna tabella Daily Change
 */
function updateDailyChangeTable(data, targetHours) {
    const tbody = document.getElementById('daily-change-table-body');
    if (!tbody || !data.length) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nessun dato disponibile</td></tr>';
        }
        return;
    }
    
    // Ordina per data crescente per calcolare il debito cumulato
    const sortedDataAsc = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calcola debito cumulato
    let cumulativeDebt = 0;
    const dataWithCumulative = sortedDataAsc.map(day => {
        const dailyDebt = day.debt || 0;
        cumulativeDebt += dailyDebt;
        // Il debito cumulato non può essere negativo (minimo 0)
        if (cumulativeDebt < 0) cumulativeDebt = 0;
        return {
            ...day,
            cumulativeDebt: cumulativeDebt
        };
    });
    
    // Inverti per mostrare i giorni più recenti in alto
    const sortedData = dataWithCumulative.reverse();
    
    tbody.innerHTML = sortedData.map(day => {
        const date = new Date(day.date);
        const dateStr = date.toLocaleDateString('it-IT', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
        });
        
        const hours = day.sleep_hours || 0;
        const hoursFormatted = formatHoursMinutesLocal(hours);
        
        const debt = day.debt || 0;
        const debtFormatted = formatHoursMinutesLocal(debt);
        
        // Classe per il colore dell'incremento giornaliero
        let incrementClass = 'daily-change-increment-neutral';
        if (debt > 0) {
            incrementClass = 'daily-change-increment-positive'; // Rosso - debito aumentato
        } else if (debt < 0) {
            incrementClass = 'daily-change-increment-negative'; // Verde - debito diminuito
        }
        
        // Debito cumulato
        const cumulativeDebtFormatted = formatHoursMinutesLocal(day.cumulativeDebt);
        
        // Classe per il colore del debito cumulato
        const debtInfo = getDebtLevelInfoLocal(day.cumulativeDebt);
        
        return `
            <tr>
                <td>${dateStr}</td>
                <td>${hoursFormatted}</td>
                <td><span class="daily-change-increment ${incrementClass}">${debtFormatted}</span></td>
                <td><span class="daily-change-cumulative-debt ${debtInfo.class}">${cumulativeDebtFormatted}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Formatta ore e minuti (versione locale)
 */
function formatHoursMinutesLocal(hours) {
    const h = parseFloat(hours);
    const hoursInt = Math.floor(Math.abs(h));
    const minutes = Math.round((Math.abs(h) - hoursInt) * 60);
    const sign = h < 0 ? '-' : '';
    
    if (hoursInt === 0 && minutes === 0) {
        return '0h';
    }
    if (minutes === 0) {
        return `${sign}${hoursInt}h`;
    }
    return `${sign}${hoursInt}h ${minutes}m`;
}

/**
 * Ottieni info livello debito (versione locale)
 */
function getDebtLevelInfoLocal(debtHours) {
    if (debtHours <= 1) {
        return { class: 'debt-optimal', color: 'var(--color-green)' };
    } else if (debtHours <= 5) {
        return { class: 'debt-slight', color: 'var(--color-yellow)' };
    } else if (debtHours <= 10) {
        return { class: 'debt-large', color: 'var(--color-orange)' };
    } else {
        return { class: 'debt-critical', color: 'var(--color-red)' };
    }
}

// Esponi funzioni globalmente
window.showDailyChangePage = showDailyChangePage;
window.closeDailyChangePage = closeDailyChangePage;
