// Sleep Debt Tracker v2 - Homepage Logic

/**
 * Aggiorna data nell'header
 */
function updateHeaderDate() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
    // Capitalizza prima lettera
    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    const dateEl = document.getElementById('header-date');
    if (dateEl) {
        dateEl.textContent = formattedDate;
    }
}

/**
 * Aggiorna UI con i dati
 */
function updateUI(data) {
    // Calcola colore e valore debito
    const debtHours = data.current_debt || 0;
    const debtInfo = window.getDebtInfo(debtHours);
    
    // Aggiorna card debito principale
    const debtValueEl = document.getElementById('debt-value');
    debtValueEl.textContent = window.formatDebt(debtHours);
    debtValueEl.className = `debt-value ${debtInfo.class}`;
    
    // Aggiorna zona attuale
    const currentZoneEl = document.getElementById('current-zone');
    currentZoneEl.textContent = debtInfo.zone;
    currentZoneEl.style.color = debtInfo.color;
    
    // Aggiorna cambiamento odierno (calcolo semplificato)
    const todayChangeEl = document.getElementById('today-change');
    if (data.recent_data && data.recent_data.length > 0) {
        const today = data.recent_data[0];
        const yesterday = data.recent_data[1];
        if (yesterday) {
            const change = today.debt - yesterday.debt;
            // Formato: "-3 h e 59 min" (con segno negativo se positivo, perché è una riduzione)
            const changeAbs = Math.abs(change);
            todayChangeEl.textContent = change < 0 ? `-${window.formatDebt(changeAbs)}` : `+${window.formatDebt(changeAbs)}`;
            todayChangeEl.style.color = change < 0 ? 'var(--color-green)' : 'var(--color-orange)';
        } else {
            todayChangeEl.textContent = '-';
        }
    } else {
        todayChangeEl.textContent = '-';
    }
    
    // Aggiorna card "Ore dormite oggi"
    const todaySleepEl = document.getElementById('today-sleep');
    if (data.recent_data && data.recent_data.length > 0 && data.recent_data[0]) {
        const sleepHours = data.recent_data[0].sleep_hours;
        const targetHours = data.target_sleep_hours || 8;
        todaySleepEl.textContent = window.formatDebt(sleepHours);
        // Verde se >= target, rosso se < target
        todaySleepEl.style.color = sleepHours >= targetHours ? 'var(--color-green)' : 'var(--color-red)';
    } else {
        todaySleepEl.textContent = '-';
        todaySleepEl.style.color = 'var(--color-text-primary)';
    }
    
    // Aggiorna card "Target sonno giornaliero"
    const targetSleepEl = document.getElementById('target-sleep');
    // Usa formato completo con ore e minuti invece di formatHoursOnly
    const { hours, minutes } = window.decimalToHoursMinutes(data.target_sleep_hours);
    if (minutes === 0) {
        targetSleepEl.textContent = `${hours}h`;
    } else {
        targetSleepEl.textContent = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }
    targetSleepEl.style.color = 'var(--color-text-primary)';
    
    // Aggiorna valore nelle impostazioni (formato completo con ore e minuti)
    const settingsTargetValueEl = document.getElementById('settings-target-value');
    if (settingsTargetValueEl) {
        if (minutes === 0) {
            settingsTargetValueEl.textContent = `${hours}h`;
        } else {
            settingsTargetValueEl.textContent = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
        }
    }
    
    // Aggiorna titolo grafico con numero giorni
    const chartTitleEl = document.getElementById('chart-title-text');
    if (chartTitleEl && data.recent_data) {
        const days = data.recent_data.length || 10;
        chartTitleEl.textContent = `Andamento del debito di sonno (${days} giorni)`;
    }
    
    // Mostra/nascondi avviso nessun dato (solo se days_tracked === 0)
    const noDataWarning = document.getElementById('no-data-warning');
    if (noDataWarning) {
        if (data.days_tracked === 0) {
            noDataWarning.style.display = 'block';
        } else {
            noDataWarning.style.display = 'none';
        }
    }
    
    // Mostra/nascondi avviso dato oggi mancante
    const missingTodayWarning = document.getElementById('missing-today-warning');
    const missingTodayMessage = document.getElementById('missing-today-message');
    if (missingTodayWarning && missingTodayMessage) {
        if (data.has_today_data === false && data.days_tracked > 0) {
            // Formatta data di oggi in italiano
            const today = new Date();
            const todayFormatted = today.toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            missingTodayMessage.textContent = `Non ci sono ancora dati di sonno per oggi ${todayFormatted}. Il calcolo del debito esclude la giornata odierna fino a quando non saranno disponibili i dati.`;
            missingTodayWarning.style.display = 'block';
        } else {
            missingTodayWarning.style.display = 'none';
        }
    }
    
    // Mostra/nascondi avviso dati insufficienti per finestra
    const insufficientDataWarning = document.getElementById('insufficient-data-warning');
    const insufficientDataMessage = document.getElementById('insufficient-data-message');
    if (insufficientDataWarning && insufficientDataMessage) {
        const windowDays = data.stats_window_days || window.currentWindow || 7;
        if (data.days_tracked > 0 && data.days_tracked < windowDays) {
            insufficientDataMessage.textContent = `Hai solo ${data.days_tracked} ${data.days_tracked === 1 ? 'giorno' : 'giorni'} di dati disponibili, ma la finestra selezionata è di ${windowDays} ${windowDays === 1 ? 'giorno' : 'giorni'}. Avvia la sincronizzazione per ottenere più dati.`;
            insufficientDataWarning.style.display = 'block';
        } else {
            insufficientDataWarning.style.display = 'none';
        }
    }
}

// Esponi funzioni globalmente
window.updateHeaderDate = updateHeaderDate;
window.updateUI = updateUI;

