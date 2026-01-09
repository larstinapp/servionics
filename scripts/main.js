/**
 * SERVIONICS - Main JavaScript
 * Industrial Automation Platform
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initSmoothScroll();
  initFAQ();
  initMobileMenu();
  initUploadZone();
  initParallax();
});

/**
 * Navbar scroll behavior
 */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
  });
}

/**
 * Scroll reveal animations
 */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  if (reveals.length === 0) return;

  const revealOnScroll = () => {
    reveals.forEach(element => {
      const windowHeight = window.innerHeight;
      const elementTop = element.getBoundingClientRect().top;
      const revealPoint = 150;

      if (elementTop < windowHeight - revealPoint) {
        element.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Check on load
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      
      const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu if open
      document.querySelector('.mobile-menu')?.classList.remove('active');
    });
  });
}

/**
 * FAQ accordion
 */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-item__question');
    
    question?.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all items
      faqItems.forEach(i => i.classList.remove('active'));
      
      // Open clicked item if it wasn't active
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/**
 * Mobile menu toggle
 */
function initMobileMenu() {
  const toggle = document.querySelector('.navbar__toggle');
  const menu = document.querySelector('.mobile-menu');
  const close = document.querySelector('.mobile-menu__close');

  toggle?.addEventListener('click', () => {
    menu?.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  close?.addEventListener('click', () => {
    menu?.classList.remove('active');
    document.body.style.overflow = '';
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menu?.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

/**
 * Upload zone drag & drop
 */
function initUploadZone() {
  const uploadZone = document.querySelector('.upload-zone');
  const fileInput = document.querySelector('.upload-zone__input');
  
  if (!uploadZone) return;

  // Click to upload
  uploadZone.addEventListener('click', () => {
    fileInput?.click();
  });

  // Drag events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
      uploadZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
      uploadZone.classList.remove('dragover');
    });
  });

  uploadZone.addEventListener('drop', handleDrop);

  function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
  }

  fileInput?.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Check if video
    if (!file.type.startsWith('video/')) {
      showNotification('Bitte laden Sie eine Videodatei hoch.', 'error');
      return;
    }

    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      showNotification('Die Datei ist zu groß. Maximal 500MB erlaubt.', 'error');
      return;
    }

    // Simulate upload
    simulateUpload(file);
  }

  function simulateUpload(file) {
    const uploadProgress = document.querySelector('.upload-progress');
    const uploadZoneContent = document.querySelector('.upload-zone__content');
    
    if (uploadProgress && uploadZoneContent) {
      uploadZoneContent.style.display = 'none';
      uploadProgress.style.display = 'block';
      
      // Simulate progress
      let progress = 0;
      const progressBar = uploadProgress.querySelector('.upload-progress__bar-fill');
      const progressText = uploadProgress.querySelector('.upload-progress__text');
      
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          setTimeout(() => {
            showAnalysisStep();
          }, 500);
        }
        
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
      }, 200);
    }
  }
}

/**
 * Show analysis step (mock)
 */
function showAnalysisStep() {
  const projectCheck = document.querySelector('.project-check__container');
  if (!projectCheck) return;

  projectCheck.innerHTML = `
    <div class="analysis-step">
      <div class="analysis-step__header">
        <div class="analysis-step__icon animate-glow">🔍</div>
        <h3>Analyse läuft...</h3>
        <p class="text-muted">Wir analysieren Ihr Video und erstellen eine 3D-Umgebung</p>
      </div>
      
      <div class="analysis-step__stages">
        <div class="analysis-stage active">
          <div class="analysis-stage__icon">✓</div>
          <div class="analysis-stage__content">
            <div class="analysis-stage__title">Video verarbeitet</div>
            <div class="analysis-stage__description">Frames extrahiert und analysiert</div>
          </div>
        </div>
        
        <div class="analysis-stage processing">
          <div class="analysis-stage__icon animate-pulse">⚙️</div>
          <div class="analysis-stage__content">
            <div class="analysis-stage__title">3D-Rekonstruktion</div>
            <div class="analysis-stage__description">Umgebung wird erstellt...</div>
          </div>
        </div>
        
        <div class="analysis-stage pending">
          <div class="analysis-stage__icon">○</div>
          <div class="analysis-stage__content">
            <div class="analysis-stage__title">AI Construction</div>
            <div class="analysis-stage__description">Roboterzelle platzieren</div>
          </div>
        </div>
        
        <div class="analysis-stage pending">
          <div class="analysis-stage__icon">○</div>
          <div class="analysis-stage__content">
            <div class="analysis-stage__title">Simulation</div>
            <div class="analysis-stage__description">Bewegungsanalyse</div>
          </div>
        </div>
      </div>
      
      <div class="analysis-step__preview">
        <div class="analysis-step__3d-placeholder">
          <div class="scan-line"></div>
          <span>🏭</span>
          <p>3D-Vorschau wird generiert...</p>
        </div>
      </div>
    </div>
  `;

  // Add styles for analysis step
  const style = document.createElement('style');
  style.textContent = `
    .analysis-step {
      text-align: center;
    }
    
    .analysis-step__header {
      margin-bottom: var(--space-8);
    }
    
    .analysis-step__icon {
      width: 80px;
      height: 80px;
      margin: 0 auto var(--space-4);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 212, 255, 0.15);
      border-radius: var(--radius-2xl);
      font-size: var(--text-4xl);
    }
    
    .analysis-step__stages {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      max-width: 400px;
      margin: 0 auto var(--space-8);
    }
    
    .analysis-stage {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background: rgba(255, 255, 255, 0.03);
      border-radius: var(--radius-lg);
      text-align: left;
    }
    
    .analysis-stage.active {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .analysis-stage.processing {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
    }
    
    .analysis-stage.pending {
      opacity: 0.5;
    }
    
    .analysis-stage__icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-lg);
    }
    
    .analysis-stage__title {
      font-weight: var(--font-semibold);
      color: var(--color-white);
      font-size: var(--text-sm);
    }
    
    .analysis-stage__description {
      font-size: var(--text-xs);
      color: var(--color-gray-400);
    }
    
    .analysis-step__preview {
      margin-top: var(--space-8);
    }
    
    .analysis-step__3d-placeholder {
      aspect-ratio: 16/9;
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: var(--radius-xl);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      font-size: var(--text-6xl);
      position: relative;
      overflow: hidden;
    }
    
    .analysis-step__3d-placeholder p {
      font-size: var(--text-sm);
      color: var(--color-gray-400);
    }
    
    .scan-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--color-accent-500), transparent);
      animation: scan 2s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Simple notification system
 */
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification__close">&times;</button>
  `;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'error' ? 'var(--color-error-500)' : 'var(--color-primary-700)'};
    border-radius: var(--radius-lg);
    color: white;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: var(--shadow-xl);
    z-index: 9999;
    animation: fadeInUp 0.3s ease;
  `;

  document.body.appendChild(notification);

  notification.querySelector('.notification__close').addEventListener('click', () => {
    notification.remove();
  });

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * Parallax effects
 */
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  
  if (parallaxElements.length === 0) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    parallaxElements.forEach(element => {
      const speed = element.dataset.parallax || 0.5;
      const yPos = -(scrollY * speed);
      element.style.transform = `translateY(${yPos}px)`;
    });
  });
}

/**
 * Counter animation
 */
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(start + (target - start) * easeOutQuart);
    
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Intersection observer for counter animation
 */
function initCounterAnimation() {
  const counters = document.querySelectorAll('[data-counter]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.counter);
        animateCounter(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

// Initialize counter animation when DOM is ready
document.addEventListener('DOMContentLoaded', initCounterAnimation);
