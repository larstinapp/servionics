/**
 * SERVIONICS SIMPLE 3D VIEWER
 * Direct THREE.js point cloud rendering for generated splat files
 * Works with our 32-byte-per-point format
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls, pointCloud;

const BYTES_PER_POINT = 32;

export async function initSimpleViewer(containerId, splatUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Setup THREE.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A1628);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(3, 3, 3);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x00d4ff, 0x1a3a52);
    scene.add(gridHelper);

    // Load and display splat
    try {
        await loadSplatAsPoints(splatUrl);
        console.log('[SimpleViewer] Loaded splat successfully');
    } catch (error) {
        console.error('[SimpleViewer] Failed to load splat:', error);
        showFallbackCube();
    }

    // Start animation
    animate();

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

async function loadSplatAsPoints(url) {
    console.log('[SimpleViewer] Loading:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = await response.arrayBuffer();
    const numPoints = Math.floor(buffer.byteLength / BYTES_PER_POINT);

    console.log(`[SimpleViewer] Parsing ${numPoints} points from ${buffer.byteLength} bytes`);

    const positions = new Float32Array(numPoints * 3);
    const colors = new Float32Array(numPoints * 3);

    const view = new DataView(buffer);

    for (let i = 0; i < numPoints; i++) {
        const offset = i * BYTES_PER_POINT;

        // Position (3 floats at offset 0)
        positions[i * 3 + 0] = view.getFloat32(offset + 0, true);
        positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
        positions[i * 3 + 2] = view.getFloat32(offset + 8, true);

        // Skip scale (3 floats at offset 12)

        // Color (4 bytes at offset 24)
        colors[i * 3 + 0] = view.getUint8(offset + 24) / 255;
        colors[i * 3 + 1] = view.getUint8(offset + 25) / 255;
        colors[i * 3 + 2] = view.getUint8(offset + 26) / 255;
    }

    // Create point cloud
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        sizeAttenuation: true
    });

    pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);

    // Auto-center camera on points
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) {
        const center = geometry.boundingSphere.center;
        controls.target.copy(center);
        camera.position.set(
            center.x + geometry.boundingSphere.radius * 2,
            center.y + geometry.boundingSphere.radius * 2,
            center.z + geometry.boundingSphere.radius * 2
        );
    }
}

function showFallbackCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Expose globally
window.initSimpleViewer = initSimpleViewer;
