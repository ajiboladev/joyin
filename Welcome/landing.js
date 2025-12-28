/* 
 *  JOYIN Landing Page Interaction
 *  Smooth onboarding experience
 *  © 2025 JOYIN. All rights reserved.
 */

// Current page state
let currentPage = 1;
const totalPages = 4;

// DOM Elements
const pages = document.querySelectorAll('.landing-page');
const dots = document.querySelectorAll('.dot');
const progressFill = document.getElementById('progressFill');
const skipBtn = document.getElementById('skipBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const userCount = document.getElementById('userCount');

// Initialize
function init() {
    console.log('🎯 JOYIN Landing initialized');
    
    // Animate user count
    animateUserCount();
    
    // Set up event listeners
    setupEventListeners();
    
    // Start with page 1 active
    showPage(1);
}

// Animate user counter
function animateUserCount() {
    let count = 0;
    const target = 1247; // Example number
    const increment = Math.ceil(target / 100);
    const timer = setInterval(() => {
        count += increment;
        if (count >= target) {
            count = target;
            clearInterval(timer);
        }
        userCount.textContent = count.toLocaleString();
    }, 20);
}

// Show specific page
function showPage(pageNumber) {
    // Update current page
    currentPage = pageNumber;
    
    // Hide all pages
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.opacity = '0';
        page.style.transform = 'translateY(20px)';
    });
    
    // Show current page
    const currentPageElement = document.getElementById(`page${pageNumber}`);
    currentPageElement.classList.add('active');
    
    // Animate in
    setTimeout(() => {
        currentPageElement.style.opacity = '1';
        currentPageElement.style.transform = 'translateY(0)';
    }, 50);
    
    // Update progress indicator
    updateProgress(pageNumber);
    
    // Update dots
    dots.forEach(dot => {
        if (parseInt(dot.dataset.page) === pageNumber) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update progress bar
function updateProgress(pageNumber) {
    const progress = (pageNumber / totalPages) * 100;
    progressFill.style.width = `${progress}%`;
}

// Setup all event listeners
function setupEventListeners() {
    // Skip button
    skipBtn.addEventListener('click', () => {
        redirectToApp();
    });
    
    // Progress dots
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const pageNumber = parseInt(dot.dataset.page);
            showPage(pageNumber);
        });
    });
    
    // Page 1 buttons
    document.getElementById('startBtn').addEventListener('click', () => {
        redirectToApp();
    });
    
    document.getElementById('nextBtn1').addEventListener('click', () => {
        showPage(2);
    });
    
    // Page 2 buttons
    document.getElementById('prevBtn2').addEventListener('click', () => {
        showPage(1);
    });
    
    document.getElementById('nextBtn2').addEventListener('click', () => {
        showPage(3);
    });
    
    // Page 3 buttons
    document.getElementById('prevBtn3').addEventListener('click', () => {
        showPage(2);
    });
    
    document.getElementById('nextBtn3').addEventListener('click', () => {
        showPage(4);
    });
    
    // Page 4 buttons
    document.getElementById('prevBtn4').addEventListener('click', () => {
        showPage(3);
    });
    
    document.getElementById('finalSignupBtn').addEventListener('click', () => {
        redirectToApp();
    });
    
    document.getElementById('loginLink').addEventListener('click', (e) => {
        e.preventDefault();
        redirectToApp('login');
    });
    
    // Quick signup form
    // document.getElementById('quickSignupForm').addEventListener('submit', (e) => {
    //     e.preventDefault();
    //     showLoading();
    //     // Simulate signup process
    //     setTimeout(() => {
    //         redirectToApp();
    //     }, 1500);
    // });
    
    // Social buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showLoading();
            setTimeout(() => {
                redirectToApp();
            }, 1500);
        });
    });
    
    // Feature items hover
    document.querySelectorAll('.feature-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            document.querySelectorAll('.feature-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Right arrow or space to go next
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            if (currentPage < totalPages) {
                showPage(currentPage + 1);
            }
        }
        
        // Left arrow to go back
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentPage > 1) {
                showPage(currentPage - 1);
            }
        }
        
        // Escape to skip
        if (e.key === 'Escape') {
            redirectToApp();
        }
    });
    
    // Swipe navigation for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        // Swipe right (go back)
        if (diff > swipeThreshold && currentPage > 1) {
            showPage(currentPage - 1);
        }
        
        // Swipe left (go next)
        if (diff < -swipeThreshold && currentPage < totalPages) {
            showPage(currentPage + 1);
        }
    }
}

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
    setTimeout(() => {
        loadingOverlay.style.opacity = '1';
    }, 10);
}

// Redirect to main app
function redirectToApp(page = '') {
    showLoading();
    
    // Simulate loading time
    setTimeout(() => {
        if (page === 'login') {
            window.location.href = '../login/?view=login';
        } else {
            window.location.href = '../home/?view=home';
        }
    }, 8000);
}

// Auto-advance for demo purposes (optional)
let autoAdvanceTimer;
function startAutoAdvance() {
    autoAdvanceTimer = setInterval(() => {
        if (currentPage < totalPages) {
            showPage(currentPage + 1);
        } else {
            clearInterval(autoAdvanceTimer);
        }
    }, 10000); // 10 seconds per page
}

// Pause auto-advance on user interaction
document.addEventListener('mousemove', () => {
    if (autoAdvanceTimer) {
        clearInterval(autoAdvanceTimer);
        startAutoAdvance(); // Restart timer
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);

// Optional: Start auto-advance (uncomment if wanted)
// setTimeout(startAutoAdvance, 5000);

console.log('✨ Landing page ready. Use arrow keys to navigate, Esc to skip.');