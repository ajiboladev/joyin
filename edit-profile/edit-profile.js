import { auth, db, storage } from "../firebase.js";
import { doc, updateDoc, getDoc } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import { ref, uploadBytes, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";


const usernameInput = document.getElementById("username");
const bioInput = document.querySelector(".bio");
const saveBtn = document.getElementById("saveProfile");
const message = document.getElementById("message");

let currentUser = null;
let originalUsername = "";
let originalBio = ""; // CORRECTED: Changed from bioInput.innerHTML to ""

// Function to load existing profile data
async function loadExistingProfile() {
  if (!currentUser) return;
  
  try {
    // Show loading state
    message.style.color = "#5b53f2";
    message.innerHTML = "Loading your profile...";
    
    // Get current user data from Firestore
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Store original values for change detection
      originalUsername = userData.username || "user";
      originalBio = userData.bio || "No bio yet";
      
      // Populate input fields with existing data
      usernameInput.value = originalUsername;
      bioInput.innerHTML = originalBio;

      //profile image
      const avatarPreview = document.getElementById("avatar-preview");
      avatarPreview.src = userData.profilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';
      
      // Clear loading message
      message.innerHTML = "";
      
      // Update page title with current username
      if (userData.username) {
        document.title = `Edit ${userData.username}'s Profile | JOYIN`;

        
      }
      
    } else {
      message.style.color = "orange";
      message.innerHTML = "No existing profile found. You can create one now!";
    }
    
  } catch (error) {
    console.error("Error loading profile:", error);
    message.style.color = "red";
    message.innerHTML = "Failed to load profile data";
  }
}

// Enable/disable save button based on changes
function checkForChanges() {
  if (originalUsername === "" && originalBio === "") return;
  
  const hasChanged = 
    usernameInput.value !== originalUsername || 
    bioInput.value !== originalBio;
  
  saveBtn.disabled = !hasChanged;
  saveBtn.style.opacity = hasChanged ? "1" : "0.7";
  saveBtn.style.cursor = hasChanged ? "pointer" : "not-allowed";
}

onAuthStateChanged(auth, (user) => {
    if (!user || !user.emailVerified) {
        // Not logged in or email not verified → redirect
        window.location.replace("../login/?view=login");
        return;
    }

    // User is logged in and verified
    currentUser = user;

    // Load profile data
    loadExistingProfile();
});

  

saveBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const newUsername = usernameInput.value.trim();
  const newBio = bioInput.value.trim();

  if (!newUsername) {
    message.style.color = "red";
    message.innerHTML = "Username cannot be empty";
    return;
  }

  try {
    // Show saving state
    message.style.color = "#5b53f2";
    message.innerHTML = "Saving changes...";
    saveBtn.disabled = true;
    
    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        username: newUsername,
        bio: newBio,
        updatedAt: new Date() // Optional: add timestamp
      }
    );

    // Success message
    message.style.color = "green";
    message.innerHTML = "✓ Profile updated successfully!";
    document.title = `${newUsername} | JOYIN`;
    
    // Update original values
    originalUsername = newUsername;
    originalBio = newBio;
    
    // Disable save button since no changes now
    saveBtn.disabled = true;
    saveBtn.style.opacity = "0.7";
    saveBtn.style.cursor = "not-allowed";
    
    // Optional: Redirect after delay
    setTimeout(() => {
      window.location.href = "../profile/?view=profile&permission=allowed";
    }, 1500);

  } catch (error) {
    console.error("Update failed:", error);
    message.style.color = "red";
    message.innerHTML = "Failed to update profile. Please try again.";
    saveBtn.disabled = false;
    saveBtn.style.opacity = "1";
    saveBtn.style.cursor = "pointer";
  }
});

// Set up event listeners for change detection
usernameInput.addEventListener("input", checkForChanges);
bioInput.addEventListener("input", checkForChanges);

// Show character count for bio
bioInput.addEventListener("input", function() {
  const charCount = this.value.length;
  const maxLength = this.getAttribute("maxlength") || 500;
  
  // Create or update counter display
  let counter = document.getElementById("bio-counter");
  if (!counter) {
    counter = document.createElement("div");
    counter.id = "bio-counter";
    counter.style.fontSize = "12px";
    counter.style.color = "#666";
    counter.style.marginTop = "5px";
    bioInput.parentNode.appendChild(counter);
  }
  
  counter.textContent = `${charCount}/${maxLength} characters`;
  counter.style.color = charCount > maxLength * 0.9 ? "red" : "#666";
});

// Initialize the save button state
checkForChanges();








// ============================================
// PROFILE PICTURE UPLOAD WITH LOADING STATES
// ============================================

// 1. Get the elements
const cameraIcon = document.getElementById("click");
const imageInput = document.getElementById("profileImage");
const saveButton = document.getElementById("saveProfilePic");
const avatarPreview = document.getElementById("avatar-preview");

// Store original button text so we can restore it later
const ORIGINAL_BUTTON_TEXT = saveButton.textContent || "Save Changes";

// 2. When camera icon is clicked, trigger the hidden file input
cameraIcon.onclick = function () {
  alert("Profile picture upload are coming soon. You can still edit Text profile for now - thank you for being an early user!");
  return true;
  imageInput.click(); // This opens the file selection dialog
};

// 3. When a new image file is selected, show a preview immediately
imageInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type (only allow images)
  if (!file.type.startsWith('image/')) {
    showErrorMessage("Please select an image file (JPG, PNG, etc.)");
    imageInput.value = ""; // Clear the invalid selection
    return;
  }
  
  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    showErrorMessage("Image size must be less than 5MB");
    imageInput.value = ""; // Clear the invalid selection
    return;
  }
  
  // Create a temporary URL to display the image
  const imageURL = URL.createObjectURL(file);
  avatarPreview.src = imageURL;
  
  // Show success feedback
  console.log("✅ New image selected for preview:", file.name);
  showSuccessMessage("Image selected! Click 'Save Changes' to upload.");
});

// 4. When "Save Changes" is clicked, upload to Firebase
saveButton.addEventListener("click", async function() {
  // Check if a new image was selected
  const file = imageInput.files[0];
  if (!file) {
    console.log("No new image selected. Saving other profile info...");
    showInfoMessage("No new image selected. Please choose an image first.");
    return;
  }
  
  const user = auth.currentUser;
  if (!user) {
    showErrorMessage("Please log in to save changes.");
    return;
  }
  
  try {
    console.log("🚀 Starting image upload...");
    
    // STEP 1: Change button to loading state
    setButtonLoading(true);
    
    // STEP 2: Create a storage reference
    // Using a timestamp ensures a unique filename and prevents browser caching
    const timestamp = Date.now();
    const imageRef = ref(
      storage,
      `usersProfilePic/${user.uid}/profile_${timestamp}.jpg`
    );
    
    // STEP 3: Upload image to Firebase Storage
    console.log("📤 Uploading file to Firebase Storage...");
    updateButtonText("Uploading...");
    await uploadBytes(imageRef, file);
    
    // STEP 4: Get the public URL of the uploaded image
    console.log("🔗 Getting download URL...");
    updateButtonText("Processing...");
    const imageURL = await getDownloadURL(imageRef);
    
    // STEP 5: Save URL in Firestore
    console.log("💾 Updating Firestore with new image URL...");
    updateButtonText("Saving...");
    await updateDoc(doc(db, "users", user.uid), {
      profilePic: imageURL,
      updatedAt: new Date() // Good practice to track updates
    });
    
    // STEP 6: Success! Show completion state
    console.log("✅ Profile image updated successfully!");
    updateButtonText("Saved ✓");
    showSuccessMessage("Profile image updated successfully!");
    
    // STEP 7: Wait 1.5 seconds, then restore button and redirect
    setTimeout(() => {
      setButtonLoading(false); // Restore button to normal state
      window.location.reload(); // Refresh to show the new image everywhere
    }, 1500);
    
  } catch (error) {
    // STEP 8: Error handling
    console.error("❌ Error during upload:", error);
    
    // Show user-friendly error messages based on error type
    let errorMessage = "Failed to update profile image.";
    
    if (error.code === 'storage/unauthorized') {
      errorMessage = "Permission denied. Please check your login status.";
    } else if (error.code === 'storage/canceled') {
      errorMessage = "Upload was cancelled.";
    } else if (error.code === 'storage/unknown') {
      errorMessage = "An unknown error occurred. Please try again.";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    // Update button to show error state
    updateButtonText("Failed ✗");
    showErrorMessage(errorMessage);
    
    // Wait 2 seconds, then restore button to normal
    setTimeout(() => {
      setButtonLoading(false);
    }, 2000);
  }
});

// ============================================
// HELPER FUNCTIONS FOR BUTTON STATES
// ============================================

/**
 * Set button to loading or normal state
 * @param {boolean} isLoading - true = loading, false = normal
 */
function setButtonLoading(isLoading) {
  if (isLoading) {
    // Disable button during upload
    saveButton.disabled = true;
    saveButton.style.opacity = "0.7";
    saveButton.style.cursor = "not-allowed";
    saveButton.style.background = "#888"; // Gray color during loading
    
    // Add spinning icon (if you have Font Awesome)
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  } else {
    // Restore button to normal state
    saveButton.disabled = false;
    saveButton.style.opacity = "1";
    saveButton.style.cursor = "pointer";
    saveButton.style.background = ""; // Restore original color
    saveButton.textContent = ORIGINAL_BUTTON_TEXT;
  }
}

/**
 * Update button text during different stages
 * @param {string} text - The text to display
 */
function updateButtonText(text) {
  saveButton.textContent = text;
}

// ============================================
// HELPER FUNCTIONS FOR USER FEEDBACK MESSAGES
// ============================================

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccessMessage(message) {
  // Remove any existing messages first
  removeAllMessages();
  
  const messageDiv = document.createElement('div');
  messageDiv.id = 'feedback-message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  messageDiv.innerHTML = `
    <i class="fas fa-check-circle"></i> ${message}
  `;
  document.body.appendChild(messageDiv);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 4000);
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showErrorMessage(message) {
  // Remove any existing messages first
  removeAllMessages();
  
  const messageDiv = document.createElement('div');
  messageDiv.id = 'feedback-message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f44336;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  messageDiv.innerHTML = `
    <i class="fas fa-exclamation-circle"></i> ${message}
  `;
  document.body.appendChild(messageDiv);
  
  // Auto-remove after 5 seconds (longer for errors so user can read)
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

/**
 * Show info message to user
 * @param {string} message - Info message
 */
function showInfoMessage(message) {
  // Remove any existing messages first
  removeAllMessages();
  
  const messageDiv = document.createElement('div');
  messageDiv.id = 'feedback-message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2196F3;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  messageDiv.innerHTML = `
    <i class="fas fa-info-circle"></i> ${message}
  `;
  document.body.appendChild(messageDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
}

/**
 * Remove all existing feedback messages
 */
function removeAllMessages() {
  const existingMessage = document.getElementById('feedback-message');
  if (existingMessage) {
    existingMessage.remove();
  }
}

// ============================================
// ADD CSS ANIMATION FOR MESSAGES (Run once)
// ============================================
if (!document.querySelector('style[data-feedback-animation]')) {
  const style = document.createElement('style');
  style.setAttribute('data-feedback-animation', 'true');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .fa-spin {
      animation: spin 1s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

console.log("✅ Improved profile picture upload system loaded!");