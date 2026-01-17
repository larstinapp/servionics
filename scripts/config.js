/**
 * SERVIONICS FRONTEND CONFIG
 * 
 * Zentrale Konfiguration für API-Endpunkte.
 * Wird je nach Umgebung automatisch gesetzt.
 */

const ServionicsConfig = {
    // API Base URL - automatisch basierend auf Umgebung
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://servionics-backend.up.railway.app', // Nach Railway Deploy anpassen!

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
