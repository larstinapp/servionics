/**
 * SERVIONICS BACKEND - NVIDIA Configuration
 * API Keys and Endpoints for NVIDIA Services
 */

module.exports = {
    // NVIDIA NGC API (for NIMs)
    ngc: {
        apiKey: process.env.NVIDIA_NGC_API_KEY || 'YOUR_NGC_API_KEY_HERE',
        baseUrl: 'https://api.nvcf.nvidia.com/v2/nvcf'
    },

    // Gaussian Splatting NIM
    gaussianSplatting: {
        endpoint: 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/gaussian-splatting',
        timeout: 300000 // 5 minutes for processing
    },

    // Omniverse Cloud
    omniverse: {
        apiKey: process.env.OMNIVERSE_API_KEY || 'YOUR_OMNIVERSE_KEY_HERE',
        nucleus: 'https://nucleus.omniverse.nvidia.com',
        farmUrl: 'https://farm.ov.nvidia.com'
    },

    // Isaac Sim Cloud
    isaacSim: {
        apiKey: process.env.ISAAC_SIM_API_KEY || 'YOUR_ISAAC_KEY_HERE',
        endpoint: 'https://api.nvidia.com/isaac-sim/v1',
        headlessMode: true
    },

    // Quality Gate Thresholds
    qualityGate: {
        minBrightness: 40,        // 0-255 average luminance
        maxMotionBlur: 100,       // Laplacian variance threshold
        minFrameCount: 30,        // Minimum frames for 3D reconstruction
        qualityThreshold: 70      // Overall score to proceed
    },

    // Asset Library Paths
    assets: {
        robots: './backend/assets/robots',
        skills: './backend/assets/skills',
        hardwareProfiles: './backend/assets/hardware-profiles'
    },

    // Output Paths
    output: {
        uploads: './uploads',
        processed: './output',
        previews: './output/previews'
    }
};
