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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.uid);
    viewerId = user.uid;

    // Get profile user ID from URL parameters
    const params = new URLSearchParams(window.location.search);
    profileUserId = params.get("uid") || viewerId;

    console.log("Viewer:", viewerId);
    console.log("Profile:", profileUserId);

    await followingPage(profileUserId);
    await followersPage(profileUserId);
     loadUserName(profileUserId);

  } else {
    window.location.href = "../login/?view=login";
  }
});

// ============================================
// Followers Page FUNCTIONS
// ============================================

async function followersPage(uid) {
    let desktopFollowers = document.getElementById("followers-desktop");
    let mobileFollowers = document.getElementById("followers-mobile");
    
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
}

// ============================================
// Following Page FUNCTIONS
// ============================================

async function followingPage(uid) {
    let desktopFollowing = document.getElementById("following-desktop");
    
    if (desktopFollowing) {
        desktopFollowing.onclick = function() {
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }
}



// ============================================
// Username FUNCTIONS
// ============================================

async function loadUserName(uid) {
    try {
       const userRef = doc(db, "users", uid);
       const userSnap = await getDoc(userRef);
       
       if (userSnap.exists()) {
            const data = userSnap.data();

            document.getElementById("profile-username").innerHTML = data.username || "No profile added yet;"
       } else {
        
       }
    } catch (error) {
        console.log(error);
        
    }
}