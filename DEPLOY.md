# Sleep Debt Tracker - Guida al Deploy su Raspberry Pi

Questa guida descrive come deployare l'applicazione Sleep Debt Tracker su un Raspberry Pi 4.

## Strategia Git e Workflow

**Branch Strategy:**
- `main` = branch di produzione, usata ESCLUSIVAMENTE dal Raspberry Pi
- `dev` = branch di sviluppo locale su cui lavori con Cursor

**Workflow Deploy:**
- Sviluppo su laptop → push su GitHub (branch `dev`)
- Test e validazione su `dev`
- Merge `dev` → `main` quando release stabile
- Raspberry Pi: `git pull origin main` → restart servizio systemd

---

## Prerequisiti

- Raspberry Pi 4 con Raspberry Pi OS (o Debian-based)
- Accesso SSH al Raspberry Pi
- Python 3.9+ installato
- Git installato
- Account GitHub con repository configurato

---

## Setup Iniziale su Raspberry Pi

### 1. Connessione SSH

Dal tuo laptop Windows, connettiti al Raspberry Pi:

```bash
ssh pi@raspberrypi.local
# oppure
ssh pi@<IP_ADDRESS>
```

### 2. Installazione Dipendenze di Sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv git
```

### 3. Clonare Repository

```bash
# Sostituisci 'alessandro' con il tuo nome utente se diverso
sudo mkdir -p /opt/sleep-debt-app
sudo chown alessandro:alessandro /opt/sleep-debt-app
cd /opt/sleep-debt-app
git clone -b main https://github.com/yourusername/sleep-debt-app.git .
```

**Nota:** 
- Sostituisci `yourusername` con il tuo username GitHub e assicurati che il repository sia pubblico o che tu abbia configurato le chiavi SSH.
- Sostituisci `alessandro` con il tuo nome utente se diverso.

### 4. Setup Automatico con Script

Esegui lo script di deploy:

```bash
cd /opt/sleep-debt-app
sudo bash scripts/deploy_raspberry.sh
```

Lo script rileva automaticamente il tuo nome utente. Se necessario, puoi passarlo esplicitamente come variabile d'ambiente:

```bash
# Se il tuo utente è diverso da quello rilevato automaticamente
sudo DEPLOY_USER=alessandro bash scripts/deploy_raspberry.sh
```

Lo script:
- Crea il virtual environment
- Installa le dipendenze Python
- Crea le directory necessarie (data)
- Configura il servizio systemd
- Abilita il servizio per l'avvio automatico

### 5. Configurazione Manuale

Se preferisci configurare manualmente:

#### 5.1 Creare Virtual Environment

```bash
cd /opt/sleep-debt-app
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### 5.2 Configurare .env

```bash
cp .env.example .env
nano .env
```

Configura le seguenti variabili:

```env
ENVIRONMENT=prod
DB_PATH=/opt/sleep-debt-app/data/sleep_debt.db
GARMIN_EMAIL=your_email@example.com
GARMIN_PASSWORD=your_password
API_HOST=0.0.0.0
API_PORT=8000
TARGET_SLEEP_HOURS=8.0
STATS_WINDOW_DAYS=7
```

**IMPORTANTE:** 
- Imposta `ENVIRONMENT=prod` per produzione
- Configura le credenziali Garmin
- Usa path assoluti per produzione

#### 5.3 Creare Directory

```bash
mkdir -p /opt/sleep-debt-app/data
chmod 755 /opt/sleep-debt-app/data
```

---

## Configurazione Servizio Systemd

### Installazione Manuale

1. Copia e modifica il file di servizio:

```bash
cd /opt/sleep-debt-app
sudo cp scripts/sleep-debt-app.service /etc/systemd/system/
sudo nano /etc/systemd/system/sleep-debt-app.service
```

2. Sostituisci i placeholder nel file:
   - `APP_DIR` → `/opt/sleep-debt-app`
   - `USER` → `pi` (o il tuo utente)

3. Ricarica systemd e abilita il servizio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sleep-debt-app
sudo systemctl start sleep-debt-app
```

### Verifica Servizio

```bash
# Controlla lo stato
sudo systemctl status sleep-debt-app

# Visualizza i log
sudo journalctl -u sleep-debt-app -f

# Riavvia il servizio
sudo systemctl restart sleep-debt-app

# Ferma il servizio
sudo systemctl stop sleep-debt-app
```

### Helper Script per Avvio Servizio

Per avviare il servizio con conferma automatica dello stato, usa lo script helper:

```bash
cd /opt/sleep-debt-app
./scripts/start-service.sh
```

Lo script avvia il servizio, attende 2 secondi, verifica che sia attivo e mostra lo stato. Se il servizio non parte, mostra automaticamente gli ultimi log.

### Limiti di Restart Automatico

Il servizio è configurato con limiti di restart per prevenire loop infiniti in caso di errori:

- **Restart policy:** `on-failure` (riavvia solo in caso di errore, non quando si ferma manualmente)
- **Limite tentativi:** Massimo 3 tentativi di restart in una finestra di 5 minuti
- **Dopo il limite:** Il servizio si ferma e richiede intervento manuale

Se il servizio raggiunge il limite di restart, controlla i log per identificare il problema:

```bash
sudo journalctl -u sleep-debt-app -n 100
```

Poi riavvia manualmente dopo aver risolto il problema:

```bash
sudo systemctl reset-failed sleep-debt-app
sudo systemctl start sleep-debt-app
```

---

## Workflow di Deploy

### Sviluppo Locale (Laptop)

1. Lavora sul branch `dev`:
```bash
git checkout dev
# ... fai le modifiche ...
git add .
git commit -m "Descrizione modifiche"
git push origin dev
```

2. Quando la release è stabile, merge su `main`:
```bash
git checkout main
git merge dev
git push origin main
```

### Deploy su Raspberry Pi

1. Connettiti via SSH al Raspberry Pi
2. Vai nella directory dell'app:
```bash
cd /opt/sleep-debt-app
```

3. Pull delle modifiche:
```bash
git pull origin main
```

4. Riavvia il servizio:
```bash
sudo systemctl restart sleep-debt-app
```

Oppure usa lo script helper per avviare con verifica automatica:
```bash
cd /opt/sleep-debt-app
./scripts/start-service.sh
```

5. Verifica che tutto funzioni:
```bash
sudo systemctl status sleep-debt-app
curl http://localhost:8000/api/sleep/status
```

### Script di Deploy Rapido

Puoi creare uno script sul Raspberry Pi per automatizzare:

```bash
#!/bin/bash
# ~/deploy.sh
cd /opt/sleep-debt-app
git pull origin main
sudo systemctl restart sleep-debt-app
echo "Deploy completato!"
```

Rendi eseguibile:
```bash
chmod +x ~/deploy.sh
```

Poi esegui semplicemente:
```bash
~/deploy.sh
```

---

## Accesso all'Applicazione

Dopo il deploy, l'applicazione sarà disponibile su:

- **Locale (dal Raspberry Pi):** `http://localhost:8000`
- **Rete locale:** `http://<IP_RASPBERRY_PI>:8000`

Per trovare l'IP del Raspberry Pi:
```bash
hostname -I
```

---

## Troubleshooting

### Il servizio non parte

1. Controlla i log:
```bash
sudo journalctl -u sleep-debt-app -n 50
```

2. Se il servizio ha raggiunto il limite di restart (3 tentativi in 5 minuti), resetta il contatore:
```bash
sudo systemctl reset-failed sleep-debt-app
sudo systemctl start sleep-debt-app
```

3. Usa lo script helper per avviare con verifica automatica:
```bash
cd /opt/sleep-debt-app
./scripts/start-service.sh
```

2. Verifica che il virtual environment sia corretto:
```bash
ls -la /opt/sleep-debt-app/venv/bin/python
```

3. Testa manualmente:
```bash
cd /opt/sleep-debt-app
source venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Errori di permessi

Assicurati che l'utente del servizio abbia i permessi:
```bash
sudo chown -R pi:pi /opt/sleep-debt-app
```

### Database non trovato

Verifica che la directory data esista:
```bash
ls -la /opt/sleep-debt-app/data/
```

### Problemi con Garmin Connect

1. Verifica le credenziali in `.env`
2. Controlla i log per errori di autenticazione
3. Testa la connessione manualmente:
```bash
cd /opt/sleep-debt-app
source venv/bin/activate
python -c "from etl.garmin_sync import sync_sleep_data; sync_sleep_data(days=1)"
```

### Il servizio non si avvia al boot

Verifica che il servizio sia abilitato:
```bash
sudo systemctl is-enabled sleep-debt-app
```

Se non è abilitato:
```bash
sudo systemctl enable sleep-debt-app
```

### Porta già in uso

Se la porta 8000 è occupata, modifica `.env`:
```env
API_PORT=8001
```

E riavvia il servizio:
```bash
sudo systemctl restart sleep-debt-app
```

---

## Backup e Manutenzione

### Backup Database

```bash
# Backup manuale
cp /opt/sleep-debt-app/data/sleep_debt.db /opt/sleep-debt-app/data/sleep_debt.db.backup

# Backup con timestamp
cp /opt/sleep-debt-app/data/sleep_debt.db /opt/sleep-debt-app/data/sleep_debt.db.$(date +%Y%m%d_%H%M%S)
```


### Aggiornamento Dipendenze

```bash
cd /opt/sleep-debt-app
source venv/bin/activate
pip install --upgrade -r requirements.txt
sudo systemctl restart sleep-debt-app
```

---

## Sicurezza

### Firewall

Se hai un firewall attivo, apri la porta:
```bash
sudo ufw allow 8000/tcp
```

### Accesso Limitato

Per limitare l'accesso solo alla rete locale, modifica `backend/config_prod.py`:
```python
PROD_CORS_ORIGINS = ["http://192.168.1.0/24"]  # Esempio
```

### HTTPS (Opzionale)

Per HTTPS, considera l'uso di un reverse proxy come nginx con Let's Encrypt.

---

## Supporto

Per problemi o domande:
1. Controlla i log: `sudo journalctl -u sleep-debt-app -f`
2. Verifica la configurazione in `.env`
3. Testa manualmente l'applicazione
4. Consulta la documentazione del progetto

