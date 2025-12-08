# Sleep Debt Tracker - Roadmap

## Fase 1: Deploy Stabile su Raspberry Pi 4 ✅

- [x] Setup branch strategy (main/dev)
- [x] Configurazione ambiente produzione
- [x] Script deploy automatico
- [x] Servizio systemd
- [x] Documentazione deploy

## Fase 2: Parametri Configurabili dall'Utente via UI ✅

- [x] Database settings table
- [x] API settings endpoints (GET/PUT)
- [x] Frontend settings panel
- [x] Target sleep hours configurabile (ore/minuti)
- [x] Stats window days configurabile (7/14/30)
- [x] Toggle dummy data
- [x] Ricalcolo automatico debito quando cambia target
- [x] Migrazione settings da .env a DB

## Fase 3: Miglioramenti UI/UX (Mobile-First) 🔄

- [x] Layout responsive base
- [x] Formattazione ore "Xh Ym"
- [ ] Design moderno (palette colori, typography, spacing)
- [ ] Transizioni smooth per interazioni
- [ ] Toast notifications migliorati
- [ ] Colore condizionale per debito (rosso/verde)
- [ ] Icone visive per trend (↑↓)
- [ ] Formattazione prominente per valore debito

## Fase 4: Dashboard e Analitiche

- [ ] Integrare Chart.js
- [ ] Grafico sonno vs target (bar chart)
- [ ] Grafico trend debito cumulativo (line chart)
- [ ] Metriche aggiuntive (media 7/14 giorni, streak)
- [ ] Visualizzazione metriche in dashboard

## Fase 5: Miglioramento Algoritmo Sleep Debt

- [ ] Ricerca approcci scientifici
- [ ] Algoritmo ponderato (decay factor)
- [ ] Algoritmo saturato (limite massimo)
- [ ] Supporto per modelli multipli
- [ ] Test unitari algoritmo

## Fase 6: Hardening e Pulizia

- [ ] Type hints completi
- [ ] Docstring Google-style
- [ ] Logging strutturato
- [ ] Error handling robusto
- [ ] Separazione config dev/prod completa
