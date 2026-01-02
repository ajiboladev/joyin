/* 
 *  JOYIN Social Media - DISCOVERY FEED SYSTEM (FIXED)
 *  Random posts feed with proper random_index handling
 *  Only fetches posts that have random_index field
 *  (c) 2025 JOYIN
 */

import { doc, getDoc, collection, orderBy, query, where, getDocs, limit, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let viewerId = null;
let profileUserId = null;

// ============================================
// DISCOVERY FEED CONFIGURATION
// ============================================

const DISCOVERY_POSTS_PER_BATCH = 10;
let discovery_currentRandomStart = null;
let discovery_isLoadingPosts = false;
let discovery_totalPostsInDatabase = 0;
let discovery_totalPostsLoaded = 0;
let discovery_loadedPostIds = new Set();
let discovery_hasMorePosts = true;

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ User logged in:", user.uid);
    viewerId = user.uid;

    const params = new URLSearchParams(window.location.search);
    profileUserId = params.get("uid") || viewerId;

    console.log("👤 Viewer:", viewerId);
    console.log("👤 Profile:", profileUserId);

    const isBanned = await softBan(profileUserId);
    
    if (isBanned) {
        console.log("🛑 User is banned, stopping all functions");
        return;
    }

    await followingPage(profileUserId);
    await followersPage(profileUserId);
    loadUserName(profileUserId);

  } else {
    console.log("❌ No user logged in, redirecting to login...");
    window.location.href = "../login/?view=login";
  }
});

// ============================================
// BAN SYSTEM FUNCTIONS
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
        console.error("❌ Error checking ban status:", error);
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
            .joyin-header { padding: 16px; }
            .joyin-logo { font-size: 28px; }
            .ban-content { padding: 16px; }
            .ban-card { padding: 20px; }
            .ban-title { font-size: 20px; }
            .ban-icon { font-size: 50px; }
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
    } catch (e) {
        console.error("Error formatting date:", e);
    }
    
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
            console.error("Logout error:", error);
            window.location.href = "/";
        }
    });
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

async function followersPage(uid) {
    let desktopFollowers = document.getElementById("followers-desktop");
    let mobileFollowers = document.getElementById("followers-mobile");
    
    if (desktopFollowers) {
        desktopFollowers.onclick = function() {
            window.location.href = `../../followers-list/?view=followers&uid=${uid}`;
        };
    }
    
    if (mobileFollowers) {
        mobileFollowers.onclick = function() {
            window.location.href = `../../followers-list/?view=followers&uid=${uid}`;
        };
    }
}

async function followingPage(uid) {
    let desktopFollowing = document.getElementById("following-desktop");
    
    if (desktopFollowing) {
        desktopFollowing.onclick = function() {
            window.location.href = `../../following-list/?view=following&uid=${uid}`;
        };
    }
}

async function loadUserName(uid) {
    try {
       const userRef = doc(db, "users", uid);
       const userSnap = await getDoc(userRef);
       
       if (userSnap.exists()) {
            const data = userSnap.data();

            document.getElementById("profile-username").textContent = data.username || "No profile added yet";

            let profileImg = document.getElementById("profileImage");
            profileImg.src = data.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
       }
    } catch (error) {
        console.error("❌ Error loading username:", error);
    }
}

// =================================================================
// DISCOVERY FEED - MAIN SYSTEM
// =================================================================

const discoveryPostsContainer = document.getElementById("discovery-posts");
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("🔍 Discovery Feed initializing...");
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("✅ User authenticated:", user.uid);
            currentUser = user;
            
            loadInitialDiscoveryPosts();
            setupDiscoveryInfiniteScroll();
            
        } else {
            console.log("❌ No user logged in, redirecting...");
            window.location.href = "../login/?view=login";
        }
    });
});

// =================================================================
// GET TOTAL POSTS COUNT (ONLY POSTS WITH random_index)
// =================================================================

async function getDiscoveryTotalPostsCount() {
    try {
        // ONLY count posts that have random_index field
        const postsQuery = query(
            collection(db, "posts"),
            where("random_index", ">=", 0)  // Only posts with random_index
        );
        
        const snapshot = await getCountFromServer(postsQuery);
        const count = snapshot.data().count;
        
        console.log(`📊 Total posts with random_index in database: ${count}`);
        return count;
        
    } catch (error) {
        console.error("❌ Error getting posts count:", error);
        return 0;
    }
}

// =================================================================
// LOAD INITIAL DISCOVERY POSTS
// =================================================================

async function loadInitialDiscoveryPosts() {
    try {
        console.log("🔍 Loading initial Discovery posts...");
        
        discovery_isLoadingPosts = true;
        discovery_totalPostsLoaded = 0;
        discovery_loadedPostIds.clear();
        discovery_hasMorePosts = true;
        discoveryPostsContainer.innerHTML = "";
        
        showDiscoveryInitialLoadingIndicator();
        
        // Get total posts count (only posts with random_index)
        discovery_totalPostsInDatabase = await getDiscoveryTotalPostsCount();
        console.log(`📊 Database has ${discovery_totalPostsInDatabase} total posts with random_index`);
        
        // Check if there are any posts with random_index
        if (discovery_totalPostsInDatabase === 0) {
            hideDiscoveryInitialLoadingIndicator();
            discoveryPostsContainer.innerHTML = `
                <div class="no-posts" style="text-align: center; padding: 50px 20px; color: #888;">
                    <p>No posts available yet. Be the first to post something!</p>
                    <button onclick="window.location.href='../upload/'" style="
                        background: #5b53f2;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 20px;
                        margin-top: 15px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Create Post</button>
                </div>
            `;
            discovery_hasMorePosts = false;
            discovery_isLoadingPosts = false;
            return;
        }
        
        // Fetch first batch
        const fetchedPosts = await fetchDiscoveryPosts(DISCOVERY_POSTS_PER_BATCH);
        
        if (fetchedPosts.length === 0) {
            hideDiscoveryInitialLoadingIndicator();
            discoveryPostsContainer.innerHTML = `
                <div class="no-posts" style="text-align: center; padding: 50px 20px; color: #888;">
                    <p>No posts available yet. Be the first to post something!</p>
                    <button onclick="window.location.href='../upload/'" style="
                        background: #5b53f2;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 20px;
                        margin-top: 15px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Create Post</button>
                </div>
            `;
            discovery_hasMorePosts = false;
            discovery_isLoadingPosts = false;
            return;
        }
        
        hideDiscoveryInitialLoadingIndicator();
        displayDiscoveryPosts(fetchedPosts);
        
        console.log(`📊 Loaded ${discovery_totalPostsLoaded}/${discovery_totalPostsInDatabase} posts`);
        
        if (discovery_totalPostsLoaded >= discovery_totalPostsInDatabase) {
            discovery_hasMorePosts = false;
            console.log("✅ All posts loaded on initial load");
            showDiscoveryEndMessage();
        } else {
            discovery_hasMorePosts = true;
            console.log(`✅ ${discovery_totalPostsInDatabase - discovery_totalPostsLoaded} posts remaining`);
        }
        
        discovery_isLoadingPosts = false;
        
    } catch (error) {
        console.error("❌ Error loading initial Discovery posts:", error);
        hideDiscoveryInitialLoadingIndicator();
        showDiscoveryErrorMessage("Failed to load posts. Please check your connection and refresh.");
        discovery_isLoadingPosts = false;
    }
}

// =================================================================
// FETCH DISCOVERY POSTS (ONLY POSTS WITH random_index)
// =================================================================
// 🎯 HOW THIS WORKS:
// 1. Generate random number (e.g., 0.34)
// 2. Try to fetch posts where random_index >= 0.34
// 3. If no posts found (because all posts have index < 0.34), fallback to random_index >= 0
// 4. This ensures we ALWAYS get posts (if any exist with random_index)
// 5. Posts WITHOUT random_index field are NEVER fetched

async function fetchDiscoveryPosts(batchSize) {
    // STEP 1: 🎲 Generate NEW random number (0.0 to 1.0)
    // Examples: 0.34, 0.89, 0.12
    discovery_currentRandomStart = Math.random();
    console.log(`🎲 Generated random start: ${discovery_currentRandomStart.toFixed(4)}`);
    
    try {
        // STEP 2: 🔍 Try to fetch posts with random_index >= generated number
        // Example: If we generated 0.34, fetch posts with index >= 0.34
        // This might return posts like: 0.35, 0.67, 0.89, etc.
        const randomQuery = query(
            collection(db, "posts"),
            where("random_index", ">=", discovery_currentRandomStart), // Only posts >= 0.34
            orderBy("random_index"),      // Sort by random_index first
            orderBy("createdAt", "desc"), // Then by newest
            limit(batchSize)              // Limit to 10 posts
        );
        
        const randomSnapshot = await getDocs(randomQuery);
        let fetchedPosts = randomSnapshot.docs;
        
        console.log(`✅ Random query (>= ${discovery_currentRandomStart.toFixed(4)}) returned ${fetchedPosts.length} posts`);
        
        // STEP 3: ⚠️ Check if we got enough posts
        // Example: If we generated 0.89 but all posts have index < 0.89 (like 0.21, 0.45, 0.67)
        // Then fetchedPosts.length will be 0 (not enough!)
        if (fetchedPosts.length < batchSize) {
            console.log(`⚠️ Only got ${fetchedPosts.length}/${batchSize} posts from random query`);
            console.log(`🔄 Trying fallback query from random_index >= 0...`);
            
            // STEP 4: 🔄 FALLBACK - Fetch from beginning (random_index >= 0)
            // This gets ALL posts that have random_index field
            // Example: Will return posts like 0.21, 0.45, 0.67, etc.
            const fallbackQuery = query(
                collection(db, "posts"),
                where("random_index", ">=", 0), // Get ALL posts with random_index
                orderBy("random_index"),
                orderBy("createdAt", "desc"),
                limit(batchSize)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            fetchedPosts = fallbackSnapshot.docs;
            
            console.log(`✅ Fallback query returned ${fetchedPosts.length} posts`);
        }
        
        // STEP 5: 🔍 Filter out posts we've already shown
        // Prevents showing duplicate posts
        const newPosts = fetchedPosts.filter(doc => !discovery_loadedPostIds.has(doc.id));
        
        console.log(`📊 After filtering duplicates: ${newPosts.length} new posts`);
        
        return newPosts;
        
    } catch (error) {
        console.error("❌ Error fetching Discovery posts:", error);
        return [];
    }
}

// =================================================================
// LOAD MORE DISCOVERY POSTS (Infinite Scroll)
// =================================================================

async function loadMoreDiscoveryPosts() {
    if (discovery_isLoadingPosts) {
        console.log("⏸️ Already loading posts, skipping...");
        return;
    }
    
    console.log(`📊 Status check: ${discovery_totalPostsLoaded}/${discovery_totalPostsInDatabase} posts loaded`);
    
    if (discovery_totalPostsLoaded >= discovery_totalPostsInDatabase) {
        console.log("✅ All posts loaded - showing end message");
        discovery_hasMorePosts = false;
        showDiscoveryEndMessage();
        return;
    }
    
    try {
        discovery_isLoadingPosts = true;
        console.log("📥 Loading more Discovery posts...");
        
        showDiscoveryLoadingIndicator();
        
        // Calculate remaining posts
        const remainingPosts = discovery_totalPostsInDatabase - discovery_totalPostsLoaded;
        const postsToFetch = Math.min(DISCOVERY_POSTS_PER_BATCH, remainingPosts);
        
        console.log(`📊 Remaining posts: ${remainingPosts}, will fetch: ${postsToFetch}`);
        
        // Fetch next batch
        const fetchedPosts = await fetchDiscoveryPosts(postsToFetch);
        
        if (fetchedPosts.length === 0) {
            discovery_hasMorePosts = false;
            console.log("✅ No more new posts returned from query");
            hideDiscoveryLoadingIndicator();
            showDiscoveryEndMessage();
            discovery_isLoadingPosts = false;
            return;
        }
        
        displayDiscoveryPosts(fetchedPosts);
        hideDiscoveryLoadingIndicator();
        
        console.log(`📊 Updated status: ${discovery_totalPostsLoaded}/${discovery_totalPostsInDatabase} posts loaded`);
        
        if (discovery_totalPostsLoaded >= discovery_totalPostsInDatabase) {
            discovery_hasMorePosts = false;
            console.log("✅ All posts now loaded");
            showDiscoveryEndMessage();
        } else {
            discovery_hasMorePosts = true;
            console.log(`✅ ${discovery_totalPostsInDatabase - discovery_totalPostsLoaded} posts remaining`);
        }
        
        discovery_isLoadingPosts = false;
        
    } catch (error) {
        console.error("❌ Error loading more Discovery posts:", error);
        hideDiscoveryLoadingIndicator();
        discovery_isLoadingPosts = false;
    }
}

// =================================================================
// SETUP INFINITE SCROLL DETECTION
// =================================================================

function setupDiscoveryInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if (discovery_isLoadingPosts) return;
        if (discovery_totalPostsLoaded >= discovery_totalPostsInDatabase) return;
        
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const pageHeight = document.body.offsetHeight;
        const scrollPosition = scrollY + windowHeight;
        
        if (scrollPosition >= pageHeight - 300) {
            console.log("🎯 Near bottom - loading more Discovery posts");
            loadMoreDiscoveryPosts();
        }
    });
}

// =================================================================
// DISPLAY DISCOVERY POSTS
// =================================================================

function displayDiscoveryPosts(postDocs) {
    postDocs.forEach((doc) => {
        const post = doc.data();
        const postId = doc.id;
        
        if (discovery_loadedPostIds.has(postId)) {
            console.log("⏭️ Skipping duplicate post:", postId);
            return;
        }
        
        discovery_loadedPostIds.add(postId);
        discovery_totalPostsLoaded++;
        
        console.log(`📝 Displaying post ${postId} (${discovery_totalPostsLoaded}/${discovery_totalPostsInDatabase})`);
        
        const postElement = createDiscoveryPostElement(post, postId);
        discoveryPostsContainer.appendChild(postElement);
    });
    
    setupDiscoverySeeMoreLinks();
}

// =================================================================
// CREATE POST ELEMENT
// =================================================================

function createDiscoveryPostElement(post, postId) {
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.dataset.postId = postId;
    
    const timeAgo = getTimeAgo(post.createdAt);
    
    const text = post.text || "";
    const needsSeeMore = text.length > 150;
    const displayText = needsSeeMore ? text.substring(0, 150) + "..." : text;
    
    postDiv.innerHTML = `
        <div class="post-header" onclick="window.location.href='../profile/?view=profile&uid=${post.userId}'">
            <img src="${post.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'}" 
                 alt="Profile picture">
            <p class="post-username"></p>
            <div class="post-status" style="font-size: 12px; color: rgb(88, 86, 86);">${timeAgo}</div>
        </div>
        
        <h4 class="post-text-content">
            <span class="post-text" style="font-size: 15px; color: rgba(197, 194, 194, 1);"></span>
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
                    loading="lazy"
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
    
    postDiv.querySelector('.post-username').textContent = post.username || "User";
    postDiv.querySelector('.post-text').textContent = displayText;
    
    setupDiscoveryPostInteractions(postDiv, post, postId);
    
    return postDiv;
}

// =================================================================
// LOADING INDICATORS
// =================================================================

function showDiscoveryInitialLoadingIndicator() {
    discoveryPostsContainer.innerHTML = `
        <div id="discovery-initial-loading-indicator" style="text-align: center; padding: 50px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 50px; color: #5b53f2;"></i>
            <p style="margin-top: 20px; color: #888; font-size: 16px;">Loading Discovery posts...</p>
        </div>
    `;
    
    if (!document.querySelector('style[data-discovery-spinner]')) {
        const style = document.createElement('style');
        style.setAttribute('data-discovery-spinner', 'true');
        style.textContent = `
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
}

function hideDiscoveryInitialLoadingIndicator() {
    const loader = document.getElementById('discovery-initial-loading-indicator');
    if (loader) {
        loader.remove();
    }
}

function showDiscoveryLoadingIndicator() {
    if (document.getElementById('discovery-loading-indicator')) return;
    
    const loader = document.createElement('div');
    loader.id = 'discovery-loading-indicator';
    loader.style.cssText = `
        text-align: center;
        padding: 30px 20px;
        color: #5b53f2;
        font-size: 14px;
    `;
    
    loader.innerHTML = `
        <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #5b53f2;"></i>
        <p style="margin-top: 15px; color: #888; font-size: 14px;">Loading more posts...</p>
    `;
    
    discoveryPostsContainer.appendChild(loader);
}

function hideDiscoveryLoadingIndicator() {
    const loader = document.getElementById('discovery-loading-indicator');
    if (loader) {
        loader.remove();
    }
}

function showDiscoveryEndMessage() {
    hideDiscoveryLoadingIndicator();
    
    if (document.getElementById('discovery-end-message')) return;
    
    if (discovery_totalPostsLoaded < discovery_totalPostsInDatabase) {
        console.log("⚠️ Not showing end message - more posts exist in database");
        return;
    }
    
    const endMsg = document.createElement('div');
    endMsg.id = 'discovery-end-message';
    endMsg.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #888;
        font-size: 14px;
    `;
    
    endMsg.innerHTML = `
        <p style="font-size: 16px; margin-bottom: 5px;">🎉 You've reached the end!</p>
        <p style="font-size: 12px; color: #666;">No more posts to discover</p>
    `;
    
    discoveryPostsContainer.appendChild(endMsg);
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

function setupDiscoverySeeMoreLinks() {
    document.querySelectorAll('.see-more-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const postId = this.dataset.postId;
            window.location.href = `./more/?view=post&id=${postId}`;
        });
    });
}

function setupDiscoveryPostInteractions(postElement, post, postId) {
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
        shareBtn.addEventListener('click', () => handleDiscoveryShare(postId, post.text));
    }
}

function handleDiscoveryShare(postId, text) {
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

function showDiscoveryErrorMessage(message) {
    discoveryPostsContainer.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 20px; color: #ff6b6b;">
            <p>${message}</p>
            <button onclick="location.reload()" style="
                background: #5b53f2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 20px;
                margin-top: 10px;
                cursor: pointer;
            ">Try Again</button>
        </div>
    `;
}

console.log("✅ Discovery Feed system loaded!");

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