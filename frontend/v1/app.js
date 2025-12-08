// Sleep Debt Tracker - Frontend JavaScript

const API_BASE_URL = window.location.origin;

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    loadSleepStatus();
    loadSettings();
});

/**
 * Load and display sleep status
 */
async function loadSleepStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/status`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Error loading sleep status:', error);
        showError('Errore nel caricamento dei dati: ' + error.message);
    }
}

/**
 * Update UI with sleep status data
 */
function updateUI(data) {
    // Update stats
    // Show 0 instead of negative debt in the main card (debt cannot be negative)
    const displayDebt = data.current_debt < 0 ? 0 : data.current_debt;
    document.getElementById('current-debt').textContent = formatHoursMinutes(displayDebt);
    document.getElementById('total-sleep').textContent = formatHoursMinutes(data.total_sleep_hours);
    document.getElementById('target-sleep').textContent = formatHoursMinutes(data.target_sleep_hours);
    document.getElementById('days-tracked').textContent = data.days_tracked;

    // Update titles with window days (if available)
    const windowDays = data.stats_window_days || 7;
    document.getElementById('debt-title').textContent = `Sleep Debt (${windowDays} giorni)`;
    document.getElementById('sleep-title').textContent = `Sonno Totale (${windowDays} giorni)`;
    document.getElementById('target-title').textContent = `Target Sonno (${windowDays} giorni)`;

    // Show/hide missing data warning
    const missingDataWarning = document.getElementById('missing-data-warning');
    const missingDataMessage = document.getElementById('missing-data-message');
    if (data.has_today_data === false) {
        // Format today's date in Italian
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        missingDataMessage.textContent = `Non ci sono ancora dati di sonno per oggi ${todayFormatted}. Il calcolo del debito esclude la giornata odierna fino a quando non saranno disponibili i dati.`;
        missingDataWarning.style.display = 'block';
    } else {
        missingDataWarning.style.display = 'none';
    }

    // Update last sync
    if (data.last_sync) {
        const syncDate = new Date(data.last_sync);
        document.getElementById('last-sync').textContent = 
            `Ultimo sync: ${formatDateTime(syncDate)}`;
    }

    // Update debt indicator color
    const debtElement = document.getElementById('current-debt');
    debtElement.className = 'value';
    if (data.current_debt > 0) {
        debtElement.classList.add('debt-positive');
    } else if (data.current_debt < 0) {
        debtElement.classList.add('debt-negative');
    }

    // Update recent data table
    updateDataTable(data.recent_data);
}

/**
 * Update data table with recent sleep data
 */
function updateDataTable(data) {
    const tbody = document.getElementById('data-table-body');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                    Nessun dato disponibile
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>
                ${formatDate(item.date)}
                ${item.is_example ? '<span style="margin-left: 8px; padding: 2px 6px; background: #fff3cd; color: #856404; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">ESEMPIO</span>' : ''}
            </td>
            <td>${formatHoursMinutes(item.sleep_hours)}</td>
            <td>${formatHoursMinutes(item.target_hours)}</td>
            <td>
                <span class="${item.debt > 0 ? 'debt-positive' : 'debt-negative'}" 
                      style="padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">
                    ${item.debt > 0 ? '+' : ''}${formatHoursMinutes(item.debt)}
                </span>
            </td>
        </tr>
    `).join('');
}

/**
 * Sync sleep data from Garmin
 */
async function syncData() {
    const syncBtn = document.getElementById('sync-btn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');

    // Disable button and show loading
    syncBtn.disabled = true;
    loading.classList.add('active');
    error.classList.remove('active');

    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Reload status after successful sync
            await loadSleepStatus();
            // Check if dummy data was used and show appropriate message
            if (result.used_dummy_data) {
                showError(`⚠️ Attenzione: Sync fallito. Utilizzati dati dummy: ${result.records_synced} record. ${result.message || ''}`);
            } else {
                showSuccess(`Sync completato: ${result.records_synced} record sincronizzati`);
            }
        } else {
            throw new Error(result.message || 'Sync fallito');
        }
    } catch (error) {
        console.error('Error syncing data:', error);
        showError('Errore durante la sincronizzazione: ' + error.message);
    } finally {
        syncBtn.disabled = false;
        loading.classList.remove('active');
    }
}

/**
 * Show error message
 */
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.classList.add('active');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        error.classList.remove('active');
    }, 5000);
}

/**
 * Show success message (temporary)
 */
function showSuccess(message) {
    // For now, just log it. Can be enhanced with a success notification
    console.log('Success:', message);
    // Could add a success notification element similar to error
}

/**
 * Format number with one decimal place
 */
function formatNumber(num) {
    return parseFloat(num).toFixed(1);
}

/**
 * Format hours (decimal) as hours and minutes (e.g., 4.82 -> "4h 49m")
 */
function formatHoursMinutes(hours) {
    const h = parseFloat(hours);
    const hoursInt = Math.floor(Math.abs(h));
    const minutes = Math.round((Math.abs(h) - hoursInt) * 60);
    
    // Handle negative values (for debt)
    const sign = h < 0 ? '-' : '';
    
    // If hours is 0 and minutes is 0, show 0h
    if (hoursInt === 0 && minutes === 0) {
        return '0h';
    }
    
    // Format: "Xh Ym" or just "Xh" if minutes is 0
    if (minutes === 0) {
        return `${sign}${hoursInt}h`;
    } else {
        return `${sign}${hoursInt}h ${minutes}m`;
    }
}

/**
 * Format date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Format date and time
 */
function formatDateTime(date) {
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Toggle settings panel visibility
 */
function toggleSettingsPanel() {
    const content = document.getElementById('settings-content');
    const toggle = document.getElementById('settings-toggle');
    
    content.classList.toggle('active');
    toggle.classList.toggle('expanded');
}

/**
 * Adjust hours by delta (positive or negative)
 */
function adjustHours(delta) {
    const hoursValue = document.getElementById('target-hours-value');
    let hours = parseInt(hoursValue.textContent) || 0;
    
    hours += delta;
    
    // Clamp between 0 and 24
    if (hours < 0) hours = 0;
    if (hours > 24) hours = 24;
    
    // If 24 hours, set minutes to 0
    if (hours === 24) {
        const minutesValue = document.getElementById('target-minutes-value');
        minutesValue.textContent = '00';
    }
    
    hoursValue.textContent = hours;
    updateTimeDisplay();
    updateButtonStates();
}

/**
 * Adjust minutes by delta (in steps of 15)
 */
function adjustMinutes(delta) {
    const minutesValue = document.getElementById('target-minutes-value');
    const hoursValue = document.getElementById('target-hours-value');
    let minutes = parseInt(minutesValue.textContent) || 0;
    const hours = parseInt(hoursValue.textContent) || 0;
    
    minutes += delta;
    
    // Handle overflow/underflow
    if (minutes < 0) {
        if (hours > 0) {
            // Decrease hours and wrap minutes
            const newHours = hours - 1;
            hoursValue.textContent = newHours;
            minutes = 60 + minutes; // minutes is negative, so this wraps correctly
        } else {
            minutes = 0;
        }
    } else if (minutes >= 60) {
        if (hours < 24) {
            // Increase hours and wrap minutes
            const newHours = hours + 1;
            hoursValue.textContent = newHours;
            minutes = minutes - 60;
        } else {
            // Can't go above 24h, so cap at 0 minutes
            minutes = 0;
        }
    }
    
    // If 24 hours, force minutes to 0
    if (parseInt(hoursValue.textContent) === 24) {
        minutes = 0;
    }
    
    minutesValue.textContent = minutes.toString().padStart(2, '0');
    updateTimeDisplay();
    updateButtonStates();
}

/**
 * Update button disabled states based on current values
 */
function updateButtonStates() {
    const hours = parseInt(document.getElementById('target-hours-value').textContent) || 0;
    const minutes = parseInt(document.getElementById('target-minutes-value').textContent) || 0;
    
    // Hours buttons
    document.getElementById('hours-decrease').disabled = (hours <= 0);
    document.getElementById('hours-increase').disabled = (hours >= 24);
    
    // Minutes buttons
    const minutesDecrease = document.getElementById('minutes-decrease');
    const minutesIncrease = document.getElementById('minutes-increase');
    
    if (hours === 24) {
        // At 24 hours, can't increase minutes and should disable decrease if at 0
        minutesIncrease.disabled = true;
        minutesDecrease.disabled = (minutes <= 0);
    } else if (hours === 0 && minutes === 0) {
        // At 0h:00m, can't decrease minutes
        minutesDecrease.disabled = true;
        minutesIncrease.disabled = false;
    } else {
        // Normal state
        minutesDecrease.disabled = false;
        minutesIncrease.disabled = false;
    }
}

/**
 * Convert decimal hours to hours and minutes
 */
function decimalToHoursMinutes(decimalHours) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return { hours, minutes };
}

/**
 * Convert hours and minutes to decimal hours
 */
function hoursMinutesToDecimal(hours, minutes) {
    return hours + (minutes / 60);
}

/**
 * Update time display when values change
 */
function updateTimeDisplay() {
    const hours = parseInt(document.getElementById('target-hours-value').textContent) || 0;
    const minutes = parseInt(document.getElementById('target-minutes-value').textContent) || 0;
    const display = document.getElementById('target-time-display');
    display.textContent = `${hours}h:${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Load settings from API and populate form
 */
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Convert decimal hours to hours and minutes
        const { hours, minutes } = decimalToHoursMinutes(data.target_sleep_hours);
        
        // Populate form fields
        document.getElementById('target-hours-value').textContent = hours;
        document.getElementById('target-minutes-value').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('stats-window-days').value = data.stats_window_days;
        document.getElementById('use-dummy-data').checked = data.use_dummy_data || false;
        
        // Update time display and button states
        updateTimeDisplay();
        updateButtonStates();
        
        // Show updated date if available
        const updatedEl = document.getElementById('settings-updated');
        if (data.updated_at) {
            const updatedDate = new Date(data.updated_at);
            updatedEl.textContent = `Ultimo aggiornamento: ${formatDateTime(updatedDate)}`;
        } else {
            updatedEl.textContent = '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Don't show error to user on initial load, just use defaults
    }
}

/**
 * Save settings to API
 */
async function saveSettings(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('save-settings-btn');
    const messageEl = document.getElementById('settings-message');
    
    // Get form values
    const hours = parseInt(document.getElementById('target-hours-value').textContent) || 0;
    const minutes = parseInt(document.getElementById('target-minutes-value').textContent) || 0;
    const targetHours = hoursMinutesToDecimal(hours, minutes);
    const statsWindow = parseInt(document.getElementById('stats-window-days').value);
    
    // Validate
    if (targetHours <= 0 || targetHours > 24) {
        showSettingsMessage('Le ore sonno target devono essere tra 0h:00m e 24h:00m', 'error');
        return;
    }
    
    if (targetHours === 24 && minutes > 0) {
        showSettingsMessage('Il massimo è 24h:00m', 'error');
        return;
    }
    
    if (![7, 14, 30].includes(statsWindow)) {
        showSettingsMessage('La finestra statistiche deve essere 7, 14 o 30 giorni', 'error');
        return;
    }
    
    // Disable button and show loading
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvataggio...';
    messageEl.classList.remove('active');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_sleep_hours: targetHours,
                stats_window_days: statsWindow,
                use_dummy_data: document.getElementById('use-dummy-data').checked
            })
        });
        
        if (!response.ok) {
            // Try to parse JSON error, but handle HTML errors too
            let errorMessage = `HTTP error! status: ${response.status}`;
            // Clone the response so we can read it multiple times if needed
            const clonedResponse = response.clone();
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                // If response is not JSON (e.g., HTML error page), get text from cloned response
                try {
                    const text = await clonedResponse.text();
                    // Extract meaningful error from HTML if possible
                    if (text.includes('Internal Server Error') || text.includes('detail')) {
                        errorMessage = 'Errore interno del server. Riprova più tardi.';
                    } else {
                        errorMessage = text.substring(0, 200) || errorMessage; // Limit length
                    }
                } catch (textError) {
                    // If both fail, use default message
                    errorMessage = `Errore del server (status ${response.status})`;
                }
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // Show success message
        showSettingsMessage('Impostazioni salvate con successo!', 'success');
        
        // Update updated date
        const updatedEl = document.getElementById('settings-updated');
        if (result.updated_at) {
            const updatedDate = new Date(result.updated_at);
            updatedEl.textContent = `Ultimo aggiornamento: ${formatDateTime(updatedDate)}`;
        }
        
        // Reload sleep status to reflect new settings
        await loadSleepStatus();
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            messageEl.classList.remove('active');
        }, 3000);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showSettingsMessage('Errore nel salvataggio: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salva';
    }
}

/**
 * Cancel settings changes and reload from API
 */
function cancelSettings() {
    loadSettings();
    const messageEl = document.getElementById('settings-message');
    messageEl.classList.remove('active');
}

/**
 * Show message in settings panel
 */
function showSettingsMessage(message, type) {
    const messageEl = document.getElementById('settings-message');
    messageEl.textContent = message;
    messageEl.className = `settings-message ${type} active`;
}

/**
 * Show confirmation modal for deleting all data
 */
function confirmDeleteAllData() {
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.add('active');
}

/**
 * Cancel deletion and close modal
 */
function cancelDeleteAllData() {
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.remove('active');
}

/**
 * Delete all sleep data after confirmation
 */
async function deleteAllData() {
    const modal = document.getElementById('delete-confirm-modal');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const deleteBtn = document.getElementById('delete-all-data-btn');
    
    // Disable buttons during deletion
    confirmBtn.disabled = true;
    deleteBtn.disabled = true;
    confirmBtn.textContent = 'Eliminazione in corso...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/sleep/data`, {
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
        
        // Close modal
        modal.classList.remove('active');
        
        // Show success message
        showSettingsMessage(`✅ ${result.message || `Eliminati ${result.records_deleted || 0} record`}`, 'success');
        
        // Reload sleep status to reflect empty data
        await loadSleepStatus();
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
            const messageEl = document.getElementById('settings-message');
            messageEl.classList.remove('active');
        }, 5000);
        
    } catch (error) {
        console.error('Error deleting all data:', error);
        showSettingsMessage('❌ Errore durante l\'eliminazione: ' + error.message, 'error');
    } finally {
        // Re-enable buttons
        confirmBtn.disabled = false;
        deleteBtn.disabled = false;
        confirmBtn.textContent = 'Sì, Elimina Tutto';
    }
}

