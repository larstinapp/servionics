/**
 * SERVIONICS FRONTEND CONFIG
 * 
 * Zentrale Konfiguration für API-Endpunkte.
 * Wird je nach Umgebung automatisch gesetzt.
 */

// PASSWORD GATE - Schützt die Seite mit Passwort
(function () {
    // Nur in Production (nicht localhost)
    if (window.location.hostname === 'localhost') return;

    // Bereits authentifiziert?
    if (sessionStorage.getItem('servionics_auth') === 'true') return;

    // Passwort abfragen
    const password = prompt('🔐 Servionics Demo - Bitte Passwort eingeben:');

    if (password === 'servionics2026') {
        sessionStorage.setItem('servionics_auth', 'true');
    } else {
        document.documentElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0f;color:white;font-family:system-ui;">
        <div style="text-align:center;">
          <h1 style="font-size:48px;margin-bottom:16px;">🔒</h1>
          <h2>Zugang verweigert</h2>
          <p style="color:#888;margin-top:8px;">Falsches Passwort</p>
          <button onclick="location.reload()" style="margin-top:24px;padding:12px 24px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;">
            Erneut versuchen
          </button>
        </div>
      </div>
    `;
        throw new Error('Authentication failed'); // Stop weitere Scripts
    }
})();

const ServionicsConfig = {
    // API Base URL - automatisch basierend auf Umgebung
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://servionics-production.up.railway.app',

    // Basic Auth Credentials (für Production)
    // HINWEIS: In echter Production würde man Tokens nutzen, nicht Basic Auth
    AUTH_USER: 'demo',
    AUTH_PASS: 'servionics2026',

    // Erstellt Authorization Header
    getAuthHeader() {
        const credentials = btoa(`${this.AUTH_USER}:${this.AUTH_PASS}`);
        return `Basic ${credentials}`;
    },

    // Fetch mit Auth
    async fetch(endpoint, options = {}) {
        const url = `${this.API_URL}${endpoint}`;
        const headers = {
            ...options.headers,
            'Authorization': this.getAuthHeader()
        };

        return fetch(url, { ...options, headers });
    }
};

// Global verfügbar machen
window.ServionicsConfig = ServionicsConfig;
