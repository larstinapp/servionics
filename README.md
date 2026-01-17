# Servionics

**Roboterleistung als Service** — Engineering-Industrialization-Platform für den deutschen Mittelstand.

## Übersicht

Servionics ist eine Plattform, die Automatisierung für den deutschen Mittelstand produktisiert und als Service bereitstellt. Von der Idee zum Go-Live in 7-14 Tagen.

### Features

- 🎥 **Video-basierter Angebotsprozess** — Upload eines Prozessvideos → AI-Analyse → Angebot in Minuten
- 🤖 **Standardisierte Automatisierung** — Pick & Place, Maschinenbeladung, Palettieren, Schleifen
- 🚀 **Schnelle Umsetzung** — Go-Live in 7-14 Tagen unter Standardvoraussetzungen
- 🔒 **Datenhoheit** — Alle Daten bleiben in Deutschland
- 📊 **Dashboard & Monitoring** — Projekt-Übersicht, KPIs, Performance Gauges

## Projekt starten

### Frontend
```bash
# Lokalen Server starten (z.B. mit Python)
python -m http.server 8000

# Oder mit Node.js npx
npx serve .
```

Dann im Browser öffnen: http://localhost:8000

### Backend Orchestrator
```bash
cd backend
npm install
npm start
```

Backend API läuft auf: http://localhost:3001

## Projektstruktur

```
servionics/
├── index.html          # Landing Page
├── dashboard.html      # Projekt-Dashboard & Monitoring
├── styles/
│   ├── main.css        # Design System & Base Styles
│   ├── components.css  # UI Komponenten
│   ├── pages.css       # Seiten-spezifische Styles
│   └── dashboard.css   # Dashboard-spezifische Styles
├── scripts/
│   ├── main.js         # JavaScript Interaktivität
│   └── dashboard.js    # Dashboard Animationen & Filter
└── README.md
```

## Technologie-Stack

- **HTML5** — Semantisches Markup
- **CSS3** — Custom Properties, Flexbox, Grid
- **Vanilla JavaScript** — Keine Frameworks, maximale Performance
- **Google Fonts** — Inter für optimale Lesbarkeit

## Design System

### Farben

| Token | Hex | Verwendung |
|-------|-----|------------|
| `--color-primary-900` | #0A1628 | Hintergrund |
| `--color-accent-500` | #00D4FF | Primärer Akzent |
| `--color-success-500` | #10B981 | Erfolg / Bestätigung |
| `--color-warning-500` | #F59E0B | Warnungen / CTAs |

### Typografie

- **Überschriften**: Inter Extra Bold, -0.02em Letter-spacing
- **Fließtext**: Inter Regular, 1.5 Line-height
- **Labels**: Inter Semi-Bold, Uppercase, 0.1em Letter-spacing

## Seiten

### Landing Page (`index.html`)
- Hero mit Value Proposition
- Modul-Übersicht (Informieren, Projekt prüfen, Delivery)
- 4-Schritte-Prozess Visualisierung
- Skills/Einsatzfelder
- Testimonials & FAQ
- Video Upload Simulation

### Dashboard (`dashboard.html`)
- KPI-Karten (Aktive Projekte, Abgeschlossen, Go-Live Zeit, Kosteneinsparung)
- Projekt-Grid mit Status und Fortschritt
- Activity Timeline
- Support-Ticket Interface
- Performance Gauges (OEE, Verfügbarkeit, Zykluszeit)

## Roadmap

- [x] Landing Page MVP
- [x] Dashboard / Monitoring Seite
- [ ] Partner-Portal
- [ ] API Integration

## Lizenz

Proprietary — © 2026 Servionics GmbH

