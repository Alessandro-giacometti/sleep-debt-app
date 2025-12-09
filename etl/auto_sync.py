"""Automatic daily sync scheduler for sleep data."""
import asyncio
import logging
from datetime import datetime, time, date, timedelta
from typing import Optional
from db.database import get_sleep_statistics, get_last_sync_time
from etl.garmin_sync import sync_sleep_data
from backend.config import get_user_settings_from_db

logger = logging.getLogger(__name__)

# Stato globale per il sync automatico
_auto_sync_enabled = True
_auto_sync_task: Optional[asyncio.Task] = None
_today_data_found = False
_last_check_date: Optional[date] = None


def _get_next_sync_times() -> list[time]:
    """Calcola i prossimi orari di sync per oggi.
    
    Schedule:
    - Dalle 7:00 alle 9:30: ogni 30 minuti (7:00, 7:30, 8:00, 8:30, 9:00, 9:30) = 6 volte
    - Dalle 10:00 alle 13:00: ogni ora (10:00, 11:00, 12:00, 13:00) = 4 volte
    
    Returns:
        Lista di orari (time objects) ordinati
    """
    sync_times = []
    
    # Dalle 7:00 alle 9:30, ogni 30 minuti (6 volte)
    sync_times.append(time(7, 0))
    sync_times.append(time(7, 30))
    sync_times.append(time(8, 0))
    sync_times.append(time(8, 30))
    sync_times.append(time(9, 0))
    sync_times.append(time(9, 30))
    
    # Dalle 10:00 alle 13:00, ogni ora (4 volte)
    sync_times.append(time(10, 0))
    sync_times.append(time(11, 0))
    sync_times.append(time(12, 0))
    sync_times.append(time(13, 0))
    
    return sync_times


def _should_run_sync_now() -> tuple[bool, Optional[time]]:
    """Verifica se dovremmo eseguire un sync ora.
    
    Returns:
        Tuple (should_run, next_sync_time)
    """
    now = datetime.now()
    current_time = now.time()
    sync_times = _get_next_sync_times()
    
    # Se è prima delle 7:00 o dopo le 13:00, non sync
    if current_time < time(7, 0) or current_time > time(13, 0):
        # Trova il prossimo sync (domani alle 7:00)
        next_sync = datetime.combine(now.date() + timedelta(days=1), time(7, 0))
        return False, next_sync.time()
    
    # Trova il prossimo sync time
    next_sync_time = None
    for sync_time in sync_times:
        if current_time <= sync_time:
            next_sync_time = sync_time
            break
    
    # Se non c'è un sync time oggi, il prossimo è domani alle 7:00
    if next_sync_time is None:
        next_sync_time = time(7, 0)
        return False, next_sync_time
    
    # Se siamo esattamente all'ora di sync (con tolleranza di 5 minuti), esegui
    time_diff = abs((datetime.combine(now.date(), current_time) - 
                    datetime.combine(now.date(), next_sync_time)).total_seconds())
    
    if time_diff <= 300:  # 5 minuti di tolleranza
        return True, next_sync_time
    
    return False, next_sync_time


async def _perform_auto_sync() -> bool:
    """Esegue il sync automatico del dato di oggi.
    
    Returns:
        True se il sync ha recuperato il dato di oggi, False altrimenti
    """
    global _today_data_found, _last_check_date
    
    try:
        # Verifica se use_dummy_data è attivo
        settings = get_user_settings_from_db()
        use_dummy_data = settings.get("use_dummy_data", False) if settings else False
        
        if use_dummy_data:
            logger.info("Auto-sync: saltato perché use_dummy_data è attivo")
            return False
        
        # Verifica se il dato di oggi è già presente
        stats = get_sleep_statistics(include_example=False)
        if stats.get("has_today_data", False):
            logger.info("Auto-sync: dato di oggi già presente, sync non necessario")
            _today_data_found = True
            _last_check_date = date.today()
            return True
        
        # Esegui il sync
        logger.info("Auto-sync: tentativo di sincronizzazione del dato di oggi...")
        sync_result = sync_sleep_data(days=1, use_dummy_data=False)
        
        if sync_result.get("success"):
            records_synced = sync_result.get("records_synced", 0)
            logger.info(f"Auto-sync: successo - {records_synced} record sincronizzati")
            
            # Verifica se ora abbiamo il dato di oggi
            stats = get_sleep_statistics(include_example=False)
            if stats.get("has_today_data", False):
                logger.info("Auto-sync: dato di oggi recuperato con successo")
                _today_data_found = True
                _last_check_date = date.today()
                return True
            else:
                logger.info("Auto-sync: sync completato ma dato di oggi non ancora disponibile")
                return False
        else:
            logger.warning(f"Auto-sync: sync fallito - {sync_result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        logger.error(f"Auto-sync: errore durante la sincronizzazione - {e}", exc_info=True)
        return False


async def _auto_sync_loop():
    """Loop principale per il sync automatico."""
    global _today_data_found, _last_check_date
    
    logger.info("Auto-sync: loop avviato")
    
    while _auto_sync_enabled:
        try:
            # Reset del flag se è un nuovo giorno
            today = date.today()
            if _last_check_date is not None and _last_check_date != today:
                _today_data_found = False
                logger.info(f"Auto-sync: nuovo giorno, reset flag (ieri: {_last_check_date}, oggi: {today})")
            _last_check_date = today
            
            # Se il dato di oggi è già stato trovato, aspetta fino a domani
            if _today_data_found:
                # Calcola il tempo fino a domani alle 7:00
                now = datetime.now()
                tomorrow_7am = datetime.combine(today + timedelta(days=1), time(7, 0))
                wait_seconds = (tomorrow_7am - now).total_seconds()
                
                if wait_seconds > 0:
                    logger.info(f"Auto-sync: dato di oggi già presente, aspetto fino a domani alle 7:00 ({wait_seconds/3600:.1f} ore)")
                    await asyncio.sleep(min(wait_seconds, 3600))  # Max 1 ora per evitare problemi
                    continue
            
            # Verifica se dovremmo eseguire un sync ora
            should_run, next_sync_time = _should_run_sync_now()
            
            if should_run:
                # Esegui il sync
                success = await _perform_auto_sync()
                if success:
                    # Se il sync ha recuperato il dato, aspetta fino a domani
                    continue
            
            # Calcola il tempo fino al prossimo sync
            now = datetime.now()
            if next_sync_time:
                next_sync_datetime = datetime.combine(now.date(), next_sync_time)
                # Se il prossimo sync è già passato oggi, passa a domani
                if next_sync_datetime <= now:
                    next_sync_datetime = datetime.combine(now.date() + timedelta(days=1), time(7, 0))
                
                wait_seconds = (next_sync_datetime - now).total_seconds()
            else:
                # Default: aspetta 1 ora
                wait_seconds = 3600
            
            # Aspetta fino al prossimo sync (max 1 ora per evitare problemi)
            wait_seconds = min(wait_seconds, 3600)
            if wait_seconds > 0:
                logger.debug(f"Auto-sync: aspetto {wait_seconds/60:.1f} minuti fino al prossimo sync")
                await asyncio.sleep(wait_seconds)
            
        except asyncio.CancelledError:
            logger.info("Auto-sync: loop cancellato")
            break
        except Exception as e:
            logger.error(f"Auto-sync: errore nel loop - {e}", exc_info=True)
            # Aspetta 5 minuti prima di riprovare in caso di errore
            await asyncio.sleep(300)


def start_auto_sync():
    """Avvia il sync automatico in background.
    
    Deve essere chiamato da un contesto asyncio (es. da un event loop).
    In pratica, questo viene chiamato dal FastAPI lifespan che ha già un event loop attivo.
    """
    global _auto_sync_task, _auto_sync_enabled
    
    if _auto_sync_task is not None and not _auto_sync_task.done():
        logger.warning("Auto-sync: già avviato")
        return
    
    _auto_sync_enabled = True
    try:
        loop = asyncio.get_running_loop()
        _auto_sync_task = loop.create_task(_auto_sync_loop())
        logger.info("Auto-sync: avviato")
    except RuntimeError:
        # Se non c'è un event loop in esecuzione, questo non dovrebbe mai succedere
        # quando chiamato da FastAPI lifespan, ma gestiamo il caso per sicurezza
        logger.error("Auto-sync: nessun event loop in esecuzione. Impossibile avviare il sync automatico.")
        logger.error("Auto-sync: questo errore non dovrebbe verificarsi quando chiamato da FastAPI lifespan.")
        # Non possiamo creare un task senza un event loop attivo
        # In questo caso, il sync automatico non verrà avviato
        _auto_sync_enabled = False


def stop_auto_sync():
    """Ferma il sync automatico."""
    global _auto_sync_task, _auto_sync_enabled
    
    _auto_sync_enabled = False
    if _auto_sync_task is not None and not _auto_sync_task.done():
        _auto_sync_task.cancel()
        logger.info("Auto-sync: fermato")


def is_auto_sync_active() -> bool:
    """Verifica se il sync automatico è attivo."""
    return _auto_sync_enabled and _auto_sync_task is not None and not _auto_sync_task.done()


def get_auto_sync_status() -> dict:
    """Restituisce lo stato del sync automatico."""
    global _today_data_found, _last_check_date
    
    now = datetime.now()
    should_run, next_sync_time = _should_run_sync_now()
    
    return {
        "enabled": _auto_sync_enabled,
        "active": is_auto_sync_active(),
        "today_data_found": _today_data_found,
        "last_check_date": _last_check_date.isoformat() if _last_check_date else None,
        "next_sync_time": next_sync_time.isoformat() if next_sync_time else None,
        "should_run_now": should_run
    }

