// ========================================
// JOYIN Social Media - Signup with Email Verification
// © 2025 JOYIN. All rights reserved.
// ========================================

// Import Firebase Authentication and Firestore functions
import { auth, db } from "../firebase.js";
import { 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ========================================
// GET DOM ELEMENTS
// ========================================
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const signupBtn = document.getElementById("signup-button");
const usernameInput = document.getElementById("username");
const message = document.getElementById("message");

// ========================================
// LOADING SPINNER FUNCTIONALITY
// ========================================

// Creates a loading spinner element with three animated dots
function createLoadingSpinner() {
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.innerHTML = `
    <div class="spinner-dot"></div>
    <div class="spinner-dot"></div>
    <div class="spinner-dot"></div>
  `;
  return spinner;
}

// ========================================
// INJECT LOADING SPINNER CSS
// ========================================
const loadingStyles = `
  .loading-spinner {
    display: inline-flex;
    gap: 5px;
    margin-left: 10px;
  }
  .spinner-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #5b53f2;
    animation: spinner-bounce 1.4s infinite ease-in-out both;
  }
  .spinner-dot:nth-child(1) { animation-delay: -0.32s; }
  .spinner-dot:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes spinner-bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  
  .btn-loading {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .countdown-timer {
    font-size: 18px;
    font-weight: bold;
    color: #ff9800;
    margin: 10px 0;
    padding: 10px;
    background-color: #fff3e0;
    border-radius: 6px;
    text-align: center;
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

const originalBtnText = signupBtn.innerHTML;

// ========================================
// FORM CONTROL FUNCTIONS
// ========================================

// Disables all form inputs and button during processing
function disableForm() {
  signupBtn.disabled = true;
  signupBtn.style.cursor = 'not-allowed';
  
  [emailInput, passwordInput, confirmPasswordInput, usernameInput].forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.6';
    input.style.cursor = 'not-allowed';
  });
  
  console.log("🔒 Form disabled - processing...");
}

// Enables all form inputs and button
function enableForm() {
  signupBtn.disabled = false;
  signupBtn.style.cursor = 'pointer';
  
  [emailInput, passwordInput, confirmPasswordInput, usernameInput].forEach(input => {
    input.disabled = false;
    input.style.opacity = '1';
    input.style.cursor = 'text';
  });
  
  console.log("✅ Form enabled");
}

// ========================================
// LOADING STATE FUNCTIONS
// ========================================

// Shows the loading state on the signup button
function showLoading() {
  // Disable form first
  disableForm();
  
  signupBtn.classList.add('btn-loading');
  signupBtn.innerHTML = 'Processing... ';
  
  const spinner = createLoadingSpinner();
  signupBtn.appendChild(spinner);
}

// Hides the loading state and re-enables the form
function hideLoading() {
  signupBtn.classList.remove('btn-loading');
  signupBtn.innerHTML = originalBtnText;
  
  // Re-enable form
  enableForm();
}

// ========================================
// COUNTDOWN TIMER DISPLAY
// ========================================

// Creates and displays a countdown timer
function createCountdownTimer(seconds) {
  const timerDiv = document.createElement('div');
  timerDiv.className = 'countdown-timer';
  timerDiv.innerHTML = `⏰ Time remaining: <span id="countdown">${seconds}</span> seconds`;
  
  message.parentNode.insertBefore(timerDiv, message.nextSibling);
  
  const countdownSpan = document.getElementById('countdown');
  let remainingSeconds = seconds;
  
  const intervalId = setInterval(() => {
    remainingSeconds--;
    countdownSpan.textContent = remainingSeconds;
    
    if (remainingSeconds <= 30) {
      timerDiv.style.color = '#f44336';
      timerDiv.style.backgroundColor = '#ffebee';
    }
    
    if (remainingSeconds <= 0) {
      clearInterval(intervalId);
      timerDiv.textContent = '⏰ Time expired!';
    }
  }, 1000);
  
  return { element: timerDiv, intervalId: intervalId };
}

// ========================================
// EMAIL VERIFICATION MONITORING
// ========================================

// Monitors user's email verification status with auto-delete after timeout
function monitorEmailVerification(user, username, email) {
  console.log("📧 Monitoring email verification for:", email);
  
  const TIMEOUT_SECONDS = 120; // 2 minutes
  const timer = createCountdownTimer(TIMEOUT_SECONDS);
  
  let checkCount = 0;
  
  // Check verification status every 3 seconds
  const checkInterval = setInterval(async () => {
    checkCount++;
    
    try {
      // Reload user data to get the latest emailVerified status
      await user.reload();
      
      console.log(`🔄 Check #${checkCount}: Verification status =`, user.emailVerified);
      
      // ========================================
      // IF EMAIL IS VERIFIED - CREATE ACCOUNT
      // ========================================
      if (user.emailVerified) {
        console.log("✅ Email verified! Creating user profile...");
        
        // Stop checking and clear timer
        clearInterval(checkInterval);
        clearInterval(timer.intervalId);
        timer.element.remove();
        
        // Keep form disabled during profile creation
        disableForm();
        
        try {
          message.style.color = "#5b53f2";
          message.innerHTML = "✅ Email verified! Setting up your profile...";
          
          // Create user document in Firestore
          await setDoc(doc(db, "users", user.uid), {
            userId: user.uid,
            username: username,
            email: email,
            bio: "",
            profilePic: "",
            followersCount: 0,
            followingCount: 0,
            likesCount: 0,
            commentsCount: 0,
            role: "user",
            softBan: false,
            username_lowercase: username.toLowerCase(),
            banStartDate: "",
            lastSeenUpdates: new Date(),
            createdAt: serverTimestamp()
          });

          // ========================================
      // 🔒 SECURITY: LOGOUT USER IMMEDIATELY
      // ========================================
      await signOut(auth);
          
          console.log("✅ User profile created in Firestore");
          
          message.style.color = "green";
          message.innerHTML = `
            ✅ <strong>Account created successfully!</strong><br>
            🎉 Welcome to JOYIN, ${username}!<br>
            🔄 Redirecting to login...
          `;
          
          // Keep form disabled during redirect
          // Redirect to login page after 2 seconds
          setTimeout(() => {
            window.location.href = "../login/?view=login";
          }, 2000);
          
        } catch (error) {
          console.error("❌ Error creating user profile:", error);
          message.style.color = "red";
          message.innerHTML = "❌ Error creating profile: " + error.message;
          enableForm(); // Re-enable form on error
        }
      }
      
    } catch (error) {
      console.error("❌ Error checking verification:", error);
      // If user is deleted or signed out, stop monitoring
      if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found') {
        clearInterval(checkInterval);
        clearInterval(timer.intervalId);
        timer.element.remove();
        enableForm(); // Re-enable form
      }
    }
  }, 3000); // Check every 3 seconds
  
  // ========================================
  // AUTO-DELETE AFTER 2 MINUTES IF NOT VERIFIED
  // ========================================
  setTimeout(async () => {
    try {
      // Reload to get latest verification status
      await user.reload();
      
      // If still not verified, delete the account
      if (!user.emailVerified) {
        console.log("⏰ Time expired. Email not verified. Deleting account...");
        
        clearInterval(checkInterval);
        clearInterval(timer.intervalId);
        
        // Disable form during deletion
        disableForm();
        
        // Delete the Firebase Auth account
        await user.delete();
        
        console.log("✅ Unverified account deleted successfully");
        
        timer.element.remove();
        
        message.style.color = "red";
        message.innerHTML = `
          ❌ <strong>Verification time expired!</strong><br><br>
          Your account has been automatically deleted because you didn't verify your email within 2 minutes.<br><br>
          📧 Please try signing up again and verify quickly.<br>
          💡 <strong>Tip:</strong> Have your email ready before signing up!
        `;
        
        // Clear form fields
        emailInput.value = "";
        passwordInput.value = "";
        confirmPasswordInput.value = "";
        usernameInput.value = "";
        
        // Re-enable form after clearing
        enableForm();
      } else {
        clearInterval(checkInterval);
        console.log("✅ Account verified before timeout");
      }
    } catch (error) {
      console.error("❌ Error during auto-delete:", error);
      clearInterval(checkInterval);
      clearInterval(timer.intervalId);
      
      if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found') {
        timer.element.remove();
        message.style.color = "red";
        message.innerHTML = "❌ Session expired. Please try signing up again.";
        enableForm(); // Re-enable form
      }
    }
  }, TIMEOUT_SECONDS * 1000);
}

// ========================================
// MAIN SIGNUP LOGIC
// ========================================

// Main signup button click handler
signupBtn.addEventListener("click", async () => {
  // ========================================
  // STEP 1: GET INPUT VALUES
  // ========================================
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const username = usernameInput.value.trim();

  // ========================================
  // STEP 2: INPUT VALIDATION
  // ========================================
  
  if (!email || !password || !username) {
    message.style.color = "red";
    message.innerHTML = "❌ All fields are required";
    return;
  }

  if (password.length < 6) {
    message.style.color = "red";
    message.innerHTML = "❌ Password must be at least 6 characters";
    return;
  }

  if (password !== confirmPassword) {
    message.style.color = "red";
    message.innerHTML = "❌ Passwords do not match";
    return;
  }

  // ========================================
  // STEP 3: SHOW LOADING STATE & DISABLE FORM
  // ========================================
  showLoading();
  message.style.color = "#5b53f2";
  message.innerHTML = "🔄 Creating your JOYIN account...";

  // ========================================
  // STEP 4: CREATE FIREBASE AUTH ACCOUNT
  // ========================================
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("✅ User account created:", user.uid);
    
    // ========================================
    // STEP 5: SEND EMAIL VERIFICATION
    // ========================================
    message.style.color = "#5b53f2";
    message.innerHTML = "📧 Sending verification email...";
    
    try {
      await sendEmailVerification(user);
      console.log("✅ Verification email sent to:", email);
      
      
      console.log("🔒 User logged out for security (must verify email first)");
      
      // ========================================
      // STEP 6: SHOW VERIFICATION INSTRUCTIONS
      // ========================================
      hideLoading(); // Remove spinner but keep form disabled
      disableForm(); // Keep form disabled during verification
      
      message.style.color = "#ff9800";
      message.innerHTML = `
        📧 <strong>Verification email sent to ${email}</strong><br><br>
        ⚠️ <strong>INSTRUCTIONS:</strong><br>
        1️⃣ Check your email inbox (and spam folder)<br>
        2️⃣ Click the verification link in the email<br>
        3️⃣ Wait here - we're automatically checking!<br><br>
        ⏰ <strong>You have 2 minutes to verify</strong><br>
        🚨 <strong>Your account will be deleted if you don't verify in time!</strong><br><br>
        🔒 <strong>Security Note:</strong> You've been logged out. After verification, please login.
      `;
      
      // ========================================
      // STEP 7: START MONITORING VERIFICATION
      // ========================================
      monitorEmailVerification(user, username, email);

      
      
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError.message);
      
      // Delete the user account since we couldn't send verification
      await user.delete();
      
      hideLoading();
      message.style.color = "red";
      message.innerHTML = "❌ Failed to send verification email. Please try again.";
    }

  } catch (error) {
    // ========================================
    // ERROR HANDLING
    // ========================================
    hideLoading(); // This will re-enable the form
    
    console.error("❌ Signup error:", error.code, error.message);
    
    if (error.code === "auth/email-already-in-use") {
      message.style.color = "red";
      message.innerHTML = "❌ This email already has an account.";
    } else if (error.code === "auth/invalid-email") {
      message.style.color = "red";
      message.innerHTML = "❌ Invalid email address format.";
    } else if (error.code === "auth/weak-password") {
      message.style.color = "red";
      message.innerHTML = "❌ Password is too weak. Use at least 6 characters.";
    } else if (error.code === "auth/network-request-failed") {
      message.style.color = "red";
      message.innerHTML = "❌ Network error. Check your internet connection.";
    } else {
      message.style.color = "red";
      message.innerHTML = "❌ Signup failed: " + error.message;
    }
  }
});

// ========================================
// ENTER KEY SUPPORT
// ========================================
confirmPasswordInput.addEventListener("keypress", function(event) {
  // Only allow Enter key if form is not disabled
  if (event.key === "Enter" && !signupBtn.disabled) {
    event.preventDefault();
    signupBtn.click();
  }
});