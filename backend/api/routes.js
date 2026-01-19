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

// ============================================
// PROJECTS STORE (in-memory, reset on restart)
// In production, use database
// ============================================
global.projects = global.projects || [];

/**
 * GET /api/projects
 * List all projects for dashboard
 */
router.get('/projects', (req, res) => {
    res.json({
        success: true,
        projects: global.projects.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )
    });
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

        // Save project to store for dashboard
        const project = {
            id: result.project_id,
            title: req.file.originalname.replace(/\.[^/.]+$/, ""),
            skillId: skillId,
            status: result.success ? 'processing' : 'failed',
            qualityScore: result.score || result.qualityScore,
            qualityLevel: result.level || result.qualityLevel,
            splattingScore: result.splattingSuitability?.score,
            hasSplat: false,
            createdAt: new Date().toISOString(),
            analysis: {
                basicQuality: result.basicQuality,
                splattingSuitability: result.splattingSuitability,
                suggestions: result.suggestions
            }
        };
        global.projects.push(project);
        console.log(`[API] Project saved: ${project.id}, Total: ${global.projects.length}`);

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

/**
 * GET /api/project/:id/splat
 * Download splat file for 3D viewer
 */
router.get('/project/:id/splat', (req, res) => {
    const { id } = req.params;

    // Check for .splat file first, then .ply
    const splatPath = path.join(config.output.processed, id, 'scene.splat');
    const plyPath = path.join(config.output.processed, id, 'splat_cloud.ply');

    let filePath = null;
    if (fs.existsSync(splatPath)) {
        filePath = splatPath;
    } else if (fs.existsSync(plyPath)) {
        filePath = plyPath;
    }

    if (!filePath) {
        return res.status(404).json({
            success: false,
            error: 'Splat file not found for this project'
        });
    }

    // Set appropriate headers
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', ext === '.splat' ? 'application/octet-stream' : 'application/x-ply');
    res.setHeader('Content-Disposition', `attachment; filename="${id}${ext}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

/**
 * GET /api/project/:id/viewer
 * Get viewer metadata for 3D visualization
 */
router.get('/project/:id/viewer', (req, res) => {
    const { id } = req.params;
    const projectDir = path.join(config.output.processed, id);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({
            success: false,
            error: 'Project not found'
        });
    }

    // Check what files exist
    const splatPath = path.join(projectDir, 'scene.splat');
    const plyPath = path.join(projectDir, 'splat_cloud.ply');
    const offerPath = path.join(projectDir, 'offer.json');

    const hasSplat = fs.existsSync(splatPath);
    const hasPly = fs.existsSync(plyPath);

    let projectInfo = {
        id: id,
        name: `Projekt ${id}`,
        pointCount: null,
        quality: 'medium'
    };

    // Try to get info from offer.json
    if (fs.existsSync(offerPath)) {
        try {
            const offer = JSON.parse(fs.readFileSync(offerPath, 'utf-8'));
            projectInfo.name = offer.project?.name || projectInfo.name;
            projectInfo.pointCount = offer.phases?.phase2?.pointCount || null;
        } catch (e) {
            console.warn('[API] Could not parse offer.json for viewer metadata');
        }
    }

    res.json({
        success: true,
        project: projectInfo,
        viewer: {
            hasSplat: hasSplat || hasPly,
            splatUrl: hasSplat || hasPly ? `/api/project/${id}/splat` : null,
            format: hasSplat ? 'splat' : (hasPly ? 'ply' : null),
            camera: {
                position: [0, 2, 5],
                lookAt: [0, 0, 0],
                up: [0, 1, 0]
            }
        }
    });
});

/**
 * GET /api/worker/status
 * Check if local GPU worker is available
 */
router.get('/worker/status', (req, res) => {
    const workerStatus = global.workerStatus || {
        available: false,
        lastSeen: null
    };

    // Consider worker available if seen in last 30 seconds
    const isAvailable = workerStatus.lastSeen &&
        (Date.now() - new Date(workerStatus.lastSeen).getTime()) < 30000;

    res.json({
        available: isAvailable,
        message: isAvailable ? 'GPU Worker connected' : 'GPU Worker not connected',
        lastSeen: workerStatus.lastSeen
    });
});

// In-memory job queue (would be Redis/DB in production)
global.splatJobs = global.splatJobs || [];

/**
 * GET /api/worker/jobs
 * List pending splatting jobs for worker
 */
router.get('/worker/jobs', (req, res) => {
    // Update worker last seen
    global.workerStatus = { lastSeen: new Date().toISOString() };

    res.json({
        jobs: global.splatJobs.filter(j => j.status === 'pending')
    });
});

/**
 * POST /api/worker/claim
 * Worker claims a job for processing
 */
router.post('/worker/claim', (req, res) => {
    const { jobId } = req.body;
    const job = global.splatJobs.find(j => j.id === jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'pending') {
        return res.status(400).json({ error: 'Job already claimed' });
    }

    job.status = 'processing';
    job.claimedAt = new Date().toISOString();

    res.json({ success: true, job });
});

/**
 * POST /api/worker/complete
 * Worker reports job completion
 */
router.post('/worker/complete', (req, res) => {
    const { jobId, splatPath, pointCount } = req.body;
    const job = global.splatJobs.find(j => j.id === jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.splatPath = splatPath;
    job.pointCount = pointCount;

    console.log(`[Worker] Job ${jobId} completed: ${splatPath}`);

    res.json({ success: true });
});

/**
 * POST /api/worker/fail
 * Worker reports job failure
 */
router.post('/worker/fail', (req, res) => {
    const { jobId, error } = req.body;
    const job = global.splatJobs.find(j => j.id === jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    job.status = 'failed';
    job.failedAt = new Date().toISOString();
    job.error = error;

    console.log(`[Worker] Job ${jobId} failed: ${error}`);

    res.json({ success: true });
});

/**
 * POST /api/worker/queue
 * Queue a new splatting job (internal use)
 */
router.post('/worker/queue', (req, res) => {
    const { projectId, videoPath } = req.body;

    const job = {
        id: projectId || `job_${Date.now()}`,
        videoPath,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    global.splatJobs.push(job);
    console.log(`[Worker] Queued job ${job.id}`);

    res.json({ success: true, job });
});

module.exports = router;


