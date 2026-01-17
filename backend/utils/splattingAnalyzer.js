/**
 * SPLATTING ANALYZER - Videoanalyse für Gaussian Splatting Eignung
 * 
 * Prüft spezifische Anforderungen für 3D-Rekonstruktion via Gaussian Splatting:
 * 
 * 1. Kamerabewegung (Camera Motion) - Genug Parallaxe für Tiefenschätzung?
 * 2. Frame-Überlappung (Overlap) - Genug Overlap für Feature Matching?
 * 3. Belichtungs-Konsistenz - Stabile Exposure ohne Auto-Anpassung?
 * 4. Reflektionen & Glas - Problematische Oberflächen erkennen?
 * 5. Scene Staticness - Bewegen sich Objekte in der Szene?
 * 6. Feature-Dichte - Genug Features für COLMAP/SfM?
 * 
 * Diese Checks gehen über Standard-Videoqualität hinaus und sind
 * spezifisch für photogrammetrische 3D-Rekonstruktion.
 */

const sharp = require('sharp');
const path = require('path');

class SplattingAnalyzer {
    constructor() {
        // Thresholds für Gaussian Splatting basierend auf Best Practices
        this.thresholds = {
            minCameraMotion: 5,        // Mindest-Pixel-Bewegung zwischen Frames
            maxCameraMotion: 100,      // Max-Bewegung (darüber = Motion Blur)
            minOverlap: 50,            // % Mindest-Überlappung zwischen Frames
            maxOverlap: 85,            // Über 85% = zu wenig Parallaxe
            maxExposureVariance: 20,   // Max erlaubte Helligkeitsschwankung
            minFeatureCount: 50,       // Mindest-Features pro Frame
            maxReflectiveArea: 30,     // Max % spiegelnde Flächen
            maxMotionPixels: 10        // Max % Pixel mit Bewegung (statische Szene)
        };
    }

    /**
     * Haupt-Analyse: Prüft alle Splatting-spezifischen Kriterien
     * @param {Array} keyframes - Bereits extrahierte Keyframe-Daten mit Pfaden
     * @param {Object} metadata - Video-Metadaten
     * @returns {Object} - Splatting-Eignungs-Bewertung
     */
    async analyze(keyframes, keyframePaths, metadata) {
        console.log('[SplattingAnalyzer] Starting Gaussian Splatting suitability analysis...');

        const results = {
            cameraMotion: await this.analyzeCameraMotion(keyframePaths),
            frameOverlap: await this.analyzeFrameOverlap(keyframePaths),
            exposureConsistency: this.analyzeExposureConsistency(keyframes),
            reflectiveSurfaces: await this.analyzeReflectiveSurfaces(keyframePaths),
            sceneStaticness: await this.analyzeSceneStaticness(keyframePaths),
            featureDensity: await this.analyzeFeatureDensity(keyframePaths)
        };

        // Berechne Gesamt-Score für Splatting-Eignung
        const scores = {
            cameraMotion: results.cameraMotion.score,
            frameOverlap: results.frameOverlap.score,
            exposureConsistency: results.exposureConsistency.score,
            reflectiveSurfaces: results.reflectiveSurfaces.score,
            sceneStaticness: results.sceneStaticness.score,
            featureDensity: results.featureDensity.score
        };

        // Gewichtung: Kamerabewegung und Features sind am wichtigsten
        const overallScore = Math.round(
            scores.cameraMotion * 0.25 +
            scores.frameOverlap * 0.15 +
            scores.exposureConsistency * 0.10 +
            scores.reflectiveSurfaces * 0.15 +
            scores.sceneStaticness * 0.10 +
            scores.featureDensity * 0.25
        );

        return {
            splattingScore: overallScore,
            splattingLevel: this.getSplattingLevel(overallScore),
            checks: results,
            scores,
            recommendation: this.generateRecommendation(results, overallScore),
            estimatedQuality: this.estimateOutputQuality(overallScore)
        };
    }

    /**
     * 1. KAMERABEWEGUNG - Genug Parallaxe für Tiefenschätzung?
     * 
     * Gaussian Splatting braucht Bewegung für 3D-Triangulation.
     * Zu wenig = keine Tiefe, zu viel = Motion Blur
     */
    async analyzeCameraMotion(keyframePaths) {
        if (keyframePaths.length < 2) {
            return { score: 0, issue: 'Zu wenige Frames', details: {} };
        }

        try {
            let totalMotion = 0;
            let motionSamples = 0;
            const motionValues = [];

            // Vergleiche aufeinanderfolgende Frames
            for (let i = 1; i < Math.min(keyframePaths.length, 10); i++) {
                const motion = await this.estimateMotion(
                    keyframePaths[i - 1],
                    keyframePaths[i]
                );
                motionValues.push(motion);
                totalMotion += motion;
                motionSamples++;
            }

            const avgMotion = totalMotion / motionSamples;
            const motionVariance = this.calculateVariance(motionValues);

            // Score berechnen
            let score = 0;
            let issue = null;

            if (avgMotion < this.thresholds.minCameraMotion) {
                score = 30;
                issue = 'Zu wenig Kamerabewegung - kaum Parallaxe für 3D';
            } else if (avgMotion > this.thresholds.maxCameraMotion) {
                score = 40;
                issue = 'Zu schnelle Bewegung - Gefahr von Motion Blur';
            } else if (motionVariance > 500) {
                score = 60;
                issue = 'Ungleichmäßige Bewegung - ruckelige Aufnahme';
            } else {
                score = Math.min(100, 70 + (avgMotion / 3));
                issue = null;
            }

            console.log(`[SplattingAnalyzer] Camera Motion: avg=${avgMotion.toFixed(1)}px, score=${score}`);

            return {
                score,
                issue,
                details: {
                    averageMotion: Math.round(avgMotion),
                    motionVariance: Math.round(motionVariance),
                    recommendation: avgMotion < 5
                        ? 'Bewegen Sie die Kamera langsam um das Objekt herum'
                        : avgMotion > 80
                            ? 'Bewegen Sie die Kamera langsamer'
                            : 'Gute Kamerabewegung'
                }
            };
        } catch (error) {
            console.error('[SplattingAnalyzer] Camera motion error:', error.message);
            return { score: 50, issue: 'Analyse fehlgeschlagen', details: {} };
        }
    }

    /**
     * Einfache Bewegungsschätzung zwischen zwei Frames
     * Nutzt Pixel-Differenz als Proxy für optischen Fluss
     */
    async estimateMotion(frame1Path, frame2Path) {
        try {
            // Lade beide Frames als kleine Grayscale-Bilder
            const size = 64; // Kleine Größe für schnelle Berechnung

            const [buf1, buf2] = await Promise.all([
                sharp(frame1Path).resize(size, size).grayscale().raw().toBuffer(),
                sharp(frame2Path).resize(size, size).grayscale().raw().toBuffer()
            ]);

            // Berechne durchschnittliche Pixel-Differenz
            let diffSum = 0;
            for (let i = 0; i < buf1.length; i++) {
                diffSum += Math.abs(buf1[i] - buf2[i]);
            }

            return diffSum / buf1.length;
        } catch (error) {
            return 20; // Fallback
        }
    }

    /**
     * 2. FRAME-ÜBERLAPPUNG - Genug Overlap für Feature Matching?
     * 
     * COLMAP braucht ~60-80% Überlappung zwischen Frames.
     * Zu wenig = Lücken, zu viel = keine Parallaxe
     */
    async analyzeFrameOverlap(keyframePaths) {
        if (keyframePaths.length < 2) {
            return { score: 0, issue: 'Zu wenige Frames', details: {} };
        }

        try {
            // Nutze die Bewegungsanalyse als Proxy für Overlap
            // Wenig Bewegung = hoher Overlap, viel Bewegung = weniger Overlap
            const motionResults = await this.analyzeCameraMotion(keyframePaths);
            const avgMotion = motionResults.details.averageMotion || 20;

            // Schätze Overlap basierend auf Bewegung (inverse Korrelation)
            // Motion 0-10 = 90-100% Overlap, Motion 50+ = 50% Overlap
            const estimatedOverlap = Math.max(40, Math.min(95, 95 - avgMotion));

            let score = 0;
            let issue = null;

            if (estimatedOverlap > this.thresholds.maxOverlap) {
                score = 60;
                issue = 'Zu viel Überlappung - mehr Bewegung nötig für Parallaxe';
            } else if (estimatedOverlap < this.thresholds.minOverlap) {
                score = 40;
                issue = 'Zu wenig Überlappung - langsamere Bewegung oder mehr Frames';
            } else {
                // Sweet spot: 60-80%
                score = 85;
                issue = null;
            }

            console.log(`[SplattingAnalyzer] Frame Overlap: ~${estimatedOverlap}%, score=${score}`);

            return {
                score,
                issue,
                details: {
                    estimatedOverlap: Math.round(estimatedOverlap),
                    recommendation: estimatedOverlap > 85
                        ? 'Bewegen Sie die Kamera mehr zwischen den Frames'
                        : estimatedOverlap < 50
                            ? 'Bewegen Sie die Kamera langsamer'
                            : 'Gute Frame-Überlappung'
                }
            };
        } catch (error) {
            console.error('[SplattingAnalyzer] Overlap error:', error.message);
            return { score: 50, issue: 'Analyse fehlgeschlagen', details: {} };
        }
    }

    /**
     * 3. BELICHTUNGS-KONSISTENZ - Stabile Exposure?
     * 
     * Auto-Exposure Änderungen verursachen Flickering im 3D-Modell.
     * Die Helligkeit sollte über alle Frames konstant bleiben.
     */
    analyzeExposureConsistency(keyframes) {
        if (keyframes.length < 3) {
            return { score: 50, issue: 'Zu wenige Frames', details: {} };
        }

        const brightnessValues = keyframes.map(kf => kf.brightness);
        const avgBrightness = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
        const variance = this.calculateVariance(brightnessValues);
        const maxDeviation = Math.max(...brightnessValues.map(b => Math.abs(b - avgBrightness)));

        let score = 0;
        let issue = null;

        if (variance > this.thresholds.maxExposureVariance * 2) {
            score = 30;
            issue = 'Starke Helligkeitsschwankungen - Auto-Exposure deaktivieren';
        } else if (variance > this.thresholds.maxExposureVariance) {
            score = 60;
            issue = 'Leichte Helligkeitsschwankungen erkannt';
        } else {
            score = Math.min(100, 80 + (20 - variance));
            issue = null;
        }

        console.log(`[SplattingAnalyzer] Exposure Consistency: variance=${variance.toFixed(1)}, score=${score}`);

        return {
            score,
            issue,
            details: {
                averageBrightness: Math.round(avgBrightness),
                brightnessVariance: Math.round(variance),
                maxDeviation: Math.round(maxDeviation),
                recommendation: variance > 15
                    ? 'Verwenden Sie manuellen Belichtungsmodus'
                    : 'Stabile Belichtung'
            }
        };
    }

    /**
     * 4. REFLEKTIERENDE OBERFLÄCHEN - Glas, Spiegel, Metall?
     * 
     * Spiegelnde Flächen sind problematisch für Gaussian Splatting:
     * - Features verschieben sich mit der Kamera
     * - Falsche Tiefen werden geschätzt
     */
    async analyzeReflectiveSurfaces(keyframePaths) {
        if (keyframePaths.length === 0) {
            return { score: 50, issue: 'Keine Frames', details: {} };
        }

        try {
            let totalHighlight = 0;
            let sampledFrames = 0;

            // Analysiere einige Frames auf helle Highlights (Reflektion-Proxy)
            for (let i = 0; i < Math.min(keyframePaths.length, 5); i++) {
                const highlight = await this.detectHighlights(keyframePaths[i]);
                totalHighlight += highlight;
                sampledFrames++;
            }

            const avgHighlight = totalHighlight / sampledFrames;

            let score = 0;
            let issue = null;

            if (avgHighlight > this.thresholds.maxReflectiveArea) {
                score = 40;
                issue = 'Viele reflektierende Oberflächen erkannt (Metall/Glas)';
            } else if (avgHighlight > this.thresholds.maxReflectiveArea / 2) {
                score = 70;
                issue = 'Einige glänzende Bereiche erkannt';
            } else {
                score = 90;
                issue = null;
            }

            console.log(`[SplattingAnalyzer] Reflective Surfaces: ${avgHighlight.toFixed(1)}%, score=${score}`);

            return {
                score,
                issue,
                details: {
                    highlightPercentage: Math.round(avgHighlight),
                    recommendation: avgHighlight > 20
                        ? 'Vermeiden Sie glänzende Oberflächen oder nutzen Sie mattes Licht'
                        : 'Keine problematischen Reflektionen'
                }
            };
        } catch (error) {
            console.error('[SplattingAnalyzer] Reflective surface error:', error.message);
            return { score: 70, issue: null, details: {} };
        }
    }

    /**
     * Erkennt sehr helle Pixel (Highlights) als Reflektion-Proxy
     */
    async detectHighlights(framePath) {
        try {
            const { data, info } = await sharp(framePath)
                .resize(100, 100)
                .grayscale()
                .raw()
                .toBuffer({ resolveWithObject: true });

            let highlightPixels = 0;
            const threshold = 240; // Sehr hell = wahrscheinlich Reflektion

            for (let i = 0; i < data.length; i++) {
                if (data[i] > threshold) {
                    highlightPixels++;
                }
            }

            return (highlightPixels / data.length) * 100;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 5. SZENE STATISCH? - Bewegen sich Objekte?
     * 
     * Gaussian Splatting funktioniert am besten mit statischen Szenen.
     * Bewegende Objekte verursachen Artefakte ("Geister").
     */
    async analyzeSceneStaticness(keyframePaths) {
        if (keyframePaths.length < 3) {
            return { score: 50, issue: 'Zu wenige Frames', details: {} };
        }

        try {
            // Vergleiche mehrere Frame-Paare
            let totalChangingPixels = 0;
            let comparisons = 0;

            for (let i = 2; i < Math.min(keyframePaths.length, 8); i += 2) {
                const changeRatio = await this.detectSceneChanges(
                    keyframePaths[i - 2],
                    keyframePaths[i]
                );
                totalChangingPixels += changeRatio;
                comparisons++;
            }

            const avgChange = totalChangingPixels / comparisons;

            let score = 0;
            let issue = null;

            if (avgChange > this.thresholds.maxMotionPixels * 3) {
                score = 30;
                issue = 'Bewegende Objekte in der Szene erkannt';
            } else if (avgChange > this.thresholds.maxMotionPixels) {
                score = 60;
                issue = 'Leichte Bewegung in der Szene';
            } else {
                score = 90;
                issue = null;
            }

            console.log(`[SplattingAnalyzer] Scene Staticness: change=${avgChange.toFixed(1)}%, score=${score}`);

            return {
                score,
                issue,
                details: {
                    movingPixelPercentage: Math.round(avgChange),
                    recommendation: avgChange > 10
                        ? 'Stellen Sie sicher, dass keine Objekte in der Szene bewegt werden'
                        : 'Szene ist ausreichend statisch'
                }
            };
        } catch (error) {
            console.error('[SplattingAnalyzer] Staticness error:', error.message);
            return { score: 70, issue: null, details: {} };
        }
    }

    /**
     * Erkennt lokale Veränderungen zwischen Frames (unabhängig von Kamerabewegung)
     */
    async detectSceneChanges(frame1Path, frame2Path) {
        try {
            const size = 50;

            const [buf1, buf2] = await Promise.all([
                sharp(frame1Path).resize(size, size).grayscale().raw().toBuffer(),
                sharp(frame2Path).resize(size, size).grayscale().raw().toBuffer()
            ]);

            let changedPixels = 0;
            const threshold = 50; // Signifikante Änderung

            for (let i = 0; i < buf1.length; i++) {
                if (Math.abs(buf1[i] - buf2[i]) > threshold) {
                    changedPixels++;
                }
            }

            return (changedPixels / buf1.length) * 100;
        } catch (error) {
            return 5;
        }
    }

    /**
     * 6. FEATURE-DICHTE - Genug Features für COLMAP?
     * 
     * SfM braucht erkennbare "Features" (Ecken, Kanten, Texturen).
     * Glatte, uniforme Flächen haben zu wenige Features.
     */
    async analyzeFeatureDensity(keyframePaths) {
        if (keyframePaths.length === 0) {
            return { score: 0, issue: 'Keine Frames', details: {} };
        }

        try {
            let totalFeatures = 0;
            let sampledFrames = 0;

            for (let i = 0; i < Math.min(keyframePaths.length, 5); i++) {
                const features = await this.countFeatures(keyframePaths[i]);
                totalFeatures += features;
                sampledFrames++;
            }

            const avgFeatures = totalFeatures / sampledFrames;

            let score = 0;
            let issue = null;

            if (avgFeatures < this.thresholds.minFeatureCount) {
                score = 30;
                issue = 'Zu wenige erkennbare Features - Szene zu glatt/uniform';
            } else if (avgFeatures < this.thresholds.minFeatureCount * 2) {
                score = 60;
                issue = 'Mäßige Feature-Dichte - mehr Textur wäre besser';
            } else {
                score = Math.min(100, 70 + (avgFeatures / 5));
                issue = null;
            }

            console.log(`[SplattingAnalyzer] Feature Density: avg=${avgFeatures.toFixed(0)}, score=${score}`);

            return {
                score,
                issue,
                details: {
                    averageFeatureCount: Math.round(avgFeatures),
                    recommendation: avgFeatures < 50
                        ? 'Fügen Sie texturierte Objekte hinzu oder filmen Sie näher'
                        : 'Ausreichend Features für die Rekonstruktion'
                }
            };
        } catch (error) {
            console.error('[SplattingAnalyzer] Feature density error:', error.message);
            return { score: 50, issue: 'Analyse fehlgeschlagen', details: {} };
        }
    }

    /**
     * Zählt "Features" mittels Harris Corner Detection Approximation
     * Nutzt Kantenstärke als Proxy für Feature-Punkte
     */
    async countFeatures(framePath) {
        try {
            // Wende Laplacian an und zähle starke Antworten
            const { data, info } = await sharp(framePath)
                .resize(100, 100)
                .grayscale()
                .convolve({
                    width: 3,
                    height: 3,
                    kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Ecken-Detektor
                })
                .raw()
                .toBuffer({ resolveWithObject: true });

            let strongResponses = 0;
            const threshold = 100;

            for (let i = 0; i < data.length; i++) {
                if (data[i] > threshold) {
                    strongResponses++;
                }
            }

            // Normalisiere auf geschätzte Feature-Anzahl
            return strongResponses / 4; // Typisch ~50-200 Features pro Frame
        } catch (error) {
            return 50;
        }
    }

    /**
     * Hilfsfunktion: Varianz berechnen
     */
    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - mean, 2));
        return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    /**
     * Bestimmt das Splatting-Eignungs-Level
     */
    getSplattingLevel(score) {
        if (score >= 80) return 'excellent';
        if (score >= 65) return 'good';
        if (score >= 50) return 'acceptable';
        return 'poor';
    }

    /**
     * Generiert actionable Empfehlung für den User
     */
    generateRecommendation(results, overallScore) {
        const issues = [];

        Object.entries(results).forEach(([check, result]) => {
            if (result.issue) {
                issues.push({
                    check,
                    issue: result.issue,
                    recommendation: result.details?.recommendation || 'Bitte optimieren'
                });
            }
        });

        if (issues.length === 0) {
            return {
                status: 'optimal',
                message: 'Das Video ist hervorragend für Gaussian Splatting geeignet!',
                tips: []
            };
        }

        // Sortiere nach Wichtigkeit
        const priorityOrder = ['featureDensity', 'cameraMotion', 'reflectiveSurfaces', 'frameOverlap', 'sceneStaticness', 'exposureConsistency'];
        issues.sort((a, b) => priorityOrder.indexOf(a.check) - priorityOrder.indexOf(b.check));

        return {
            status: overallScore >= 60 ? 'acceptable' : 'needs_improvement',
            message: overallScore >= 60
                ? 'Das Video kann verarbeitet werden, aber Optimierungen würden das Ergebnis verbessern.'
                : 'Das Video sollte vor der Verarbeitung optimiert werden.',
            tips: issues.slice(0, 3).map(i => i.recommendation)
        };
    }

    /**
     * Schätzt die erwartete Ausgabequalität
     */
    estimateOutputQuality(score) {
        if (score >= 85) return { level: 'high', description: 'Hochwertige 3D-Rekonstruktion erwartet' };
        if (score >= 70) return { level: 'medium', description: 'Brauchbare Rekonstruktion, evtl. kleine Artefakte' };
        if (score >= 50) return { level: 'low', description: 'Grundlegende Rekonstruktion möglich, Qualität eingeschränkt' };
        return { level: 'very_low', description: 'Rekonstruktion möglicherweise fehlerhaft oder unvollständig' };
    }
}

module.exports = new SplattingAnalyzer();
