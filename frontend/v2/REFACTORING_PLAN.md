# Piano di Ristrutturazione Frontend v2

## Obiettivo
Separare il codice in moduli per migliorare manutenibilità e scalabilità.

## Struttura Proposta

```
frontend/v2/
├── index.html              # HTML pulito, solo struttura
├── styles/
│   ├── variables.css      # Design system (variabili CSS)
│   ├── base.css           # Reset, typography, layout base
│   ├── components.css     # Componenti riutilizzabili
│   └── pages.css          # Stili specifici per pagina
├── js/
│   ├── app.js             # Core: API, stato globale, utilities
│   ├── navigation.js      # Navigazione tra pagine
│   ├── pages/
│   │   ├── homepage.js    # Logica homepage
│   │   ├── settings.js   # Logica settings
│   │   ├── zone.js        # Logica pagina zone
│   │   └── chart.js       # Logica chart fullscreen
│   └── charts.js          # Chart.js integration
```

## Suddivisione Responsabilità

### CSS
- **variables.css**: Tutte le variabili CSS (`:root`)
- **base.css**: Reset, body, container, typography base
- **components.css**: Card, button, navbar, mini-card, etc.
- **pages.css**: Stili specifici per homepage, settings, zone, chart-fullscreen

### JavaScript
- **app.js**: 
  - Stato globale (`sleepData`, `currentChartType`, `currentWindow`)
  - API calls (`loadSleepStatus`, `syncData`)
  - Utilities (`formatDebt`, `formatDate`, etc.)
  - Inizializzazione app
  
- **navigation.js**: 
  - `showHomepage()`, `showSettings()`
  - Gestione navbar
  - Coordinamento visibilità pagine

- **pages/homepage.js**:
  - `updateUI()`, `updateDebtCard()`, `updateMiniCards()`
  - `updateSleepTodayCard()`, `updateTargetSleepCard()`
  - Logica specifica homepage

- **pages/settings.js**:
  - `showSettingsSubpage()`, `closeSettingsSubpage()`
  - `selectWindow()`, `saveSettings()`
  - Logica settings e sub-pages

- **pages/zone.js**:
  - `showZonePage()`, `closeZonePage()`
  - `updateZoneProgress()`, `toggleZoneItem()`
  - Logica pagina zone

- **pages/chart.js**:
  - `openChartFullscreen()`, `closeChartFullscreen()`
  - `selectDays()`, `switchChartType()`
  - Logica chart fullscreen

- **charts.js**: (già esistente, minimi cambiamenti)
  - `renderMainChart()`, `renderFullscreenChart()`
  - Gestione Chart.js

## Ordine di Caricamento

### CSS (in index.html):
```html
<link rel="stylesheet" href="/static/v2/styles/variables.css">
<link rel="stylesheet" href="/static/v2/styles/base.css">
<link rel="stylesheet" href="/static/v2/styles/components.css">
<link rel="stylesheet" href="/static/v2/styles/pages.css">
```

### JavaScript (in index.html):
```html
<script type="module" src="/static/v2/js/app.js"></script>
```

E in `app.js`:
```javascript
import { initNavigation } from './navigation.js';
import { initHomepage } from './pages/homepage.js';
import { initSettings } from './pages/settings.js';
import { initZone } from './pages/zone.js';
import { initChart } from './pages/chart.js';
```

## Compatibilità onclick Handlers

Per mantenere compatibilità con `onclick="functionName()"` negli attributi HTML:
- Esporre funzioni necessarie su `window` in ogni modulo
- Oppure usare event delegation (meglio, ma richiede refactoring HTML)

## Vantaggi
1. **Manutenibilità**: Ogni file ha responsabilità chiara
2. **Scalabilità**: Facile aggiungere nuove pagine/funzionalità
3. **Performance**: CSS esterno cacheabile dal browser
4. **Developer Experience**: Più facile trovare e modificare codice
5. **Testabilità**: Moduli isolati più facili da testare

## Note
- Usare moduli ES6 (`type="module"`) per import/export
- Mantenere compatibilità con onclick handlers esponendo su `window`
- CSS in ordine: variables → base → components → pages (cascata)

