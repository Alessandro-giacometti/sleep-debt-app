// Sleep Debt Tracker v2 - Settings Page Logic

// Variabile globale per tracciare lo stato del toggle dummy data
window.currentDummyData = false;

/**
 * Aggiorna UI delle impostazioni con i valori correnti
 */
function updateSettingsUI(settings) {
    // Aggiorna valore finestra giorni
    const windowValueEl = document.getElementById('settings-window-value');
    if (windowValueEl && settings.stats_window_days) {
        windowValueEl.textContent = `${settings.stats_window_days} giorni`;
    }
    
    // Aggiorna valore target sonno (formato completo con ore e minuti)
    const targetValueEl = document.getElementById('settings-target-value');
    if (targetValueEl && settings.target_sleep_hours) {
        const { hours, minutes } = decimalToHoursMinutes(settings.target_sleep_hours);
        if (minutes === 0) {
            targetValueEl.textContent = `${hours}h`;
        } else {
            targetValueEl.textContent = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
        }
    }
    
    // Aggiorna toggle dummy data
    const useDummyData = settings.use_dummy_data || false;
    window.currentDummyData = useDummyData;
    const dummyDataToggle = document.getElementById('dummy-data-toggle');
    if (dummyDataToggle) {
        if (useDummyData) {
            dummyDataToggle.classList.add('active');
        } else {
            dummyDataToggle.classList.remove('active');
        }
    }
    
    // Aggiorna selettore finestra giorni (attiva l'opzione corretta)
    const windowDays = settings.stats_window_days || 10;
    document.querySelectorAll('.window-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelectorAll('.window-option-check').forEach(check => {
        check.textContent = '';
    });
    
    // Trova e seleziona l'opzione corretta
    const optionEl = document.querySelector(`.window-option[onclick*="${windowDays}"]`);
    if (optionEl) {
        optionEl.classList.add('selected');
        const checkEl = document.getElementById(`window-check-${windowDays}`);
        if (checkEl) {
            checkEl.textContent = '✓';
        }
    }
    
    // Aggiorna picker target sonno SOLO se la sub-pagina NON è attiva
    // (per evitare di sovrascrivere il valore che l'utente sta modificando)
    // Nota: il picker scrollabile viene inizializzato quando si apre la sub-pagina
    // quindi non serve aggiornarlo qui
}

/**
 * Selettore finestra giorni (solo UI, non salva)
 */
function selectWindow(days) {
    // Aggiorna UI - rimuovi selected da tutte le opzioni
    document.querySelectorAll('.window-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Aggiungi selected all'opzione cliccata
    const optionEl = document.querySelector(`.window-option[onclick*="${days}"]`);
    if (optionEl) {
        optionEl.classList.add('selected');
    }
    
    // Aggiorna anche i checkmark
    document.querySelectorAll('.window-option-check').forEach(check => {
        check.textContent = '';
    });
    const checkEl = document.getElementById(`window-check-${days}`);
    if (checkEl) {
        checkEl.textContent = '✓';
    }
    
    // Salva valore per il salvataggio
    if (window.currentWindow !== undefined) {
        window.currentWindow = days;
    }
}

/**
 * Toggle "Valuta di più gli ultimi giorni" (placeholder)
 */
function toggleWeight() {
    const toggle = document.getElementById('weight-toggle-slider');
    const toggleContainer = toggle?.parentElement;
    if (toggleContainer) {
        toggleContainer.classList.toggle('active');
        // TODO: Implementare logica di salvataggio quando sarà implementata la funzionalità
        console.log('Weight toggle:', toggleContainer.classList.contains('active') ? 'on' : 'off');
    }
}

/**
 * Toggle dati dummy
 */
function toggleDummyData(event) {
    // Previeni la propagazione dell'evento
    if (event) {
        event.stopPropagation();
    }
    
    const toggle = document.getElementById('dummy-data-toggle');
    if (toggle) {
        toggle.classList.toggle('active');
        window.currentDummyData = toggle.classList.contains('active');
        
        // Salva immediatamente le impostazioni
        saveSettings();
    }
}

/**
 * Converti decimal hours a hours e minutes
 * Arrotonda correttamente i minuti senza limiti ai multipli di 15
 */
function decimalToHoursMinutes(decimalHours) {
    // Assicurati che decimalHours sia un numero
    const numHours = Number(decimalHours);
    if (isNaN(numHours)) {
        console.error('decimalToHoursMinutes: invalid input', decimalHours);
        return { hours: 0, minutes: 0 };
    }
    
    const hours = Math.floor(Math.abs(numHours));
    const decimalMinutes = (Math.abs(numHours) - hours) * 60;
    // Arrotonda i minuti al numero intero più vicino
    const minutes = Math.round(decimalMinutes);
    // Se arrotondato a 60, passa all'ora successiva
    if (minutes >= 60) {
        return { hours: hours + 1, minutes: 0 };
    }
    
    return { hours, minutes };
}

/**
 * Converti hours e minutes a decimal hours
 */
function hoursMinutesToDecimal(hours, minutes) {
    return hours + (minutes / 60);
}

// Variabili per gestire i listener degli scroll
let hoursScrollHandler = null;
let minutesScrollHandler = null;

/**
 * Inizializza picker scrollabile target
 */
async function initTargetPicker() {
    // Ottieni valore corrente - carica sempre dalle settings per avere il valore più aggiornato
    let targetHours = 8.0;
    
    try {
        const response = await fetch(`${window.location.origin}/api/settings`);
        if (response.ok) {
            const settings = await response.json();
            targetHours = settings.target_sleep_hours || 8.0;
            // Aggiorna anche window.sleepData per future chiamate
            if (!window.sleepData) {
                window.sleepData = {};
            }
            window.sleepData.target_sleep_hours = targetHours;
        } else {
            // Fallback a window.sleepData se la chiamata API fallisce
            if (window.sleepData && window.sleepData.target_sleep_hours) {
                targetHours = window.sleepData.target_sleep_hours;
            }
        }
    } catch (error) {
        console.warn('Could not load settings for picker initialization:', error);
        // Fallback a window.sleepData se la chiamata API fallisce
        if (window.sleepData && window.sleepData.target_sleep_hours) {
            targetHours = window.sleepData.target_sleep_hours;
        }
    }
    
    // Converti in ore e minuti
    const converted = decimalToHoursMinutes(targetHours);
    let currentHours = converted.hours;
    // Arrotonda i minuti al multiplo di 15 più vicino
    let currentMinutes = Math.round(converted.minutes / 15) * 15;
    if (currentMinutes >= 60) {
        currentMinutes = 0;
        currentHours += 1;
    }
    
    
    // Crea picker ore (0-24)
    const hoursContent = document.getElementById('target-hours-content');
    const hoursScroll = document.getElementById('target-hours-scroll');
    if (hoursContent && hoursScroll) {
        // Rimuovi listener vecchio se esiste
        if (hoursScrollHandler) {
            hoursScroll.removeEventListener('scroll', hoursScrollHandler);
        }
        
        hoursContent.innerHTML = '';
        let selectedHourElement = null;
        for (let h = 0; h <= 24; h++) {
            const item = document.createElement('div');
            item.className = 'target-picker-item';
            item.textContent = `${h}h`;
            item.dataset.value = h;
            if (h === currentHours) {
                item.classList.add('selected');
                selectedHourElement = item; // Salva riferimento all'elemento selezionato
            }
            item.onclick = () => selectTargetHour(h);
            hoursContent.appendChild(item);
        }
        // Scrolla all'elemento selezionato - usa il riferimento salvato invece di querySelector
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (selectedHourElement && selectedHourElement.parentNode === hoursContent) {
                        // Calcola la posizione manualmente per un controllo migliore
                        const scrollPosition = selectedHourElement.offsetTop - (hoursScroll.offsetHeight / 2) + (selectedHourElement.offsetHeight / 2);
                        hoursScroll.scrollTop = scrollPosition;
                        
                        // Verifica che lo scroll sia stato applicato, altrimenti riprova
                        setTimeout(() => {
                            const currentScroll = hoursScroll.scrollTop;
                            const expectedScroll = scrollPosition;
                            const tolerance = 10; // 10px di tolleranza
                            if (Math.abs(currentScroll - expectedScroll) > tolerance) {
                                hoursScroll.scrollTop = scrollPosition;
                            }
                        }, 50);
                    } else {
                        // Fallback: usa querySelector
                        const selected = hoursContent.querySelector('.selected');
                        if (selected) {
                            const scrollPosition = selected.offsetTop - (hoursScroll.offsetHeight / 2) + (selected.offsetHeight / 2);
                            hoursScroll.scrollTop = scrollPosition;
                        }
                    }
                }, 150);
            });
        });
        
        // Listener per scroll manuale
        hoursScrollHandler = () => updateSelectedOnScroll(hoursScroll, 'hours');
        hoursScroll.addEventListener('scroll', hoursScrollHandler);
    }
    
    // Crea picker minuti (solo multipli di 15: 0, 15, 30, 45)
    const minutesContent = document.getElementById('target-minutes-content');
    const minutesScroll = document.getElementById('target-minutes-scroll');
    if (minutesContent && minutesScroll) {
        // Rimuovi listener vecchio se esiste
        if (minutesScrollHandler) {
            minutesScroll.removeEventListener('scroll', minutesScrollHandler);
        }
        
        minutesContent.innerHTML = '';
        // Arrotonda currentMinutes al multiplo di 15 più vicino
        const roundedMinutes = Math.round(currentMinutes / 15) * 15;
        const minuteOptions = [0, 15, 30, 45];
        let selectedMinuteElement = null;
        for (const m of minuteOptions) {
            const item = document.createElement('div');
            item.className = 'target-picker-item';
            item.textContent = `${m.toString().padStart(2, '0')}min`;
            item.dataset.value = m;
            if (m === roundedMinutes) {
                item.classList.add('selected');
                selectedMinuteElement = item; // Salva riferimento all'elemento selezionato
            }
            item.onclick = () => selectTargetMinute(m);
            minutesContent.appendChild(item);
        }
        // Scrolla all'elemento selezionato - usa il riferimento salvato invece di querySelector
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (selectedMinuteElement && selectedMinuteElement.parentNode === minutesContent) {
                        // Calcola la posizione manualmente per un controllo migliore
                        const scrollPosition = selectedMinuteElement.offsetTop - (minutesScroll.offsetHeight / 2) + (selectedMinuteElement.offsetHeight / 2);
                        minutesScroll.scrollTop = scrollPosition;
                        
                        // Verifica che lo scroll sia stato applicato, altrimenti riprova
                        setTimeout(() => {
                            const currentScroll = minutesScroll.scrollTop;
                            const expectedScroll = scrollPosition;
                            const tolerance = 10; // 10px di tolleranza
                            if (Math.abs(currentScroll - expectedScroll) > tolerance) {
                                minutesScroll.scrollTop = scrollPosition;
                            }
                        }, 50);
                    } else {
                        // Fallback: usa querySelector
                        const selected = minutesContent.querySelector('.selected');
                        if (selected) {
                            const scrollPosition = selected.offsetTop - (minutesScroll.offsetHeight / 2) + (selected.offsetHeight / 2);
                            minutesScroll.scrollTop = scrollPosition;
                        }
                    }
                }, 150);
            });
        });
        
        // Listener per scroll manuale
        minutesScrollHandler = () => updateSelectedOnScroll(minutesScroll, 'minutes');
        minutesScroll.addEventListener('scroll', minutesScrollHandler);
    }
    
    updateTargetPickerSelected();
}

/**
 * Aggiorna selezione durante lo scroll
 */
function updateSelectedOnScroll(scrollContainer, type) {
    const items = scrollContainer.querySelectorAll('.target-picker-item');
    const containerHeight = scrollContainer.clientHeight;
    const scrollTop = scrollContainer.scrollTop;
    const centerY = scrollTop + (containerHeight / 2);
    
    let closestItem = null;
    let closestDistance = Infinity;
    
    items.forEach(item => {
        const itemTop = item.offsetTop;
        const itemHeight = item.clientHeight;
        const itemCenter = itemTop + (itemHeight / 2);
        const distance = Math.abs(centerY - itemCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });
    
    if (closestItem) {
        items.forEach(item => item.classList.remove('selected'));
        closestItem.classList.add('selected');
        updateTargetPickerSelected();
    }
}

/**
 * Seleziona ora nel picker
 */
function selectTargetHour(hour) {
    document.querySelectorAll('#target-hours-content .target-picker-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.value) === hour) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    updateTargetPickerSelected();
}

/**
 * Seleziona minuto nel picker
 */
function selectTargetMinute(minute) {
    document.querySelectorAll('#target-minutes-content .target-picker-item').forEach(item => {
        item.classList.remove('selected');
        if (parseInt(item.dataset.value) === minute) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    updateTargetPickerSelected();
}

/**
 * Aggiorna display "Selezionato"
 */
function updateTargetPickerSelected() {
    const hoursEl = document.querySelector('#target-hours-content .target-picker-item.selected');
    const minutesEl = document.querySelector('#target-minutes-content .target-picker-item.selected');
    const selectedEl = document.getElementById('target-picker-selected');
    
    if (hoursEl && minutesEl && selectedEl) {
        const hours = Number(hoursEl.dataset.value) || 0;
        const minutes = Number(minutesEl.dataset.value) || 0;
        selectedEl.textContent = `Selezionato: ${hours}h ${minutes.toString().padStart(2, '0')}min`;
    }
}

/**
 * Aggiorna stati dei bottoni del picker target
 */
function updateTargetPickerButtonStates() {
    const hours = parseInt(document.getElementById('target-hours-value').textContent) || 0;
    const minutes = parseInt(document.getElementById('target-minutes-value').textContent) || 0;
    
    // Bottoni ore
    const hoursDecrease = document.getElementById('target-hours-decrease');
    const hoursIncrease = document.getElementById('target-hours-increase');
    if (hoursDecrease) hoursDecrease.disabled = (hours <= 0);
    if (hoursIncrease) hoursIncrease.disabled = (hours >= 24);
    
    // Bottoni minuti
    const minutesDecrease = document.getElementById('target-minutes-decrease');
    const minutesIncrease = document.getElementById('target-minutes-increase');
    
    if (hours === 24) {
        if (minutesIncrease) minutesIncrease.disabled = true;
        if (minutesDecrease) minutesDecrease.disabled = (minutes <= 0);
    } else if (hours === 0 && minutes === 0) {
        if (minutesDecrease) minutesDecrease.disabled = true;
        if (minutesIncrease) minutesIncrease.disabled = false;
    } else {
        if (minutesDecrease) minutesDecrease.disabled = false;
        if (minutesIncrease) minutesIncrease.disabled = false;
    }
}

/**
 * Modifica ore target
 */
function adjustTargetHours(delta) {
    const hoursValue = document.getElementById('target-hours-value');
    let hours = parseInt(hoursValue.textContent) || 0;
    
    hours += delta;
    
    // Clamp tra 0 e 24
    if (hours < 0) hours = 0;
    if (hours > 24) hours = 24;
    
    // Se 24 ore, imposta minuti a 0
    if (hours === 24) {
        const minutesValue = document.getElementById('target-minutes-value');
        if (minutesValue) minutesValue.textContent = '00';
    }
    
    hoursValue.textContent = hours;
    updateTargetPickerDisplay();
    updateTargetPickerButtonStates();
}

/**
 * Modifica minuti target
 */
function adjustTargetMinutes(delta) {
    const minutesValue = document.getElementById('target-minutes-value');
    const hoursValue = document.getElementById('target-hours-value');
    let minutes = parseInt(minutesValue.textContent) || 0;
    const hours = parseInt(hoursValue.textContent) || 0;
    
    minutes += delta;
    
    // Gestisci overflow/underflow
    if (minutes < 0) {
        if (hours > 0) {
            const newHours = hours - 1;
            hoursValue.textContent = newHours;
            minutes = 60 + minutes;
        } else {
            minutes = 0;
        }
    } else if (minutes >= 60) {
        if (hours < 24) {
            const newHours = hours + 1;
            hoursValue.textContent = newHours;
            minutes = minutes - 60;
        } else {
            minutes = 0;
        }
    }
    
    // Se 24 ore, forza minuti a 0
    if (parseInt(hoursValue.textContent) === 24) {
        minutes = 0;
    }
    
    minutesValue.textContent = minutes.toString().padStart(2, '0');
    updateTargetPickerDisplay();
    updateTargetPickerButtonStates();
}

/**
 * Salva impostazioni chiamando l'API
 */
async function saveSettings() {
    const API_BASE_URL = window.location.origin;
    
    // Ottieni valori correnti
    let targetHours = null;
    let statsWindow = null;
    
    // Ottieni riferimenti alle sub-pagine (dichiarati una volta all'inizio)
    const targetSubpage = document.getElementById('settings-target-subpage');
    const windowSubpage = document.getElementById('settings-window-subpage');
    
    // Se siamo nella sub-pagina target, leggi dai picker scrollabili
    if (targetSubpage && targetSubpage.classList.contains('active')) {
        const hoursEl = document.querySelector('#target-hours-content .target-picker-item.selected');
        const minutesEl = document.querySelector('#target-minutes-content .target-picker-item.selected');
        if (hoursEl && minutesEl) {
            // Leggi i valori direttamente da dataset.value (sono numeri)
            const hours = Number(hoursEl.dataset.value) || 0;
            const minutes = Number(minutesEl.dataset.value) || 0;
            
            targetHours = hoursMinutesToDecimal(hours, minutes);
            
            // Validazione
            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) {
                showSettingsMessage('Errore: valori non validi dal picker', 'error');
                return;
            }
        }
    } else {
        // Altrimenti usa il valore corrente dalle settings
        if (window.sleepData) {
            targetHours = window.sleepData.target_sleep_hours;
        }
    }
    
    // Se siamo nella sub-pagina window, leggi da lì
    if (windowSubpage && windowSubpage.classList.contains('active')) {
        // Trova l'opzione selezionata
        const selectedOption = document.querySelector('.window-option.selected');
        if (selectedOption) {
            const onclickAttr = selectedOption.getAttribute('onclick');
            const match = onclickAttr.match(/selectWindow\((\d+)\)/);
            if (match) {
                statsWindow = parseInt(match[1]);
            }
        }
    } else {
        // Altrimenti usa il valore corrente
        statsWindow = window.currentWindow || 10;
    }
    
    // Valida
    if (targetHours !== null && (targetHours <= 0 || targetHours > 24)) {
        showSettingsMessage('Le ore sonno target devono essere tra 0h:00m e 24h:00m', 'error');
        return;
    }
    
    if (statsWindow !== null && ![7, 10, 14].includes(statsWindow)) {
        showSettingsMessage('La finestra statistiche deve essere 7, 10 o 14 giorni', 'error');
        return;
    }
    
    // Se non abbiamo valori, usa quelli correnti
    if (targetHours === null && window.sleepData) {
        targetHours = window.sleepData.target_sleep_hours;
    }
    if (statsWindow === null) {
        statsWindow = window.currentWindow || 10;
    }
    
    // Mostra loading - trova il bottone nella sub-pagina attiva
    // (riutilizza windowSubpage e targetSubpage già dichiarati sopra)
    let saveBtn = null;
    if (windowSubpage && windowSubpage.classList.contains('active')) {
        saveBtn = document.getElementById('settings-save-btn-window');
    } else if (targetSubpage && targetSubpage.classList.contains('active')) {
        saveBtn = document.getElementById('settings-save-btn-target');
    }
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Salvataggio...';
    }
    
    // Nascondi messaggi precedenti
    showSettingsMessage('', '');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_sleep_hours: targetHours,
                stats_window_days: statsWindow,
                use_dummy_data: window.currentDummyData || false
            })
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            const clonedResponse = response.clone();
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                try {
                    const text = await clonedResponse.text();
                    if (text.includes('Internal Server Error') || text.includes('detail')) {
                        errorMessage = 'Errore interno del server. Riprova più tardi.';
                    } else {
                        errorMessage = text.substring(0, 200) || errorMessage;
                    }
                } catch (textError) {
                    errorMessage = `Errore del server (status ${response.status})`;
                }
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // Mostra messaggio di successo
        showSettingsMessage('✅ Impostazioni salvate con successo!', 'success');
        
        // Aggiorna valori nella lista impostazioni
        const windowValueEl = document.getElementById('settings-window-value');
        if (windowValueEl) {
            windowValueEl.textContent = `${statsWindow} giorni`;
        }
        
        const targetValueEl = document.getElementById('settings-target-value');
        if (targetValueEl) {
            const { hours, minutes } = decimalToHoursMinutes(targetHours);
            if (minutes === 0) {
                targetValueEl.textContent = `${hours}h`;
            } else {
                targetValueEl.textContent = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
            }
        }
        
        // Aggiorna window globale
        window.currentWindow = statsWindow;
        
        // Aggiorna bottone per mostrare ricaricamento
        if (saveBtn) {
            saveBtn.textContent = '⏳ Ricaricamento...';
        }
        
        // Mostra messaggio di ricaricamento
        showSettingsMessage('✅ Impostazioni salvate! ⏳ Ricaricamento dati...', 'success');
        
        // Ricarica settings e sleep status usando funzioni globali
        if (typeof loadSettings === 'function') {
            await loadSettings();
        }
        if (typeof loadSleepStatus === 'function') {
            await loadSleepStatus();
        }
        
        // Mostra messaggio finale
        showSettingsMessage('✅ Impostazioni salvate e dati aggiornati!', 'success');
        
        // NON aggiornare il picker target se la sub-pagina è ancora aperta
        // (per evitare che il valore venga sovrascritto durante il ricaricamento)
        const targetSubpage = document.getElementById('settings-target-subpage');
        if (targetSubpage && targetSubpage.classList.contains('active')) {
            // Mantieni il valore che l'utente ha selezionato nel picker
            // Non aggiornare con updateSettingsUI per evitare che venga modificato
        }
        
        // Chiudi sub-pagina dopo un breve delay
        setTimeout(() => {
            // Nascondi messaggio prima di chiudere
            const windowMessage = document.getElementById('settings-message-window');
            const targetMessage = document.getElementById('settings-message-target');
            if (windowMessage) windowMessage.classList.remove('active');
            if (targetMessage) targetMessage.classList.remove('active');
            
            // Reset bottone salva prima di chiudere
            const saveBtnWindow = document.getElementById('settings-save-btn-window');
            const saveBtnTarget = document.getElementById('settings-save-btn-target');
            if (saveBtnWindow) {
                saveBtnWindow.disabled = false;
                saveBtnWindow.textContent = 'Salva';
            }
            if (saveBtnTarget) {
                saveBtnTarget.disabled = false;
                saveBtnTarget.textContent = 'Salva';
            }
            
            closeSettingsSubpage();
        }, 2000);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showSettingsMessage('❌ Errore nel salvataggio: ' + error.message, 'error');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salva';
        }
    } finally {
        // Assicurati che il bottone sia sempre resettato in caso di errore
        if (saveBtn && saveBtn.disabled) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salva';
        }
    }
}

/**
 * Mostra messaggio nelle impostazioni
 */
function showSettingsMessage(message, type) {
    // Trova il messaggio nella sub-pagina attiva usando ID univoci
    const windowSubpage = document.getElementById('settings-window-subpage');
    const targetSubpage = document.getElementById('settings-target-subpage');
    
    let messageEl = null;
    let subpageEl = null;
    if (windowSubpage && windowSubpage.classList.contains('active')) {
        messageEl = document.getElementById('settings-message-window');
        subpageEl = windowSubpage;
    } else if (targetSubpage && targetSubpage.classList.contains('active')) {
        messageEl = document.getElementById('settings-message-target');
        subpageEl = targetSubpage;
    }
    
    // Se non trovato nella sub-pagina attiva, prova a cercare in entrambe (per cleanup)
    if (!messageEl) {
        messageEl = document.getElementById('settings-message-window') || document.getElementById('settings-message-target');
        if (!subpageEl) {
            subpageEl = windowSubpage || targetSubpage;
        }
    }
    
    if (messageEl) {
        if (message) {
            messageEl.textContent = message;
            messageEl.className = `settings-message ${type} active`;
            // Scrolla la sub-pagina per mostrare il messaggio completamente
            // La sub-pagina è position: fixed con scroll interno, quindi scrolliamo l'elemento sub-pagina
            if (subpageEl) {
                setTimeout(() => {
                    // Calcola la posizione del messaggio rispetto alla sub-pagina
                    const messageRect = messageEl.getBoundingClientRect();
                    const subpageRect = subpageEl.getBoundingClientRect();
                    const scrollPosition = subpageEl.scrollTop + (messageRect.top - subpageRect.top) - (subpageEl.clientHeight - messageRect.height - 80);
                    subpageEl.scrollTo({
                        top: Math.max(0, scrollPosition),
                        behavior: 'smooth'
                    });
                }, 100);
            }
        } else {
            // Se message è vuoto, nascondi
            messageEl.classList.remove('active');
        }
    }
    // Rimuovi il console.warn - non è un errore critico se l'elemento non esiste
}

// Traccia la pagina da cui si è arrivati per le sub-pagine
let previousPageBeforeSubpage = null;

/**
 * Mostra sotto-pagina impostazioni
 */
function showSettingsSubpage(type) {
    // Salva la pagina corrente come pagina precedente SOLO se non è già stata impostata
    // (ad esempio da openTargetSettings())
    if (previousPageBeforeSubpage === null) {
        // Usa il nuovo sistema di navigazione per verificare la pagina corrente
        const currentPage = window.getCurrentPage ? window.getCurrentPage() : 'settings-page';
        if (currentPage === 'homepage') {
            previousPageBeforeSubpage = 'homepage';
        } else {
            previousPageBeforeSubpage = 'settings';
        }
    }
    
    // Nascondi messaggi precedenti
    const windowMessage = document.getElementById('settings-message-window');
    const targetMessage = document.getElementById('settings-message-target');
    if (windowMessage) windowMessage.classList.remove('active');
    if (targetMessage) targetMessage.classList.remove('active');
    
    if (type === 'window') {
        document.getElementById('settings-window-subpage').classList.add('active');
        // Inizializza selettore con valore corrente
        const currentWindow = window.currentWindow || window.sleepData?.stats_window_days || 10;
        document.querySelectorAll('.window-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelectorAll('.window-option-check').forEach(check => {
            check.textContent = '';
        });
        
        const optionEl = document.querySelector(`.window-option[onclick*="${currentWindow}"]`);
        if (optionEl) {
            optionEl.classList.add('selected');
            const checkEl = document.getElementById(`window-check-${currentWindow}`);
            if (checkEl) {
                checkEl.textContent = '✓';
            }
        }
    } else if (type === 'target') {
        const targetSubpage = document.getElementById('settings-target-subpage');
        targetSubpage.classList.add('active');
        
        // Reset bottone salva quando si apre la sub-pagina
        const saveBtnTarget = document.getElementById('settings-save-btn-target');
        if (saveBtnTarget) {
            saveBtnTarget.disabled = false;
            saveBtnTarget.textContent = 'Salva';
        }
        
        // Inizializza picker scrollabile con valore corrente
        // Usa requestAnimationFrame per assicurarsi che la sub-pagina sia completamente visibile
        // prima di inizializzare il picker
        requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
                if (typeof initTargetPicker === 'function') {
                    try {
                        await initTargetPicker();
                    } catch (error) {
                        console.error('Error initializing target picker:', error);
                    }
                }
            });
        });
    }
}

/**
 * Chiudi sotto-pagina impostazioni
 */
function closeSettingsSubpage() {
    document.querySelectorAll('.settings-subpage').forEach(page => {
        page.classList.remove('active');
    });
    
    // Reset bottoni salva quando si chiude la sub-pagina
    const saveBtnWindow = document.getElementById('settings-save-btn-window');
    const saveBtnTarget = document.getElementById('settings-save-btn-target');
    if (saveBtnWindow) {
        saveBtnWindow.disabled = false;
        saveBtnWindow.textContent = 'Salva';
    }
    if (saveBtnTarget) {
        saveBtnTarget.disabled = false;
        saveBtnTarget.textContent = 'Salva';
    }
    
    // Torna alla pagina da cui si è arrivati
    if (previousPageBeforeSubpage === 'homepage') {
        if (typeof showHomepage === 'function') {
            showHomepage();
        }
    } else {
        // Default: torna alle impostazioni
        if (typeof showSettings === 'function') {
            showSettings();
        }
    }
    
    // Reset della variabile
    previousPageBeforeSubpage = null;
}

// Esponi funzioni globalmente
window.updateSettingsUI = updateSettingsUI;
window.selectWindow = selectWindow;
window.toggleWeight = toggleWeight;
window.toggleDummyData = toggleDummyData;
window.saveSettings = saveSettings;
window.showSettingsSubpage = showSettingsSubpage;
window.closeSettingsSubpage = closeSettingsSubpage;
window.adjustTargetHours = adjustTargetHours;
window.adjustTargetMinutes = adjustTargetMinutes;
window.decimalToHoursMinutes = decimalToHoursMinutes;
window.hoursMinutesToDecimal = hoursMinutesToDecimal;
/**
 * Apri pagina target settings dalla homepage
 */
function openTargetSettings() {
    // Salva che stiamo venendo dalla homepage PRIMA di cambiare pagina
    // Usa il nuovo sistema di navigazione per verificare la pagina corrente
    const currentPage = window.getCurrentPage ? window.getCurrentPage() : 'settings-page';
    if (currentPage === 'homepage') {
        previousPageBeforeSubpage = 'homepage';
    } else {
        previousPageBeforeSubpage = 'settings';
    }
    
    // Mostra pagina impostazioni (necessaria per mostrare la sub-pagina)
    if (typeof showSettings === 'function') {
        showSettings();
    }
    // Apri sub-pagina target
    setTimeout(() => {
        if (typeof showSettingsSubpage === 'function') {
            showSettingsSubpage('target');
        }
    }, 100);
}

window.initTargetPicker = initTargetPicker;
window.selectTargetHour = selectTargetHour;
window.selectTargetMinute = selectTargetMinute;
window.updateTargetPickerSelected = updateTargetPickerSelected;
window.openTargetSettings = openTargetSettings;

/**
 * Mostra modal di conferma per eliminare tutti i dati
 */
function confirmDeleteAllData() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Annulla eliminazione e chiudi modal
 */
function cancelDeleteAllData() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Elimina tutti i dati di sonno dopo conferma
 */
async function deleteAllData() {
    const modal = document.getElementById('delete-confirm-modal');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (!modal || !confirmBtn) {
        console.error('Delete modal elements not found');
        return;
    }
    
    // Disabilita bottone durante eliminazione
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Eliminazione in corso...';
    
    try {
        const response = await fetch(`${window.location.origin}/api/sleep/data`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                const text = await response.text();
                errorMessage = text.substring(0, 200) || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // Chiudi modal
        modal.classList.remove('active');
        
        // Mostra messaggio di successo
        if (window.showSuccess) {
            window.showSuccess(`✅ ${result.message || `Eliminati ${result.records_deleted || 0} record`}`);
        }
        
        // Ricarica dati per riflettere l'eliminazione
        if (typeof window.loadSleepStatus === 'function') {
            await window.loadSleepStatus();
        }
        
    } catch (error) {
        console.error('Error deleting all data:', error);
        if (window.showError) {
            window.showError('❌ Errore durante l\'eliminazione: ' + error.message);
        }
    } finally {
        // Riabilita bottone
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Sì, Elimina Tutto';
    }
}

// Esponi funzioni globalmente
window.confirmDeleteAllData = confirmDeleteAllData;
window.cancelDeleteAllData = cancelDeleteAllData;
window.deleteAllData = deleteAllData;

