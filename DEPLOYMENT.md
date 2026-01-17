# Servionics Backend Deployment

## Railway Setup (5 Minuten)

### 1. Railway Account erstellen
1. Gehe zu https://railway.app
2. "Login with GitHub" klicken
3. Repository `servionics` autorisieren

### 2. Neues Projekt erstellen
1. Dashboard → "New Project"
2. "Deploy from GitHub repo"
3. Wähle `larstinapp/servionics`
4. **Root Directory:** `backend` ← WICHTIG!

### 3. Environment Variables setzen
In Railway Dashboard → Variables:

```
PORT=3001
NODE_ENV=production
BASIC_AUTH_USER=demo
BASIC_AUTH_PASS=servionics2026
```

### 4. Deploy!
Railway deployed automatisch bei jedem Git Push.

---

## URLs nach Deploy

- **Backend API:** `https://servionics-backend.up.railway.app`
- **Health Check:** `https://servionics-backend.up.railway.app/api/health`

---

## Frontend anpassen (nach Deploy)

In `scripts/main.js` Zeile ~247:
```javascript
// Vorher:
const response = await fetch('http://localhost:3001/api/project/upload', ...

// Nachher:
const API_URL = 'https://servionics-backend.up.railway.app';
const response = await fetch(`${API_URL}/api/project/upload`, ...
```

---

## Lokale GPU-Worker (Phase 2 & 4)

Der Railway-Server ist nur für Phase 1, 3, 5.
GPU-intensive Phasen laufen auf deinem Desktop.

Setup folgt nach Railway-Deploy.
