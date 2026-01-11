import { auth } from "../firebase.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Get DOM elements - FIXED: 'messsage' typo
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-button");
const message = document.getElementById("message"); // FIXED: 'messsage' → 'message'

// Create loading styles
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

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);

// Store original button text
const originalBtnText = loginBtn.innerHTML;

// Function to create loading spinner
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

// Show loading state
function showLoginLoading() {
  loginBtn.disabled = true;
  loginBtn.classList.add('btn-login-loading');
  loginBtn.innerHTML = 'Logging in... ';
  
  // Add spinner
  const spinner = createLoginSpinner();
  loginBtn.appendChild(spinner);
  
  // Disable all form inputs
  [emailInput, passwordInput].forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.7';
    input.style.cursor = 'not-allowed';
  });
}

// Hide loading state
function hideLoginLoading() {
  loginBtn.disabled = false;
  loginBtn.classList.remove('btn-login-loading');
  loginBtn.innerHTML = originalBtnText;
  
  // Re-enable all form inputs
  [emailInput, passwordInput].forEach(input => {
    input.disabled = false;
    input.style.opacity = '1';
    input.style.cursor = 'text';
  });
}

// Add click event listener
loginBtn.addEventListener("click", () => {
  // Get input values
  const email = emailInput.value;
  const password = passwordInput.value.toLowerCase();

  // Input validation
  if (!email || !password) {
    message.style.color = "red";
    message.innerHTML = "Email and password are required";
    return;
  }

  // Show loading state
  showLoginLoading();
  message.style.color = "#5b53f2";
  message.innerHTML = "Logging you into JOYIN...";

  // Login with Firebase
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log("✅ Login successful:", user.uid);
      
      // Show success message
      message.style.color = "green";
      message.innerHTML = "✅ Welcome back to JOYIN! Redirecting...";

       
      
      // Keep loading state visible for 1 second, then redirect
      setTimeout(() => {
        window.location.href = "../home/?view=home&tab=post&filter=popular";
      }, 1000);

     
      
    })
    .catch((error) => {
      hideLoginLoading();
      
      // Handle Firebase Auth errors
      message.style.color = "red";
      
      if (error.code === "auth/user-not-found") {
        message.innerHTML = "❌ No account found with this email.";
      } else if (error.code === "auth/wrong-password") {
        message.innerHTML = "❌ Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        message.innerHTML = "❌ Invalid email address.";
      } else if (error.code === "auth/too-many-requests") {
        message.innerHTML = "❌ Too many failed attempts. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        message.innerHTML = "❌ Network error. Check your internet connection.";
      } else {
        console.error("❌ Login error:", error.message);
        message.innerHTML = "❌ Login failed: " + error.message;
      }
    });
});

passwordInput.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    loginBtn.click(); // Trigger login button click
  }
});