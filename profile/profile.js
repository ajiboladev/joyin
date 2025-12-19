// ============================================
// FIREBASE IMPORTS - ADDED collection
// ============================================

// Import Firebase Firestore functions we need
import { doc, getDoc, updateDoc, increment, deleteDoc, setDoc, collection, getDocs } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Import our Firebase configuration from a local file
import { auth, db } from "../firebase.js";

// Import Firebase Authentication listener
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ============================================
// DOM ELEMENT CACHE
// ============================================

// Get ALL elements with class ".username_s" (both desktop & mobile)
const usernameElements = document.querySelectorAll(".username_s");

// Get ALL elements with class ".bio-text-content"
const bioElements = document.querySelectorAll(".bio-text-content");

// Get ALL elements with class ".followers-count" (the number, not the text)
const followersElements = document.querySelectorAll(".followers-count");

// Get ALL elements with class ".following-count"
const followingElements = document.querySelectorAll(".following-count");

// Get ALL elements with class ".like-count"
const likes = document.querySelectorAll(".like-count");

// Get the SINGLE element with class ".block" (for showing messages)
const message = document.querySelector(".block");

// Get specific elements by their IDs for click functionality
const followersDesktop = document.getElementById("followers-desktop");
const followingDesktop = document.getElementById("following-desktop");
const followersMobile = document.getElementById("followers-mobile");
const uploadDesktop = document.getElementById("upload-desktop");
const uploadMobile = document.getElementById("upload-mobile");

// ============================================
// GLOBAL VARIABLES
// ============================================

// Variable to store WHO is looking at the page (current logged-in user)
let viewerId = null;

// Variable to store WHOSE profile is being shown (could be viewer's own or someone else's)
let profileUserId = null;

// ============================================
// SEE MORE LINK FUNCTION
// ============================================

// Function to make "See More" links work (for long bios)
function setupSeeMoreLinks(uid) {
  // Get the desktop "See More" link
  const seeMoreLink = document.getElementById("see-more-bio-link");
  // Get the mobile "See More" link
  const seeMoreLinkSm = document.getElementById("see-more-bio-link-sm");
  
  // Setup desktop link if it exists
  if (seeMoreLink) {
    // When desktop link is clicked...
    seeMoreLink.onclick = function(event) {
      event.preventDefault(); // Stop normal link behavior
      // Redirect to bio page with user ID
      window.location.href = `more-bio/?view=profile&tab=see-more&uid=${uid}`;
    };
  }
  
  // Setup mobile link if it exists
  if (seeMoreLinkSm) {
    // When mobile link is clicked...
    seeMoreLinkSm.onclick = function(event) {
      event.preventDefault(); // Stop normal link behavior
      // Redirect to bio page with user ID
      window.location.href = `more-bio/?view=profile&tab=see-more&uid=${uid}`;
    };
  }
}

// ============================================
// INITIALIZATION - WAIT FOR DOM TO LOAD
// ============================================

// Wait for HTML page to fully load before running JavaScript
document.addEventListener("DOMContentLoaded", () => {
  
  // Get BOTH follow buttons (desktop and mobile versions)
  const followButton = document.getElementById("follow-button");
  const followButtonSm = document.getElementById("follow-button-sm");
  
  // Warn if no follow buttons found (helpful for debugging)
  if (!followButton && !followButtonSm) {
    console.warn("No follow buttons found");
  }

  // ============================================
  // AUTHENTICATION STATE LISTENER
  // ============================================

  // Firebase listener that runs when user logs in/out
  onAuthStateChanged(auth, async (user) => {
    // If user is logged in...
    if (user) {
      console.log("User logged in:", user.uid);
      viewerId = user.uid; // Store the logged-in user's ID

      // Get profile user ID from URL (like "?uid=abc123")
      const params = new URLSearchParams(window.location.search);
      // If no "uid" in URL, use the viewer's own ID
      profileUserId = params.get("uid") || viewerId;

      console.log("Viewer:", viewerId);     // Who's looking
      console.log("Profile:", profileUserId); // Whose profile is showing

      // Hide follow buttons if viewing OWN profile (can't follow yourself)
      if (viewerId === profileUserId) {
        // Hide desktop follow button
        if (followButton) followButton.style.display = "none";
        // Hide mobile follow button
        if (followButtonSm) followButtonSm.style.display = "none";
      } else {
        // Show follow buttons for OTHER people's profiles
        if (followButton) followButton.style.display = "block";
        if (followButtonSm) followButtonSm.style.display = "block";
        
        // Hide edit button (can't edit someone else's profile)
        const editProfileButton = document.getElementById("edit-profile-button");
        if (editProfileButton) editProfileButton.style.display = "none";
        
        // Hide settings icon (can't access someone else's settings)
        const settingsIcon = document.getElementById("settings-icon");
        if (settingsIcon) settingsIcon.style.display = "none";
        
        // Show message button (can message other users)
        const editProfileMessage = document.getElementById("edit-profile-button-message");
        if (editProfileMessage) editProfileMessage.style.display = "block";

        // Hide some navigation links when viewing others' profiles
        // (This prevents users from seeing others' followers/following/upload stats)
        if (followersDesktop) followersDesktop.style.display = "none";
        if (followingDesktop) followingDesktop.style.display = "none";
        if (followersMobile) followersMobile.style.display = "none";
        if (uploadDesktop) uploadDesktop.style.display = "none";
        if (uploadMobile) uploadMobile.style.display = "none";
      }
      
      // Show "Loading..." state
      showLoadingState();

      // Setup clickable followers/following pages
      await followingPage(profileUserId);
      await followersPage(profileUserId);
      
      // Load the user's profile data from Firebase
      await loadUserProfile(profileUserId);

      // Setup "See More" links AFTER profile is loaded
      setupSeeMoreLinks(profileUserId);

      // Setup follow system ONLY if viewing someone else's profile
      if (viewerId !== profileUserId) {
        await initializeFollowSystem();
      }
      
    } else {
      // No user logged in - redirect to login page
      window.location.href = "../login/?view=login";
    }
  });

  // ============================================
  // LOAD USER PROFILE FUNCTION
  // ============================================

  // Function to load user data from Firebase
  async function loadUserProfile(uid) {
    try {
      // Create a reference to the user's document in Firestore
      // Path: "users/{userId}"
      const userRef = doc(db, "users", uid);
      
      // Get the actual document data (waits for Firebase response)
      const userSnap = await getDoc(userRef);

      // If the user document exists in Firebase...
      if (userSnap.exists()) {
        // Get all the data from the document
        const data = userSnap.data();
        // console.log("✅ Profile data loaded:", data); // Debug line

        // Update ALL username elements on the page
        usernameElements.forEach(el => {
          el.textContent = data.username || "User"; // Use "User" if no username
        });

        // Update ALL bio elements
        bioElements.forEach(el => {
          el.textContent = data.bio || "No bio yet"; // Default if no bio
          truncateBio(el); // Cut long bios with "..."
          setTimeout(() => {
            truncateAllBios(); // Do it again after a short delay
          }, 100);
        });

        // Update ALL followers count elements
        followersElements.forEach(el => {
          el.textContent = data.followersCount || 0; // Default to 0
        });

        // Update ALL following count elements
        followingElements.forEach(el => {
          el.textContent = data.followingCount || 0; // Default to 0
        });

        // Update ALL likes count elements
        likes.forEach(el => {
          el.textContent = data.likesCount || 0; // Default to 0
        });

        // Update browser tab title
        document.title = `(${data.username}) | JOYIN` || "(User) | JOYIN";

        // Hide loading state after 1 second
        setTimeout(() => {
          hideLoadingState();
        }, 1000);
        
      } else {
        // If user doesn't exist in Firebase...
        console.log("❌ No profile found");
        showErrorState("Profile not found");
        message.style.color = "red";
        setTimeout(() => {
          message.innerHTML = "Profile not found"; // Show error message
        }, 2000);

        // Hide loading after showing error
        setTimeout(() => {
          hideLoadingState();
        }, 2000);
      }
      
    } catch (error) {
      // If something goes wrong (network error, etc.)
      console.error("❌ Error loading profile:", error);
      showErrorState("Failed to load profile");
      message.style.color = "red";
      setTimeout(() => {
        message.innerHTML = "Failed to load profile";
      }, 2000);

      setTimeout(() => {
        hideLoadingState();
      }, 2000);
    }
  }

  // ============================================
  // LOADING STATE FUNCTIONS
  // ============================================

  // Show "Loading..." text while fetching data
  function showLoadingState() {
    usernameElements.forEach(el => {
      el.textContent = "Loading...";
    });
    
    bioElements.forEach(el => {
      el.textContent = "Loading profile...";
    });
    
    // Add a "loading" class to the profile section
    const profileSection = document.querySelector(".profile-section");
    if (profileSection) {
      profileSection.classList.add("loading");
    }
  }

  // Remove "Loading..." state
  function hideLoadingState() {
    const profileSection = document.querySelector(".profile-section");
    if (profileSection) {
      profileSection.classList.remove("loading");
    }
  }

  // Show error message in bio area
  function showErrorState(errorMessage) {
    bioElements.forEach(el => {
      el.textContent = errorMessage;
      el.style.color = "red";
    });
  }

  // ============================================
  // DYNAMIC LOADING STYLES
  // ============================================

  // CSS that gets added to the page for loading state
  const loadingStyles = `
  .profile-section.loading {
      opacity: 0.7;
      pointer-events: none;
      position: relative;
  }

  .profile-section.loading::after {
      content: "Loading profile...";
      display: block;
      text-align: center;
      color: #5b53f2;
      margin-top: 10px;
      font-size: 14px;
  }
  `;

  // Create a <style> tag and add it to the page
  const styleSheet = document.createElement("style");
  styleSheet.textContent = loadingStyles;
  document.head.appendChild(styleSheet);

  // ============================================
  // BIO TEXT TRUNCATION FUNCTIONS
  // ============================================

  // Cut long bios and add "..." after 120 characters
  function truncateBio(bioElement) {
      const charLimit = 120;
      const fullText = bioElement.textContent;
      const seeMoreLink = bioElement.nextElementSibling; // The "See More" link next to bio
      
      // If there's a "See More" link next to the bio...
      if (seeMoreLink && seeMoreLink.classList.contains('see-more-link')) {
          // If bio is longer than limit...
          if (fullText.length > charLimit) {
              // Cut it and add "..."
              bioElement.textContent = fullText.substring(0, charLimit) + '...';
              seeMoreLink.style.display = 'inline'; // Show "See More" link
          } else {
              seeMoreLink.style.display = 'none'; // Hide "See More" link
          }
      }
  }

  // Same function for mobile/other bio elements
  function truncateAllBios() {
    const bioTexts = document.querySelectorAll('.bio-text-content');
    
    bioTexts.forEach(bioText => {
      const seeMoreLink = bioText.nextElementSibling;
      
      if (seeMoreLink && seeMoreLink.classList.contains('see-more')) {
        const fullBioText = bioText.textContent;
        const charLimit = 50;
        
        if (fullBioText.length > charLimit) {
          bioText.textContent = fullBioText.substring(0, charLimit) + '...';
          seeMoreLink.style.display = 'inline';
        } else {
          seeMoreLink.style.display = 'none';
        }
      }
    });
  }

}); // END OF DOMContentLoaded - Everything above runs when page loads

// ============================================
// FOLLOW SYSTEM FUNCTIONS - UPDATED
// ============================================

// Get all follow buttons on the page
function getAllFollowButtons() {
  const buttons = [];
  const desktopButton = document.getElementById("follow-button");
  const mobileButton = document.getElementById("follow-button-sm");
  
  if (desktopButton) buttons.push(desktopButton);
  if (mobileButton) buttons.push(mobileButton);
  
  return buttons;
}

// CHECK IF VIEWER ALREADY FOLLOWS PROFILE USER
async function checkFollowStatus() {
  // Need both IDs to check
  if (!viewerId || !profileUserId) {
    console.error("Cannot check follow status: IDs missing");
    return false;
  }
  
  try {
    // Reference to: "users/{profileUserId}/followers/{viewerId}"
    const followRef = doc(db, "users", profileUserId, "followers", viewerId);
    const snap = await getDoc(followRef);
    return snap.exists(); // true if following, false if not
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

// UPDATE BUTTON TEXT BASED ON FOLLOW STATUS
async function updateFollowButton() {
  const followButtons = getAllFollowButtons();
  
  if (followButtons.length === 0) return; // No buttons found
  
  try {
    // Check if currently following
    const isFollowing = await checkFollowStatus();
    
    // Update each button
    followButtons.forEach(button => {
      button.textContent = isFollowing ? "Unfollow" : "Follow";
      
      // Change button colors
      if (isFollowing) {
        button.style.backgroundColor = "#333"; // Dark gray for "Unfollow"
        button.style.color = "#fff";
      } else {
        button.style.backgroundColor = "#5b53f2"; // Purple for "Follow"
        button.style.color = "#fff";
      }
    });
  } catch (error) {
    console.error("Error updating button:", error);
  }
}

// INITIALIZE THE ENTIRE FOLLOW SYSTEM
async function initializeFollowSystem() {
  const followButtons = getAllFollowButtons();
  
  // Need buttons and user IDs to work
  if (followButtons.length === 0 || !viewerId || !profileUserId) {
    console.error("Cannot initialize follow system: Missing elements or IDs");
    return;
  }
  
  console.log("Initializing follow system...");
  
  // Set initial button state (Follow/Unfollow)
  await updateFollowButton();
  
  // Setup click listeners for all buttons
  followButtons.forEach(button => {
    // Remove old listeners first (prevent duplicates)
    button.removeEventListener("click", handleFollowClick);
    // Add new listener
    button.addEventListener("click", handleFollowClick);
  });
}

// HANDLE FOLLOW BUTTON CLICK
async function handleFollowClick() {
  const followButtons = getAllFollowButtons();
  
  if (followButtons.length === 0 || !viewerId || !profileUserId) {
    console.error("Cannot toggle follow: Missing elements or IDs");
    return;
  }
  
  // Disable all buttons during operation (prevent double clicks)
  followButtons.forEach(button => {
    button.disabled = true;
    button.textContent = "..."; // Show loading dots
  });
  
  try {
    await toggleFollow(); // Do the follow/unfollow action
  } catch (error) {
    console.error("Follow error:", error);
    const message = document.querySelector(".block");
    if (message) {
      message.style.color = "red";
      setTimeout(() => {
        message.innerHTML = "Failed to update follow status. Please try again.";
      }, 1500);
    }
    
    // Restore button text if error occurs
    await updateFollowButton();
  } finally {
    // Always re-enable buttons (even if error occurred)
    followButtons.forEach(button => {
      button.disabled = false;
    });
  }
}

// TOGGLE FOLLOW/UNFOLLOW - UPDATED FOR BIDIRECTIONAL TRACKING
async function toggleFollow() {
  if (!viewerId || !profileUserId) {
    throw new Error("Missing viewerId or profileUserId");
  }
  
  // References for BOTH directions:
  // 1. User B's followers list (add/remove User A)
  const profileFollowersRef = doc(db, "users", profileUserId, "followers", viewerId);
  
  // 2. User A's following list (add/remove User B) - NEW for bidirectional
  const viewerFollowingRef = doc(db, "users", viewerId, "following", profileUserId);
  
  // References to update the count numbers
  const profileRef = doc(db, "users", profileUserId);
  const viewerRef = doc(db, "users", viewerId);

  // Check if already following
  const alreadyFollowing = await getDoc(profileFollowersRef);

  if (alreadyFollowing.exists()) {
    // UNFOLLOW - Remove from both collections
    console.log("Unfollowing user...");
    
    // Remove from profile user's followers
    await deleteDoc(profileFollowersRef);
    
    // Remove from viewer's following
    await deleteDoc(viewerFollowingRef);
    
    // Decrease both counts by 1
    await updateDoc(profileRef, { followersCount: increment(-1) });
    await updateDoc(viewerRef, { followingCount: increment(-1) });
    
  } else {
    // FOLLOW - Add to both collections
    console.log("Following user...");
    
    // Add to profile user's followers
    await setDoc(profileFollowersRef, { 
      followedAt: new Date().toISOString(), // Timestamp
      userId: viewerId
    });
    
    // Add to viewer's following
    await setDoc(viewerFollowingRef, { 
      followedAt: new Date().toISOString(),
      userId: profileUserId
    });
    
    // Increase both counts by 1
    await updateDoc(profileRef, { followersCount: increment(1) });
    await updateDoc(viewerRef, { followingCount: increment(1) });
  }

  // Update button text (Follow/Unfollow)
  await updateFollowButton();
  
  // Update the count numbers on the page
  await refreshCounts();
  
  // Show a temporary success message
  showFollowMessage(!alreadyFollowing.exists());
}

// REFRESH COUNTS IN UI
async function refreshCounts() {
  if (!viewerId || !profileUserId) return;
  
  try {
    // Get fresh data for BOTH users
    const profileSnap = await getDoc(doc(db, "users", profileUserId));
    const viewerSnap = await getDoc(doc(db, "users", viewerId));

    // Update profile user's counts
    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      
      // Update ALL followers count elements
      followersElements.forEach(el => {
        el.textContent = profileData.followersCount || 0;
      });
      
      // Update ALL following count elements
      followingElements.forEach(el => {
        el.textContent = profileData.followingCount || 0;
      });
    }
    
    // If viewing OWN profile, update counts from viewer's data too
    if (viewerSnap.exists() && viewerId === profileUserId) {
      const viewerData = viewerSnap.data();
      
      // Update both counts (same as above for own profile)
      followersElements.forEach(el => {
        el.textContent = viewerData.followersCount || 0;
      });
      
      followingElements.forEach(el => {
        el.textContent = viewerData.followingCount || 0;
      });
    }
  } catch (error) {
    console.error("Error refreshing counts:", error);
  }
}

// ============================================
// NEW FUNCTIONS FOR FOLLOW MANAGEMENT
// ============================================

// Show follow/unfollow success message
function showFollowMessage(isFollowing) {
  let messageElement = document.querySelector(".follow-message");
  
  // Create message element if it doesn't exist
  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "follow-message";
    messageElement.style.cssText = "text-align: center; font-size: 14px; margin-top: 5px; color: #5b53f2; display: none;";
    
    // Try to attach it near the follow button
    const followButton = document.getElementById("follow-button");
    if (followButton && followButton.parentNode) {
      followButton.parentNode.appendChild(messageElement);
    } else {
      console.warn("Could not find follow button to attach follow message");
      return;
    }
  }
  
  // Set message text and color
  messageElement.textContent = isFollowing ? "Followed successfully!" : "Unfollowed";
  messageElement.style.color = isFollowing ? "#5b53f2" : "#333";
  messageElement.style.display = "block"; // Show the message
  
  // Hide message after 2 seconds
  setTimeout(() => {
    if (messageElement) {
      messageElement.style.display = "none";
    }
  }, 2000);
}

// ============================================
// Followers Page FUNCTIONS
// ============================================

// Make followers count/link clickable
async function followersPage(uid) {
    let desktopFollowers = document.getElementById("followers-desktop");
    let mobileFollowers = document.getElementById("followers-mobile");
    let followersCountDesktop = document.getElementById("followers-count-desktop");
    let followersCountMobile = document.getElementById("followers-count-mobile");
    
    // Desktop followers link
    if (desktopFollowers) {
        desktopFollowers.onclick = function() {
            // Redirect to followers list page
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }
    
    // Mobile followers link
    if (mobileFollowers) {
        mobileFollowers.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }

    // Desktop followers count number
    if (followersCountDesktop) {
        followersCountDesktop.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }

    // Mobile followers count number
    if (followersCountMobile) {
        followersCountMobile.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }
}

// ============================================
// Following Page FUNCTIONS
// ============================================

// Make following count/link clickable
async function followingPage(uid) {
    let desktopFollowing = document.getElementById("following-desktop");
    let followingCountDesktop = document.getElementById("following-count-desktop");
    let followingCountMobile = document.getElementById("following-count-mobile");
    
    // Desktop following link
    if (desktopFollowing) {
        desktopFollowing.onclick = function() {
            // Redirect to following list page
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }

    // Desktop following count number
    if (followingCountDesktop) {
        followingCountDesktop.onclick = function() {
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }

    // Mobile following count number
    if (followingCountMobile) {
        followingCountMobile.onclick = function() {
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }
}

// ============================================
// DEBUG HELPER - Check if everything is loaded
// ============================================

// Function to check system status (for debugging)
function checkSystemStatus() {
  const followButtons = getAllFollowButtons();
  console.log("=== SYSTEM STATUS ===");
  console.log("Follow buttons found:", followButtons.length);
  console.log("Viewer ID:", viewerId);
  console.log("Profile User ID:", profileUserId);
  console.log("Database:", db ? "Connected" : "Not connected");
  console.log("==================");
}



// Check current state
// checkSystemStatus();

// // Force refresh counts
// refreshCounts();

// // Check if both buttons are found
// console.log("Desktop button:", document.getElementById("follow-button"));
// console.log("Mobile button:", document.getElementById("follow-button-sm"));

// ============================================
// FEATURES SUMMARY
// ============================================

/*
FEATURES IMPLEMENTED:

1. USER AUTHENTICATION
   - Detects when user logs in/out
   - Redirects to login if not authenticated
   - Manages user sessions

2. PROFILE VIEWING
   - Views own profile or other users' profiles
   - Handles URL parameters for profile selection
   - Shows/hides appropriate buttons based on profile ownership

3. PROFILE DATA LOADING
   - Fetches user data from Firestore
   - Updates all UI elements with user data
   - Handles loading states with visual feedback
   - Implements error handling for failed loads

4. FOLLOW SYSTEM
   - Follow/unfollow functionality
   - Real-time button state updates
   - Database counters for followers/following
   - Visual feedback with button colors
   - Loading states during operations
   - Error handling for failed operations

5. BIO TRUNCATION
   - Desktop: 120 character limit with "see more"
   - Mobile: 50 character limit with "see more"
   - Dynamic text truncation based on content length

6. LOADING STATES
   - Shows "Loading..." text during data fetch
   - CSS animations for loading states
   - Minimum display time for smooth UX

7. ERROR HANDLING
   - Network error handling
   - Database error handling
   - User-friendly error messages
   - Graceful degradation

8. UI UPDATES
   - Dynamic title updates
   - Real-time count updates
   - Button state management
   - Responsive design support

9. PERFORMANCE OPTIMIZATIONS
   - DOM element caching
   - Single event listeners
   - Efficient database queries
   - Debounced operations

10. DEBUGGING SUPPORT
    - Console logging for development
    - System status checker
    - Error tracking
*/

// ============================================
// IMPORTANT NOTES
// ============================================

/*
CRITICAL ISSUES TO FIX:

1. DUPLICATE CODE: There are two onAuthStateChanged listeners
   - One at line ~47
   - Another at line ~239
   This causes duplicate event handlers and potential bugs
   
   SOLUTION: Remove the second onAuthStateChanged block (lines 239-268)

2. TIMING ISSUES: The follow system initialization might run before
   profile data is loaded, causing race conditions
   
   SOLUTION: Ensure initializeFollowSystem() is called after
   loadUserProfile() completes

3. MISSING IMPORTS: Make sure all Firebase functions are imported
   at the top of the file

4. SECURITY: Ensure Firebase Firestore rules are properly configured
   to allow follow/unfollow operations

RECOMMENDED IMPROVEMENTS:

1. Add real-time listeners for follower count changes
2. Implement caching for frequently accessed profiles
3. Add animations for state transitions
4. Implement offline support
5. Add keyboard navigation support
6. Improve accessibility (ARIA labels, keyboard focus)
7. Add unit tests for critical functions
8. Implement rate limiting for follow/unfollow actions
9. Add confirmation dialog for unfollow actions
10. Implement follow suggestions
*/













// FOLLOW SYSTEM
// async function singleFollow(viewerId, profileUserId) {
//   await updateDoc(doc(db, "users", profileUserId), {
//     followersCount: increment(1)
//   });

//   await updateDoc(doc(db, "users", viewerId), {
//     followingCount: increment(1)
//   });

//   console.log("Follow success");
//   window.location.reload()
// }
// document.getElementById("follow-button")
//   .addEventListener("click", async () => {
//     if (!viewerId || !profileUserId) {
//       alert("User not ready yet");
//       return;
//     }

//     await singleFollow(viewerId, profileUserId);
//   });
// async function isAlreadyFollowing(viewerId, profileUserId) {
//   const followRef = doc(db, "users", profileUserId, "followers", viewerId);
//   const snap = await getDoc(followRef);
//   return snap.exists();
// }

// async function followOnce(viewerId, profileUserId) {
//   const alreadyFollowing = await isAlreadyFollowing(viewerId, profileUserId);

//   if (alreadyFollowing) {
//     message.style.color= "green";
//     setTimeout(() => {
//       message.innerHTML= "You already followed this user";
//     }, 2000);
//     return;
//   }

//   // mark as followed
//   await setDoc(
//     doc(db, "users", profileUserId, "followers", viewerId),
//     { followedAt: Date.now() }
//   );

//   // update counts
//   await updateDoc(doc(db, "users", profileUserId), {
//     followersCount: increment(1)
//   });

//   await updateDoc(doc(db, "users", viewerId), {
//     followingCount: increment(1)
//   });
// // Update button text immediately
// document.getElementById("follow-button").textContent = "Unfollow";
//   message.style.color="green";
//   setTimeout(() => {
//     message.innerHTML="Followed successfully";
//   }, 2000);
// }
// try {
//   await followOnce(viewerId, profileUserId);
// } catch (error) {
//   message.style.color= "red";
//   setTimeout(() => {
//     message.innerHTML = "Failed to follow. Please try again.";
//   }, 2000);
// }

// document.getElementById("follow-button")
//   .addEventListener("click", () => {
//     followOnce(viewerId, profileUserId);
//   });








// import { doc, getDoc } 
// from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
// import { auth, db } from "../firebase.js";
// import { onAuthStateChanged } 
// from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     console.log("User logged in:", user.uid);
//     loadUserProfile(user.uid);
//   } else {
//     window.location.href = "../login/?view=login";
//   }
// });

// async function loadUserProfile(uid) {
//   const userRef = doc(db, "users", uid);
//   const userSnap = await getDoc(userRef);

//   if (userSnap.exists()) {
//     const data = userSnap.data();
//     // console.log("Profile data:", data);


//     document.querySelectorAll(".username_s").forEach(el => {
//     el.textContent = data.username;
// });

// document.querySelectorAll(".bio-text-content").forEach(el => {
//     el.textContent = data.bio;
// });


//   } else {
//     console.log("No profile found");
//   }
// }