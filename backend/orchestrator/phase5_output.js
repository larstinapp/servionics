/**
 * PHASE 5: OUTPUT & OFFER GENERATION
 * 
 * Aggregates all pipeline results and generates the final offer
 * Includes TCO calculation and feasibility assessment
 */

const config = require('../config/nvidia.config');
const path = require('path');
const fs = require('fs');

// Standard pricing and timing data
const PRICING = {
    skills: {
        'pick-place': {
            setupCost: 25000,
            monthlyCost: 2500,
            implementationDays: 7
        },
        'palletizing': {
            setupCost: 35000,
            monthlyCost: 3200,
            implementationDays: 10
        },
        'machine-loading': {
            setupCost: 30000,
            monthlyCost: 2800,
            implementationDays: 8
        },
        'grinding': {
            setupCost: 45000,
            monthlyCost: 4000,
            implementationDays: 14
        }
    },
    laborCostPerHour: 35,  // Average labor cost in Germany
    shiftHours: 8,
    workDaysPerMonth: 22
};

class Phase5Output {
    /**
     * Generate final offer from pipeline results
     * @param {Object} project - Full project data
     * @param {Object} simResult - Phase 4 simulation results
     * @returns {Object} - Final offer response
     */
    async generate(project, simResult) {
        console.log(`[Phase5] Generating offer for: ${project.id}`);

        // Determine feasibility status (traffic light)
        const feasibility = this.assessFeasibility(simResult);

        // Calculate TCO
        const tco = this.calculateTCO(project.skillId, simResult.cycleTime);

        // Calculate delivery estimate
        const delivery = this.estimateDelivery(project.skillId, simResult);

        // Build final response
        const response = {
            success: true,
            project_id: project.id,
            skill: project.skillId,

            // Feasibility Assessment
            feasibility_status: feasibility.status,
            feasibility_color: feasibility.color,
            feasibility_message: feasibility.message,

            // Simulation Results
            simulation_results: {
                reachability: simResult.reachability,
                reachability_score: simResult.reachabilityScore,
                cycle_time_s: simResult.cycleTime,
                risk_score: simResult.riskScore,
                collisions_detected: simResult.collisions.detected
            },

            // Media
            preview_video_url: simResult.previewVideoUrl,
            screenshot_url: simResult.screenshotUrl,

            // Delivery
            delivery_estimate: delivery.text,
            delivery_days: delivery.days,
            implementation_phases: delivery.phases,

            // TCO & ROI
            tco_estimate: tco,

            // Metadata
            generated_at: new Date().toISOString(),
            processing_time_s: this.getProcessingTime(project)
        };

        // Save response to file
        await this.saveResponse(response, project.id);

        return response;
    }

    /**
     * Assess feasibility (traffic light system)
     */
    assessFeasibility(simResult) {
        // Green: All checks passed
        if (simResult.reachability &&
            !simResult.collisions.detected &&
            simResult.riskScore < 0.2) {
            return {
                status: 'feasible',
                color: 'green',
                message: 'Projekt ist standardmäßig umsetzbar. Alle Prüfungen bestanden.'
            };
        }

        // Yellow: Minor issues
        if (simResult.reachability &&
            simResult.riskScore < 0.5) {
            return {
                status: 'conditional',
                color: 'yellow',
                message: 'Projekt umsetzbar mit Anpassungen. Vor-Ort-Check empfohlen.'
            };
        }

        // Red: Major issues
        return {
            status: 'needs_review',
            color: 'red',
            message: 'Individuelle Lösung erforderlich. Experten-Beratung notwendig.'
        };
    }

    /**
     * Calculate Total Cost of Ownership
     */
    calculateTCO(skillId, cycleTime) {
        const pricing = PRICING.skills[skillId] || PRICING.skills['pick-place'];

        // Calculate parts per hour
        const partsPerHour = cycleTime > 0 ? Math.floor(3600 / cycleTime) : 0;
        const partsPerDay = partsPerHour * PRICING.shiftHours;
        const partsPerMonth = partsPerDay * PRICING.workDaysPerMonth;

        // Calculate labor savings
        const manualLaborCostPerMonth = PRICING.laborCostPerHour *
            PRICING.shiftHours *
            PRICING.workDaysPerMonth;

        // Estimated labor reduction: 70%
        const laborSavingsPerMonth = manualLaborCostPerMonth * 0.7;

        // Net monthly benefit
        const netMonthlyBenefit = laborSavingsPerMonth - pricing.monthlyCost;

        // ROI calculation
        const roiMonths = netMonthlyBenefit > 0
            ? Math.ceil(pricing.setupCost / netMonthlyBenefit)
            : Infinity;

        return {
            setup_cost_eur: pricing.setupCost,
            monthly_cost_eur: pricing.monthlyCost,
            labor_savings_eur: Math.round(laborSavingsPerMonth),
            net_monthly_benefit_eur: Math.round(netMonthlyBenefit),
            roi_months: roiMonths,
            parts_per_hour: partsPerHour,
            parts_per_month: partsPerMonth,
            labor_reduction_percent: 70
        };
    }

    /**
     * Estimate delivery timeline
     */
    estimateDelivery(skillId, simResult) {
        const baseDays = PRICING.skills[skillId]?.implementationDays || 10;

        // Adjust based on risk
        let adjustedDays = baseDays;
        if (simResult.riskScore >= 0.2) adjustedDays += 2;
        if (simResult.riskScore >= 0.5) adjustedDays += 5;

        // Standard phases
        const phases = [
            {
                name: 'Vor-Ort-Check',
                days: 1,
                description: 'Vermessung und finale Planung'
            },
            {
                name: 'Hardware-Lieferung',
                days: Math.ceil(adjustedDays * 0.4),
                description: 'Roboter, Greifer, Sicherheitstechnik'
            },
            {
                name: 'Installation',
                days: Math.ceil(adjustedDays * 0.3),
                description: 'Mechanischer Aufbau und Verkabelung'
            },
            {
                name: 'Inbetriebnahme',
                days: Math.ceil(adjustedDays * 0.2),
                description: 'Programmierung und Tests'
            },
            {
                name: 'Schulung & Go-Live',
                days: 1,
                description: 'Mitarbeiter-Einweisung'
            }
        ];

        // Calculate total
        const totalDays = phases.reduce((sum, p) => sum + p.days, 0);

        // Generate text
        let text;
        if (totalDays <= 7) {
            text = 'Go-Live in 7 Tagen möglich';
        } else if (totalDays <= 14) {
            text = 'Go-Live in 7-14 Tagen möglich';
        } else {
            text = `Go-Live in ca. ${totalDays} Tagen`;
        }

        return {
            text,
            days: totalDays,
            phases
        };
    }

    /**
     * Get total processing time
     */
    getProcessingTime(project) {
        if (!project.startTime) return 0;
        return Math.round((Date.now() - project.startTime) / 1000);
    }

    /**
     * Save response to file
     */
    async saveResponse(response, projectId) {
        const outputDir = path.join(config.output.processed, projectId);
        const responsePath = path.join(outputDir, 'offer.json');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(responsePath, JSON.stringify(response, null, 2));
        console.log(`[Phase5] Offer saved to: ${responsePath}`);
    }
}

module.exports = new Phase5Output();
