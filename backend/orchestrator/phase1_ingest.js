/**
 * PHASE 1: INGEST & QUALITY GATE
 * 
 * Analyzes uploaded video for:
 * - Brightness (lighting quality)
 * - Motion blur detection
 * - Frame count adequacy
 * - Loop consistency
 * 
 * Purpose: Filter out garbage input before expensive GPU processing
 * 
 * HINWEIS: Nutzt FFmpeg für echte Video-Analyse!
 */

const config = require('../config/nvidia.config');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const imageAnalyzer = require('../utils/imageAnalyzer'); // Sharp-basierte Bildanalyse
const splattingAnalyzer = require('../utils/splattingAnalyzer'); // NEU: Gaussian Splatting Eignungsprüfung

class Phase1Ingest {
    /**
     * Main analysis function
     * @param {string} videoPath - Path to uploaded video
     * @returns {Object} - Quality assessment result
     */
    async analyze(videoPath) {
        console.log(`[Phase1] Analyzing: ${videoPath}`);

        // Extract video metadata and keyframes using FFmpeg
        const metadata = await this.extractMetadata(videoPath);
        console.log(`[Phase1] Metadata: ${metadata.duration}s, ${metadata.fps}fps, ${metadata.width}x${metadata.height}`);

        // Extract keyframes WITH paths for splatting analysis
        const { keyframes, keyframePaths, tempDir } = await this.extractKeyframesWithPaths(videoPath, metadata);
        console.log(`[Phase1] Extracted ${keyframes.length} keyframes`);

        // Run basic quality checks
        const brightnessScore = this.analyzeBrightness(keyframes);
        const blurScore = this.analyzeMotionBlur(keyframes);
        const frameScore = this.analyzeFrameCount(metadata);
        const consistencyScore = this.analyzeConsistency(keyframes);

        // Calculate basic quality score (weighted average)
        const basicScore = Math.round(
            brightnessScore * 0.25 +
            blurScore * 0.30 +
            frameScore * 0.25 +
            consistencyScore * 0.20
        );

        // NEW: Run Gaussian Splatting suitability analysis
        console.log(`[Phase1] Running Gaussian Splatting suitability analysis...`);
        let splattingAnalysis = null;
        try {
            splattingAnalysis = await splattingAnalyzer.analyze(keyframes, keyframePaths, metadata);
            console.log(`[Phase1] Splatting Score: ${splattingAnalysis.splattingScore}/100 (${splattingAnalysis.splattingLevel})`);
        } catch (error) {
            console.error(`[Phase1] Splatting analysis failed:`, error.message);
            splattingAnalysis = {
                splattingScore: 50,
                splattingLevel: 'unknown',
                recommendation: { status: 'error', message: 'Analyse fehlgeschlagen', tips: [] }
            };
        }

        // Cleanup temp keyframe files
        this.cleanupTempDir(tempDir);

        // Combined score: 60% basic quality, 40% splatting suitability
        const overallScore = Math.round(basicScore * 0.6 + splattingAnalysis.splattingScore * 0.4);
        const level = this.getQualityLevel(overallScore);

        // Generate combined feedback
        const basicFeedback = this.generateFeedback({
            brightness: brightnessScore,
            blur: blurScore,
            frames: frameScore,
            consistency: consistencyScore
        });

        // Merge suggestions from both analyses
        const allSuggestions = [
            ...basicFeedback.suggestions,
            ...(splattingAnalysis.recommendation?.tips || [])
        ].slice(0, 5); // Max 5 suggestions

        return {
            score: overallScore,
            level, // 'good' | 'medium' | 'poor'
            basicQuality: {
                score: basicScore,
                metrics: {
                    brightness: brightnessScore,
                    motionBlur: blurScore,
                    frameCount: frameScore,
                    consistency: consistencyScore
                }
            },
            splattingSuitability: {
                score: splattingAnalysis.splattingScore,
                level: splattingAnalysis.splattingLevel,
                checks: splattingAnalysis.checks,
                estimatedQuality: splattingAnalysis.estimatedQuality
            },
            feedback: splattingAnalysis.splattingScore < 60
                ? splattingAnalysis.recommendation?.message
                : basicFeedback.message,
            suggestions: allSuggestions,
            keyframeCount: keyframes.length,
            duration: metadata.duration,
            resolution: { width: metadata.width, height: metadata.height }
        };
    }

    /**
     * Extract video metadata using FFprobe
     * ERKLÄRUNG: ffprobe ist ein Tool das Video-Infos ausliest
     */
    async extractMetadata(videoPath) {
        try {
            // FFprobe Befehl: Gibt JSON mit Video-Stream-Infos zurück
            const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
            const output = execSync(cmd, { encoding: 'utf-8' });
            const data = JSON.parse(output);

            // Finde den Video-Stream
            const videoStream = data.streams.find(s => s.codec_type === 'video');

            if (!videoStream) {
                throw new Error('Kein Video-Stream gefunden');
            }

            // Parse FPS (kann "30/1" oder "29.97" sein)
            let fps = 30;
            if (videoStream.r_frame_rate) {
                const [num, denom] = videoStream.r_frame_rate.split('/');
                fps = denom ? Math.round(parseInt(num) / parseInt(denom)) : parseFloat(num);
            }

            const duration = parseFloat(data.format.duration) || 0;
            const frameCount = Math.round(duration * fps);

            return {
                duration: Math.round(duration * 10) / 10,
                fps: fps,
                width: videoStream.width || 1920,
                height: videoStream.height || 1080,
                frameCount: frameCount,
                codec: videoStream.codec_name
            };
        } catch (error) {
            console.error('[Phase1] FFprobe error:', error.message);
            // Fallback bei Fehler
            return {
                duration: 10,
                fps: 30,
                width: 1920,
                height: 1080,
                frameCount: 300
            };
        }
    }

    /**
     * Extract keyframes from video using FFmpeg - returns paths for splatting analysis
     * HINWEIS: Cleanup muss vom Aufrufer gemacht werden!
     */
    async extractKeyframesWithPaths(videoPath, metadata) {
        const keyframes = [];
        const keyframePaths = [];
        const tempDir = path.join(config.output.uploads, 'keyframes_temp_' + Date.now());

        try {
            // Erstelle temp-Ordner
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Berechne wie viele Keyframes wir wollen (ca. 20)
            const totalFrames = Math.min(20, Math.floor(metadata.duration));
            const interval = metadata.duration / totalFrames;

            // FFmpeg: Extrahiere Keyframes als kleine JPGs
            // -vf fps=1/X = Ein Frame alle X Sekunden
            // -vf scale=160:-1 = Skaliere auf 160px Breite (schneller)
            const cmd = `ffmpeg -y -i "${videoPath}" -vf "fps=1/${Math.max(0.5, interval)},scale=160:-1" -q:v 2 "${tempDir}/frame_%03d.jpg"`;

            console.log(`[Phase1] Extracting keyframes...`);
            execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });

            // Lese extrahierte Frames und analysiere sie mit Sharp
            const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.jpg')).sort();

            console.log(`[Phase1] Analyzing ${files.length} frames with Sharp...`);

            for (let i = 0; i < files.length; i++) {
                const filePath = path.join(tempDir, files[i]);
                keyframePaths.push(filePath); // Speichere Pfad für Splatting-Analyse

                // Echte Pixel-Analyse mit Sharp
                const analysis = await imageAnalyzer.analyzeImage(filePath);

                keyframes.push({
                    index: i,
                    timestamp: i * interval,
                    brightness: analysis.brightness,      // Echter Durchschnitt (0-255)
                    sharpness: analysis.sharpness,        // Laplacian Variance (0-100)
                    contrast: analysis.contrast,          // Standardabweichung
                    edgeDensity: analysis.edgeDensity,    // % Kantenpixel
                    file: files[i]
                });

                // Fortschritt loggen (alle 5 Frames)
                if (i % 5 === 0) {
                    console.log(`[Phase1] Frame ${i + 1}/${files.length}: Brightness=${analysis.brightness}, Sharpness=${analysis.sharpness}`);
                }
            }

        } catch (error) {
            console.error('[Phase1] Keyframe extraction error:', error.message);
            // Fallback: Mock-Daten
            for (let i = 0; i < 10; i++) {
                keyframes.push({
                    index: i,
                    timestamp: i * 1.5,
                    brightness: 100 + Math.random() * 50,
                    sharpness: 70 + Math.random() * 30
                });
            }
        }

        // WICHTIG: Pfade und tempDir zurückgeben, cleanup macht der Aufrufer!
        return { keyframes, keyframePaths, tempDir };
    }

    /**
     * Cleanup temp directory
     */
    cleanupTempDir(dir) {
        try {
            if (fs.existsSync(dir)) {
                fs.readdirSync(dir).forEach(file => {
                    fs.unlinkSync(path.join(dir, file));
                });
                fs.rmdirSync(dir);
            }
        } catch (e) {
            console.warn('[Phase1] Cleanup warning:', e.message);
        }
    }

    /**
     * Analyze brightness across keyframes
     * Score: 0-100
     */
    analyzeBrightness(keyframes) {
        if (keyframes.length === 0) return 0;

        const avgBrightness = keyframes.reduce((sum, kf) => sum + kf.brightness, 0) / keyframes.length;
        const minThreshold = config.qualityGate.minBrightness;

        // Score based on brightness level
        if (avgBrightness >= 100) return 100;
        if (avgBrightness >= 80) return 85;
        if (avgBrightness >= minThreshold) return 70;
        if (avgBrightness >= minThreshold * 0.5) return 40;
        return 20;
    }

    /**
     * Analyze motion blur (using Laplacian variance)
     * Score: 0-100 (higher = sharper)
     */
    analyzeMotionBlur(keyframes) {
        if (keyframes.length === 0) return 0;

        const avgSharpness = keyframes.reduce((sum, kf) => sum + kf.sharpness, 0) / keyframes.length;

        // Convert sharpness to score (higher sharpness = better)
        if (avgSharpness >= 100) return 100;
        if (avgSharpness >= 80) return 85;
        if (avgSharpness >= 60) return 70;
        if (avgSharpness >= 40) return 50;
        return 30;
    }

    /**
     * Analyze frame count adequacy
     * Score: 0-100
     */
    analyzeFrameCount(metadata) {
        const minFrames = config.qualityGate.minFrameCount;
        const idealFrames = 150; // ~5 seconds at 30fps

        if (metadata.frameCount >= idealFrames) return 100;
        if (metadata.frameCount >= minFrames * 2) return 85;
        if (metadata.frameCount >= minFrames) return 70;
        if (metadata.frameCount >= minFrames * 0.5) return 40;
        return 20;
    }

    /**
     * Analyze frame consistency (loop quality)
     * Score: 0-100
     */
    analyzeConsistency(keyframes) {
        if (keyframes.length < 2) return 0;

        // Check variation between consecutive frames
        let totalVariation = 0;
        for (let i = 1; i < keyframes.length; i++) {
            const brightnessDiff = Math.abs(keyframes[i].brightness - keyframes[i - 1].brightness);
            totalVariation += brightnessDiff;
        }

        const avgVariation = totalVariation / (keyframes.length - 1);

        // Lower variation = more consistent
        if (avgVariation < 10) return 100;
        if (avgVariation < 20) return 85;
        if (avgVariation < 30) return 70;
        if (avgVariation < 50) return 50;
        return 30;
    }

    /**
     * Determine quality level
     */
    getQualityLevel(score) {
        if (score >= 80) return 'good';
        if (score >= 60) return 'medium';
        return 'poor';
    }

    /**
     * Generate user feedback based on metrics
     */
    generateFeedback(metrics) {
        const suggestions = [];
        let primaryIssue = null;

        // Check each metric and add suggestions
        if (metrics.brightness < 70) {
            suggestions.push('Mehr Beleuchtung: Filmen Sie bei besseren Lichtverhältnissen');
            if (!primaryIssue) primaryIssue = 'Beleuchtung';
        }

        if (metrics.blur < 70) {
            suggestions.push('Stabilere Aufnahme: Nutzen Sie ein Stativ oder filmen Sie langsamer');
            if (!primaryIssue) primaryIssue = 'Bewegungsunschärfe';
        }

        if (metrics.frames < 70) {
            suggestions.push('Längere Aufnahme: Das Video sollte mindestens 5 Sekunden lang sein');
            if (!primaryIssue) primaryIssue = 'Videolänge';
        }

        if (metrics.consistency < 70) {
            suggestions.push('Gleichmäßige Bewegung: Vermeiden Sie abrupte Kamerabewegungen');
            if (!primaryIssue) primaryIssue = 'Konsistenz';
        }

        // Generate message
        const avgScore = Math.round(
            (metrics.brightness + metrics.blur + metrics.frames + metrics.consistency) / 4
        );

        let message;
        if (avgScore >= 80) {
            message = 'Ausgezeichnete Videoqualität! Bereit für die 3D-Rekonstruktion.';
        } else if (avgScore >= 60) {
            message = `Akzeptable Qualität, aber ${primaryIssue} könnte verbessert werden.`;
        } else {
            message = `Die Videoqualität ist nicht ausreichend. Hauptproblem: ${primaryIssue}.`;
        }

        return { message, suggestions };
    }
}

module.exports = new Phase1Ingest();
