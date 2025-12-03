# Sleep Debt Tracker - Roadmap

Questa roadmap descrive i passi per trasformare il prototipo minimale in un'applicazione completa e funzionante.

## 📋 Stato Attuale

- ✅ Prototipo minimale con stub funzionante
- ✅ Backend FastAPI con endpoint base
- ✅ Frontend HTML/JS responsive
- ✅ Database DuckDB inizializzato
- ✅ Repository GitHub configurata
- ✅ Test endpoint completati
- ✅ **Fase 1 completata**: Database DuckDB reale implementato
- ✅ **Fase 2 completata**: Integrazione Garmin Connect funzionante
- ✅ Formattazione ore in formato "Xh Ym"
- ✅ Gestione dati mancanti per giornata odierna
- ✅ Disabilitazione cache browser per sviluppo

---

## 🎯 Fase 1: Implementazione Database DuckDB ✅ COMPLETATA

**Priorità:** 🔴 Alta  
**Stima:** 2-3 giorni  
**Stato:** ✅ Completata

### Obiettivi
- ✅ Implementare operazioni reali su DuckDB invece degli stub
- ✅ Persistenza dati funzionante
- ✅ Query efficienti per statistiche

### Task
- [x] Implementare `write_sleep_data()` per inserire/aggiornare dati reali
- [x] Implementare `read_sleep_data()` per leggere dati storici dal DB
- [x] Implementare `get_sleep_statistics()` con query reali
- [x] Gestire errori DB e transazioni
- [x] Escludere giornata odierna dal calcolo se dati mancanti

### Deliverable
- ✅ Database completamente funzionante con dati persistenti
- ✅ Statistiche calcolate da dati reali

---

## 🔌 Fase 2: Integrazione Garmin Connect ✅ COMPLETATA

**Priorità:** 🔴 Alta  
**Stima:** 3-5 giorni  
**Stato:** ✅ Completata

### Obiettivi
- ✅ Fetch reale dei dati dal Garmin Connect
- ✅ Autenticazione funzionante
- ✅ Parsing dati sonno

### Task
- [x] Configurare autenticazione Garmin Connect API
- [x] Implementare login e gestione sessione (con garth per persistenza token)
- [x] Implementare fetch dati sonno per periodo specifico
- [x] Parsing dati Garmin nel formato interno (gestione multiple strutture dati)
- [x] Gestione errori (rate limit, autenticazione scaduta, ecc.)
- [x] Test con account Garmin reale
- [x] Parsing robusto di timestamp e durata sonno

### Deliverable
- ✅ Sync funzionante con Garmin Connect reale
- ✅ Dati sonno importati correttamente

---

## 📊 Fase 3: Calcolo Sleep Debt 🔄 IN CORSO

**Priorità:** 🟡 Media  
**Stima:** 2-3 giorni  
**Stato:** 🔄 In corso

### Obiettivi
- Logica di calcolo sleep debt accurata
- Target sonno configurabile
- Gestione casi edge

### Task
- [x] Implementare calcolo debito giornaliero (`calculate_daily_debt`)
- [ ] Implementare calcolo debito cumulativo reale (`calculate_sleep_debt` - attualmente stub)
- [ ] Aggiungere configurazione target sonno (default 8h, personalizzabile da .env)
- [x] Gestire giorni mancanti (nessun dato disponibile) - già implementato per oggi
- [ ] Calcolare metriche aggiuntive (media settimanale, trend, ecc.)
- [ ] Test con scenari vari (surplus, deficit, dati mancanti)

### Deliverable
- Calcolo sleep debt accurato e testato
- Configurazione target sonno funzionante

---

## 🎨 Fase 4: Miglioramenti UI

**Priorità:** 🟡 Media  
**Stima:** 3-4 giorni

### Obiettivi
- Grafici interattivi per visualizzare dati
- Dashboard migliorata
- UX ottimizzata

### Task
- [ ] Integrare libreria grafici (Chart.js o Plotly.js)
- [ ] Grafico sleep debt nel tempo (line chart)
- [ ] Grafico ore sonno giornaliere (bar chart)
- [ ] Visualizzazione trend settimanale/mensile
- [ ] Migliorare dashboard con metriche chiave
- [ ] Aggiungere loading states e animazioni
- [ ] Migliorare responsive design per mobile
- [ ] Aggiungere dark mode (opzionale)
- [ ] Ottimizzare performance rendering

### Deliverable
- UI moderna con grafici interattivi
- Dashboard completa e responsive

---

## ⚙️ Fase 5: Funzionalità Aggiuntive

**Priorità:** 🟢 Bassa  
**Stima:** 2-4 giorni

### Obiettivi
- Funzionalità avanzate per migliorare l'esperienza utente

### Task
- [ ] Pagina configurazione target sonno personalizzato
- [ ] Export dati in CSV/JSON
- [ ] Sistema notifiche/alert (opzionale)
- [ ] Cron job per sync automatico periodico
- [ ] Logging e monitoring
- [ ] Backup automatico database
- [ ] Gestione profili multipli (se necessario)

### Deliverable
- Funzionalità avanzate implementate
- Sistema più robusto e completo

---

## 🧪 Fase 6: Testing e Documentazione

**Priorità:** 🟡 Media  
**Stima:** 2-3 giorni

### Obiettivi
- Test completi per garantire qualità
- Documentazione completa

### Task
- [ ] Test unitari per funzioni di calcolo sleep debt
- [ ] Test integrazione per ETL Garmin
- [ ] Test API endpoints
- [ ] Test database operations
- [ ] Test end-to-end del flusso completo
- [ ] Documentazione API (Swagger già disponibile su `/docs`)
- [ ] Aggiornare README con istruzioni complete
- [ ] Documentazione setup Raspberry Pi
- [ ] Guida troubleshooting

### Deliverable
- Suite test completa
- Documentazione aggiornata

---

## 🚀 Fase 7: Deployment e Produzione

**Priorità:** 🟡 Media  
**Stima:** 1-2 giorni

### Obiettivi
- Deploy su Raspberry Pi
- Configurazione produzione

### Task
- [ ] Configurare servizio systemd per auto-start
- [ ] Configurare reverse proxy (nginx, opzionale)
- [ ] Setup SSL/HTTPS (opzionale)
- [ ] Configurare backup automatico
- [ ] Monitoring e logging produzione
- [ ] Documentazione deployment

### Deliverable
- App funzionante su Raspberry Pi
- Setup produzione completo

---

## 📝 Note Generali

### Ordine di Implementazione Consigliato
1. **Fase 1** (Database) - Base per tutto
2. **Fase 2** (Garmin) - Dati reali
3. **Fase 3** (Calcolo) - Logica core
4. **Fase 4** (UI) - Miglioramento UX
5. **Fase 5** (Extra) - Funzionalità avanzate
6. **Fase 6** (Testing) - Qualità e stabilità
7. **Fase 7** (Deploy) - Produzione

### Best Practices
- Committare spesso con messaggi chiari
- Creare branch per feature importanti
- Testare ogni fase prima di passare alla successiva
- Documentare decisioni importanti

### Dipendenze tra Fasi
- Fase 2 dipende da Fase 1 (database deve funzionare)
- Fase 3 dipende da Fase 1 e 2 (dati reali necessari)
- Fase 4 può essere sviluppata in parallelo dopo Fase 1
- Fase 6 dovrebbe essere fatto durante tutto lo sviluppo

---

## 📅 Timeline Stimata

- **Fase 1-3 (Core):** ~7-11 giorni
- **Fase 4 (UI):** ~3-4 giorni
- **Fase 5 (Extra):** ~2-4 giorni
- **Fase 6 (Testing):** ~2-3 giorni
- **Fase 7 (Deploy):** ~1-2 giorni

**Totale stimato:** ~15-24 giorni di sviluppo

---

*Ultimo aggiornamento: Dicembre 2024*

