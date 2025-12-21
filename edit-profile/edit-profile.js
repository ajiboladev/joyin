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
  if (user) {
    currentUser = user;
    // Load existing profile data when user is authenticated
    loadExistingProfile();
  } else {
    window.location.href = "../login/?view=login";
  }
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





//PROFILE PICTURE.

// 1. Get the elements
const cameraIcon = document.getElementById("click");
const imageInput = document.getElementById("profileImage");
const saveButton = document.getElementById("saveProfilePic");
const avatarPreview = document.getElementById("avatar-preview");

// 2. When camera icon is clicked, trigger the hidden file input
cameraIcon.onclick = function () {
  imageInput.click(); // This opens the file selection dialog
};

// 3. When a new image file is selected, show a preview immediately
imageInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Create a temporary URL to display the image
  const imageURL = URL.createObjectURL(file);
  avatarPreview.src = imageURL;
  
  // Optional: Show a small message
  console.log("New image selected for preview:", file.name);
});

// 4. When "Save Changes" is clicked, upload to Firebase
saveButton.addEventListener("click", async function() {
  // Check if a new image was selected
  const file = imageInput.files[0];
  if (!file) {
    console.log("No new image selected. Saving other profile info...");
    // You would proceed to save username/bio here
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to save changes.");
    return;
  }

  try {
    console.log("Starting image upload...");
    
    // 1. Create a storage reference
    // Using a timestamp ensures a unique filename and prevents browser caching
    const timestamp = Date.now();
    const imageRef = ref(
      storage,
      `usersProfilePic/${user.uid}/profile_${timestamp}.jpg`
    );

    // 2. Upload image
    console.log("Uploading file to Firebase Storage...");
    await uploadBytes(imageRef, file);

    // 3. Get the public URL of the uploaded image
    console.log("Getting download URL...");
    const imageURL = await getDownloadURL(imageRef);

    // 4. Save URL in Firestore
    console.log("Updating Firestore with new image URL...");
    await updateDoc(doc(db, "users", user.uid), {
      profilePic: imageURL,
      updatedAt: new Date() // Good practice to track updates
    });

    console.log("Profile image updated successfully!");
    alert("Profile image updated ✅");
    
    // Optional: Redirect or update UI
    // window.location.reload(); // To show the new image everywhere

  } catch (error) {
    console.error("Error during upload:", error);
    alert("Failed to update profile image. Error: " + error.message);
  }
});