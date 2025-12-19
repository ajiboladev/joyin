/* 
 *  JOYIN - Feedback System
 *  User feedback submission & management
 *  © 2025 JOYIN. All rights reserved.
 */

// Import Firebase (adjust path to match your project)
import { db, auth } from "../firebase.js";
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// DOM Elements
const feedbackForm = document.getElementById('feedbackForm');
const messageTextarea = document.getElementById('message');
const charCount = document.getElementById('charCount');
const submitBtn = document.getElementById('submitBtn');
const statusMessage = document.getElementById('statusMessage');
const userInfoCard = document.getElementById('userInfoCard');
const userEmailPreview = document.getElementById('userEmailPreview');
const feedbackList = document.getElementById('feedbackList');
const recentFeedback = document.getElementById('recentFeedback');

// Current user data
let currentUser = null;
let userData = null;

// Initialize
async function init() {
    console.log('💬 Feedback system initializing...');
    
    // Setup character counter
    messageTextarea.addEventListener('input', updateCharCount);
    updateCharCount(); // Initial count
    
    // Setup form submission
    feedbackForm.addEventListener('submit', handleSubmit);
    
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserProfile();
            await loadUserFeedback();
        } else {
            // User not logged in - redirect or show message
            showStatus('Please sign in to submit feedback', 'error');
            setTimeout(() => {
                window.location.href = '../login/?view=login';
            }, 2000);
        }
    });
}

// Load user profile from Firestore
async function loadUserProfile() {
    try {
        // In a real app, you'd fetch user data from Firestore
        // For now, use auth data
        const userName = currentUser.displayName || currentUser.email.split('@')[0];
        const userEmail = currentUser.email;
        
        // Update UI
        document.querySelector('.user-name').textContent = userName;
        document.querySelector('.user-email').textContent = userEmail;
        userEmailPreview.textContent = userEmail;
        
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Load user's previous feedback
async function loadUserFeedback() {
    try {
        if (!currentUser) return;
        
        const q = query(
            collection(db, 'feedback'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            feedbackList.innerHTML = `
                <div class="no-feedback">
                    <i class="fas fa-inbox"></i>
                    <p>You haven't submitted any feedback yet.</p>
                </div>
            `;
            return;
        }
        
        feedbackList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const feedbackItem = createFeedbackItem(data);
            feedbackList.appendChild(feedbackItem);
        });
        
    } catch (error) {
        console.error('Error loading feedback:', error);
        feedbackList.innerHTML = `
            <div class="no-feedback">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Could not load your feedback history.</p>
            </div>
        `;
    }
}

// Create HTML for a feedback item
function createFeedbackItem(data) {
    const div = document.createElement('div');
    div.className = 'feedback-item';
    
    const typeLabels = {
        'idea': '💡 Idea',
        'bug': '🐛 Bug Report',
        'praise': '❤️ Praise',
        'other': '📝 Other'
    };
    
    const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
    
    const status = data.adminReply ? 'replied' : 'pending';
    const statusIcon = status === 'replied' ? 'fas fa-check-circle' : 'fas fa-clock';
    const statusText = status === 'replied' ? 'Replied' : 'Pending Reply';
    
    div.innerHTML = `
        <div class="feedback-meta">
            <span class="feedback-type ${data.type}">${typeLabels[data.type] || data.type}</span>
            <span class="feedback-date">${dateStr}</span>
        </div>
        <div class="feedback-content">${data.message.substring(0, 150)}${data.message.length > 150 ? '...' : ''}</div>
        <div class="feedback-status ${status}">
            <i class="${statusIcon}"></i>
            <span>${statusText}</span>
        </div>
    `;
    
    return div;
}

// Update character counter
function updateCharCount() {
    const length = messageTextarea.value.length;
    charCount.textContent = length;
    
    if (length > 1900) {
        charCount.style.color = 'var(--joyin-error)';
    } else if (length > 1500) {
        charCount.style.color = 'var(--joyin-warning)';
    } else {
        charCount.style.color = 'var(--joyin-white)';
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showStatus('Please sign in to submit feedback', 'error');
        return;
    }
    
    // Get form data
    const formData = new FormData(feedbackForm);
    const type = formData.get('type');
    const message = formData.get('message').trim();
    const allowReply = formData.get('allow_reply') === 'on';
    
    // Validation
    if (message.length < 10) {
        showStatus('Please write at least 10 characters', 'error');
        messageTextarea.focus();
        return;
    }
    
    if (message.length > 2000) {
        showStatus('Message is too long (max 2000 characters)', 'error');
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        // Prepare feedback data
        const feedbackData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            type: type,
            message: message,
            allowReply: allowReply,
            status: 'new', // new, read, replied, closed
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        // Save to Firestore
        const docRef = await addDoc(collection(db, 'feedback'), feedbackData);
        
        console.log('Feedback saved with ID:', docRef.id);
        
        // Show success message
        showStatus('✅ Feedback sent successfully! We\'ll get back to you soon.', 'success');
        
        // Reset form
        feedbackForm.reset();
        updateCharCount();
        
        // Reload feedback list
        await loadUserFeedback();
        
        // Re-enable button after 3 seconds
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Feedback';
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showStatus('❌ Failed to send feedback. Please try again.', 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Feedback';
    }
}

// Show status message
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);