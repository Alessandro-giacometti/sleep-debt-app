// Sleep Debt Tracker - Frontend JavaScript

const API_BASE_URL = window.location.origin;

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    loadSleepStatus();
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
    document.getElementById('current-debt').textContent = formatHoursMinutes(data.current_debt);
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
    if (data.has_today_data === false) {
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
            <td>${formatDate(item.date)}</td>
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
            showSuccess(`Sync completato: ${result.records_synced} record sincronizzati`);
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

