import { auth, db } from "../firebase.js";
import { createUserWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Get DOM elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const signupBtn = document.getElementById("signup-button");
const usernameInput = document.getElementById("username");
const message = document.getElementById("message");

// Create a loading spinner element (add to your HTML or create dynamically)
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

// Add this CSS to your signup page
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
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = loadingStyles;
document.head.appendChild(styleSheet);

// Store original button text
const originalBtnText = signupBtn.innerHTML;

// Function to show loading state
function showLoading() {
  signupBtn.disabled = true;
  signupBtn.classList.add('btn-loading');
  signupBtn.innerHTML = 'Creating Account... ';
  
  // Add spinner
  const spinner = createLoadingSpinner();
  signupBtn.appendChild(spinner);
  
  // Disable all form inputs
  [emailInput, passwordInput, confirmPasswordInput, usernameInput].forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.7';
  });
}

// Function to hide loading state
function hideLoading() {
  signupBtn.disabled = false;
  signupBtn.classList.remove('btn-loading');
  signupBtn.innerHTML = originalBtnText;
  
  // Re-enable all form inputs
  [emailInput, passwordInput, confirmPasswordInput, usernameInput].forEach(input => {
    input.disabled = false;
    input.style.opacity = '1';
  });
}

// Add click event listener
signupBtn.addEventListener("click", () => {
  // Get input values
  const email = emailInput.value;
  const password = passwordInput.value.toLowerCase();
  const confirmPassword = confirmPasswordInput.value;
  const username = usernameInput.value;

  // Input validation
  if (!email || !password || !username) {
    message.style.color = "red";
    message.innerHTML = "All fields are required";
    return;
  }

  if (password.length < 6) {
    message.style.color = "red";
    message.innerHTML = "Password must be at least 6 characters";
    return;
  }

  if (password !== confirmPassword) {
    message.style.color = "red";
    message.innerHTML = "Passwords do not match";
    return;
  }

  // Show loading state
  showLoading();
  message.style.color = "#5b53f2";
  message.innerHTML = "Creating your JOYIN account...";

  // Create user with Firebase Authentication
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      
      // Update message
      message.style.color = "#5b53f2";
      message.innerHTML = "Setting up your profile...";
      
      // Create user document in Firestore
      try {
        await setDoc(doc(db, "users", user.uid), {
          username: username,
          email: email,
          bio: "",
          profilePic: "",
          followersCount: 0,
          followingCount: 0,
          likesCount: "",
          role : "user",
          softBan: Boolean(false),
          username_lowercase: username.toLowerCase(),
          createdAt: serverTimestamp(),
        });
        
        // Success! Update message
        message.style.color = "green";
        message.innerHTML = "✅ Account created successfully! Welcome to JOYIN!";
        
        // Show success animation before redirect
        setTimeout(() => {
          window.location.href = "../login/?view=login";
        }, 1500);

      } catch (error) {
        hideLoading();
        console.error("❌ Error creating user document:", error.message);
        message.style.color = "red";
        message.innerHTML = "Error creating profile: " + error.message;
      }
    })
    .catch((error) => {
      hideLoading();
      
      // Handle Firebase Auth errors
      if (error.code === "auth/email-already-in-use") {
        message.style.color = "red";
        message.innerHTML = "This email already has an account.";
      } else if (error.code === "auth/invalid-email") {
        message.style.color = "red";
        message.innerHTML = "Invalid email address.";
      } else if (error.code === "auth/weak-password") {
        message.style.color = "red";
        message.innerHTML = "Password is too weak. Use at least 6 characters.";
      } else if (error.code === "auth/network-request-failed") {
        message.innerHTML = "❌ Network error. Check your internet connection.";
      } else {
        console.error("❌ Auth error:", error.message);
        message.style.color = "red";
        message.innerHTML = "Signup failed: " + error.message;
      }
    });
});

confirmPasswordInput.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
     signupBtn.click(); // Trigger login button click
  }
});