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

4. Copia il file di configurazione:
```bash
cp .env.example .env
```

5. Modifica `.env` con le tue configurazioni (opzionale per ora, tutto è stub)

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
│   ├── garmin_sync.py    # Sync dati Garmin (stub)
│   └── sleep_debt.py     # Calcolo sleep debt (stub)
├── db/              # Database
│   └── database.py  # DuckDB operations (stub)
└── frontend/        # Frontend statico
    ├── index.html   # UI principale
    └── app.js       # JavaScript client
```

## 🔌 API Endpoints

- `GET /` - Frontend HTML
- `GET /api/sleep/status` - Ottieni stato sleep e statistiche
- `POST /api/sleep/sync` - Sincronizza dati da Garmin

## 📝 Note

Questo è un **prototipo minimale** con implementazioni stub:
- Tutte le funzioni ETL ritornano dati finti
- Il database DuckDB viene inizializzato ma le operazioni sono stub
- L'integrazione Garmin è solo importata, non utilizzata realmente

## 🔮 Prossimi Passi

- Implementare fetch reale da Garmin Connect
- Implementare calcolo reale del sleep debt
- Implementare scrittura/lettura reale su DuckDB
- Aggiungere grafici interattivi
- Migliorare UI/UX

## 🖥️ Raspberry Pi

Per eseguire su Raspberry Pi:
1. Installa Python 3 e pip
2. Segui i passi di setup sopra
3. Avvia il server (può essere eseguito come servizio systemd)
4. Accedi da browser locale o da altri dispositivi sulla stessa rete

