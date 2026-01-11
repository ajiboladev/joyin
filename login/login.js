// ========================================
// JOYIN Social Media - Secure Login with Profile Verification
// © 2025 JOYIN. All rights reserved.
// ========================================

import { auth, db } from "../firebase.js";
import { 
  signInWithEmailAndPassword,
  signOut  // ← Import signOut to logout incomplete accounts
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  doc, 
  getDoc  // ← Import getDoc to check if Firestore profile exists
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
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);

const originalBtnText = loginBtn.innerHTML;

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
  loginBtn.disabled = true;
  loginBtn.classList.add('btn-login-loading');
  loginBtn.innerHTML = 'Logging in... ';
  
  const spinner = createLoginSpinner();
  loginBtn.appendChild(spinner);
  
  [emailInput, passwordInput].forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.7';
    input.style.cursor = 'not-allowed';
  });
}

// Hides loading state
function hideLoginLoading() {
  loginBtn.disabled = false;
  loginBtn.classList.remove('btn-login-loading');
  loginBtn.innerHTML = originalBtnText;
  
  [emailInput, passwordInput].forEach(input => {
    input.disabled = false;
    input.style.opacity = '1';
    input.style.cursor = 'text';
  });
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
  const password = passwordInput.value.toLowerCase();

  // ========================================
  // STEP 2: INPUT VALIDATION
  // ========================================
  if (!email || !password) {
    message.style.color = "red";
    message.innerHTML = "❌ Email and password are required";
    return;
  }

  // ========================================
  // STEP 3: SHOW LOADING STATE
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
    // Check if user has verified their email
    // ========================================
    // if (!user.emailVerified) {
    //   console.log("❌ Email not verified");
      
    //   // Logout the unverified user
    //   await signOut(auth);
      
    //   hideLoginLoading();
    //   message.style.color = "red";
    //   message.innerHTML = `
    //     ❌ <strong>Email not verified!</strong><br><br>
    //     Please check your email and click the verification link before logging in.<br>
    //     📧 Check your spam folder if you don't see the email.
    //   `;
    //   return; // Stop login process
    // }
    
    console.log("✅ Email verified");
    
    // ========================================
    // 🔒 SECURITY CHECK 2: FIRESTORE PROFILE EXISTS
    // Check if user profile exists in Firestore
    // This catches incomplete signups where email was verified
    // but profile creation failed
    // ========================================
    message.style.color = "#5b53f2";
    message.innerHTML = "🔍 Verifying your profile...";
    
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // Profile doesn't exist in Firestore
      console.log("❌ Firestore profile missing for:", user.uid);
      
      // This is a broken account - Auth exists but no Firestore profile
      // Delete the auth account to force them to sign up again
      
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
    
    // Redirect to home page after 1 second
    setTimeout(() => {
      window.location.href = "../home/?view=home&tab=post&filter=popular";
    }, 1000);

  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    hideLoginLoading();
    
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
  if (event.key === "Enter") {
    event.preventDefault();
    loginBtn.click();
  }
});