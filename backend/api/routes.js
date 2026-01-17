/**
 * SERVIONICS BACKEND API
 * REST endpoints for frontend integration
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const orchestrator = require('../orchestrator');
const config = require('../config/nvidia.config');

const router = express.Router();

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = config.output.uploads;
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Nur Videodateien erlaubt'), false);
        }
    }
});

/**
 * POST /api/project/upload
 * Upload video and start pipeline
 */
router.post('/project/upload', upload.single('video'), async (req, res) => {
    try {
        const { skillId } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Keine Videodatei hochgeladen'
            });
        }

        if (!skillId) {
            return res.status(400).json({
                success: false,
                error: 'Skill-ID erforderlich'
            });
        }

        console.log(`[API] Received upload: ${req.file.filename}, Skill: ${skillId}`);

        // Start pipeline asynchronously
        const result = await orchestrator.processProject({
            videoFile: req.file.path,
            skillId: skillId,
            metadata: {
                originalName: req.file.originalname,
                size: req.file.size,
                uploadTime: new Date().toISOString()
            }
        });

        res.json(result);

    } catch (error) {
        console.error('[API] Upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/project/status
 * Get current pipeline status
 */
router.get('/project/status', (req, res) => {
    const status = orchestrator.getStatus();
    res.json(status);
});

/**
 * GET /api/skills
 * List available skills
 */
router.get('/skills', (req, res) => {
    const skills = [
        {
            id: 'pick-place',
            name: 'Pick & Place',
            icon: '📦',
            description: 'Teile von A nach B bewegen',
            deliveryDays: '7-10'
        },
        {
            id: 'palletizing',
            name: 'Palettieren',
            icon: '🎯',
            description: 'Kartons auf Paletten stapeln',
            deliveryDays: '10-14'
        },
        {
            id: 'machine-loading',
            name: 'Maschinenbeladung',
            icon: '🔧',
            description: 'CNC/Werkzeugmaschinen bestücken',
            deliveryDays: '8-12'
        },
        {
            id: 'grinding',
            name: 'Schleifen',
            icon: '✨',
            description: 'Oberflächenbearbeitung',
            deliveryDays: '12-14'
        }
    ];

    res.json(skills);
});

/**
 * GET /api/project/:id
 * Get project details by ID
 */
router.get('/project/:id', (req, res) => {
    const { id } = req.params;
    const offerPath = path.join(config.output.processed, id, 'offer.json');

    if (!fs.existsSync(offerPath)) {
        return res.status(404).json({
            success: false,
            error: 'Projekt nicht gefunden'
        });
    }

    const offer = JSON.parse(fs.readFileSync(offerPath, 'utf-8'));
    res.json(offer);
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        pipeline: orchestrator.getStatus().status
    });
});

module.exports = router;
