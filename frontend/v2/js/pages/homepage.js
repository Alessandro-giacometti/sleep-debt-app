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
    
    // Aggiorna card "Dormi oggi"
    const todaySleepEl = document.getElementById('today-sleep');
    if (data.recent_data && data.recent_data.length > 0 && data.recent_data[0]) {
        const sleepHours = data.recent_data[0].sleep_hours;
        todaySleepEl.textContent = window.formatDebt(sleepHours);
        todaySleepEl.style.color = 'var(--color-green)';
    } else {
        todaySleepEl.textContent = '-';
    }
    
    // Aggiorna card "Obiettivo del sonno"
    const targetSleepEl = document.getElementById('target-sleep');
    targetSleepEl.textContent = window.formatDebt(data.target_sleep_hours);
    targetSleepEl.style.color = 'var(--color-text-primary)';
    
    // Aggiorna valore nelle impostazioni
    const settingsTargetValueEl = document.getElementById('settings-target-value');
    if (settingsTargetValueEl) {
        settingsTargetValueEl.textContent = window.formatDebt(data.target_sleep_hours);
    }
    
    // Aggiorna titolo grafico con numero giorni
    const chartTitleEl = document.getElementById('chart-title-text');
    if (chartTitleEl && data.recent_data) {
        const days = data.recent_data.length || 10;
        chartTitleEl.textContent = `Andamento del debito di sonno (${days} giorni)`;
    }
}

// Esponi funzioni globalmente
window.updateHeaderDate = updateHeaderDate;
window.updateUI = updateUI;

