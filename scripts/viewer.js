/**
 * SERVIONICS 3D VIEWER
 * Gaussian Splatting Visualization using GaussianSplats3D
 */

import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

// ============================================
// Configuration
// ============================================

const ViewerConfig = {
    // Camera defaults
    camera: {
        up: [0, 1, 0],
        position: [0, 2, 5],
        lookAt: [0, 0, 0]
    },
    // Quality presets
    quality: {
        low: {
            sphericalHarmonicsDegree: 0,
            antialiased: false,
            dynamicScene: false
        },
        medium: {
            sphericalHarmonicsDegree: 1,
            antialiased: true,
            dynamicScene: false
        },
        high: {
            sphericalHarmonicsDegree: 2,
            antialiased: true,
            dynamicScene: false
        }
    },
    // Demo splat URL - LOCAL file to avoid CORS/SharedArrayBuffer issues
    demoSplat: '/output/demo/scene.splat'
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    canvas: document.getElementById('viewerCanvas'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingProgress: document.getElementById('loadingProgress'),
    loadingText: document.getElementById('loadingText'),
    errorOverlay: document.getElementById('errorOverlay'),
    errorText: document.getElementById('errorText'),
    settingsModal: document.getElementById('settingsModal'),
    infoPanel: document.getElementById('infoPanel'),
    // Info values
    infoProjectId: document.getElementById('infoProjectId'),
    infoPointCount: document.getElementById('infoPointCount'),
    infoQuality: document.getElementById('infoQuality'),
    infoFps: document.getElementById('infoFps'),
    // Buttons
    btnFullscreen: document.getElementById('btnFullscreen'),
    btnSettings: document.getElementById('btnSettings'),
    btnRetry: document.getElementById('btnRetry'),
    closeSettings: document.getElementById('closeSettings'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    toggleInfo: document.getElementById('toggleInfo'),
    projectTitle: document.getElementById('projectTitle'),
    // Settings
    settingQuality: document.getElementById('settingQuality'),
    settingBackground: document.getElementById('settingBackground'),
    settingGrid: document.getElementById('settingGrid'),
    settingAutoRotate: document.getElementById('settingAutoRotate')
};

// ============================================
// State
// ============================================

let viewer = null;
let currentProjectId = null;
let frameCount = 0;
let lastFpsUpdate = Date.now();

// ============================================
// URL Parameters
// ============================================

function getProjectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('project') || params.get('id') || 'demo';
}

// ============================================
// API Communication
// ============================================

async function getSplatUrl(projectId) {
    // For demo mode, return demo splat
    if (projectId === 'demo') {
        return ViewerConfig.demoSplat;
    }

    // Try to get splat from API
    try {
        const apiUrl = window.CONFIG?.API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/project/${projectId}`);

        if (!response.ok) {
            throw new Error('Project not found');
        }

        const data = await response.json();

        // Check if project has a splat file
        if (data.project?.splatUrl) {
            return data.project.splatUrl;
        }

        // Fallback to local output folder
        return `/output/${projectId}/scene.splat`;
    } catch (error) {
        console.warn('[Viewer] API error, using demo splat:', error);
        return ViewerConfig.demoSplat;
    }
}

async function getProjectInfo(projectId) {
    if (projectId === 'demo') {
        return {
            id: 'DEMO',
            name: 'Demo Scene',
            pointCount: '~500K',
            quality: 'High'
        };
    }

    try {
        const apiUrl = window.CONFIG?.API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/project/${projectId}`);

        if (response.ok) {
            const data = await response.json();
            return {
                id: data.project?.id || projectId,
                name: data.project?.name || 'Projekt',
                pointCount: data.project?.pointCount?.toLocaleString() || '-',
                quality: data.project?.quality || 'Medium'
            };
        }
    } catch (error) {
        console.warn('[Viewer] Could not load project info');
    }

    return {
        id: projectId,
        name: 'Projekt',
        pointCount: '-',
        quality: '-'
    };
}

// ============================================
// Viewer Initialization
// ============================================

async function initViewer() {
    const projectId = getProjectIdFromUrl();
    currentProjectId = projectId;

    console.log(`[Viewer] Initializing for project: ${projectId}`);

    // Show loading
    showLoading('Lade Projekt-Daten...');

    try {
        // Get project info
        const projectInfo = await getProjectInfo(projectId);
        updateProjectInfo(projectInfo);

        // Get splat URL
        updateLoadingText('Bereite 3D-Viewer vor...');
        const splatUrl = await getSplatUrl(projectId);

        console.log(`[Viewer] Loading splat from: ${splatUrl}`);

        // Clear any existing canvas content
        elements.canvas.innerHTML = '';

        // Initialize GaussianSplats3D viewer
        updateLoadingText('Initialisiere WebGL...');

        const qualitySetting = localStorage.getItem('viewer_quality') || 'medium';
        const qualityConfig = ViewerConfig.quality[qualitySetting];

        // Create viewer with proper configuration
        viewer = new GaussianSplats3D.Viewer({
            cameraUp: ViewerConfig.camera.up,
            initialCameraPosition: ViewerConfig.camera.position,
            initialCameraLookAt: ViewerConfig.camera.lookAt,
            rootElement: elements.canvas,
            selfDrivenMode: true,
            useBuiltInControls: true,
            ...qualityConfig
        });

        // Add splat scene with progress callback
        updateLoadingText('Lade 3D-Modell...');

        await viewer.addSplatScene(splatUrl, {
            splatAlphaRemovalThreshold: 5,
            showLoadingUI: false,
            progressiveLoad: true
        });

        // Start rendering
        updateLoadingText('Starte Rendering...');
        viewer.start();

        // Small delay to ensure rendering is ready
        await new Promise(r => setTimeout(r, 500));

        // Hide loading
        hideLoading();

        // Start FPS counter
        startFpsCounter();

        console.log('[Viewer] Successfully initialized');

    } catch (error) {
        console.error('[Viewer] Initialization failed:', error);
        showError(error.message || 'Das 3D-Modell konnte nicht geladen werden.');
    }
}

// ============================================
// UI Updates
// ============================================

function showLoading(text) {
    elements.loadingOverlay.style.display = 'flex';
    elements.errorOverlay.style.display = 'none';
    updateLoadingText(text);
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function updateLoadingText(text) {
    elements.loadingText.textContent = text;
}

function updateLoadingProgress(percent) {
    elements.loadingProgress.style.width = `${percent}%`;
}

function showError(message) {
    elements.loadingOverlay.style.display = 'none';
    elements.errorOverlay.style.display = 'flex';
    elements.errorText.textContent = message;
}

function updateProjectInfo(info) {
    elements.projectTitle.textContent = info.name;
    elements.infoProjectId.textContent = info.id;
    elements.infoPointCount.textContent = info.pointCount;
    elements.infoQuality.textContent = info.quality;
}

function startFpsCounter() {
    const updateFps = () => {
        frameCount++;
        const now = Date.now();
        const elapsed = now - lastFpsUpdate;

        if (elapsed >= 1000) {
            const fps = Math.round((frameCount / elapsed) * 1000);
            elements.infoFps.textContent = fps;
            frameCount = 0;
            lastFpsUpdate = now;
        }

        requestAnimationFrame(updateFps);
    };

    updateFps();
}

// ============================================
// Event Handlers
// ============================================

function setupEventListeners() {
    // Fullscreen toggle
    elements.btnFullscreen?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Settings modal
    elements.btnSettings?.addEventListener('click', () => {
        elements.settingsModal.style.display = 'flex';
    });

    elements.closeSettings?.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
    });

    elements.modalBackdrop?.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
    });

    // Retry button
    elements.btnRetry?.addEventListener('click', () => {
        location.reload();
    });

    // Info panel toggle
    elements.toggleInfo?.addEventListener('click', () => {
        const content = elements.infoPanel.querySelector('.viewer-info__content');
        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? 'block' : 'none';
        elements.toggleInfo.textContent = isCollapsed ? '−' : '+';
    });

    // Settings changes
    elements.settingQuality?.addEventListener('change', (e) => {
        localStorage.setItem('viewer_quality', e.target.value);
        // Would need to reinitialize viewer to apply
    });

    elements.settingAutoRotate?.addEventListener('change', (e) => {
        if (viewer && viewer.controls) {
            viewer.controls.autoRotate = e.target.checked;
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case 'r':
                if (viewer) {
                    viewer.reset();
                }
                break;
            case 'f':
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
                break;
            case 'escape':
                elements.settingsModal.style.display = 'none';
                break;
        }
    });
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Viewer] DOM ready, initializing...');
    setupEventListeners();
    initViewer();
});

// Export for debugging
window.ServionicsViewer = {
    getViewer: () => viewer,
    reload: () => initViewer(),
    config: ViewerConfig
};
