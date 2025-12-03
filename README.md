# Sleep Debt Tracker

Webapp personale per monitorare il sleep debt usando dati del Garmin.

## 🚀 Setup

### Prerequisiti

- Python 3.8+
- pip

### Installazione

1. Clona o scarica il progetto

2. Crea un ambiente virtuale (consigliato):
```bash
python -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate
```

3. Installa le dipendenze:
```bash
pip install -r requirements.txt
```

4. Crea il file `.env` con le tue configurazioni:
```bash
# Database
DB_PATH=data/sleep_debt.db

# Garmin Connect credentials (obbligatorie per sync reale)
GARMIN_EMAIL=your-email@example.com
GARMIN_PASSWORD=your-password

# Target sonno in ore (opzionale, default: 8.0)
TARGET_SLEEP_HOURS=8.0

# Finestra di tempo per statistiche in giorni (opzionale, default: 7)
STATS_WINDOW_DAYS=7

# API configuration (opzionale)
API_HOST=0.0.0.0
API_PORT=8000
```

## 🏃 Avvio

Avvia il server FastAPI:

```bash
python -m backend.main
```

Oppure con uvicorn direttamente:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Apri il browser su: `http://localhost:8000`

## 📁 Struttura del Progetto

```
sleep-debt-app/
├── backend/          # FastAPI application
│   ├── main.py      # API endpoints
│   ├── config.py    # Configurazione
│   └── models.py    # Modelli Pydantic
├── etl/             # ETL e calcoli
│   ├── garmin_sync.py    # Sync dati Garmin
│   └── sleep_debt.py     # Calcolo sleep debt
├── db/              # Database
│   └── database.py  # DuckDB operations
└── frontend/        # Frontend statico
    ├── index.html   # UI principale
    └── app.js       # JavaScript client
```

## 🔌 API Endpoints

- `GET /` - Frontend HTML
- `GET /api/sleep/status` - Ottieni stato sleep e statistiche
- `POST /api/sleep/sync` - Sincronizza dati da Garmin

## 📝 Stato Attuale

✅ **Completato:**
- Database DuckDB completamente funzionante con persistenza reale
- Integrazione Garmin Connect con autenticazione e fetch dati reali
- Calcolo sleep debt giornaliero e cumulativo
- Target sonno configurabile da `.env`
- Dashboard con formattazione ore in formato "Xh Ym"
- Gestione dati mancanti per giornata odierna

🔄 **In sviluppo:**
- Metriche aggiuntive (media settimanale, trend)
- Grafici interattivi (Chart.js)

## 🔮 Prossimi Passi

- Aggiungere grafici interattivi per visualizzare trend
- Implementare metriche aggiuntive (media settimanale, trend)
- Migliorare UI/UX
- Testing completo
- Deploy su Raspberry Pi

## 🖥️ Raspberry Pi

Per eseguire su Raspberry Pi:
1. Installa Python 3 e pip
2. Segui i passi di setup sopra
3. Avvia il server (può essere eseguito come servizio systemd)
4. Accedi da browser locale o da altri dispositivi sulla stessa rete

