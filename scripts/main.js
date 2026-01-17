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
  initCookieBanner();
  initScrollProgress();
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
    anchor.addEventListener('click', function (e) {
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

  /**
   * Handle selected files
   * ERKÄRUNG: Diese Funktion wird aufgerufen wenn du ein Video auswählst
   * Sie prüft ob die Datei gültig ist und startet dann den Upload
   */
  function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];

    // Prüfung 1: Ist es ein Video?
    if (!file.type.startsWith('video/')) {
      showNotification('Bitte laden Sie eine Videodatei hoch.', 'error');
      return;
    }

    // Prüfung 2: Ist die Datei kleiner als 500MB?
    if (file.size > 500 * 1024 * 1024) {
      showNotification('Die Datei ist zu groß. Maximal 500MB erlaubt.', 'error');
      return;
    }

    // NEU: Starte echten Upload zum Backend
    uploadToBackend(file);
  }

  /**
   * Upload video to Backend API
   * ERKLÄRUNG: 
   * 1. FormData = Container um Dateien zu versenden
   * 2. fetch() = Browser-Funktion für HTTP-Anfragen
   * 3. POST = HTTP-Methode zum Senden von Daten
   */
  async function uploadToBackend(file) {
    const uploadProgress = document.querySelector('.upload-progress');
    const uploadZoneContent = document.querySelector('.upload-zone__content');

    // Zeige Upload-Fortschritt an
    if (uploadProgress && uploadZoneContent) {
      uploadZoneContent.style.display = 'none';
      uploadProgress.style.display = 'block';
    }

    const progressBar = uploadProgress?.querySelector('.upload-progress__bar-fill');
    const progressText = uploadProgress?.querySelector('.upload-progress__text');

    try {
      // SCHRITT 1: Zeige "Uploading..." Status
      if (progressText) progressText.textContent = 'Uploading...';
      if (progressBar) progressBar.style.width = '30%';

      // SCHRITT 2: Erstelle FormData mit Video und Skill-ID
      // FormData ist wie ein Paket, das wir an den Server schicken
      const formData = new FormData();
      formData.append('video', file);                    // Die Video-Datei
      formData.append('skillId', 'pick-place');          // Welcher Skill (vorerst hardcoded)

      // SCHRITT 3: Sende an Backend
      // Nutzt ServionicsConfig für URL (localhost oder Production)
      if (progressText) progressText.textContent = 'Analysiere...';
      if (progressBar) progressBar.style.width = '60%';

      // API URL aus Config (passt sich automatisch an localhost/production an)
      const API_URL = window.ServionicsConfig?.API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/project/upload`, {
        method: 'POST',
        headers: {
          // Auth Header für Production (in Dev wird es vom Server ignoriert)
          'Authorization': window.ServionicsConfig?.getAuthHeader() || ''
        },
        body: formData
      });

      // SCHRITT 4: Verarbeite die Antwort vom Server
      const result = await response.json();

      if (progressBar) progressBar.style.width = '100%';
      if (progressText) progressText.textContent = '100%';

      // Kurze Pause für visuelles Feedback
      await new Promise(resolve => setTimeout(resolve, 500));

      // SCHRITT 5: Zeige das Ergebnis an
      if (result.success) {
        // Pipeline erfolgreich → Zeige Angebot
        showOfferResult(result);
      } else if (result.phase === 'quality_gate') {
        // Quality Gate nicht bestanden → Zeige Feedback
        showQualityFeedback(result);
      } else {
        // Anderer Fehler
        showNotification(result.error || 'Ein Fehler ist aufgetreten', 'error');
        resetUploadZone();
      }

    } catch (error) {
      // Fehlerbehandlung (z.B. Server nicht erreichbar)
      console.error('Upload failed:', error);
      showNotification('Verbindung zum Server fehlgeschlagen. Läuft der Backend-Server?', 'error');
      resetUploadZone();
    }
  }

  /**
   * Zeige Quality-Feedback wenn Score zu niedrig
   */
  function showQualityFeedback(result) {
    const projectCheck = document.querySelector('.project-check__container');
    if (!projectCheck) return;

    const levelColors = {
      'good': '#10B981',
      'medium': '#F59E0B',
      'poor': '#EF4444'
    };

    const levelLabels = {
      'good': 'Gut',
      'medium': 'Mittel',
      'poor': 'Schwach'
    };

    projectCheck.innerHTML = `
      <div class="quality-feedback">
        <div class="quality-feedback__header">
          <div class="quality-feedback__score" style="border-color: ${levelColors[result.qualityLevel]}">
            <span class="quality-feedback__number">${result.qualityScore}</span>
            <span class="quality-feedback__label">Qualität: ${levelLabels[result.qualityLevel]}</span>
          </div>
          <h3>Video-Qualität nicht ausreichend</h3>
          <p class="text-muted">${result.feedback}</p>
        </div>
        
        <div class="quality-feedback__suggestions">
          <h4>Verbesserungsvorschläge:</h4>
          <ul>
            ${result.suggestions.map(s => `<li>💡 ${s}</li>`).join('')}
          </ul>
        </div>
        
        <div class="quality-feedback__metrics">
          <div class="metric">
            <span class="metric__label">Helligkeit</span>
            <div class="metric__bar"><div class="metric__fill" style="width: ${result.metrics?.brightness || 0}%"></div></div>
          </div>
          <div class="metric">
            <span class="metric__label">Schärfe</span>
            <div class="metric__bar"><div class="metric__fill" style="width: ${result.metrics?.motionBlur || 0}%"></div></div>
          </div>
          <div class="metric">
            <span class="metric__label">Frames</span>
            <div class="metric__bar"><div class="metric__fill" style="width: ${result.metrics?.frameCount || 0}%"></div></div>
          </div>
        </div>
        
        <button class="btn btn--primary" onclick="location.reload()">Neues Video hochladen</button>
      </div>
    `;

    addQualityFeedbackStyles();
  }

  /**
   * Zeige erfolgreiches Angebot
   */
  function showOfferResult(result) {
    const projectCheck = document.querySelector('.project-check__container');
    if (!projectCheck) return;

    const statusColors = {
      'green': '#10B981',
      'yellow': '#F59E0B',
      'red': '#EF4444'
    };

    projectCheck.innerHTML = `
      <div class="offer-result">
        <div class="offer-result__header">
          <div class="offer-result__status" style="background: ${statusColors[result.feasibility_color]}20; border-color: ${statusColors[result.feasibility_color]}">
            <span style="color: ${statusColors[result.feasibility_color]}">●</span>
            ${result.feasibility_message}
          </div>
          <h3>Projekt ${result.project_id}</h3>
        </div>
        
        <div class="offer-result__grid">
          <div class="offer-result__card">
            <span class="offer-result__icon">⏱️</span>
            <span class="offer-result__value">${result.delivery_estimate}</span>
            <span class="offer-result__label">Umsetzungszeit</span>
          </div>
          <div class="offer-result__card">
            <span class="offer-result__icon">💰</span>
            <span class="offer-result__value">${result.tco_estimate?.monthly_cost_eur?.toLocaleString('de-DE')} €</span>
            <span class="offer-result__label">Monatliche Kosten</span>
          </div>
          <div class="offer-result__card">
            <span class="offer-result__icon">📈</span>
            <span class="offer-result__value">${result.tco_estimate?.roi_months} Monate</span>
            <span class="offer-result__label">ROI Break-Even</span>
          </div>
        </div>
        
        <div class="offer-result__actions">
          <a href="dashboard.html" class="btn btn--primary">Zum Dashboard</a>
          <button class="btn btn--secondary" onclick="location.reload()">Neues Projekt</button>
        </div>
      </div>
    `;

    addOfferResultStyles();
  }

  /**
   * Reset upload zone to initial state
   */
  function resetUploadZone() {
    const uploadProgress = document.querySelector('.upload-progress');
    const uploadZoneContent = document.querySelector('.upload-zone__content');

    if (uploadProgress) uploadProgress.style.display = 'none';
    if (uploadZoneContent) uploadZoneContent.style.display = 'flex';
  }

  /**
   * CSS für Quality Feedback
   */
  function addQualityFeedbackStyles() {
    if (document.getElementById('quality-feedback-styles')) return;

    const style = document.createElement('style');
    style.id = 'quality-feedback-styles';
    style.textContent = `
      .quality-feedback {
        text-align: center;
        padding: var(--space-6);
      }
      .quality-feedback__score {
        width: 100px;
        height: 100px;
        margin: 0 auto var(--space-4);
        border: 4px solid;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .quality-feedback__number {
        font-size: var(--text-3xl);
        font-weight: var(--font-bold);
      }
      .quality-feedback__label {
        font-size: var(--text-xs);
        color: var(--color-gray-400);
      }
      .quality-feedback__suggestions {
        background: rgba(255,255,255,0.03);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin: var(--space-6) 0;
        text-align: left;
      }
      .quality-feedback__suggestions ul {
        list-style: none;
        padding: 0;
        margin: var(--space-3) 0 0;
      }
      .quality-feedback__suggestions li {
        padding: var(--space-2) 0;
        color: var(--color-gray-300);
      }
      .quality-feedback__metrics {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        margin-bottom: var(--space-6);
      }
      .metric {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .metric__label {
        width: 80px;
        font-size: var(--text-sm);
        color: var(--color-gray-400);
      }
      .metric__bar {
        flex: 1;
        height: 8px;
        background: rgba(255,255,255,0.1);
        border-radius: var(--radius-full);
        overflow: hidden;
      }
      .metric__fill {
        height: 100%;
        background: var(--color-accent-500);
        border-radius: var(--radius-full);
        transition: width 0.5s ease;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * CSS für Offer Result
   */
  function addOfferResultStyles() {
    if (document.getElementById('offer-result-styles')) return;

    const style = document.createElement('style');
    style.id = 'offer-result-styles';
    style.textContent = `
      .offer-result {
        text-align: center;
        padding: var(--space-6);
      }
      .offer-result__status {
        display: inline-block;
        padding: var(--space-2) var(--space-4);
        border: 1px solid;
        border-radius: var(--radius-full);
        font-size: var(--text-sm);
        margin-bottom: var(--space-4);
      }
      .offer-result__grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-4);
        margin: var(--space-6) 0;
      }
      .offer-result__card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .offer-result__icon {
        font-size: var(--text-2xl);
      }
      .offer-result__value {
        font-size: var(--text-xl);
        font-weight: var(--font-bold);
      }
      .offer-result__label {
        font-size: var(--text-xs);
        color: var(--color-gray-400);
      }
      .offer-result__actions {
        display: flex;
        gap: var(--space-3);
        justify-content: center;
      }
      @media (max-width: 640px) {
        .offer-result__grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
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

/**
 * DSGVO Cookie Banner
 */
function initCookieBanner() {
  // Check if user already responded
  if (localStorage.getItem('servionics_cookies') !== null) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-banner__content">
      <div class="cookie-banner__text">
        <strong>🍪 Cookie-Hinweis</strong>
        <p>Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung zu bieten. 
           <a href="#datenschutz">Mehr erfahren</a></p>
      </div>
      <div class="cookie-banner__actions">
        <button class="cookie-banner__btn cookie-banner__btn--accept">Akzeptieren</button>
        <button class="cookie-banner__btn cookie-banner__btn--decline">Nur notwendige</button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .cookie-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(10, 22, 40, 0.98);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px 24px;
      z-index: 9999;
      animation: slideUp 0.4s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    
    .cookie-banner__content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    
    .cookie-banner__text {
      flex: 1;
      min-width: 280px;
    }
    
    .cookie-banner__text strong {
      display: block;
      margin-bottom: 4px;
      color: var(--color-white);
    }
    
    .cookie-banner__text p {
      font-size: 14px;
      color: var(--color-gray-400);
      margin: 0;
    }
    
    .cookie-banner__text a {
      color: var(--color-accent-400);
      text-decoration: underline;
    }
    
    .cookie-banner__actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }
    
    .cookie-banner__btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }
    
    .cookie-banner__btn--accept {
      background: var(--color-accent-500);
      color: var(--color-primary-900);
    }
    
    .cookie-banner__btn--accept:hover {
      background: var(--color-accent-400);
      transform: translateY(-2px);
    }
    
    .cookie-banner__btn--decline {
      background: transparent;
      color: var(--color-gray-300);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .cookie-banner__btn--decline:hover {
      border-color: rgba(255, 255, 255, 0.4);
      color: var(--color-white);
    }
    
    @media (max-width: 640px) {
      .cookie-banner__actions {
        width: 100%;
      }
      
      .cookie-banner__btn {
        flex: 1;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(banner);

  // Event handlers
  banner.querySelector('.cookie-banner__btn--accept').addEventListener('click', () => {
    localStorage.setItem('servionics_cookies', 'all');
    banner.style.animation = 'slideUp 0.3s ease reverse';
    setTimeout(() => banner.remove(), 300);
  });

  banner.querySelector('.cookie-banner__btn--decline').addEventListener('click', () => {
    localStorage.setItem('servionics_cookies', 'essential');
    banner.style.animation = 'slideUp 0.3s ease reverse';
    setTimeout(() => banner.remove(), 300);
  });
}

/**
 * Scroll Progress Indicator
 */
function initScrollProgress() {
  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.innerHTML = '<div class="scroll-progress__fill"></div>';

  const style = document.createElement('style');
  style.textContent = `
    .scroll-progress {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.1);
      z-index: 9999;
    }
    
    .scroll-progress__fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--color-accent-500), var(--color-success-500));
      transition: width 0.1s ease-out;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(progressBar);

  const fill = progressBar.querySelector('.scroll-progress__fill');

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    fill.style.width = `${Math.min(scrollPercent, 100)}%`;
  });
}
