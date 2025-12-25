/* 
 *  JOYIN Social Media - Interactive Functions
 *  This file powers JOYIN's features.
 *  (c) 2025 JOYIN
 */

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let viewerId = null;
let profileUserId = null;

// Cache DOM elements at the top for better performance
const userNameElement = document.getElementById("user-name");
const userHandleElement = document.getElementById("user-handle");
const fullBioElement = document.getElementById("full-bio");
const followersCountElement = document.getElementById("followers-count");
const followingCountElement = document.getElementById("following-count");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.uid);
    viewerId = user.uid;

    // Get profile user ID from URL parameters
    const params = new URLSearchParams(window.location.search);
    profileUserId = params.get("uid") || viewerId;

    console.log("Viewer:", viewerId);
    console.log("Profile:", profileUserId);

    // Show loading state
    showLoadingState();

    await loadUserProfile(profileUserId);
  } else {
    window.location.href = "../login/?view=login";
  }
});

async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      // console.log("✅ Profile data loaded:", data);

      // Update UI elements
      if (userNameElement) {
        userNameElement.textContent = data.username || "User";
      }
      
      if (userHandleElement) {
        userHandleElement.textContent = `@${data.username}` || "@User";
      }
      
      if (fullBioElement) {
        fullBioElement.textContent = data.bio || "No bio yet";
      }
      
      document.title = `(${data.username}) | JOYIN` || "(User) | JOYIN";
      
      if (followersCountElement) {
        followersCountElement.textContent = data.followersCount || 0;
      }
      
      if (followingCountElement) {
        followingCountElement.textContent = data.followingCount || 0;
      }

      let profileImg = document.getElementById("profileImage");
      profileImg.src = data.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";

      // Hide loading state after successful load
      hideLoadingState();
      
    } else {
      console.log("❌ No profile found");
      
      // Show error message to user
      if (userNameElement) {
        setTimeout(() => {
          userNameElement.textContent = "User Not Found";
          userNameElement.style.color = "red";
        }, 2000);
      }
      
      hideLoadingState();
    }
  } catch (error) {
    console.error("❌ Error loading profile:", error);
    
    // Show error message to user
    if (userNameElement) {
      setTimeout(() => {
        userNameElement.textContent = "Error Loading Profile";
        userNameElement.style.color = "red";
      }, 2000);
    }
    
    hideLoadingState();
    showErrorState("Failed to load profile");
  }
}

// ============================================
// LOADING STATE FUNCTIONS
// ============================================

function showLoadingState() {
  // Set loading text on elements if they exist
  if (userNameElement) {
    userNameElement.textContent = "Loading...";
  }
  
  if (fullBioElement) {
    fullBioElement.textContent = "Loading profile...";
  }
  
  // Add loading class to profile section if it exists
  const profileSection = document.querySelector(".profile-section, .container, main");
  if (profileSection) {
    profileSection.classList.add("loading");
  }
  
  // Add dynamic loading styles
  addLoadingStyles();
}

function hideLoadingState() {
  const profileSection = document.querySelector(".profile-section, .container, main");
  if (profileSection) {
    profileSection.classList.remove("loading");
  }
}

function showErrorState(errorMessage) {
  // Show error in bio element if it exists
  if (fullBioElement) {
    fullBioElement.textContent = errorMessage;
    fullBioElement.style.color = "red";
  }
  
  // Also show in user name if bio doesn't exist
  if (!fullBioElement && userNameElement) {
    userNameElement.textContent = errorMessage;
    userNameElement.style.color = "red";
  }
}

// ============================================
// DYNAMIC LOADING STYLES
// ============================================

function addLoadingStyles() {
  // Only add styles once
  if (document.getElementById('loading-styles')) return;
  
  const loadingStyles = `
    .loading {
        opacity: 0.7;
        pointer-events: none;
        position: relative;
    }

    .loading::after {
        content: "Loading profile...";
        display: block;
        text-align: center;
        color: #5b53f2;
        margin-top: 10px;
        font-size: 14px;
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.id = 'loading-styles';
  styleSheet.textContent = loadingStyles;
  document.head.appendChild(styleSheet);
}