import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, runTransaction } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let currentUserId = null;
let profileUserId = null;
let profileUserName = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
          if (!user) {
        // Not logged in
        alert("Please login to view followers");
        window.location.replace('../login/?view=login');
        return;
    }

     if (!user.emailVerified) {
        // Logged in but email not verified
        alert("Please verify your email before accessing this page.");
        window.location.replace('../login/?view=login');
        return;
    }
        try {
             console.log("User logged in:", user.uid);
            currentUserId = user.uid;

            // Get user ID from URL or use current user
            const urlParams = new URLSearchParams(window.location.search);
            profileUserId = urlParams.get('uid') || currentUserId;
            
            console.log("Loading followers for user:", profileUserId);
            
            // Load profile user data first
            await loadProfileUserData();
            await loadFollowers();

            //Pages
            await followersPage(profileUserId);
            await followingPage(profileUserId);
            
        } catch (error) {
             alert("Please login to view followers");
            // Redirect to login if not authenticated
           window.location.replace('../login/?view=login');
        }
    });
});

async function loadProfileUserData() {
    try {
        const userRef = doc(db, "users", profileUserId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            profileUserName = userData.username || 'User';
            
            // Update page title
            document.title = `${profileUserName}'s Followers | JOYIN`;
        } else {
            document.title = "Followers | JOYIN";
        }
    } catch (error) {
        console.error("Error loading profile user data:", error);
        document.title = "Followers | JOYIN";
    }
}

async function loadFollowers() {
    const followersList = document.getElementById('followers-list');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    try {
        // Get followers collection
        const followersRef = collection(db, "users", profileUserId, "followers");
        const followersSnap = await getDocs(followersRef);
        
        // Update count
        const totalCount = document.getElementById('total-count');
        totalCount.textContent = followersSnap.size;
        
        // Update title with count
        if (profileUserName) {
            document.title = `${profileUserName}'s Followers (${followersSnap.size}) | JOYIN`;
        } else {
            document.title = `Followers (${followersSnap.size}) | JOYIN`;
        }
        
        if (followersSnap.size === 0) {
            // Show empty state
            loadingState.style.display = 'none';
            emptyState.style.display = 'block';
            followersList.innerHTML = '';
            return;
        }
        
        // Hide loading and empty states
        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        
        // Clear current list
        followersList.innerHTML = '';
        
        // Process each follower
        const followerPromises = [];
        followersSnap.forEach(followerDoc => {
            followerPromises.push(loadFollowerData(followerDoc.id));
        });
        
        // Wait for all follower data to load
        const followersData = await Promise.all(followerPromises);
        
        // Display followers
        followersData.forEach(follower => {
            if (follower) {
                followersList.appendChild(createFollowerElement(follower));
            }
        });
        
    } catch (error) {
        console.error('Error loading followers:', error);
        loadingState.innerHTML = '<p style="color: #ff4757;">Failed to load followers</p>';
        document.title = "Followers | JOYIN";
    }
}

async function loadFollowerData(followerId) {
    try {
        // Get follower's user data
        const userRef = doc(db, "users", followerId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            // Check if current user follows this follower
            let isFollowing = false;
            if (currentUserId !== followerId) {
                const followRef = doc(db, "users", followerId, "followers", currentUserId);
                const followSnap = await getDoc(followRef);
                isFollowing = followSnap.exists();
            }
            
            return {
                id: followerId,
                username: userData.username || 'User',
                bio: userData.bio || '',
                isFollowing: isFollowing,
                isCurrentUser: currentUserId === followerId
            };
        }
        return null;
    } catch (error) {
        console.error('Error loading follower data:', error);
        return null;
    }
}

function createFollowerElement(follower) {
    const div = document.createElement('div');
    div.className = 'follower-item';
    div.dataset.userId = follower.id;
    
    // Get first letter for avatar
    const firstLetter = follower.username.charAt(0).toUpperCase();
    
    div.innerHTML = `
        <div class="follower-info" onclick="viewUserProfile('${follower.id}')">
            <div class="avatar">
                ${firstLetter}
            </div>
            <div class="user-details">
                <div class="username">${follower.username}</div>
                <div class="user-bio">${follower.bio.substring(0, 50)}${follower.bio.length > 50 ? '...' : ''}</div>
            </div>
        </div>
        ${follower.isCurrentUser ? '' : 
            `<button class="follow-btn ${follower.isFollowing ? 'following' : ''}" 
                    onclick="toggleFollow('${follower.id}', this, event)">
                ${follower.isFollowing ? 'Following' : 'Follow'}
            </button>`
        }
    `;
    
    // Make entire div clickable except for the follow button
    div.onclick = function(e) {
        // Only navigate if not clicking the follow button
        if (!e.target.closest('.follow-btn')) {
            viewUserProfile(follower.id);
        }
    };
    
    return div;
}

// Make functions globally available
window.goBack = function() {
    window.history.back();
};

window.exploreUsers = function() {
    window.location.href = '../searchbar/';
};

window.viewUserProfile = function(userId) {
    window.location.href = `../profile/?uid=${userId}`;
};

window.toggleFollow = async function(userId, button, event) {
  // Stop event from bubbling
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  if (!currentUserId) return;

  // Don't allow following yourself
  if (userId === currentUserId) return;

  const isCurrentlyFollowing = button.classList.contains('following');
  const newFollowState = !isCurrentlyFollowing;

  // Update button immediately for UX
  button.classList.add('loading');
  button.disabled = true;
  button.textContent = '...';

  try {
    // Firestore references
    const userFollowersRef = doc(db, "users", userId, "followers", currentUserId);
    const currentUserFollowingRef = doc(db, "users", currentUserId, "following", userId);
    const userRef = doc(db, "users", userId);
    const currentUserRef = doc(db, "users", currentUserId);

    await runTransaction(db, async (transaction) => {
      const followerSnap = await transaction.get(userFollowersRef);
      const followingSnap = await transaction.get(currentUserFollowingRef);

      if (isCurrentlyFollowing) {
        // Unfollow
        if (followerSnap.exists() && followingSnap.exists()) {
          transaction.delete(userFollowersRef);
          transaction.delete(currentUserFollowingRef);
          transaction.update(userRef, { followersCount: increment(-1) });
          transaction.update(currentUserRef, { followingCount: increment(-1) });
        }
      } else {
        // Follow
        if (!followerSnap.exists() && !followingSnap.exists()) {
          transaction.set(userFollowersRef, {
            followedAt: new Date().toISOString(),
            userId: currentUserId
          });
          transaction.set(currentUserFollowingRef, {
            followedAt: new Date().toISOString(),
            userId: userId
          });
          transaction.update(userRef, { followersCount: increment(1) });
          transaction.update(currentUserRef, { followingCount: increment(1) });
        }
      }
    });

    // Update button UI after transaction
    button.classList.toggle('following', newFollowState);
    button.textContent = newFollowState ? 'Following' : 'Follow';

  } catch (error) {
    console.error('Error toggling follow:', error);
    // Revert button state on error
    button.classList.toggle('following', isCurrentlyFollowing);
    button.textContent = isCurrentlyFollowing ? 'Following' : 'Follow';
    alert('Failed to update follow status. Please try again.');
  } finally {
    button.classList.remove('loading');
    button.disabled = false;
  }
};


// ============================================
// Followers Page FUNCTIONS
// ============================================

async function followersPage(uid) {
    let followers = document.getElementById("followers-link");
    
    if (followers) {
        followers.onclick = function() {
            window.location.href = `../followers-list/?view=followers&uid=${uid}`;
        };
    }
}

// ============================================
// Following Page FUNCTIONS
// ============================================

async function followingPage(uid) {
    let following = document.getElementById("following-link");
    
    if (following) {
        following.onclick = function() {
            window.location.href = `../following-list/?view=following&uid=${uid}`;
        };
    }
}