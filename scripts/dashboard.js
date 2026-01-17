/**
 * Servionics Dashboard JavaScript
 * Dashboard-specific interactions and animations
 */

(function() {
    'use strict';

    // Counter Animation for Dashboard Numbers
    function animateCounters() {
        const counters = document.querySelectorAll('[data-counter]');
        
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.counter, 10);
            const duration = 1500;
            const start = 0;
            const startTime = performance.now();
            
            function updateCounter(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-out)
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(start + (target - start) * easeOut);
                
                counter.textContent = current.toLocaleString('de-DE');
                
                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString('de-DE');
                }
            }
            
            requestAnimationFrame(updateCounter);
        });
    }

    // Animate Gauge Charts
    function animateGauges() {
        const gauges = document.querySelectorAll('.gauge__fill');
        
        gauges.forEach(gauge => {
            const dashOffset = gauge.getAttribute('stroke-dashoffset');
            gauge.style.strokeDashoffset = '251.2'; // Start from empty
            
            setTimeout(() => {
                gauge.style.strokeDashoffset = dashOffset;
            }, 300);
        });
    }

    // Progress Bars Animation
    function animateProgressBars() {
        const progressBars = document.querySelectorAll('.progress-bar__fill');
        
        progressBars.forEach(bar => {
            const targetWidth = bar.style.width;
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.width = targetWidth;
            }, 200);
        });
    }

    // Filter Buttons
    function initializeFilters() {
        const filterGroups = document.querySelectorAll('.dashboard-section__filters');
        
        filterGroups.forEach(group => {
            const buttons = group.querySelectorAll('.filter-btn');
            
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remove active from all
                    buttons.forEach(btn => btn.classList.remove('filter-btn--active'));
                    // Add active to clicked
                    button.classList.add('filter-btn--active');
                    
                    // Trigger filter logic (placeholder for actual filtering)
                    const filter = button.textContent.trim().toLowerCase();
                    console.log('Filter selected:', filter);
                });
            });
        });
    }

    // Ticket Item Click Handler
    function initializeTickets() {
        const tickets = document.querySelectorAll('.ticket-item');
        
        tickets.forEach(ticket => {
            ticket.addEventListener('click', () => {
                // Visual feedback
                ticket.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    ticket.style.transform = '';
                }, 100);
                
                // In a real app, this would open a modal or navigate to detail page
                console.log('Ticket clicked:', ticket.querySelector('.ticket-item__id')?.textContent);
            });
        });
    }

    // Project Card Detail Button
    function initializeProjectCards() {
        const detailButtons = document.querySelectorAll('.project-card .btn');
        
        detailButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.textContent.trim();
                const projectCard = button.closest('.project-card');
                const projectId = projectCard.querySelector('.project-card__id')?.textContent;
                
                console.log(`Action "${action}" on project ${projectId}`);
                
                // Show a simple toast notification
                showToast(`${action} für ${projectId}`);
            });
        });
    }

    // Simple Toast Notification
    function showToast(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(0, 212, 255, 0.9);
            color: #0A1628;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add toast animations to document
    function addToastStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Real-time Clock Update (for demo purposes)
    function initializeLiveClock() {
        // Update activity times every minute (simulated)
        setInterval(() => {
            const liveIndicators = document.querySelectorAll('.status-dot--active');
            liveIndicators.forEach(dot => {
                dot.style.animation = 'none';
                dot.offsetHeight; // Trigger reflow
                dot.style.animation = 'pulse 2s infinite';
            });
        }, 60000);
    }

    // Initialize Dashboard
    function initDashboard() {
        addToastStyles();
        
        // Run animations with slight delays
        setTimeout(animateCounters, 100);
        setTimeout(animateGauges, 200);
        setTimeout(animateProgressBars, 300);
        
        // Initialize interactive elements
        initializeFilters();
        initializeTickets();
        initializeProjectCards();
        initializeLiveClock();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDashboard);
    } else {
        initDashboard();
    }
})();
