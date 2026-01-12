// ============================================
// EMAIL CHANGE SCRIPT - PENDING EMAIL APPROACH
// ============================================

import { auth, db } from "../firebase.js";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 🎯 GET HTML ELEMENTS
const newEmailInput = document.getElementById("newEmail");
const currentPasswordInput = document.getElementById("currentPassword");
const changeEmailBtn = document.getElementById("changeEmailBtn");
const emailMessage = document.getElementById("emailMessage");
const currentEmailDisplay = document.getElementById("currentEmailDisplay");
const toggleEmailPassword = document.getElementById("toggleEmailPassword");

// 👁️ SHOW CURRENT USER'S EMAIL WHEN PAGE LOADS
auth.onAuthStateChanged((user) => {
    if (user && user.email) {
        currentEmailDisplay.textContent = user.email;
    } else {
        currentEmailDisplay.textContent = "Not logged in";
    }
});

// 👁️ PASSWORD VISIBILITY TOGGLE
toggleEmailPassword.addEventListener('click', () => {
    const currentType = currentPasswordInput.getAttribute('type');
    
    if (currentType === 'password') {
        currentPasswordInput.setAttribute('type', 'text');
        toggleEmailPassword.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M1 1L23 23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
    } else {
        currentPasswordInput.setAttribute('type', 'password');
        toggleEmailPassword.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
    }
});

// 📧 EMAIL CHANGE FUNCTION - PENDING EMAIL APPROACH
changeEmailBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    
    if (!user) {
        showEmailMessage("❌ You must be logged in", "error");
        return;
    }
    
    const newEmail = newEmailInput.value.trim();
    const currentPassword = currentPasswordInput.value.trim();
    
    // ⛔ VALIDATION
    if (!newEmail || !currentPassword) {
        showEmailMessage("❌ All fields are required", "error");
        return;
    }
    
    if (newEmail === user.email) {
        showEmailMessage("❌ New email is the same as current email", "error");
        return;
    }
    
    // ⏳ SHOW LOADING STATE
    changeEmailBtn.disabled = true;
    changeEmailBtn.innerHTML = `
        <div class="spinner" style="display: inline-block;"></div>
        <span style="margin-left: 8px;">Sending verification...</span>
    `;
    
    try {
        // 🔐 STEP 1: VERIFY PASSWORD
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // 📝 STEP 2: STORE PENDING EMAIL IN FIRESTORE
        // ============================================
        // Instead of updating the actual email, store it as "pendingEmail"
        // This way, Firestore and Auth stay in sync until verification
        const userDocRef = doc(db, "users", user.uid);
        
        await updateDoc(userDocRef, {
            // pendingEmail: newEmail,           // Store new email as pending
            // pendingEmailRequestedAt: new Date(), // When request was made
            // emailChangeStatus: "pending_verification", // Track status
            email:newEmail
        });
        
        console.log("📝 Pending email stored in Firestore:", newEmail);
        
        // ✉️ STEP 3: SEND VERIFICATION EMAIL
        // ===================================
        // Now send verification email to the new address
        await verifyBeforeUpdateEmail(user, newEmail);
        
        // ✅ SUCCESS: VERIFICATION EMAIL SENT
        showEmailMessage(`
            ✅ Verification email sent to <strong>${newEmail}</strong>.<br>
            Please check your inbox (and spam folder) and click the verification link.<br>
            <small style="color: var(--text-secondary);">
                Your email will update <strong>only after</strong> you verify it.
            </small>
        `, "success");
        
        // Clear sensitive fields
        currentPasswordInput.value = "";
        newEmailInput.value = "";
        
        // DO NOT update displayed email yet! It stays as old email
        // Only show "Pending: new@email.com" if you want
        currentEmailDisplay.textContent = user.email + ` (Pending: ${newEmail})`;
        
    } catch (error) {
        console.error("Email change error:", error);
        
        // ❌ SHOW ERROR MESSAGE
        if (error.code === "auth/wrong-password") {
            showEmailMessage("❌ Incorrect password", "error");
        } else if (error.code === "auth/email-already-in-use") {
            showEmailMessage("❌ Email already in use by another account", "error");
        } else if (error.code === "auth/invalid-email") {
            showEmailMessage("❌ Invalid email address", "error");
        } else if (error.code === "auth/too-many-requests") {
            showEmailMessage("❌ Too many attempts. Please try again later.", "error");
        } else if (error.code === "firestore/permission-denied") {
            showEmailMessage("❌ Permission denied. Cannot update profile.", "error");
        } else {
            showEmailMessage("❌ Failed to send verification email. Try again.", "error");
        }
        
    } finally {
        // 🔄 RESET BUTTON
        changeEmailBtn.disabled = false;
        changeEmailBtn.innerHTML = `
            <span class="btn-text">Send Verification Email</span>
            <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    }
});

// 💬 SHOW MESSAGE FUNCTION
function showEmailMessage(text, type) {
    emailMessage.innerHTML = text;
    emailMessage.className = 'message-container ' + type;
    
    if (type === 'success') {
        setTimeout(() => {
            emailMessage.innerHTML = '';
            emailMessage.className = 'message-container';
        }, 30000); // 30 seconds
    }
}

// ⌨️ KEYBOARD SHORTCUTS
newEmailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') currentPasswordInput.focus();
});

currentPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') changeEmailBtn.click();
});