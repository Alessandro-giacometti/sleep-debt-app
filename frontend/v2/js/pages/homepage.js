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
    
    // Aggiorna classe della card principale per styling basato sul livello del debito
    const debtMainCard = document.getElementById('debt-main-card');
    if (debtMainCard) {
        // Rimuovi tutte le classi di livello
        debtMainCard.classList.remove('debt-level-optimal', 'debt-level-slight', 'debt-level-large', 'debt-level-critical');
        // Aggiungi la classe corrispondente
        debtMainCard.classList.add(`debt-level-${debtInfo.class}`);
    }
    
    // Aggiorna zona attuale
    const currentZoneEl = document.getElementById('current-zone');
    currentZoneEl.textContent = debtInfo.zone;
    // Il colore è ora gestito dalle classi CSS del badge/pill
    
    // Aggiorna anche la mini card "Sleep Debt Zone" con la classe del livello per migliorare visibilità
    const zoneMiniCard = document.querySelector('.mini-card[onclick="showZonePage()"]');
    if (zoneMiniCard) {
        // Rimuovi tutte le classi di livello
        zoneMiniCard.classList.remove('debt-level-optimal', 'debt-level-slight', 'debt-level-large', 'debt-level-critical');
        // Aggiungi la classe corrispondente
        zoneMiniCard.classList.add(`debt-level-${debtInfo.class}`);
    }
    
    // Aggiorna cambiamento odierno (mostra la differenza del giorno, cioè il debt giornaliero di oggi)
    const todayChangeEl = document.getElementById('today-change');
    const dailyChangeCard = document.querySelector('.info-card[onclick="showDailyChangePage()"]');
    if (data.recent_data && data.recent_data.length > 0) {
        const today = data.recent_data[0];
        const debt = today.debt || 0;
        
        // Formatta la differenza (debt giornaliero)
        const debtFormatted = window.formatHoursMinutes ? window.formatHoursMinutes(debt) : window.formatDebt(Math.abs(debt));
        const debtSign = debt > 0 ? '+' : '';
        
        todayChangeEl.textContent = debt !== 0 ? `${debtSign}${debtFormatted}` : '0h';
        
        // Colore in base al segno e classe per bordo card
        if (dailyChangeCard) {
            dailyChangeCard.classList.remove('card-status-positive', 'card-status-negative', 'card-status-neutral');
            if (debt > 0) {
                todayChangeEl.style.color = 'var(--color-red)'; // Deficit (positivo)
                dailyChangeCard.classList.add('card-status-positive');
            } else if (debt < 0) {
                todayChangeEl.style.color = 'var(--color-green)'; // Surplus (negativo)
                dailyChangeCard.classList.add('card-status-negative');
            } else {
                todayChangeEl.style.color = 'var(--color-text-secondary)'; // Neutro
                dailyChangeCard.classList.add('card-status-neutral');
            }
        }
    } else {
        todayChangeEl.textContent = '-';
        todayChangeEl.style.color = '';
        if (dailyChangeCard) {
            dailyChangeCard.classList.remove('card-status-positive', 'card-status-negative', 'card-status-neutral');
        }
    }
    
    // Aggiorna card "Ore dormite oggi" (formato compatto con "m" invece di "min")
    const todaySleepEl = document.getElementById('today-sleep');
    const todaySleepCard = document.querySelector('.info-card[onclick="showDailySleepPage()"]');
    if (data.recent_data && data.recent_data.length > 0 && data.recent_data[0]) {
        const sleepHours = data.recent_data[0].sleep_hours;
        const targetHours = data.target_sleep_hours || 8;
        // Usa formatHoursMinutes per formato compatto (es. "8h 30m")
        todaySleepEl.textContent = window.formatHoursMinutes ? window.formatHoursMinutes(sleepHours) : window.formatDebt(sleepHours);
        // Verde se >= target, rosso se < target
        const isGood = sleepHours >= targetHours;
        todaySleepEl.style.color = isGood ? 'var(--color-green)' : 'var(--color-red)';
        
        // Aggiungi classe per bordo card
        if (todaySleepCard) {
            todaySleepCard.classList.remove('card-status-good', 'card-status-bad');
            todaySleepCard.classList.add(isGood ? 'card-status-good' : 'card-status-bad');
        }
    } else {
        todaySleepEl.textContent = '-';
        todaySleepEl.style.color = 'var(--color-text-primary)';
        if (todaySleepCard) {
            todaySleepCard.classList.remove('card-status-good', 'card-status-bad');
        }
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
    
    // Mostra/nascondi avviso sincronizzazione in corso
    // (mostra quando il sync è stato tentato all'apertura dell'app)
    const syncingTodayWarning = document.getElementById('syncing-today-warning');
    if (syncingTodayWarning) {
        if (data.auto_sync_attempted === true) {
            syncingTodayWarning.style.display = 'block';
            // Se il sync ha recuperato i dati, nascondi il messaggio dopo un breve delay
            if (data.has_today_data === true) {
                setTimeout(() => {
                    syncingTodayWarning.style.display = 'none';
                }, 2000); // Nascondi dopo 2 secondi se il sync ha avuto successo
            } else if (data.has_today_data === false) {
                // Se il sync è fallito (has_today_data === false), nascondi il messaggio dopo un delay
                // Se days_tracked > 0, il messaggio verrà nascosto quando viene mostrato l'avviso di dati mancanti (vedi sotto)
                // Se days_tracked === 0, nascondi comunque il messaggio dopo il delay (l'avviso "Nessun dato" è già visibile)
                if (data.days_tracked === 0) {
                    setTimeout(() => {
                        syncingTodayWarning.style.display = 'none';
                    }, 2000); // Nascondi dopo 2 secondi anche se non ci sono dati ancora
                }
                // Se days_tracked > 0, il messaggio verrà nascosto nel blocco sotto quando viene mostrato l'avviso di dati mancanti
            }
        } else {
            syncingTodayWarning.style.display = 'none';
        }
    }
    
    // Mostra/nascondi avviso dato oggi mancante
    // (mostra solo se il dato è mancante DOPO che il sync è stato tentato o se non è stato tentato)
    const missingTodayWarning = document.getElementById('missing-today-warning');
    const missingTodayMessage = document.getElementById('missing-today-message');
    if (missingTodayWarning && missingTodayMessage) {
        if (data.has_today_data === false && data.days_tracked > 0) {
            // Se il sync è stato tentato ma non ha recuperato dati, mostra l'avviso dopo un breve delay
            // per dare tempo al messaggio di sincronizzazione di essere visibile
            if (data.auto_sync_attempted === true) {
                setTimeout(() => {
                    // Nascondi il messaggio di sincronizzazione prima di mostrare l'avviso di dati mancanti
                    if (syncingTodayWarning) {
                        syncingTodayWarning.style.display = 'none';
                    }
                    // Formatta data di oggi in italiano
                    const today = new Date();
                    const todayFormatted = today.toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    });
                    missingTodayMessage.textContent = `Non ci sono ancora dati di sonno per oggi ${todayFormatted}. Il calcolo del debito esclude la giornata odierna fino a quando non saranno disponibili i dati.`;
                    missingTodayWarning.style.display = 'block';
                }, 2000); // Mostra dopo 2 secondi se il sync non ha recuperato dati
            } else {
                // Formatta data di oggi in italiano
                const today = new Date();
                const todayFormatted = today.toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                missingTodayMessage.textContent = `Non ci sono ancora dati di sonno per oggi ${todayFormatted}. Il calcolo del debito esclude la giornata odierna fino a quando non saranno disponibili i dati.`;
                missingTodayWarning.style.display = 'block';
            }
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
