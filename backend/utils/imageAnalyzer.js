/**
 * IMAGE ANALYZER - Bildanalyse für 3D-Rekonstruktions-Tauglichkeit
 * 
 * Dieses Modul analysiert Einzelbilder auf:
 * 1. Helligkeit (Luminance) - Ist genug Licht vorhanden?
 * 2. Schärfe (Blur) - Ist das Bild scharf genug?
 * 3. Kantendichte (Edge Density) - Gibt es genug Struktur?
 * 4. Kontrast - Ist genug Variation im Bild?
 * 
 * LERNPUNKT: Diese Metriken sind klassische Computer Vision Techniken
 * die auch in professionellen 3D-Rekonstruktions-Pipelines verwendet werden.
 */

const sharp = require('sharp');

class ImageAnalyzer {
    /**
     * Hauptfunktion: Analysiert ein Bild komplett
     * 
     * ERKLÄRUNG:
     * - Lädt das Bild mit Sharp (schnelle Bildverarbeitung)
     * - Konvertiert zu Grayscale für einfachere Analyse
     * - Berechnet verschiedene Metriken
     * 
     * @param {string} imagePath - Pfad zum Bild
     * @returns {Object} - Alle Analyse-Ergebnisse
     */
    async analyzeImage(imagePath) {
        try {
            // Lade Bild und konvertiere zu Grayscale für Analyse
            const image = sharp(imagePath);
            const metadata = await image.metadata();

            // Hole Roh-Pixeldaten als Buffer
            const { data, info } = await image
                .grayscale()           // Konvertiere zu Graustufen
                .raw()                 // Gib rohe Pixeldaten zurück
                .toBuffer({ resolveWithObject: true });

            // Berechne alle Metriken
            const brightness = this.calculateBrightness(data);
            const contrast = this.calculateContrast(data, brightness);
            const blur = await this.calculateBlur(imagePath);
            const edgeDensity = this.calculateEdgeDensity(data, info.width, info.height);

            return {
                brightness,      // 0-255 (höher = heller)
                contrast,        // 0-127 (höher = mehr Kontrast)
                sharpness: blur, // 0-100 (höher = schärfer)
                edgeDensity,     // 0-100 (höher = mehr Details)
                width: metadata.width,
                height: metadata.height
            };
        } catch (error) {
            console.error('[ImageAnalyzer] Error:', error.message);
            // Fallback-Werte bei Fehler
            return {
                brightness: 128,
                contrast: 50,
                sharpness: 50,
                edgeDensity: 50,
                error: error.message
            };
        }
    }

    /**
     * Berechnet durchschnittliche Helligkeit
     * 
     * ERKLÄRUNG:
     * Die Helligkeit ist einfach der Durchschnitt aller Pixel-Werte.
     * In Grayscale: 0 = Schwarz, 255 = Weiß
     * 
     * Für 3D-Rekonstruktion brauchen wir mindestens ~80-100
     * um genug Details zu erkennen.
     * 
     * @param {Buffer} data - Grayscale Pixel-Daten
     * @returns {number} - Durchschnittliche Helligkeit (0-255)
     */
    calculateBrightness(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        return Math.round(sum / data.length);
    }

    /**
     * Berechnet Kontrast (Standardabweichung der Helligkeit)
     * 
     * ERKLÄRUNG:
     * Kontrast = Wie stark variieren die Pixel-Werte?
     * - Niedriger Kontrast = Alles grau, wenig Details
     * - Hoher Kontrast = Klare Unterschiede, gute Textur
     * 
     * Für 3D-Rekonstruktion brauchen wir hohen Kontrast,
     * damit Features erkannt werden können.
     * 
     * @param {Buffer} data - Grayscale Pixel-Daten
     * @param {number} mean - Durchschnittliche Helligkeit
     * @returns {number} - Standardabweichung (0-127)
     */
    calculateContrast(data, mean) {
        let sumSquaredDiff = 0;
        for (let i = 0; i < data.length; i++) {
            const diff = data[i] - mean;
            sumSquaredDiff += diff * diff;
        }
        const variance = sumSquaredDiff / data.length;
        return Math.round(Math.sqrt(variance));
    }

    /**
     * Berechnet Schärfe mit Laplacian Variance
     * 
     * ERKLÄRUNG:
     * Der Laplacian-Filter erkennt Kanten (schnelle Helligkeitsänderungen).
     * - Scharfes Bild = Viele starke Kanten = Hohe Varianz
     * - Unscharfes Bild = Weiche Übergänge = Niedrige Varianz
     * 
     * Das ist DIE Standard-Methode für Blur-Detection!
     * 
     * Laplacian Kernel:
     * [ 0, -1,  0]
     * [-1,  4, -1]
     * [ 0, -1,  0]
     * 
     * @param {string} imagePath - Pfad zum Bild
     * @returns {number} - Schärfe-Score (0-100)
     */
    async calculateBlur(imagePath) {
        try {
            // Sharp hat einen eingebauten Laplacian-ähnlichen Filter: convolve
            const { data, info } = await sharp(imagePath)
                .grayscale()
                .resize(200, 200, { fit: 'inside' }) // Verkleinern für Speed
                .convolve({
                    width: 3,
                    height: 3,
                    kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0] // Laplacian
                })
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Berechne Varianz der Laplacian-Antwort
            let sum = 0;
            let sumSq = 0;
            for (let i = 0; i < data.length; i++) {
                sum += data[i];
                sumSq += data[i] * data[i];
            }
            const mean = sum / data.length;
            const variance = (sumSq / data.length) - (mean * mean);

            // Normalisiere auf 0-100 (typische Werte: 0-2000)
            const sharpnessScore = Math.min(100, Math.round(variance / 20));

            return sharpnessScore;
        } catch (error) {
            console.error('[ImageAnalyzer] Blur calculation error:', error.message);
            return 50;
        }
    }

    /**
     * Berechnet Kantendichte mit Sobel-ähnlichem Ansatz
     * 
     * ERKLÄRUNG:
     * Zählt wie viele Pixel starke Helligkeitsänderungen haben.
     * - Viele Kanten = Viel Textur/Detail = Gut für 3D
     * - Wenige Kanten = Glatte Flächen = Schwieriger für 3D
     * 
     * Wir approximieren Sobel mit einfachen Differenzen:
     * |Pixel(x+1) - Pixel(x)| > Threshold
     * 
     * @param {Buffer} data - Grayscale Pixel-Daten
     * @param {number} width - Bildbreite
     * @param {number} height - Bildhöhe
     * @returns {number} - Kantendichte in Prozent (0-100)
     */
    calculateEdgeDensity(data, width, height) {
        const threshold = 30; // Mindest-Differenz für "Kante"
        let edgeCount = 0;

        // Gehe durch alle Pixel (außer Rand)
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                const idx = y * width + x;
                const current = data[idx];
                const right = data[idx + 1];
                const below = data[idx + width];

                // Horizontaler Gradient
                const gx = Math.abs(right - current);
                // Vertikaler Gradient
                const gy = Math.abs(below - current);

                // Kombinierter Gradient (approximiert Sobel-Magnitude)
                const gradient = Math.sqrt(gx * gx + gy * gy);

                if (gradient > threshold) {
                    edgeCount++;
                }
            }
        }

        // Prozentualer Anteil von Kantenpixeln
        const totalPixels = (width - 1) * (height - 1);
        const density = (edgeCount / totalPixels) * 100;

        return Math.round(density);
    }

    /**
     * Bewertet ob ein Bild für 3D-Rekonstruktion geeignet ist
     * 
     * ERKLÄRUNG:
     * Kombiniert alle Metriken zu einer Gesamtbewertung.
     * 
     * Gewichtung basiert auf Wichtigkeit für Gaussian Splatting:
     * - Schärfe: 35% (unscharf = Katastrophe)
     * - Kantendichte: 25% (keine Features = keine Rekonstruktion)
     * - Helligkeit: 25% (zu dunkel = keine Details)
     * - Kontrast: 15% (flach = schwierig)
     * 
     * @param {Object} metrics - Ergebnisse von analyzeImage()
     * @returns {Object} - Gesamtbewertung mit Score und Feedback
     */
    evaluateForReconstruction(metrics) {
        // Normalisiere alle Werte auf 0-100
        const brightnessScore = Math.min(100, (metrics.brightness / 150) * 100);
        const contrastScore = Math.min(100, (metrics.contrast / 60) * 100);
        const sharpnessScore = metrics.sharpness;
        const edgeScore = Math.min(100, metrics.edgeDensity * 5); // Typ. 5-20%

        // Gewichteter Durchschnitt
        const overall = Math.round(
            sharpnessScore * 0.35 +
            edgeScore * 0.25 +
            brightnessScore * 0.25 +
            contrastScore * 0.15
        );

        // Bestimme Qualitätsstufe
        let level, message;
        if (overall >= 75) {
            level = 'excellent';
            message = 'Hervorragend für 3D-Rekonstruktion geeignet';
        } else if (overall >= 60) {
            level = 'good';
            message = 'Gut geeignet, kleinere Verbesserungen möglich';
        } else if (overall >= 40) {
            level = 'acceptable';
            message = 'Akzeptabel, aber Qualität könnte besser sein';
        } else {
            level = 'poor';
            message = 'Nicht geeignet, bitte besseres Video aufnehmen';
        }

        // Generiere spezifische Hinweise
        const issues = [];
        if (brightnessScore < 50) issues.push('Zu dunkel - mehr Licht benötigt');
        if (contrastScore < 40) issues.push('Zu wenig Kontrast - Szene wirkt flach');
        if (sharpnessScore < 40) issues.push('Unscharf - stabilere Aufnahme nötig');
        if (edgeScore < 30) issues.push('Zu wenig Details - mehr Textur nötig');

        return {
            score: overall,
            level,
            message,
            issues,
            breakdown: {
                brightness: Math.round(brightnessScore),
                contrast: Math.round(contrastScore),
                sharpness: sharpnessScore,
                edges: Math.round(edgeScore)
            }
        };
    }
}

module.exports = new ImageAnalyzer();
