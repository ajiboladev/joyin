// ===== GLOBAL VARIABLES & INITIALIZATION =====
const contentArea = document.getElementById('content-area');
const navLinks = document.querySelectorAll('.nav-link');
const quickLinks = document.querySelectorAll('.quick-link-card, .footer-links a');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mainNav = document.querySelector('.main-nav');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestionTags = document.querySelectorAll('.suggestion-tag');

// Current active page
let currentPage = 'welcome';

// ===== INITIALIZE HELP CENTER =====
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    setupNavigation();
    setupSearch();
    setupMobileMenu();
    setupFAQToggle();
    
    // Handle initial hash in URL
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
        loadPage(initialHash);
    }
});

// ===== NAVIGATION SETUP =====
function setupNavigation() {
    // Handle main navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            loadPage(page);
            
            // Update URL hash without page reload
            window.history.pushState({page}, '', `#${page}`);
            
            // Close mobile menu if open
            mainNav.classList.remove('active');
        });
    });
    
    // Handle quick link clicks
    quickLinks.forEach(link => {
        if (link.getAttribute('data-page')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.getAttribute('data-page');
                loadPage(page);
                
                // Update URL hash
                window.history.pushState({page}, '', `#${page}`);
            });
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(e) {
        const hash = window.location.hash.substring(1);
        if (hash) {
            loadPage(hash);
        } else {
            loadWelcome();
        }
    });
}

// ===== PAGE LOADING FUNCTION =====
function loadPage(pageName) {
    // Don't reload if already on this page
    if (currentPage === pageName) return;
    
    // Update active navigation link
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    currentPage = pageName;
    
    // Show loading state
    contentArea.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading content...</p>
        </div>
    `;
    
    // SCROLL TO TOP OF CONTENT AREA
    const contentStartPosition = contentArea.offsetTop - 100; // 100px buffer
    window.scrollTo({
        top: contentStartPosition,
        behavior: 'smooth' // Smooth scrolling
    });
    
    // Load content from JSON file
    fetch(`content/${pageName}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Page not found');
            }
            return response.json();
        })
        .then(data => {
            renderPage(data);
            
            // SCROLL AGAIN AFTER CONTENT LOADS (in case loading took time)
            setTimeout(() => {
                const newContentStart = contentArea.offsetTop - 80;
                window.scrollTo({
                    top: newContentStart,
                    behavior: 'smooth'
                });
            }, 100);
        })
        .catch(error => {
            console.error('Error loading page:', error);
            contentArea.innerHTML = `
                <div class="error-message">
                    <h2>Page Not Found</h2>
                    <p>Sorry, we couldn't find the page you're looking for.</p>
                    <a href="#getting-started" class="back-link" data-page="getting-started">Go to Getting Started</a>
                </div>
            `;
            
            // Scroll to error message
            setTimeout(() => {
                const errorPosition = contentArea.offsetTop - 80;
                window.scrollTo({
                    top: errorPosition,
                    behavior: 'smooth'
                });
            }, 100);
        });
}

// ===== PAGE RENDERING =====
function renderPage(pageData) {
    let contentHTML = '';
    
    if (pageData.type === 'faq') {
        // Render FAQ page
        contentHTML = `
            <div class="content-page">
                <div class="page-header">
                    <h1>${pageData.title}</h1>
                    <p>${pageData.description}</p>
                </div>
                <div class="faq-section">
                    <h2 class="section-title"><i class="fas fa-question-circle"></i>Frequently Asked Questions</h2>
                    <div class="faq-list">
        `;
        
        pageData.faqs.forEach(faq => {
            contentHTML += `
                <div class="faq-item">
                    <div class="faq-question">
                        ${faq.question}
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="faq-answer">
                        ${faq.answer}
                    </div>
                </div>
            `;
        });
        
        contentHTML += `
                    </div>
                </div>
            </div>
        `;
        
    } else if (pageData.type === 'article') {
        // Render article page
        contentHTML = `
            <div class="content-page">
                <div class="page-header">
                    <h1>${pageData.title}</h1>
                    <p>${pageData.description}</p>
                </div>
                <div class="article-section">
                    <div class="article-content">
                        ${pageData.content}
                    </div>
                </div>
            </div>
        `;
        
    } else if (pageData.type === 'contact') {
        // Render contact form
        contentHTML = `
            <div class="content-page">
                <div class="page-header">
                    <h1>${pageData.title}</h1>
                    <p>${pageData.description}</p>
                </div>
                <div class="contact-section">
                    <form class="contact-form" id="support-form">
                        ${pageData.formFields.map(field => `
                            <div class="form-group">
                                <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
                                ${field.type === 'textarea' ? 
                                    `<textarea id="${field.id}" name="${field.name}" ${field.required ? 'required' : ''}></textarea>` :
                                    `<input type="${field.type}" id="${field.id}" name="${field.name}" ${field.required ? 'required' : ''}>`
                                }
                            </div>
                        `).join('')}
                        
                        <button type="submit" class="submit-btn">
                            <i class="fas fa-paper-plane"></i>Send Message
                        </button>
                    </form>
                    
                    <div class="contact-info">
                        <h3>Other Ways to Reach Us</h3>
                        <div class="contact-methods">
                            ${pageData.contactMethods.map(method => `
                                <div class="contact-method">
                                    <i class="${method.icon}"></i>
                                    <div>
                                        <strong>${method.title}</strong>
                                        <p>${method.details}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ADD HIGHLIGHT CLASS TO NEW CONTENT
    contentHTML = `<div class="content-page content-highlight">${contentHTML}</div>`;
    
    contentArea.innerHTML = contentHTML;
    
    // Re-attach FAQ toggle listeners
    setupFAQToggle();
    
    // Attach contact form handler if applicable
    if (pageData.type === 'contact') {
        document.getElementById('support-form').addEventListener('submit', handleContactSubmit);
    }
    
    // Remove highlight class after animation completes
    setTimeout(() => {
        const contentPage = document.querySelector('.content-page');
        if (contentPage) {
            contentPage.classList.remove('content-highlight');
        }
    }, 1500);
}

// ===== WELCOME PAGE =====
function loadWelcome() {
    contentArea.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <i class="fas fa-hands-helping"></i>
            </div>
            <h2>Welcome to JOYIN Help</h2>
            <p>Select a topic from the navigation or quick links above to get started. We're here to help you make the most of JOYIN v1.0.0!</p>
        </div>
    `;
    currentPage = 'welcome';
    
    // Reset active navigation
    navLinks.forEach(link => link.classList.remove('active'));
}

// ===== FAQ TOGGLE FUNCTIONALITY =====
function setupFAQToggle() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            item.classList.toggle('active');
        });
    });
}

// ===== SEARCH FUNCTIONALITY =====
function setupSearch() {
    // Search button click
    searchBtn.addEventListener('click', performSearch);
    
    // Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Suggestion tag clicks
    suggestionTags.forEach(tag => {
        tag.addEventListener('click', function() {
            searchInput.value = this.textContent;
            performSearch();
        });
    });
}

function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (query) {
        // In a real implementation, this would search through your content
        // For now, we'll just show a search results message
        contentArea.innerHTML = `
            <div class="search-results content-highlight">
                <h2>Search Results for "${query}"</h2>
                <p>Search functionality will be fully implemented in a future update.</p>
                <div class="search-tips">
                    <h3>Try these pages instead:</h3>
                    <ul>
                        <li><a href="#getting-started" data-page="getting-started">Getting Started</a> - For basic how-to questions</li>
                        <li><a href="#troubleshooting" data-page="troubleshooting">Troubleshooting</a> - For technical issues</li>
                        <li><a href="#account-settings" data-page="account-settings">Account & Privacy</a> - For settings questions</li>
                    </ul>
                </div>
            </div>
        `;
        
        // Update URL
        window.history.pushState({search: query}, '', `#search=${encodeURIComponent(query)}`);
        currentPage = 'search';
        
        // SCROLL TO SEARCH RESULTS
        setTimeout(() => {
            const searchResultsTop = contentArea.offsetTop - 80;
            window.scrollTo({
                top: searchResultsTop,
                behavior: 'smooth'
            });
            
            // Remove highlight after animation
            setTimeout(() => {
                const searchResults = document.querySelector('.search-results');
                if (searchResults) {
                    searchResults.classList.remove('content-highlight');
                }
            }, 1500);
        }, 100);
    }
}

// ===== MOBILE MENU =====
function setupMobileMenu() {
    mobileMenuBtn.addEventListener('click', function() {
        mainNav.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.main-nav') && !e.target.closest('.mobile-menu-btn')) {
            mainNav.classList.remove('active');
        }
    });
}

// ===== CONTACT FORM HANDLER =====
function handleContactSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('.submit-btn');
    
    // Disable button and show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Sending...';
    submitBtn.disabled = true;
    
    // In a real implementation, you would send this to your server
    // For now, we'll simulate a successful submission
    setTimeout(() => {
        alert('Thank you for your message! Our support team will get back to you within 24 hours.');
        form.reset();
        
        // Reset button
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>Send Message';
        submitBtn.disabled = false;
    }, 1500);
}