// ============================================
// FIREBASE IMPORTS
// ============================================
import { doc, getDoc, updateDoc, increment, deleteDoc, setDoc,  collection,
  query,
  where,
  orderBy,
  getDocs, serverTimestamp, runTransaction } 
from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { auth, db } from "../firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"; // Use your Firebase version

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ============================================
// DOM ELEMENT CACHE
// ============================================
const usernameElements = document.querySelectorAll(".username_s");
const bioElements = document.querySelectorAll(".bio-text-content");
const followersElements = document.querySelectorAll(".followers-count");
const followingElements = document.querySelectorAll(".following-count");
// const likersElements = document.querySelectorAll(".likers-count");
const likesElements = document.querySelectorAll(".like-count");
const message = document.querySelector(".block");

const followersDesktop = document.getElementById("followers-desktop");
const followingDesktop = document.getElementById("following-desktop");
const followersMobile = document.getElementById("followers-mobile");
const uploadDesktop = document.getElementById("upload-desktop");
const uploadMobile = document.getElementById("upload-mobile");

// ============================================
// GLOBAL VARIABLES
// ============================================
let viewerId = null;
let profileUserId = null;

// ============================================
// SEE MORE LINK FUNCTION - COMPLETELY FIXED
// ============================================
function setupSeeMoreLinks(uid) {
  console.log("📖 Setting up see more links for uid:", uid);
  
  // Get all see more links
  const allSeeMoreLinks = document.querySelectorAll('.see-more');
  console.log("📖 Found see more links:", allSeeMoreLinks.length);
  
  allSeeMoreLinks.forEach((link, index) => {
    console.log(`📖 Setting up link ${index + 1}:`, link.id || 'no-id');
    
    // Remove any existing handlers by cloning
    const newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);
    
    // Add the click handler
    newLink.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      console.log("📖 See more clicked! Navigating to bio page...");
      window.location.href = `more-bio/?view=profile&tab=see-more&uid=${uid}`;
    });
    
    console.log(`✅ See more link ${index + 1} handler added`);
  });
}






// ============================================
// PROFILE IMAGE NAVIGATION - FIXED
// ============================================
function setupProfileImageNavigation(uid) {
  console.log("🖼️ Setting up profile image navigation for uid:", uid);
  
  // Get the CONTAINER divs, not the images themselves
  const desktopBannerContainer = document.querySelector("#profile-banner-desktop .profile-banner");
  const mobileBannerContainer = document.querySelector("#profile-banner-mobile");
  
  if (desktopBannerContainer) {
    desktopBannerContainer.style.cursor = "pointer";
    
    // Remove any existing click handlers
    const newDesktopBanner = desktopBannerContainer.cloneNode(true);
    desktopBannerContainer.parentNode.replaceChild(newDesktopBanner, desktopBannerContainer);
    
    newDesktopBanner.onclick = function(e) {
      // Only trigger if clicking the image or the container, not child elements
      if (e.target.tagName === 'IMG' || e.target === newDesktopBanner) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🖼️ Desktop profile image clicked, navigating...");
        window.location.href = `profile-image/?view=profile-image&uid=${uid}`;
      }
    };
    console.log("✅ Desktop profile image click handler added");
  } else {
    console.warn("⚠️ Desktop profile banner not found");
  }
  
  if (mobileBannerContainer) {
    mobileBannerContainer.style.cursor = "pointer";
    
    // Remove any existing click handlers
    const newMobileBanner = mobileBannerContainer.cloneNode(true);
    mobileBannerContainer.parentNode.replaceChild(newMobileBanner, mobileBannerContainer);
    
    newMobileBanner.onclick = function(e) {
      // Only trigger if clicking the image or the container, not child elements
      if (e.target.tagName === 'IMG' || e.target === newMobileBanner) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🖼️ Mobile profile image clicked, navigating...");
        window.location.href = `profile-image/?view=profile-image&uid=${uid}`;
      }
    };
    console.log("✅ Mobile profile image click handler added");
  } else {
    console.warn("⚠️ Mobile profile banner not found");
  }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  
  const followButton = document.getElementById("follow-button");
  const followButtonSm = document.getElementById("follow-button-sm");
  
  if (!followButton && !followButtonSm) {
    console.warn("No follow buttons found");
  }

  // ============================================
  // AUTHENTICATION STATE LISTENER
  // ============================================
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("User logged in:", user.uid);
      viewerId = user.uid;

      const params = new URLSearchParams(window.location.search);
      profileUserId = params.get("uid") || viewerId;

      console.log("Viewer:", viewerId);
      console.log("Profile:", profileUserId);

      if (viewerId === profileUserId) {
        if (followButton) followButton.style.display = "none";
        if (followButtonSm) followButtonSm.style.display = "none";
      } else {
        if (followButton) followButton.style.display = "block";
        if (followButtonSm) followButtonSm.style.display = "block";
        
        const editProfileButton = document.getElementById("edit-profile-button");
        if (editProfileButton) editProfileButton.style.display = "none";
        
        const settingsIcon = document.getElementById("settings-icon");
        if (settingsIcon) settingsIcon.style.display = "none";

        const settings = document.getElementById("settings-icon-sm");
        if (settings) settings.style.display = "none";
        
        const editProfileMessage = document.getElementById("edit-profile-button-message");
        if (editProfileMessage) editProfileMessage.style.display = "block";

        const editProfileButtonSm = document.getElementById("edit-profile-sm");
        if (editProfileButtonSm) editProfileButtonSm.style.display = "none";
        
        if (followersDesktop) followersDesktop.style.display = "none";
        if (followingDesktop) followingDesktop.style.display = "none";
        if (followersMobile) followersMobile.style.display = "none";
        if (uploadDesktop) uploadDesktop.style.display = "none";
        if (uploadMobile) uploadMobile.style.display = "none";
      }
      
      showLoadingState();

       
      await followingPage(profileUserId);
      await followersPage(profileUserId);
      
      await loadUserProfile(profileUserId);

      // ✅ Account temporary ban
        const isBanned = await softBan(profileUserId);
        if (isBanned) {
            console.log("🛑 Stopping further execution - user is banned");
            return; // Stop here, don't load posts or profile
        }


       loadUserPosts(profileUserId);

       setupMessageButtons();
      
      // ✅ SETUP PROFILE IMAGE NAVIGATION AFTER PROFILE LOADS
      setupProfileImageNavigation(profileUserId);
      
      // ✅ SETUP SEE MORE LINKS AFTER A SHORT DELAY
      setTimeout(() => {
        setupSeeMoreLinks(profileUserId);
      }, 500);

      if (viewerId !== profileUserId) {
        await initializeFollowSystem();
      }
      
    } else {
      window.location.href = "../login/?view=login";
    }
  });


  

  // ============================================
  // LOAD USER PROFILE FUNCTION
  // ============================================
  async function loadUserProfile(uid) {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        usernameElements.forEach(el => {
          el.innerHTML = ` ${data.username || "User"} <i class="fa-solid fa-circle-check" style="color: #6a63f4; margin-left: 5px;"></i>`;
        });

        bioElements.forEach(el => {
          el.textContent = data.bio || "No bio yet";
          truncateBio(el);
        });
        
        // Truncate all bios after a delay to ensure DOM is ready
        setTimeout(() => {
          truncateAllBios();
          console.log("✂️ Bio truncation complete");
        }, 200);

        followersElements.forEach(el => {
          el.textContent = data.followersCount || 0;
        });

        followingElements.forEach(el => {
          el.textContent = data.followingCount || 0;
        });

        likesElements.forEach(el => {
          el.textContent = data.likesCount || 0;
        });

        let profileImageDesktop = document.getElementById("profileImgDesktop");
        profileImageDesktop.src = data.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";

        let profileImageMobile = document.getElementById("profileImgMobile");
        profileImageMobile.src = data.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";

        document.title = `(${data.username}) | JOYIN` || "(User) | JOYIN";

        setTimeout(() => {
          hideLoadingState();
        }, 1000);
        
      } else {
        console.log("❌ No profile found");
        showErrorState("Profile not found");
        message.style.color = "red";
        setTimeout(() => {
          message.innerHTML = "Profile not found";
        }, 2000);

        setTimeout(() => {
          hideLoadingState();
        }, 2000);
      }
      
    } catch (error) {
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
  function showLoadingState() {
    usernameElements.forEach(el => {
      el.textContent = "Loading...";
    });
    
    bioElements.forEach(el => {
      el.textContent = "Loading profile...";
    });
    
    const profileSection = document.querySelector(".profile-section");
    if (profileSection) {
      profileSection.classList.add("loading");
    }
  }

  function hideLoadingState() {
    const profileSection = document.querySelector(".profile-section");
    if (profileSection) {
      profileSection.classList.remove("loading");
    }
  }

  function showErrorState(errorMessage) {
    bioElements.forEach(el => {
      el.textContent = errorMessage;
      el.style.color = "red";
    });
  }

  // ============================================
  // DYNAMIC LOADING STYLES
  // ============================================
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

  const styleSheet = document.createElement("style");
  styleSheet.textContent = loadingStyles;
  document.head.appendChild(styleSheet);

  // ============================================
  // BIO TEXT TRUNCATION FUNCTIONS - COMPLETELY FIXED
  // ============================================
  function truncateBio(bioElement) {
      const charLimit = 1244;
      const fullText = bioElement.textContent.trim();
      
      // Find the next sibling that is a see-more link
      let seeMoreLink = bioElement.nextElementSibling;
      while (seeMoreLink && !seeMoreLink.classList.contains('see-more')) {
        seeMoreLink = seeMoreLink.nextElementSibling;
      }
      
      if (seeMoreLink) {
          if (fullText.length > charLimit) {
              bioElement.textContent = fullText.substring(0, charLimit);
              seeMoreLink.style.display = 'inline';
              console.log("✂️ Bio truncated to", charLimit, "chars, see more shown");
          } else {
              seeMoreLink.style.display = 'none';
              console.log("✂️ Bio is short (", fullText.length, "chars), see more hidden");
          }
      } else {
        console.warn("⚠️ See more link not found next to bio element");
      }
  }

  function truncateAllBios() {
    const bioTexts = document.querySelectorAll('.bio-text-content');
    console.log("✂️ Truncating all bios, found:", bioTexts.length);
    
    bioTexts.forEach((bioText, index) => {
      const fullBioText = bioText.textContent.trim();
      const charLimit = 120;
      
      // Find the next sibling that is a see-more link
      let seeMoreLink = bioText.nextElementSibling;
      while (seeMoreLink && !seeMoreLink.classList.contains('see-more')) {
        seeMoreLink = seeMoreLink.nextElementSibling;
      }
      
      if (seeMoreLink) {
        if (fullBioText.length > charLimit) {
          bioText.textContent = fullBioText.substring(0, charLimit);
          seeMoreLink.style.display = 'inline';
          console.log(`✂️ Bio ${index + 1} truncated to ${charLimit} chars, see more shown`);
        } else {
          seeMoreLink.style.display = 'none';
          console.log(`✂️ Bio ${index + 1} is short (${fullBioText.length} chars), see more hidden`);
        }
      } else {
        console.warn(`⚠️ See more link not found for bio ${index + 1}`);
      }
    });
  }

});

// ============================================
// FOLLOW SYSTEM FUNCTIONS
// ============================================
function getAllFollowButtons() {
  const buttons = [];
  const desktopButton = document.getElementById("follow-button");
  const mobileButton = document.getElementById("follow-button-sm");
  
  if (desktopButton) buttons.push(desktopButton);
  if (mobileButton) buttons.push(mobileButton);
  
  return buttons;
}

async function checkFollowStatus() {
  if (!viewerId || !profileUserId) {
    console.error("Cannot check follow status: IDs missing");
    return false;
  }
  
  try {
    const followRef = doc(db, "users", profileUserId, "followers", viewerId);
    const snap = await getDoc(followRef);
    return snap.exists();
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
}

async function updateFollowButton() {
  const followButtons = getAllFollowButtons();
  
  if (followButtons.length === 0) return;
  
  try {
    const isFollowing = await checkFollowStatus();
    
    followButtons.forEach(button => {
      button.textContent = isFollowing ? "Unfollow" : "Follow";
      
      if (isFollowing) {
        button.style.backgroundColor = "#333";
        button.style.color = "#fff";
      } else {
        button.style.backgroundColor = "#5b53f2";
        button.style.color = "#fff";
      }
    });
  } catch (error) {
    console.error("Error updating button:", error);
  }
}

async function initializeFollowSystem() {
  const followButtons = getAllFollowButtons();
  
  if (followButtons.length === 0 || !viewerId || !profileUserId) {
    console.error("Cannot initialize follow system: Missing elements or IDs");
    return;
  }
  
  console.log("Initializing follow system...");
  
  await updateFollowButton();
  
  followButtons.forEach(button => {
    button.removeEventListener("click", handleFollowClick);
    button.addEventListener("click", handleFollowClick);
  });
}

async function handleFollowClick() {
  const followButtons = getAllFollowButtons();
  
  if (followButtons.length === 0 || !viewerId || !profileUserId) {
    console.error("Cannot toggle follow: Missing elements or IDs");
    return;
  }
  
  followButtons.forEach(button => {
    button.disabled = true;
    button.textContent = "...";
  });
  
  try {
    await toggleFollow();
  } catch (error) {
    console.error("Follow error:", error);
    const message = document.querySelector(".block");
    if (message) {
      message.style.color = "red";
      setTimeout(() => {
        message.innerHTML = "Failed to update follow status. Please try again.";
      }, 1500);
    }
    
    await updateFollowButton();
  } finally {
    followButtons.forEach(button => {
      button.disabled = false;
    });
  }
}

async function toggleFollow() {
  console.log("=== FOLLOW DEBUG ===");
  console.log("viewerId:", viewerId);
  console.log("profileUserId:", profileUserId);  
  console.log("auth.currentUser.uid:", auth.currentUser?.uid);
  console.log("Match?", viewerId === auth.currentUser?.uid);

  if (!viewerId || !profileUserId) {
    throw new Error("Missing viewerId or profileUserId");
  }

  const profileFollowersRef = doc(db, "users", profileUserId, "followers", viewerId);
  const viewerFollowingRef = doc(db, "users", viewerId, "following", profileUserId);
  const profileRef = doc(db, "users", profileUserId);
  const viewerRef = doc(db, "users", viewerId);

  try {
    await runTransaction(db, async (transaction) => {
      // Get current follow state
      const followerSnap = await transaction.get(profileFollowersRef);

      if (followerSnap.exists()) {
        // Unfollow
        console.log("Unfollowing user...");
        transaction.delete(profileFollowersRef);
        transaction.delete(viewerFollowingRef);
        transaction.update(profileRef, { followersCount: increment(-1) });
        transaction.update(viewerRef, { followingCount: increment(-1) });

      } else {
        // Follow
        console.log("Following user...");
        transaction.set(profileFollowersRef, {
          followedAt: new Date().toISOString(),
          userId: viewerId
        });
        transaction.set(viewerFollowingRef, {
          followedAt: new Date().toISOString(),
          userId: profileUserId
        });
        transaction.update(profileRef, { followersCount: increment(1) });
        transaction.update(viewerRef, { followingCount: increment(1) });
      }
    });

    // Update UI **after transaction**
    await updateFollowButton();
    await refreshCounts();

    // Show message
    showFollowMessage(await getDoc(profileFollowersRef).then(snap => !snap.exists()));

  } catch (error) {
    console.error("Error toggling follow:", error);
  }
}


async function refreshCounts() {
  if (!viewerId || !profileUserId) return;
  
  try {
    const profileSnap = await getDoc(doc(db, "users", profileUserId));
    const viewerSnap = await getDoc(doc(db, "users", viewerId));

    if (profileSnap.exists()) {
      const profileData = profileSnap.data();
      
      followersElements.forEach(el => {
        el.textContent = profileData.followersCount || 0;
      });
      
      followingElements.forEach(el => {
        el.textContent = profileData.followingCount || 0;
      });
    }
    
    if (viewerSnap.exists() && viewerId === profileUserId) {
      const viewerData = viewerSnap.data();
      
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

function showFollowMessage(isFollowing) {
  let messageElement = document.querySelector(".follow-message");
  
  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "follow-message";
    messageElement.style.cssText = "text-align: center; font-size: 14px; margin-top: 5px; color: #5b53f2; display: none;";
    
    const followButton = document.getElementById("follow-button");
    if (followButton && followButton.parentNode) {
      followButton.parentNode.appendChild(messageElement);
    } else {
      console.warn("Could not find follow button to attach follow message");
      return;
    }
  }
  
  messageElement.textContent = isFollowing ? "Unfollowed" : "Followed successfully!";
  messageElement.style.color = isFollowing ? "#5b53f2" : "#5b53f2";
  messageElement.style.display = "block";
  
  setTimeout(() => {
    if (messageElement) {
      messageElement.style.display = "none";
    }
  }, 2000);
}

// ============================================
// FOLLOWERS/FOLLOWING PAGE FUNCTIONS
// ============================================
async function followersPage(uid) {
    let desktopFollowers = document.getElementById("followers-desktop");
    let mobileFollowers = document.getElementById("followers-mobile");
    let followersCountDesktop = document.getElementById("followers-count-desktop");
    let followersCountMobile = document.getElementById("followers-count-mobile");
    
    if (desktopFollowers) {
        desktopFollowers.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }
    
    if (mobileFollowers) {
        mobileFollowers.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }

    if (followersCountDesktop) {
        followersCountDesktop.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }

    if (followersCountMobile) {
        followersCountMobile.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }
}

async function followingPage(uid) {
    let desktopFollowing = document.getElementById("following-desktop");
    let followingCountDesktop = document.getElementById("following-count-desktop");
    let followingCountMobile = document.getElementById("following-count-mobile");
    
    if (desktopFollowing) {
        desktopFollowing.onclick = function() {
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }

    if (followingCountDesktop) {
        followingCountDesktop.onclick = function() {
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }

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















// ============================================
// POSTS LOADER WITH CLICK REDIRECT
// ============================================

const postsContainer = document.querySelector(".posts-container");
const postSystem = document.querySelector(".post-system-container");
let defaultImg = 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';


// ============================================
// BAN SYSTEM 
// ============================================

async function softBan(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Check if user is banned
            if (data.softBan === true || data.softBan === "true") {
                console.log("🚨 User is banned, showing info card");
                
                // Clear the posts area
                const postsArea =  postsContainer;//document.querySelector(".post-system-container");
                if (postsArea) {
                    postsArea.innerHTML = createInfoCard();
                }
                
                // Also clear any other posts container
                const otherPostsContainer = document.querySelector(".posts-container");
                if (otherPostsContainer) {
                    otherPostsContainer.innerHTML = createInfoCard();
                }
                
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking ban:", error);
    }
    return false;
}

// Function to create the info card - SIMPLIFIED VERSION
function createInfoCard() {
    // Add CSS if not already added
    const styleId = 'info-card-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .info-card {
                background: #1a1a1a;
                border-radius: 16px;
                padding: 24px;
                margin: 20px auto;
                max-width: 500px;
                border: 1px solid #333;
                text-align: center;
                color: white;
                animation: fadeIn 0.5s ease;
            }
            
            .info-icon {
                font-size: 48px;
                margin-bottom: 16px;
                color: #5b53f2;
            }
            
            .info-title {
                font-size: 20px;
                font-weight: 600;
                margin-bottom: 12px;
                color: #5b53f2;
            }
            
            .info-message {
                font-size: 15px;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.5;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create the card HTML
    return `
        <div class="info-card">
            <div class="info-icon">🔒</div>
            <h2 class="info-title">Account Restricted</h2>
            <p class="info-message">
                This account has been temporarily suspended.
            </p>
        </div>
    `;
}



async function loadUserPosts(userId) {
  postSystem.style.display = "none";
  postsContainer.innerHTML = `<span><i class="fas fa-spinner fa-spin"></i></span> Loading posts...`;
  

  try {
    const postsRef = collection(db, "posts");
    
    const q = query(
      postsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    postsContainer.innerHTML = "";
    postSystem.style.display = "none";

    // Empty state
    if (snapshot.empty) {
      postSystem.style.display = "none";
      
      if (viewerId === profileUserId) {
        postsContainer.innerHTML = `
          <div class="no-posts">
            <i class="fas fa-camera-retro"></i>
            <p>No posts yet. Be the first to post something!</p>
            <button onclick="window.location.href='../upload/'">
              <i class="fas fa-plus" style="font-size: 0.9rem; margin-right: 8px;"></i>Create Post
            </button>
          </div>
        `;
      } else {
        postsContainer.innerHTML = `
          <div class="no-posts">
            <i class="fas fa-camera-retro"></i>
            <p>No posts yet.</p>
          </div>
        `;
      }
      return;
    }

    // Load each post
    snapshot.forEach((doc) => {
      const post = doc.data();
      const postId = doc.id; // Get post ID
      const postDiv = document.createElement("div");
      postDiv.className = "post-card";
      postDiv.dataset.postId = postId; // Store post ID in data attribute
      const timeAgo = getTimeAgo(post.createdAt);

      

      postDiv.innerHTML= `
        <div class="post-header">
          <img 
            src="${post.userProfilePic || defaultImg}" 
            class="post-user-img"
            onerror="this.src='${defaultImg}'"
          >
          <span class="post-username"></span><i class="fa-solid fa-circle-check" style="color: #6a63f4; margin-left: 5px;"></i>
          <span id="post-dtatus" style="font-size: 12px; color: rgb(88, 86, 86);">${timeAgo}</span>
        </div>

        
        <div class="post-content" onclick="redirectToPost('${postId}')" style="cursor: pointer;">
          <p class="post-text"></p>
          
        </div>

         <!-- ALWAYS show image div, but conditionally set src -->
    ${post.imageUrl && post.imageUrl.trim() !== '' ? 
  `<div class="post-image-container">
    <img 
      src="${post.imageUrl}"
      class="post-main-image" 
      onerror="this.onerror=null; this.src=''"
      alt="Post image"
      loading="lazy"
    >
  </div>` : 
  ''
}

        <div style="padding: 12px 16px; border-top: 1px solid #424141ff;">
          <button 
            class="like-btn" 
            style="background:none; border:none; color:#5b53f2; cursor:pointer;"
          >
            <i class="far fa-heart"></i><span style="padding-right: 5px; padding-left: 5px;" class="like-count">${post.likeCount || 0}</span>
          </button>

          <button 
            class="like-btn" 
            style="background:none; border:none; color:#5b53f2; cursor:pointer; padding-left: 5px;"
          >
            <i class="far fa-comment"></i><span style="padding-right: 5px; padding-left: 5px;" class="like-count">${post.commentCount || 0}</span> 
          </button>
          <button 
            class="view-btn" 
            onclick="redirectToPost('${postId}')"
            style="background:none; border:none; color:#fff; cursor:pointer; margin-left: 12px;"
          >
            <i class="fas fa-arrow-right"></i> View Full Post
          </button>
        </div>
      `;
      // setupPostInteractions(postDiv, post, postId);

      postsContainer.appendChild(postDiv);
      // setupPostInteractions(postDiv, post, postId);

      postDiv.querySelector('.post-username').textContent = post.username || "User";
    postDiv.querySelector('.post-text').textContent = post.text || "";

    });

    
  } catch (error) {
    console.error("Error loading posts:", error);
    postsContainer.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #ef4444; margin-bottom: 12px;"></i>
        <p>Failed to load posts</p>
        <button onclick="location.reload()" style="background: #5b53f2; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 12px;">
          Try Again
        </button>
      </div>
    `;
  }
}


// ============================================
// REDIRECT TO POST DETAILS PAGE
// ============================================
function redirectToPost(postId) {
  console.log('Redirecting to post:', postId);
  // Change this URL to match your post details page structure
  window.location.href = `./more/?id=${postId}`;
  
  // Alternative options:
  // window.location.href = `/post/${postId}`;
  // window.location.href = `../post/?postId=${postId}`;
  // window.location.href = `../view-post/?id=${postId}`;
}

// Make function global
window.redirectToPost = redirectToPost;


// ============================================
// ESCAPE HTML TO PREVENT XSS
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// ============================================
// STYLES FOR CLICKABLE POSTS
// ============================================
const postStyles = `
<style>
  .post-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .post-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(91, 83, 242, 0.2);
  }
  
  .post-content {
    transition: background 0.2s ease;
  }
  
  .post-content:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  .like-btn, .view-btn {
    transition: all 0.2s ease;
  }
  
  .like-btn:hover, .view-btn:hover {
    transform: scale(1.05);
  }
  
  .error-state, .no-posts {
    text-align: center;
    padding: 40px 20px;
  }
</style>
`;

// Add styles to page
if (!document.getElementById('post-click-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'post-click-styles';
  styleElement.innerHTML = postStyles;
  document.head.appendChild(styleElement);
}





// Convert Firestore timestamp to "time ago" format
// timestamp: The date/time when the post was created
function getTimeAgo(timestamp) {
    // If no timestamp exists, return "Just now"
    if (!timestamp) return "Just now";
    
    // Create a Date object for right now
    const now = new Date();
    
    // Convert Firestore timestamp to JavaScript Date object
    // Firestore timestamps have a .toDate() method
    // If it's already a Date object or string, create a new Date from it
    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Calculate difference in seconds between now and post date
    // Date objects subtracted give milliseconds, so divide by 1000
    const seconds = Math.floor((now - postDate) / 1000);
    
    // Check different time ranges and return appropriate string
    
    // Less than 60 seconds ago
    if (seconds < 60) return "Just now";
    
    // Less than 1 hour ago (3600 seconds = 60 × 60)
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    
    // Less than 1 day ago (86400 seconds = 24 × 60 × 60)
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    
    // Less than 1 week ago (604800 seconds = 7 × 24 × 60 × 60)
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    // More than 1 week ago - show the actual date
    // toLocaleDateString(): Converts date to local format (e.g., "12/25/2023")
    return postDate.toLocaleDateString();
}



// ============================================
// PROFILE PAGE MESSAGE BUTTON
// ============================================

function setupMessageButtons() {
    const messageBtns = document.querySelectorAll(".chat-button");
    if (!messageBtns.length) return;

    // Remove old listeners
    messageBtns.forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });

    const freshBtns = document.querySelectorAll(".chat-button");

    // If viewing own profile - go to inbox
    if (viewerId === profileUserId) {
        freshBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = "../chats/inbox/";
            });
        });
        return;
    }

    // If viewing someone else's profile
    freshBtns.forEach(btn => {
        btn.style.display = "block";
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Generate chat ID
            const chatId = [viewerId, profileUserId].sort().join("_");
            
            // Redirect to chat page
            window.location.href = `../chats/?chatId=${chatId}`;
        });
    });
}









// Import at the TOP of your file (outside event listener)


// Get the logout button
const logoutBtn = document.getElementById("logout");

// Add event listener
logoutBtn.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      console.log("✅ User logged out");
      // Redirect after logout
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("❌ Logout error:", error);
      alert("Logout failed: " + error.message);
    });
});


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