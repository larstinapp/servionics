/**
 * SERVIONICS BACKEND SERVER
 * Main entry point for the backend orchestrator
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api/routes');
const config = require('./config/nvidia.config');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow frontend origins
app.use(cors({
    origin: [
        'http://localhost:8000',
        'http://localhost:3000',
        'https://servionics.vercel.app',  // Für später
        /\.vercel\.app$/                   // Alle Vercel Preview URLs
    ],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Auth Middleware (nur in Production)
// ERKLÄRUNG: Schützt alle /api Routen mit Passwort
const basicAuth = (req, res, next) => {
    // Health check immer erlauben (für Railway)
    // req.path ist relativ zu /api, also nur /health
    if (req.path === '/health') return next();

    // In Development überspringen
    if (process.env.NODE_ENV !== 'production') return next();

    const auth = req.headers.authorization;
    const user = process.env.BASIC_AUTH_USER || 'demo';
    const pass = process.env.BASIC_AUTH_PASS || 'servionics2026';
    const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

    if (auth === expected) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Servionics API"');
    res.status(401).json({ error: 'Authentication required' });
};

// Serve static files (output/previews)
app.use('/output', express.static(path.join(__dirname, '../output')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes (mit Basic Auth in Production)
app.use('/api', basicAuth, apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Servionics Backend Orchestrator',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            upload: 'POST /api/project/upload',
            status: 'GET /api/project/status',
            skills: 'GET /api/skills',
            project: 'GET /api/project/:id',
            health: 'GET /api/health'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('[Server] Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  SERVIONICS BACKEND ORCHESTRATOR');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  API Docs: http://localhost:${PORT}/`);
    console.log('═══════════════════════════════════════════════════');
});

module.exports = app;
