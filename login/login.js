// ========================================
// JOYIN Social Media - Secure Login with Profile Verification
// © 2025 JOYIN. All rights reserved.
// ========================================

import { auth, db } from "../firebase.js";
import { 
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  doc, 
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ========================================
// GET DOM ELEMENTS
// ========================================
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-button");
const message = document.getElementById("message");

// ========================================
// INJECT LOADING STYLES
// ========================================
const loadingStyles = `
  .login-loading {
    display: inline-flex;
    gap: 5px;
    margin-left: 10px;
  }
  .login-spinner-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #5b53f2;
    animation: login-spinner-bounce 1.4s infinite ease-in-out both;
  }
  .login-spinner-dot:nth-child(1) { animation-delay: -0.32s; }
  .login-spinner-dot:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes login-spinner-bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  
  .btn-login-loading {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* Disabled input styling */
  input:disabled {
    cursor: not-allowed !important;
    background-color: #f5f5f5 !important;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);

const originalBtnText = loginBtn.innerHTML;

// ========================================
// FORM CONTROL FUNCTIONS
// ========================================

// Disables all form inputs and button during processing
function disableLoginForm() {
  loginBtn.disabled = true;
  loginBtn.style.cursor = 'not-allowed';
  
  [emailInput, passwordInput].forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.6';
    input.style.cursor = 'not-allowed';
  });
  
  console.log("🔒 Login form disabled - processing...");
}

// Enables all form inputs and button
function enableLoginForm() {
  loginBtn.disabled = false;
  loginBtn.style.cursor = 'pointer';
  
  [emailInput, passwordInput].forEach(input => {
    input.disabled = false;
    input.style.opacity = '1';
    input.style.cursor = 'text';
  });
  
  console.log("✅ Login form enabled");
}

// ========================================
// LOADING SPINNER FUNCTIONS
// ========================================

// Creates a loading spinner
function createLoginSpinner() {
  const spinner = document.createElement('div');
  spinner.className = 'login-loading';
  spinner.innerHTML = `
    <div class="login-spinner-dot"></div>
    <div class="login-spinner-dot"></div>
    <div class="login-spinner-dot"></div>
  `;
  return spinner;
}

// Shows loading state
function showLoginLoading() {
  // Disable form first
  disableLoginForm();
  
  loginBtn.classList.add('btn-login-loading');
  loginBtn.innerHTML = 'Logging in... ';
  
  const spinner = createLoginSpinner();
  loginBtn.appendChild(spinner);
}

// Hides loading state
function hideLoginLoading() {
  loginBtn.classList.remove('btn-login-loading');
  loginBtn.innerHTML = originalBtnText;
  
  // Re-enable form
  enableLoginForm();
}

// ========================================
// MAIN LOGIN LOGIC
// ========================================

// Login button click handler
loginBtn.addEventListener("click", async () => {
  // ========================================
  // STEP 1: GET INPUT VALUES
  // ========================================
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // ========================================
  // STEP 2: INPUT VALIDATION
  // ========================================
  if (!email || !password) {
    message.style.color = "red";
    message.innerHTML = "❌ Email and password are required";
    return;
  }

  // ========================================
  // STEP 3: SHOW LOADING STATE & DISABLE FORM
  // ========================================
  showLoginLoading();
  message.style.color = "#5b53f2";
  message.innerHTML = "🔄 Logging you into JOYIN...";

  // ========================================
  // STEP 4: SIGN IN WITH FIREBASE AUTH
  // ========================================
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("✅ Authentication successful:", user.uid);
    
    // ========================================
    // 🔒 SECURITY CHECK 1: EMAIL VERIFICATION
    // ========================================
    message.style.color = "#5b53f2";
    message.innerHTML = "🔍 Checking email verification...";
    
    if (!user.emailVerified) {
    console.log("❌ Email not verified");

    try {
        // Delete the unverified account
        await user.delete();
        console.log("✅ Unverified account deleted");
    } catch (deleteError) {
        console.error("❌ Error deleting unverified account:", deleteError);
        // If deletion fails, just log out
        await signOut(auth);
    }

    hideLoginLoading();
    message.style.color = "red";
    message.innerHTML = `
        ❌ <strong>Email not verified!</strong><br><br>
        Your account has been deleted because it was not verified.<br>
        Please sign up again to create a new account.<br>
        📧 Check your email for the verification link.
    `;
    return; // Stop login process
}

    console.log("✅ Email verified");
    
    // ========================================
    // 🔒 SECURITY CHECK 2: FIRESTORE PROFILE EXISTS
    // ========================================
    message.style.color = "#5b53f2";
    message.innerHTML = "🔍 Verifying your profile...";
    
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // Profile doesn't exist in Firestore
      console.log("❌ Firestore profile missing for:", user.uid);
      
      message.style.color = "red";
      message.innerHTML = "🗑️ Cleaning up incomplete account...";
      
      try {
        // Delete the auth account
        await user.delete();
        
        console.log("✅ Incomplete account deleted");
        
        hideLoginLoading();
        message.style.color = "red";
        message.innerHTML = `
          ❌ <strong>Account setup incomplete!</strong><br><br>
          Your account was created but profile setup failed.<br>
          We've cleaned up the incomplete account.<br><br>
          📝 <strong>Please sign up again to create a complete account.</strong>
        `;
        
      } catch (deleteError) {
        console.error("❌ Error deleting incomplete account:", deleteError);
        
        // If delete fails, just logout
        await signOut(auth);
        
        hideLoginLoading();
        message.style.color = "red";
        message.innerHTML = `
          ❌ <strong>Account setup incomplete!</strong><br><br>
          Please contact support or sign up again.
        `;
      }
      
      return; // Stop login process
    }
    
    console.log("✅ Firestore profile exists");
    
    // ========================================
    // ✅ ALL CHECKS PASSED - LOGIN SUCCESSFUL
    // ========================================
    const userData = userDocSnap.data();
    
    message.style.color = "green";
    message.innerHTML = `✅ Welcome back, ${userData.username}! Redirecting...`;
    
    console.log("✅ Login successful for:", userData.username);
    
    // Keep form disabled during redirect
    // Redirect to home page after 1 second
    setTimeout(() => {
      window.location.href = "../home/?view=home&tab=post&filter=popular";
    }, 1000);

  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    hideLoginLoading(); // This will re-enable the form
    
    console.error("❌ Login error:", error.code, error.message);
    
    message.style.color = "red";
    
    if (error.code === "auth/user-not-found") {
      message.innerHTML = "❌ No account found with this email.";
    } else if (error.code === "auth/wrong-password") {
      message.innerHTML = "❌ Incorrect password.";
    } else if (error.code === "auth/invalid-email") {
      message.innerHTML = "❌ Invalid email address.";
    } else if (error.code === "auth/invalid-credential") {
      message.innerHTML = "❌ Invalid email or password.";
    } else if (error.code === "auth/too-many-requests") {
      message.innerHTML = "❌ Too many failed attempts. Please try again later.";
    } else if (error.code === "auth/network-request-failed") {
      message.innerHTML = "❌ Network error. Check your internet connection.";
    } else {
      message.innerHTML = "❌ Login failed: " + error.message;
    }
  }
});

// ========================================
// ENTER KEY SUPPORT
// ========================================
passwordInput.addEventListener("keypress", function(event) {
  // Only allow Enter key if form is not disabled
  if (event.key === "Enter" && !loginBtn.disabled) {
    event.preventDefault();
    loginBtn.click();
  }
});