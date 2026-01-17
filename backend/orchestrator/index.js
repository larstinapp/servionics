/**
 * SERVIONICS BACKEND ORCHESTRATOR
 * Main Pipeline Controller for Video-to-Simulation
 * 
 * Phases:
 * 1. Ingest & Quality Gate
 * 2. Reality Capture (Gaussian Splatting)
 * 3. AI Construction (Asset Placement)
 * 4. Simulation (Isaac Sim)
 * 5. Output & Offer Generation
 */

const config = require('../config/nvidia.config');
const Phase1Ingest = require('./phase1_ingest');
const Phase2Capture = require('./phase2_capture');
const Phase3Construct = require('./phase3_construct');
const Phase4Simulate = require('./phase4_simulate');
const Phase5Output = require('./phase5_output');

class ServionicsOrchestrator {
    constructor() {
        this.config = config;
        this.currentProject = null;
        this.pipelineStatus = 'idle';
    }

    /**
     * Main entry point - triggered by frontend video upload
     * @param {Object} request - { videoFile, skillId, metadata }
     * @returns {Object} - Final offer response or error
     */
    async processProject(request) {
        const projectId = this.generateProjectId();

        console.log(`[Orchestrator] Starting project ${projectId}`);
        console.log(`[Orchestrator] Skill: ${request.skillId}`);

        this.currentProject = {
            id: projectId,
            skillId: request.skillId,
            startTime: Date.now(),
            status: 'processing',
            phases: {}
        };

        try {
            // ═══════════════════════════════════════════════════════════════
            // PHASE 1: INGEST & QUALITY GATE
            // ═══════════════════════════════════════════════════════════════
            this.pipelineStatus = 'phase1_ingest';
            console.log('[Phase 1] Starting Quality Gate...');

            const qualityResult = await Phase1Ingest.analyze(request.videoFile);
            this.currentProject.phases.ingest = qualityResult;

            if (qualityResult.score < this.config.qualityGate.qualityThreshold) {
                return this.failFast(qualityResult);
            }

            console.log(`[Phase 1] Quality Score: ${qualityResult.score}/100 ✓`);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 2: REALITY CAPTURE (GAUSSIAN SPLATTING)
            // ═══════════════════════════════════════════════════════════════
            this.pipelineStatus = 'phase2_capture';
            console.log('[Phase 2] Starting 3D Reconstruction...');

            const captureResult = await Phase2Capture.process(
                request.videoFile,
                projectId
            );
            this.currentProject.phases.capture = captureResult;

            console.log(`[Phase 2] Environment USD: ${captureResult.environmentUsd} ✓`);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 3: AI CONSTRUCTION
            // ═══════════════════════════════════════════════════════════════
            this.pipelineStatus = 'phase3_construct';
            console.log('[Phase 3] Starting AI Construction...');

            const constructResult = await Phase3Construct.build(
                captureResult.environmentUsd,
                request.skillId,
                projectId
            );
            this.currentProject.phases.construct = constructResult;

            console.log(`[Phase 3] Master Scene: ${constructResult.masterSceneUsd} ✓`);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 4: SIMULATION (ISAAC SIM)
            // ═══════════════════════════════════════════════════════════════
            this.pipelineStatus = 'phase4_simulate';
            console.log('[Phase 4] Starting Simulation...');

            const simResult = await Phase4Simulate.run(
                constructResult.masterSceneUsd,
                request.skillId,
                projectId
            );
            this.currentProject.phases.simulate = simResult;

            console.log(`[Phase 4] Reachability: ${simResult.reachability ? 'PASS' : 'FAIL'}`);

            // ═══════════════════════════════════════════════════════════════
            // PHASE 5: OUTPUT & OFFER GENERATION
            // ═══════════════════════════════════════════════════════════════
            this.pipelineStatus = 'phase5_output';
            console.log('[Phase 5] Generating Offer...');

            const offerResult = await Phase5Output.generate(
                this.currentProject,
                simResult
            );

            this.currentProject.status = 'completed';
            this.currentProject.endTime = Date.now();
            this.pipelineStatus = 'idle';

            console.log(`[Orchestrator] Project ${projectId} completed in ${this.getDuration()}s`);

            // WICHTIG: Füge Phase 1 Analyse-Daten zum Ergebnis hinzu
            // Damit das Frontend die Quality-Checks anzeigen kann!
            return {
                ...offerResult,
                // Phase 1 Analyse-Daten für Frontend
                basicQuality: qualityResult.basicQuality,
                splattingSuitability: qualityResult.splattingSuitability,
                keyframeCount: qualityResult.keyframeCount,
                duration: qualityResult.duration,
                resolution: qualityResult.resolution,
                suggestions: qualityResult.suggestions,
                feedback: qualityResult.feedback
            };

        } catch (error) {
            console.error(`[Orchestrator] Pipeline failed:`, error);
            this.currentProject.status = 'failed';
            this.currentProject.error = error.message;
            this.pipelineStatus = 'error';

            return {
                success: false,
                projectId,
                error: error.message,
                failedPhase: this.pipelineStatus
            };
        }
    }

    /**
     * Fast-fail response for quality gate
     * Gibt alle Analyse-Daten zurück damit Frontend die Checks anzeigen kann
     */
    failFast(qualityResult) {
        console.log(`[Phase 1] Quality insufficient (${qualityResult.score}/100) - Returning feedback`);

        return {
            success: false,
            projectId: this.currentProject.id,
            phase: 'quality_gate',
            // Alte Felder für Kompatibilität
            qualityScore: qualityResult.score,
            qualityLevel: qualityResult.level,
            // Neue erweiterte Felder
            score: qualityResult.score,
            level: qualityResult.level,
            basicQuality: qualityResult.basicQuality,
            splattingSuitability: qualityResult.splattingSuitability,
            feedback: qualityResult.feedback,
            suggestions: qualityResult.suggestions,
            keyframeCount: qualityResult.keyframeCount,
            duration: qualityResult.duration,
            resolution: qualityResult.resolution
        };
    }

    /**
     * Generate unique project ID
     */
    generateProjectId() {
        const year = new Date().getFullYear();
        const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        return `PRJ-${year}-${seq}`;
    }

    /**
     * Get pipeline duration in seconds
     */
    getDuration() {
        if (!this.currentProject?.startTime) return 0;
        return ((Date.now() - this.currentProject.startTime) / 1000).toFixed(1);
    }

    /**
     * Get current pipeline status for frontend polling
     */
    getStatus() {
        return {
            projectId: this.currentProject?.id,
            status: this.pipelineStatus,
            phases: this.currentProject?.phases || {},
            duration: this.getDuration()
        };
    }
}

module.exports = new ServionicsOrchestrator();
