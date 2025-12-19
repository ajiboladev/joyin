import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let currentUserId = null;
let profileUserId = null;
let profileUserName = null;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // Get user ID from URL or use current user
            const urlParams = new URLSearchParams(window.location.search);
            profileUserId = urlParams.get('uid') || currentUserId;
            
            console.log("Loading following for user:", profileUserId);
            
            // Load profile user data first
            await loadProfileUserData();
            await loadFollowing();

            //Pages
            await followersPage(profileUserId);
            await followingPage(profileUserId);
            
        } else {
            alert("Please login to view following list");
            // Redirect to login if not authenticated
            window.location.href = '../login/?view=login';
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
            document.title = `${profileUserName}'s Following | JOYIN`;
        } else {
            document.title = "Following | JOYIN";
        }
    } catch (error) {
        console.error("Error loading profile user data:", error);
        document.title = "Following | JOYIN";
    }
}

async function loadFollowing() {
    const followingList = document.getElementById('following-list');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    try {
        // Get following collection
        const followingRef = collection(db, "users", profileUserId, "following");
        const followingSnap = await getDocs(followingRef);
        
        // Update count
        const totalCount = document.getElementById('total-count');
        totalCount.textContent = followingSnap.size;
        
        // Update title with count
        if (profileUserName) {
            document.title = `${profileUserName}'s Following (${followingSnap.size}) | JOYIN`;
        } else {
            document.title = `Following (${followingSnap.size}) | JOYIN`;
        }
        
        if (followingSnap.size === 0) {
            // Show empty state
            loadingState.style.display = 'none';
            emptyState.style.display = 'block';
            followingList.innerHTML = '';
            return;
        }
        
        // Hide loading and empty states
        loadingState.style.display = 'none';
        emptyState.style.display = 'none';
        
        // Clear current list
        followingList.innerHTML = '';
        
        // Process each followed user
        const followingPromises = [];
        followingSnap.forEach(followingDoc => {
            followingPromises.push(loadFollowingData(followingDoc.id));
        });
        
        // Wait for all following data to load
        const followingData = await Promise.all(followingPromises);
        
        // Display following
        followingData.forEach(user => {
            if (user) {
                followingList.appendChild(createFollowingElement(user));
            }
        });
        
    } catch (error) {
        console.error('Error loading following:', error);
        loadingState.innerHTML = '<p style="color: #ff4757;">Failed to load following list</p>';
        document.title = "Following | JOYIN";
    }
}

async function loadFollowingData(userId) {
    try {
        // Get user's data
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            return {
                id: userId,
                username: userData.username || 'User',
                bio: userData.bio || '',
                isCurrentUser: currentUserId === userId
            };
        }
        return null;
    } catch (error) {
        console.error('Error loading following data:', error);
        return null;
    }
}

function createFollowingElement(user) {
    const div = document.createElement('div');
    div.className = 'following-item';
    div.dataset.userId = user.id;
    
    // Get first letter for avatar
    const firstLetter = user.username.charAt(0).toUpperCase();
    
    div.innerHTML = `
        <div class="following-info" onclick="viewUserProfile('${user.id}')">
            <div class="avatar">
                ${firstLetter}
            </div>
            <div class="user-details">
                <div class="username">${user.username}</div>
                <div class="user-bio">${user.bio.substring(0, 50)}${user.bio.length > 50 ? '...' : ''}</div>
            </div>
        </div>
        ${user.isCurrentUser ? '' : 
            `<button class="unfollow-btn" onclick="unfollowUser('${user.id}', this, event)">
                Following
            </button>`
        }
    `;
    
    // Make entire div clickable except for the unfollow button
    div.onclick = function(e) {
        // Only navigate if not clicking the unfollow button
        if (!e.target.closest('.unfollow-btn')) {
            viewUserProfile(user.id);
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

window.unfollowUser = async function(userId, button, event) {
    // Stop event from bubbling to parent div
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (!currentUserId) return;
    
    // Don't allow unfollowing yourself
    if (userId === currentUserId) return;
    
    // Update button immediately for better UX
    button.classList.add('loading');
    button.disabled = true;
    button.textContent = '...';
    
    try {
        // References
        const userFollowersRef = doc(db, "users", userId, "followers", profileUserId);
        const currentUserFollowingRef = doc(db, "users", profileUserId, "following", userId);
        const userRef = doc(db, "users", userId);
        const currentUserRef = doc(db, "users", profileUserId);
        
        // Unfollow
        await deleteDoc(userFollowersRef);
        await deleteDoc(currentUserFollowingRef);
        await updateDoc(userRef, { followersCount: increment(-1) });
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        
        // Remove from UI
        const item = button.closest('.following-item');
        if (item) {
            item.style.opacity = '0.5';
            setTimeout(() => {
                item.remove();
                // Update count
                const totalCount = document.getElementById('total-count');
                const newCount = Math.max(0, parseInt(totalCount.textContent) - 1);
                totalCount.textContent = newCount;
                
                // Update title with new count
                if (profileUserName) {
                    document.title = `${profileUserName}'s Following (${newCount}) | JOYIN`;
                } else {
                    document.title = `Following (${newCount}) | JOYIN`;
                }
                
                // Show empty state if no more following
                const followingList = document.getElementById('following-list');
                if (followingList.children.length === 0) {
                    document.getElementById('empty-state').style.display = 'block';
                }
            }, 300);
        }
        
    } catch (error) {
        console.error('Error unfollowing user:', error);
        // Revert button state on error
        button.textContent = 'Following';
        
        // Show error message
        alert('Failed to unfollow. Please try again.');
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