/* 
 *  JOYIN Social Media - Interactive Functions with INFINITE SCROLL
 *  This file powers JOYIN's features including infinite scrolling posts
 *  (c) 2025 JOYIN
 */

import { doc, getDoc, collection, orderBy, query, onSnapshot, getDocs, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let viewerId = null;
let profileUserId = null;

// ============================================
// INFINITE SCROLL VARIABLES
// ============================================

// How many posts to load at once
const POSTS_PER_BATCH = 10;

// Store the last document we loaded (needed to get next batch)
let lastVisiblePost = null;

// Track if we're currently loading posts (prevents duplicate requests)
let isLoadingPosts = false;

// Track if there are more posts to load
let hasMorePosts = true;

// Store all loaded posts to avoid duplicates
let loadedPostIds = new Set();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.uid);
    viewerId = user.uid;

    const params = new URLSearchParams(window.location.search);
    profileUserId = params.get("uid") || viewerId;

    console.log("Viewer:", viewerId);
    console.log("Profile:", profileUserId);

    // Check if user is banned BEFORE doing anything else
    const isBanned = await softBan(profileUserId);
    
    if (isBanned) {
        console.log("🛑 User is banned, stopping all other functions");
        return;
    }

    await followingPage(profileUserId);
    await followersPage(profileUserId);
    loadUserName(profileUserId);

  } else {
    window.location.href = "../login/?view=login";
  }
});

// ============================================
// Soft Ban FUNCTIONS
// ============================================

async function softBan(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            if (data.softBan === true || data.softBan === "true") {
                createBanScreen({
                    username: data.username || 'User',
                    banReason: data.banReason || 'Violation of community guidelines',
                    banStartDate: data.banStartDate || data.createdAt || new Date(),
                    adminContact: data.adminContact || 'joyinofficialnetwork@gmail.com'
                });
                return true;
            }
        }
    } catch (error) {
        console.error("Error checking ban:", error);
    }
    return false;
}

function createBanScreen(banInfo) {
    console.log("🎨 Creating ban screen...");
    
    document.body.innerHTML = '';
    
    const style = document.createElement('style');
    style.textContent = `
        body {
            margin: 0;
            padding: 0;
            background: #000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            min-height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        .ban-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .joyin-header {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #333;
        }
        
        .joyin-logo {
            font-size: 32px;
            font-weight: 800;
            color: #5b53f2;
            letter-spacing: 1px;
            text-transform: uppercase;
            text-shadow: 0 0 20px rgba(91, 83, 242, 0.3);
        }
        
        .ban-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .ban-card {
            background: #1a1a1a;
            border-radius: 16px;
            padding: 24px;
            width: 100%;
            max-width: 400px;
            border: 1px solid #333;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        
        .ban-icon {
            font-size: 60px;
            text-align: center;
            margin-bottom: 20px;
            color: #5b53f2;
            filter: drop-shadow(0 0 10px rgba(91, 83, 242, 0.3));
        }
        
        .ban-title {
            font-size: 22px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 12px;
            color: #5b53f2;
        }
        
        .ban-subtitle {
            font-size: 15px;
            color: #aaa;
            text-align: center;
            margin-bottom: 24px;
        }
        
        .ban-details {
            background: rgba(91, 83, 242, 0.05);
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 24px;
            border-left: 4px solid #5b53f2;
        }
        
        .ban-info-item {
            margin-bottom: 14px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .ban-info-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .info-label {
            display: block;
            font-size: 13px;
            color: #888;
            margin-bottom: 4px;
        }
        
        .info-value {
            display: block;
            font-size: 15px;
            color: white;
            font-weight: 600;
        }
        
        .ban-message {
            background: rgba(91, 83, 242, 0.1);
            border: 1px solid rgba(91, 83, 242, 0.2);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .logout-btn {
            background: #5b53f2;
            color: white;
            border: none;
            border-radius: 25px;
            padding: 16px;
            width: 100%;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 20px;
            transition: all 0.2s ease;
        }
        
        .logout-btn:hover {
            background: #6a63f4;
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(91, 83, 242, 0.3);
        }
        
        .logout-btn:active {
            transform: translateY(0);
        }
        
        .contact-info {
            font-size: 13px;
            color: #888;
            text-align: center;
        }
        
        .contact-link {
            color: #5b53f2;
            text-decoration: none;
            font-weight: 600;
        }
        
        @media (max-width: 480px) {
            .joyin-header {
                padding: 16px;
            }
            
            .joyin-logo {
                font-size: 28px;
            }
            
            .ban-content {
                padding: 16px;
            }
            
            .ban-card {
                padding: 20px;
            }
            
            .ban-title {
                font-size: 20px;
            }
            
            .ban-icon {
                font-size: 50px;
            }
        }
        
        @media (max-width: 360px) {
            .joyin-logo {
                font-size: 24px;
            }
            
            .ban-card {
                padding: 16px;
            }
            
            .ban-title {
                font-size: 18px;
            }
            
            .ban-subtitle {
                font-size: 14px;
            }
        }
    `;
    
    document.head.appendChild(style);
    
    let formattedDate = "Recently";
    try {
        const dateObj = banInfo.banStartDate?.toDate ? 
                       banInfo.banStartDate.toDate() : 
                       new Date(banInfo.banStartDate);
        formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {}
    
    document.body.innerHTML = `
        <div class="ban-container">
            <div class="joyin-header">
                <div class="joyin-logo">JOYIN</div>
            </div>
            
            <div class="ban-content">
                <div class="ban-card">
                    <div class="ban-icon">🚫</div>
                    <h1 class="ban-title">Account Restricted</h1>
                    <p class="ban-subtitle">Your account has been temporarily suspended</p>
                    
                    <div class="ban-details">
                        <div class="ban-info-item">
                            <span class="info-label">Username</span>
                            <span class="info-value">@${banInfo.username}</span>
                        </div>
                        <div class="ban-info-item">
                            <span class="info-label">Restriction Reason</span>
                            <span class="info-value">${banInfo.banReason}</span>
                        </div>
                        <div class="ban-info-item">
                            <span class="info-label">Restriction Started</span>
                            <span class="info-value">${formattedDate}</span>
                        </div>
                    </div>
                    
                    <div class="ban-message">
                        ⚠️ You cannot post, comment, or interact with other users during this restriction period.
                    </div>
                    
                    <button class="logout-btn" id="manualLogoutBtn">
                        Log Out
                    </button>
                    
                    <div class="contact-info">
                        If you believe this is a mistake, contact us:
                        <a href="mailto:${banInfo.adminContact}" class="contact-link">
                            ${banInfo.adminContact}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('manualLogoutBtn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = "/";
        } catch (error) {
            window.location.href = "/";
        }
    });
}

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

            document.getElementById("profile-username").innerHTML = data.username || "No profile added yet;";

            let profileImg = document.getElementById("profileImage");
            profileImg.src = data.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
       }
    } catch (error) {
        console.log(error);
    }
}

// =================================================================
// INFINITE SCROLL - POSTS LOADING SYSTEM
// =================================================================

const postsContainer = document.getElementById("posts");
let currentUser = null;

// Wait for page to load completely
document.addEventListener('DOMContentLoaded', function() {
    console.log("🏠 Home page loading...");
    
    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ User logged in:", user.uid);
            currentUser = user;
            
            // Load the FIRST batch of posts (initial 20)
            loadInitialPosts();
            
            // Set up the scroll listener for infinite scroll
            setupInfiniteScroll();
            
        } else {
            console.log("❌ No user logged in, redirecting...");
            window.location.href = "../login/?view=login";
        }
    });
});

// =================================================================
// LOAD INITIAL POSTS (First 20)
// =================================================================

async function loadInitialPosts() {
    try {
        console.log("📥 Loading initial posts from Firestore...");
        
        // Reset everything when loading initial posts
        isLoadingPosts = true;
        lastVisiblePost = null;
        hasMorePosts = true;
        loadedPostIds.clear();
        postsContainer.innerHTML = ""; // Clear existing posts
        
        // Create a query to get the FIRST 20 posts
        // orderBy("createdAt", "desc") = Sort by newest first
        // limit(POSTS_PER_BATCH) = Only get 20 posts
        const q = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc"),
            limit(POSTS_PER_BATCH)
        );
        
        // Get the posts from Firestore (one-time fetch, not real-time)
        const snapshot = await getDocs(q);
        
        console.log(`📊 Got ${snapshot.size} initial posts`);
        
        // If no posts exist at all
        if (snapshot.empty) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>No posts yet. Be the first to post something!</p>
                    <button onclick="window.location.href='../upload/'">Create Post</button>
                </div>
            `;
            hasMorePosts = false;
            isLoadingPosts = false;
            return;
        }
        
        // If we got fewer posts than we asked for, there are no more posts
        if (snapshot.size < POSTS_PER_BATCH) {
            hasMorePosts = false;
            console.log("✅ All posts loaded (less than 20 posts total)");
        }
        
        // Save the last document so we know where to start next batch
        lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
        
        // Display all the posts we just loaded
        displayPosts(snapshot);
        
        isLoadingPosts = false;
        
    } catch (error) {
        console.error("Error loading initial posts:", error);
        showErrorMessage("Failed to load posts. Please refresh.");
        isLoadingPosts = false;
    }
}

// =================================================================
// LOAD MORE POSTS (Next 20)
// =================================================================

async function loadMorePosts() {
    // Safety checks - don't load if:
    // 1. Already loading posts
    // 2. No more posts available
    // 3. Don't have a reference to the last post
    if (isLoadingPosts || !hasMorePosts || !lastVisiblePost) {
        console.log("⏸️ Not loading more posts:", { isLoadingPosts, hasMorePosts, hasLastPost: !!lastVisiblePost });
        return;
    }
    
    try {
        isLoadingPosts = true;
        console.log("📥 Loading more posts...");
        
        // Show a loading indicator at the bottom
        showLoadingIndicator();
        
        // Create query for NEXT batch of posts
        // startAfter(lastVisiblePost) = Start after the last post we loaded
        // This ensures we don't get duplicate posts
        const q = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc"),
            startAfter(lastVisiblePost),  // KEY: Start after last post
            limit(POSTS_PER_BATCH)
        );
        
        const snapshot = await getDocs(q);
        
        // console.log(`📊 Got ${snapshot.size} more posts`);
        
        // If we got no posts, we've reached the end
        if (snapshot.empty) {
            hasMorePosts = false;
            console.log("✅ All posts loaded (no more posts)");
            hideLoadingIndicator();
            showEndMessage();
            isLoadingPosts = false;
            return;
        }
        
        // If we got fewer posts than requested, this is the last batch
        if (snapshot.size < POSTS_PER_BATCH) {
            hasMorePosts = false;
            console.log("✅ All posts loaded (last batch)");
        }
        
        // Update lastVisiblePost for the next batch
        lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
        
        // Display the new posts (append them, don't replace)
        displayPosts(snapshot, true); // true = append mode
        
        hideLoadingIndicator();
        
        // Show end message AFTER displaying the last posts
        if (!hasMorePosts) {
            showEndMessage();
        }
        
        isLoadingPosts = false;
        
    } catch (error) {
        console.error("Error loading more posts:", error);
        hideLoadingIndicator();
        isLoadingPosts = false;
    }
}

// =================================================================
// SETUP INFINITE SCROLL DETECTION
// =================================================================

function setupInfiniteScroll() {
    // Listen for scroll events on the window
    window.addEventListener('scroll', () => {
        // Don't do anything if already loading or no more posts
        if (isLoadingPosts || !hasMorePosts) return;
        
        // Calculate how close we are to the bottom
        // scrollY = How far user has scrolled down
        // innerHeight = Height of the visible window
        // document.body.offsetHeight = Total height of the page
        const scrollPosition = window.scrollY + window.innerHeight;
        const pageHeight = document.body.offsetHeight;
        
        // If we're within 300px of the bottom, load more posts
        // You can adjust this number - smaller = loads sooner
        if (scrollPosition >= pageHeight - 300) {
            // console.log("🎯 Near bottom - loading more posts");
            loadMorePosts();
        }
    });
}

// =================================================================
// DISPLAY POSTS ON THE PAGE
// =================================================================

function displayPosts(snapshot, appendMode = false) {
    // appendMode = false: Clear and show new posts (initial load)
    // appendMode = true: Add posts to existing ones (load more)
    
    if (!appendMode) {
        postsContainer.innerHTML = "";
    }
    
    if (snapshot.empty && !appendMode) {
        postsContainer.innerHTML = `
            <div class="no-posts">
                <p>No posts yet. Be the first to post something!</p>
                <button onclick="window.location.href='../upload/'">Create Post</button>
            </div>
        `;
        return;
    }
    
    snapshot.forEach((doc) => {
        const post = doc.data();
        const postId = doc.id;
        
        // Skip if we've already displayed this post (prevent duplicates)
        if (loadedPostIds.has(postId)) {
            // console.log("⏭️ Skipping duplicate post:", postId);
            return;
        }
        
        // Mark this post as loaded
        loadedPostIds.add(postId);
        
        // console.log("📝 Processing post:", postId);
        
        const postElement = createPostElement(post, postId);
        postsContainer.appendChild(postElement);
    });
    
    setupSeeMoreLinks();
}

// =================================================================
// CREATE POST ELEMENT (Same as before)
// =================================================================

function createPostElement(post, postId) {
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.dataset.postId = postId;
    
    const timeAgo = getTimeAgo(post.createdAt);
    const text = post.text || "";
    const needsSeeMore = text.length > 150;
    const displayText = needsSeeMore ? text.substring(0, 150) + "...seemore" : text;
    
    postDiv.innerHTML = `
        <div class="post-header" onclick="window.location.href='../profile/?view=profile&uid=${post.userId}'">
            <img src="${post.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'}" 
                 alt="${post.username}'s profile picture">
            <p class="post-username">${post.username || "User"}</p>
            <div class="post-status" style="font-size: 12px; color: rgb(88, 86, 86);">${timeAgo}</div>
        </div>
        
        <h4 class="post-text-content">
            <span class="post-text" style="font-size: 15px; color: rgba(197, 194, 194, 1);">${displayText}</span>
            ${needsSeeMore ? 
                `<a class="see-more-link" data-post-id="${postId}" style="color: #007bff; cursor: pointer;">...see more</a>` 
                : ''}
        </h4>
        
        ${post.imageUrl && post.imageUrl.trim() !== '' ? 
            `<div class="post-image-container">
                <img 
                    src="${post.imageUrl}"
                    class="post-main-image" 
                    onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1506744038136-46273834b3fb'"
                    alt="Post image"
                >
            </div>` : 
            ''
        }  
        
        <div class="reaction">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b53f2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
            <p class="reaction-count">${post.likeCount || 0} ${post.likeCount === 1 ? 'like' : 'likes'}</p>
        </div>
        
        <div class="post-actions">
            <button class="action-button like-btn" data-post-id="${postId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                Like
            </button>
            
            <button class="action-button comment-btn" data-post-id="${postId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Comment
            </button>
            
            <button class="action-button share-btn" data-post-id="${postId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
            </button>
        </div>
    `;
    
    setupPostInteractions(postDiv, post, postId);
    return postDiv;
}

// =================================================================
// LOADING INDICATORS
// =================================================================

function showLoadingIndicator() {
    // Check if indicator already exists
    if (document.getElementById('loading-indicator')) return;
    
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #5b53f2;
        font-size: 14px;
    `;
    loader.innerHTML = `
        <div style="display: inline-block; animation: spin 1s linear infinite;">
            ⏳
        </div>
        <p>Loading more posts...</p>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    postsContainer.appendChild(loader);
}

function hideLoadingIndicator() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.remove();
    }
}

function showEndMessage() {
    // Check if message already exists
    if (document.getElementById('end-message')) return;
    
    const endMsg = document.createElement('div');
    endMsg.id = 'end-message';
    endMsg.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #888;
        font-size: 14px;
    `;
    endMsg.innerHTML = `
        <p>🎉 You've reached the end!</p>
        <p style="font-size: 12px;">No more posts to load</p>
    `;
    postsContainer.appendChild(endMsg);
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

function getTimeAgo(timestamp) {
    if (!timestamp) return "Just now";
    
    const now = new Date();
    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((now - postDate) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return postDate.toLocaleDateString();
}

function setupSeeMoreLinks() {
    document.querySelectorAll('.see-more-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const postId = this.dataset.postId;
            window.location.href = `./more/?view=post&id=${postId}`;
        });
    });
}

function setupPostInteractions(postElement, post, postId) {
    const likeBtn = postElement.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => alert("Like functionality coming soon!"));
    }
    
    const commentBtn = postElement.querySelector('.comment-btn');
    if (commentBtn) {
        commentBtn.addEventListener('click', () => alert("Comment functionality coming soon!"));
    }
    
    const shareBtn = postElement.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => handleShare(postId, post.text));
    }
}

function handleShare(postId, text) {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on JOYIN',
            url: `./more/?tab=shared_post&id=${postId}`
        });
    } else {
        const link = `${window.location.origin}/post/?id=${postId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Post link copied to clipboard!');
        });
    }
}

function showErrorMessage(message) {
    postsContainer.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        </div>
    `;
}

console.log("✅ Home feed system with infinite scroll loaded!");

// =================================================================
// LOGOUT FUNCTIONALITY
// =================================================================

const logoutBtn = document.getElementById("logout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        signOut(auth)
            .then(() => {
                console.log("✅ User logged out");
                window.location.href = "/";
            })
            .catch((error) => {
                console.error("❌ Logout error:", error);
                alert("Logout failed: " + error.message);
            });
    });
}