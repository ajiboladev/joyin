// ============================================
// PASSWORD CHANGE SCRIPT - FULLY COMMENTED
// ============================================

// 🔥 FIREBASE IMPORTS
// ============================================
// Import our Firebase connection from firebase.js
import { auth, db } from "../firebase.js";

// Import specific Firebase Auth functions we need
// EmailAuthProvider - Creates credentials using email/password
// reauthenticateWithCredential - Verifies user knows their current password
// updatePassword - Updates user's password in Firebase
import { 
    EmailAuthProvider, 
    reauthenticateWithCredential, 
    updatePassword 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";


// 🎯 DOM ELEMENTS - GRABBING HTML ELEMENTS
// ============================================
// Get references to all HTML elements we need to control
const currentPasswordInput = document.getElementById("currentPassword"); // Current password input field
const newPasswordInput = document.getElementById("newPassword");         // New password input field
const changePasswordBtn = document.getElementById("changePasswordBtn");  // Update button
const passwordMessage = document.getElementById("passwordMessage");      // Message display area
const strengthBar = document.getElementById("strengthBar");              // Password strength visual bar
const strengthText = document.getElementById("strengthText");            // Text describing password strength

// Password requirement checkboxes (shown as bullet points)
const reqLength = document.getElementById("reqLength");      // "At least 8 characters" indicator
const reqUppercase = document.getElementById("reqUppercase"); // "One uppercase letter" indicator
const reqLowercase = document.getElementById("reqLowercase"); // "One lowercase letter" indicator
const reqNumber = document.getElementById("reqNumber");       // "One number" indicator


// 👁️ PASSWORD VISIBILITY TOGGLE
// ============================================
// Makes password fields show/hide when clicking eye icon
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
        // Get which password field this eye icon controls
        const targetId = button.getAttribute('data-target'); // 'currentPassword' or 'newPassword'
        const input = document.getElementById(targetId);      // The actual input field
        const icon = button.querySelector('.eye-icon');       // The eye icon SVG inside the button
        
        // Toggle between password (hidden) and text (visible)
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        // Update eye icon to show open/closed state
        if (type === 'text') {
            // Show "eye with slash" icon (password is visible)
            icon.innerHTML = `
                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 1L23 23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        } else {
            // Show normal eye icon (password is hidden)
            icon.innerHTML = `
                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            `;
        }
    });
});


// 📊 REAL-TIME PASSWORD STRENGTH CHECKER
// ============================================
// Runs every time user types in the new password field
newPasswordInput.addEventListener('input', checkPasswordStrength);

function checkPasswordStrength() {
    const password = newPasswordInput.value;
    
    // ✅ CHECK EACH PASSWORD REQUIREMENT
    // ====================================
    const hasLength = password.length >= 6;          // At least 6 characters
    const hasUppercase = /[A-Z]/.test(password);     // Contains A-Z
    const hasLowercase = /[a-z]/.test(password);     // Contains a-z
    const hasNumber = /[0-9]/.test(password);        // Contains 0-9
    
    // 📝 UPDATE VISUAL INDICATORS
    // ====================================
    // Toggle 'met' class on/off for each requirement
    // CSS will change color from gray to green when 'met' is added
    reqLength.classList.toggle('met', hasLength);
    reqUppercase.classList.toggle('met', hasUppercase);
    reqLowercase.classList.toggle('met', hasLowercase);
    reqNumber.classList.toggle('met', hasNumber);
    
    // 🎯 CALCULATE STRENGTH SCORE (0-100)
    // ====================================
    let score = 0;
    if (hasLength) score += 25;      // 25 points for minimum length
    if (hasUppercase) score += 25;   // 25 points for uppercase
    if (hasLowercase) score += 25;   // 25 points for lowercase
    if (hasNumber) score += 25;      // 25 points for numbers
    
    // 🎨 UPDATE STRENGTH METER & TEXT
    // ====================================
    let strength = 'weak';  // CSS class name
    let color = 'error';    // CSS variable name for color
    
    if (score >= 100) {
        // All requirements met = Strong password
        strength = 'strong';
        color = 'primary';      // Uses your #5B5EF2 color
        strengthText.textContent = 'Strong password';
    } else if (score >= 75) {
        // 3 out of 4 requirements = Good password
        strength = 'good';
        color = 'success';      // Green color
        strengthText.textContent = 'Good password';
    } else if (score >= 50) {
        // 2 out of 4 requirements = Fair password
        strength = 'fair';
        color = 'warning';      // Yellow/Orange color
        strengthText.textContent = 'Fair password';
    } else {
        // 0-1 requirements = Weak password
        strengthText.textContent = 'Weak password';
    }
    
    // Apply the strength class and color to the visual bar
    strengthBar.className = 'strength-bar ' + strength;
    strengthBar.style.backgroundColor = `var(--${color})`;
}


// 💬 SHOW MESSAGE FUNCTION (REUSABLE)
// ============================================
/**
 * Shows a message to the user with colored styling
 * @param {string} text - The message to display
 * @param {string} type - 'success' (green) or 'error' (red)
 */
function showMessage(text, type) {
    // Set the message text
    passwordMessage.textContent = text;
    // Add CSS class for styling (success or error)
    passwordMessage.className = 'message-container ' + type;
    
    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            passwordMessage.textContent = '';                // Clear message
            passwordMessage.className = 'message-container'; // Remove styling
            currentPasswordInput.value = '';                 // Clear current password field
            newPasswordInput.value = '';                     // Clear new password field
            checkPasswordStrength();                         // Reset strength meter to empty state
        }, 5000); // 5 seconds delay
    }
}


// 🔐 MAIN PASSWORD CHANGE FUNCTION
// ============================================
// Runs when user clicks "Update Password" button
changePasswordBtn.addEventListener("click", async () => {
    // Get current logged-in user from Firebase Auth
    const user = auth.currentUser;
    
    // ⛔ CHECK 1: IS USER LOGGED IN?
    if (!user) {
        showMessage("❌ You must be logged in to change password", "error");
        return; // Stop execution
    }
    
    // Get values from input fields (trim removes extra spaces)
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();

    // ⛔ CHECK 2: ARE BOTH FIELDS FILLED?
    if (!currentPassword || !newPassword) {
        showMessage("❌ Please fill in both fields", "error");
        return;
    }
    
    // ⛔ CHECK 3: IS NEW PASSWORD LONG ENOUGH? (Firebase minimum is 6)
    if (newPassword.length < 6) {
        showMessage("❌ Password must be at least 6 characters", "error");
        return;
    }
    
    // ⛔ CHECK 4: IS NEW PASSWORD DIFFERENT FROM CURRENT?
    if (currentPassword === newPassword) {
        showMessage("❌ New password must be different from current password", "error");
        return;
    }

    // ⏳ SHOW LOADING STATE (PREVENT DOUBLE-CLICKS)
    // ============================================
    changePasswordBtn.disabled = true;  // Disable button
    // Replace button text with spinner
    changePasswordBtn.innerHTML = `
        <div class="spinner" style="display: inline-block;"></div>
        <span style="margin-left: 8px;">Updating...</span>
    `;

    try {
        // 🔐 STEP 1: RE-AUTHENTICATE USER (VERIFY CURRENT PASSWORD)
        // ==========================================================
        // Create credentials using user's email and entered current password
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        // Ask Firebase to verify these credentials are correct
        // This ensures user REALLY knows their current password
        await reauthenticateWithCredential(user, credential);
        // If this fails, error is caught below (wrong password)

        // 🔑 STEP 2: UPDATE TO NEW PASSWORD
        // ==================================
        // Tell Firebase to change user's password
        await updatePassword(user, newPassword);
        // If this fails, error is caught below (weak password, etc.)

        // ✅ SUCCESS: PASSWORD UPDATED
        // =============================
        showMessage("✅ Password updated successfully! You can now use your new password.", "success");
        
    } catch (error) {
        // ❌ HANDLE ERRORS
        // =================
        console.error("Password update error:", error);
        
        // Check error type and show appropriate message
        if (error.code === "auth/wrong-password") {
            showMessage("❌ Current password is incorrect", "error");
        } else if (error.code === "auth/weak-password") {
            showMessage("❌ Password is too weak. Use at least 6 characters with letters and numbers", "error");
        } else if (error.code === "auth/requires-recent-login") {
            // User hasn't logged in recently - session expired
            showMessage("❌ Session expired. Please log in again", "error");
            // Redirect to login page after 2 seconds
            setTimeout(() => window.location.href = '/login.html', 2000);
        } else if (error.code === "auth/too-many-requests") {
            // Too many failed attempts - prevent brute force attacks
            showMessage("❌ Too many attempts. Please try again later", "error");
        } else {
            // Any other unexpected error
            showMessage("❌ Password update failed. Please try again.", "error");
        }
        
    } finally {
        // 🔄 RESET BUTTON STATE (RUNS WHETHER SUCCESS OR ERROR)
        // =====================================================
        changePasswordBtn.disabled = false;  // Re-enable button
        // Restore original button text and icon
        changePasswordBtn.innerHTML = `
            <span class="btn-text">Update Password</span>
            <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 12V19H20V12M12 3V16M12 16L8 12M12 16L16 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
});


// ⌨️ KEYBOARD SHORTCUTS (UX IMPROVEMENT)
// ============================================
// Press Enter in current password field → jump to new password field
currentPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') newPasswordInput.focus();
});

// Press Enter in new password field → click update button
newPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') changePasswordBtn.click();
});


// 🚀 INITIALIZE ON PAGE LOAD
// ============================================
// Run strength checker once when page loads to set initial state
checkPasswordStrength();