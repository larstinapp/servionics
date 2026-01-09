# Servionics

**Roboterleistung als Service** — Engineering-Industrialization-Platform für den deutschen Mittelstand.

## Übersicht

Servionics ist eine Plattform, die Automatisierung für den deutschen Mittelstand produktisiert und als Service bereitstellt. Von der Idee zum Go-Live in 7-14 Tagen.

### Features

- 🎥 **Video-basierter Angebotsprozess** — Upload eines Prozessvideos → AI-Analyse → Angebot in Minuten
- 🤖 **Standardisierte Automatisierung** — Pick & Place, Maschinenbeladung, Palettieren, Schleifen
- 🚀 **Schnelle Umsetzung** — Go-Live in 7-14 Tagen unter Standardvoraussetzungen
- 🔒 **Datenhoheit** — Alle Daten bleiben in Deutschland

## Projekt starten

```bash
# Lokalen Server starten (z.B. mit Python)
python -m http.server 8000

# Oder mit Node.js npx
npx serve .
```

Dann im Browser öffnen: http://localhost:8000

## Projektstruktur

```
servionics/
├── index.html          # Landing Page
├── styles/
│   ├── main.css        # Design System & Base Styles
│   ├── components.css  # UI Komponenten
│   └── pages.css       # Seiten-spezifische Styles
├── scripts/
│   └── main.js         # JavaScript Interaktivität
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

## Roadmap

- [x] Landing Page MVP
- [ ] Dashboard / Monitoring Seite
- [ ] Partner-Portal
- [ ] API Integration

## Lizenz

Proprietary — © 2026 Servionics GmbH
