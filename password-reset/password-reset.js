// ============================================
// PASSWORD RESET SCRIPT - FULLY COMMENTED
// ============================================

// 🔥 FIREBASE IMPORTS
// ============================================
// signInWithEmailAndPassword - Logs user in to verify they know their password
// sendPasswordResetEmail - Sends password reset email to user's inbox
import { auth} from "../firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


// 🎯 DOM ELEMENTS - GRABBING HTML ELEMENTS
// ============================================
const resetButton = document.getElementById('reset-button');      // "Send Reset Link" button
const resetEmail = document.getElementById('resetEmail');        // Email input field
const currentPassword = document.getElementById('currentPassword'); // Current password field
const resetMessage = document.getElementById('resetMessage');    // Message display area
const togglePassword = document.getElementById('togglePassword'); // Eye icon button to show/hide password


// 👁️ PASSWORD VISIBILITY TOGGLE
// ============================================
// When user clicks the eye icon, toggle password visibility
togglePassword.addEventListener('click', () => {
    // Check current type: 'password' (hidden) or 'text' (visible)
    const type = currentPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    // Update the input field type
    currentPassword.setAttribute('type', type);
    
    // 🔄 CHANGE EYE ICON BASED ON VISIBILITY STATE
    // ============================================
    if (type === 'password') {
        // Password is HIDDEN - show OPEN eye icon
        togglePassword.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
    } else {
        // Password is VISIBLE - show eye with SLASH (crossed out)
        togglePassword.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65663 6.06 6.06M9.9 4.24C10.5883 4.0789 11.2931 3.99836 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19M14.12 14.12C13.8454 14.4148 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.4811 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8249 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2219 9.18488 10.8539C9.34884 10.4859 9.58525 10.1547 9.88 9.88" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 1L23 23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
    }
});


// 🔐 MAIN RESET PASSWORD FUNCTION
// ============================================
// Runs when user clicks "Send Reset Link" button
resetButton.addEventListener('click', async () => {
    // Get values from input fields (trim removes extra spaces)
    const email = resetEmail.value.trim();
    const password = currentPassword.value.trim();
    
    // ⛔ VALIDATION CHECKS
    // ====================
    // Check 1: Are both fields filled?
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return; // Stop execution
    }
    
    // Check 2: Is email valid format? (uses helper function below)
    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return; // Stop execution
    }
    
    // ⏳ SHOW LOADING STATE
    // =====================
    resetButton.disabled = true;  // Disable button to prevent double-clicks
    // Replace button text with loading spinner
    resetButton.innerHTML = `
        <div class="spinner" style="display: inline-block;"></div>
        <span style="margin-left: 8px;">Sending...</span>
    `;
    
    try {
        // 🔐 STEP 1: VERIFY USER KNOWS THEIR PASSWORD
        // ===========================================
        // Try to log in with the email and password provided
        // This proves the user actually knows their current password
        // signInWithEmailAndPassword(email, password) = "Try to log in"
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // If login fails, throws error (caught below)
        
        // ✉️ STEP 2: SEND PASSWORD RESET EMAIL
        // =====================================
        // Now that we've verified the user, send reset email
        // Firebase sends email with password reset link to user's inbox
        await sendPasswordResetEmail(auth, email);
        
        // ✅ SUCCESS: RESET EMAIL SENT
        // =============================
        showMessage('✅ Password reset email sent! Check your inbox.', 'success');
        
        // Clear the input fields for security
        resetEmail.value = '';
        currentPassword.value = '';
        
        // 🔄 OPTIONAL: REDIRECT TO LOGIN PAGE AFTER 3 SECONDS
        // ===================================================
        // Gives user time to read success message before redirecting
        setTimeout(() => {
            window.history.back();
        }, 3000); // 3 seconds delay
        
    } catch (error) {
        // ❌ HANDLE ERRORS
        // =================
        console.error('Reset error:', error);
        
        // Check which error occurred and show appropriate message
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            // Wrong password OR email doesn't exist
            showMessage('❌ Email or password is incorrect.', 'error');
        } else if (error.code === 'auth/too-many-requests') {
            // Too many failed attempts (Firebase security feature)
            showMessage('❌ Too many attempts. Please try again later.', 'error');
        } else {
            // Any other unexpected error
            showMessage('❌ Something went wrong. Please try again.', 'error');
        }
        
    } finally {
        // 🔄 RESET BUTTON STATE (ALWAYS RUNS)
        // ===================================
        // Whether success or error, always restore button to normal state
        resetButton.disabled = false;  // Re-enable button
        // Restore original button text and icon
        resetButton.innerHTML = `
            <span class="button-text">Send Reset Link</span>
            <svg class="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
});


// 💬 SHOW MESSAGE FUNCTION (REUSABLE)
// ============================================
/**
 * Displays a message to the user with colored styling
 * @param {string} text - The message to show
 * @param {string} type - 'success' (green) or 'error' (red)
 */
function showMessage(text, type) {
    // Set the message text
    resetMessage.textContent = text;
    // Add CSS class for styling (success or error colors)
    resetMessage.className = 'reset-message ' + type;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            resetMessage.textContent = '';                // Clear text
            resetMessage.className = 'reset-message';     // Remove styling
        }, 5000); // 5 seconds delay
    }
}


// 📧 EMAIL VALIDATION FUNCTION
// ============================================
/**
 * Checks if an email address is valid format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid format
 */
function isValidEmail(email) {
    // Regular expression pattern for email validation:
    // - ^[^\s@]+ = Starts with non-space, non-@ characters
    // - @ = Must contain @ symbol
    // - [^\s@]+ = Domain name (non-space, non-@)
    // - \. = Must contain a dot
    // - [^\s@]+$ = Ends with domain extension
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email); // Returns true if matches pattern
}


// ⌨️ KEYBOARD SHORTCUTS (UX IMPROVEMENT)
// ============================================
// Press Enter in email field → submit form
resetEmail.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') resetButton.click();
});

// Press Enter in password field → submit form
currentPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') resetButton.click();
});