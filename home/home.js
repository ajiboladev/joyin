/* 
 *  JOYIN Social Media - Interactive Functions with INFINITE SCROLL
 *  This file powers JOYIN's features including infinite scrolling posts
 *  (c) 2025 JOYIN
 */

import { doc, getDoc, collection, orderBy, query, onSnapshot, getDocs, limit, startAfter, getCountFromServer, writeBatch, setDoc, updateDoc, deleteDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

let viewerId = null;
let profileUserId = null;

// ============================================
// INFINITE SCROLL VARIABLES
// ============================================

// This controls how many posts to load at once
// Setting it to 10 means: Load 10 posts, then another 10, then another 10...
const POSTS_PER_BATCH = 10;

// This stores the LAST post from the previous batch
// Example: If we loaded posts 1-10, this stores post #10
// Then we use it to get posts 11-20 next time
let lastVisiblePost = null;

// This prevents loading posts multiple times at once
// It's like a traffic light: RED (true) = stop, GREEN (false) = go
let isLoadingPosts = false;

// This tells us if there are more posts to load
// TRUE = keep scrolling, more posts available
// FALSE = stop, we've loaded everything
let hasMorePosts = true;

// This is a SET (list) of all post IDs we've already shown
// It prevents showing the same post twice
// Example: If post "abc123" is in here, skip it
let loadedPostIds = new Set();

// NEW: Track total posts in database
// This tells us how many posts exist in total
let totalPostsInDatabase = 0;

// NEW: Track how many posts we've successfully loaded and displayed
// This tells us how many posts are currently showing on screen
let totalPostsLoaded = 0;

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
    setupMessageButtons();

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

            document.getElementById("profile-username").textContent = data.username || "No profile added yet;";

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

// Find the HTML element where we'll put all the posts
// This is the container that holds all post cards
const postsContainer = document.getElementById("posts");

// Variable to store info about the logged-in user
let currentUser = null;

// Wait for the entire webpage to finish loading before running our code
// This prevents errors from trying to access elements that don't exist yet
document.addEventListener('DOMContentLoaded', function() {
    console.log("🏠 Home page loading...");
    
    // Listen for authentication state changes (login/logout)
    // This runs automatically whenever someone logs in or out
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Someone IS logged in
            console.log("✅ User logged in:", user.uid);
            currentUser = user; // Save user info for later use
            
            // Load the FIRST batch of posts (initial 10)
            loadInitialPosts();
            
            // Set up the scroll listener to detect when user scrolls near bottom
            setupInfiniteScroll();
            
        } else {
            // Nobody is logged in - redirect to login page
            console.log("❌ No user logged in, redirecting...");
            window.location.href = "../login/?view=login";
        }
    });
});

// =================================================================
// GET TOTAL POSTS COUNT FROM DATABASE
// =================================================================
// This function counts how many posts exist in the database
// We use this to know if there are more posts to load

async function getTotalPostsCount() {
    try {
        // Create a query to count all posts in the database
        const postsQuery = query(collection(db, "posts"));
        
        // Get the count from Firestore
        const snapshot = await getCountFromServer(postsQuery);
        
        // Return the total count
        const count = snapshot.data().count;
        console.log(`📊 Total posts in database: ${count}`);
        return count;
        
    } catch (error) {
        console.error("Error getting posts count:", error);
        return 0; // Return 0 if there's an error
    }
}

// =================================================================
// LOAD INITIAL POSTS (First 10 posts)
// =================================================================
// This function runs when the page first opens
// It loads the first batch of posts so users see something immediately

async function loadInitialPosts() {
    try {
        console.log("📥 Loading initial posts from Firestore...");
        
        // STEP 1: Reset all variables to starting values
        // This is like clearing the table before serving new food
        isLoadingPosts = true;           // Set traffic light to RED (loading)
        lastVisiblePost = null;          // Reset bookmark to start from beginning
        hasMorePosts = true;             // Assume there are more posts
        loadedPostIds.clear();           // Clear the list of posts we've shown
        totalPostsLoaded = 0;            // Reset loaded posts counter
        postsContainer.innerHTML = "";   // Remove any existing posts from screen
        
        // Show initial loading spinner
        showInitialLoadingIndicator();
        
        // STEP 1.5: Get total posts count from database
        // This tells us how many posts exist in total
        totalPostsInDatabase = await getTotalPostsCount();
        console.log(`📊 Database has ${totalPostsInDatabase} total posts`);
        
        // STEP 2: Create a database query
        // This is like writing a request: "Give me 10 newest posts"
        const q = query(
            collection(db, "posts"),         // Look in the "posts" collection
            orderBy("createdAt", "desc"),    // Sort by newest first (desc = descending)
            limit(POSTS_PER_BATCH)           // Only get 10 posts (POSTS_PER_BATCH = 10)
        );
        
        // STEP 3: Actually fetch the posts from Firebase
        // getDocs = "Get Documents" - retrieves the posts once
        const snapshot = await getDocs(q);
        
        console.log(`📊 Got ${snapshot.size} initial posts`);
        
        // STEP 4: Check if there are NO posts at all in the database
        if (snapshot.empty) {
            // Database is empty - show a message
            hideInitialLoadingIndicator();
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>No posts yet. Be the first to post something!</p>
                    <button onclick="window.location.href='../upload/'">Create Post</button>
                </div>
            `;
            hasMorePosts = false;      // No more posts to load
            isLoadingPosts = false;    // Set traffic light to GREEN
            return;                     // Stop here
        }
        
        // STEP 5: Save the LAST post as a bookmark
        // snapshot.docs = array of all posts we got
        // [snapshot.docs.length - 1] = get the LAST item in the array
        // Example: If we got posts 1-10, save post #10
        lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
        
        // STEP 6: Display all the posts on the screen
        hideInitialLoadingIndicator();
        displayPosts(snapshot);
        
        // STEP 7: Check if we've loaded all posts
        // Compare: posts we've loaded vs total posts in database
        console.log(`📊 Loaded ${totalPostsLoaded} out of ${totalPostsInDatabase} posts`);
        
        if (totalPostsLoaded >= totalPostsInDatabase) {
            // We've loaded everything!
            hasMorePosts = false;
            console.log("✅ All posts loaded (initial load complete)");
        } else {
            // There are more posts to load
            hasMorePosts = true;
            console.log(`✅ More posts available (${totalPostsInDatabase - totalPostsLoaded} remaining)`);
        }
        
        // STEP 8: Loading complete - set traffic light to GREEN
        isLoadingPosts = false;
        
    } catch (error) {
        // If ANYTHING goes wrong, show an error message
        console.error("Error loading initial posts:", error);
        hideInitialLoadingIndicator();
        showErrorMessage("Failed to load posts. Please check your connection and refresh.");
        isLoadingPosts = false;    // Make sure to unlock loading
    }
}

// =================================================================
// LOAD MORE POSTS (Next 10 posts)
// =================================================================
// This function runs when user scrolls near the bottom
// It loads the NEXT batch of 10 posts

async function loadMorePosts() {
    // STEP 1: Safety checks - don't load if any of these are true
    if (isLoadingPosts) {
        // Already loading posts - wait for current load to finish
        console.log("⏸️ Already loading posts, please wait...");
        return;
    }
    
    if (!lastVisiblePost) {
        // Don't have a bookmark - can't load next batch
        console.log("⏸️ No bookmark for next batch");
        return;
    }
    
    // STEP 2: Check if we've loaded all posts from database
    console.log(`📊 Checking: Loaded ${totalPostsLoaded} / Total ${totalPostsInDatabase}`);
    
    if (totalPostsLoaded >= totalPostsInDatabase) {
        // We've loaded everything - show "No more posts" message
        console.log("✅ All posts have been loaded from database");
        hasMorePosts = false;
        showEndMessage();
        return;
    }
    
    // STEP 3: If we reach here, there ARE more posts in database
    // But we haven't loaded them yet, so show loading indicator
    try {
        // Set loading state
        isLoadingPosts = true;                    // Traffic light to RED
        console.log("📥 Loading more posts...");
        
        // Show loading spinner at bottom of page
        // This will keep spinning until posts load OR we confirm no more posts
        showLoadingIndicator();
        
        // STEP 4: Create query for NEXT batch of posts
        // This is the KEY to infinite scroll!
        const q = query(
            collection(db, "posts"),              // Look in "posts" collection
            orderBy("createdAt", "desc"),         // Sort by newest first
            startAfter(lastVisiblePost),          // 🔑 START AFTER the last post we loaded
            limit(POSTS_PER_BATCH)                // Get next 10 posts
        );
        
        // Example of how startAfter works:
        // First load: Got posts 1-10, bookmark = post #10
        // Second load: startAfter(post #10) → Get posts 11-20, bookmark = post #20
        // Third load: startAfter(post #20) → Get posts 21-30, bookmark = post #30
        
        // STEP 5: Fetch the posts from Firebase
        const snapshot = await getDocs(q);
        
        console.log(`📊 Got ${snapshot.size} more posts`);
        
        // STEP 6: Check if Firebase returned NO posts
        // This should not happen if our count is correct, but check anyway
        if (snapshot.empty) {
            hasMorePosts = false;                 // Mark as finished
            console.log("✅ No more posts returned from query");
            hideLoadingIndicator();               // Remove loading spinner
            showEndMessage();                     // Show "You've reached the end!"
            isLoadingPosts = false;               // Traffic light to GREEN
            return;                                // Stop here
        }
        
        // STEP 7: Update the bookmark to the NEW last post
        // Example: Just loaded posts 11-20, so bookmark is now post #20
        lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
        
        // STEP 8: Display the new posts on screen (ADD to existing, don't replace)
        displayPosts(snapshot, true);             // true = append mode
        
        // STEP 9: Clean up
        hideLoadingIndicator();                   // Remove loading spinner
        
        // STEP 10: Check again if we've loaded all posts
        console.log(`📊 Now loaded ${totalPostsLoaded} out of ${totalPostsInDatabase} posts`);
        
        if (totalPostsLoaded >= totalPostsInDatabase) {
            // We've loaded everything!
            hasMorePosts = false;
            console.log("✅ All posts now loaded");
            showEndMessage();                     // Show "You've reached the end!"
        } else {
            // Still more posts to load
            hasMorePosts = true;
            console.log(`✅ More posts available (${totalPostsInDatabase - totalPostsLoaded} remaining)`);
        }
        
        isLoadingPosts = false;                   // Traffic light to GREEN
        
    } catch (error) {
        // If loading fails (network error, etc.)
        console.error("Error loading more posts:", error);
        
        // DON'T hide the loading indicator
        // Keep showing "Try to reload the page" because posts still exist in database
        // The user can scroll again or refresh to retry
        
        console.log("⚠️ Load failed but posts remain in database - keeping loading indicator");
        
        isLoadingPosts = false;                   // Traffic light to GREEN (allow retry)
    }
}

// =================================================================
// SETUP INFINITE SCROLL DETECTION
// =================================================================
// This function sets up a listener that watches when user scrolls
// When user gets close to bottom, it automatically loads more posts

function setupInfiniteScroll() {
    // Add a scroll event listener to the window
    // This runs EVERY TIME the user scrolls (even a tiny bit)
    window.addEventListener('scroll', () => {
        // STEP 1: Quick check - don't do anything if already loading
        if (isLoadingPosts) {
            return;
        }
        
        // STEP 2: Check if there are more posts to load
        // Compare loaded vs total in database
        if (totalPostsLoaded >= totalPostsInDatabase) {
            // All posts loaded - don't trigger loading
            return;
        }
        
        // STEP 3: Calculate scroll position
        // Think of this like measuring how far down the page you are
        
        // How far user has scrolled from the top (in pixels)
        const scrollY = window.scrollY;
        
        // Height of the visible window (what user can see)
        const windowHeight = window.innerHeight;
        
        // Total height of the entire page
        const pageHeight = document.body.offsetHeight;
        
        // Current position = how far scrolled + visible area
        // Example: Scrolled 1000px, window is 800px tall = position is 1800px
        const scrollPosition = scrollY + windowHeight;
        
        // STEP 4: Check if user is near the bottom
        // If current position is within 300px of the bottom, load more
        // 
        // Example calculation:
        // Page height: 2000px
        // Trigger point: 2000 - 300 = 1700px
        // User position: 1750px
        // 1750 >= 1700 ? YES → Load more posts!
        if (scrollPosition >= pageHeight - 300) {
            console.log("🎯 Near bottom - loading more posts");
            loadMorePosts();  // Trigger loading of next batch
        }
    });
}

// =================================================================
// DISPLAY POSTS ON THE PAGE
// =================================================================
// This function takes the raw post data from Firebase
// and converts it into HTML elements that users can see

function displayPosts(snapshot, appendMode = false) {
    // appendMode = false: Clear everything and show new posts (initial load)
    // appendMode = true: Add to existing posts (loading more)
    
    // STEP 1: If NOT appending, clear the container
    if (!appendMode) {
        postsContainer.innerHTML = "";  // Remove all existing posts
    }
    
    // STEP 2: Check if snapshot is empty (no posts received)
    if (snapshot.empty && !appendMode) {
        // Show "no posts" message
        postsContainer.innerHTML = `
            <div class="no-posts">
                <p>No posts yet. Be the first to post something!</p>
                <button onclick="window.location.href='../upload/'">Create Post</button>
            </div>
        `;
        return;  // Stop here
    }
    
    // STEP 3: Loop through each post document in the snapshot
    // forEach = "For each item, do this..."
    snapshot.forEach((doc) => {
        // Get the post data (username, text, image, etc.)
        const post = doc.data();
        
        // Get the unique ID of this post
        const postId = doc.id;
        
        // STEP 4: Check if we've already shown this post
        // loadedPostIds.has(postId) = "Is this ID in our list?"
        if (loadedPostIds.has(postId)) {
            console.log("⏭️ Skipping duplicate post:", postId);
            return;  // Skip this post, move to next one
        }
        
        // STEP 5: Mark this post as "already shown"
        // Add its ID to our tracking list
        loadedPostIds.add(postId);
        
        // STEP 6: Increment the total posts loaded counter
        totalPostsLoaded++;
        
        console.log(`📝 Processing post: ${postId} (${totalPostsLoaded}/${totalPostsInDatabase})`);
        
        // STEP 7: Create the HTML element for this post
        const postElement = createPostElement(post, postId);
        
        // STEP 8: Add the post element to the posts container
        // appendChild = "Add this as the last child"
        // So new posts appear at the bottom
        postsContainer.appendChild(postElement);
    });
    
    // STEP 9: Set up click handlers for "see more" links
    setupSeeMoreLinks();
}

// =================================================================
// CREATE POST ELEMENT
// =================================================================
// This function builds the complete HTML structure for ONE post
// It takes the post data and returns a complete, styled post card

function createPostElement(post, postId) {
    // STEP 1: Create a new div element (container for the post)
    const postDiv = document.createElement("div");
    postDiv.className = "post";              // Add CSS class for styling
    postDiv.dataset.postId = postId;         // Store post ID in the element
    
    // STEP 2: Calculate time ago (e.g., "2 hours ago")
    const timeAgo = getTimeAgo(post.createdAt);
    
    // STEP 3: Get the post text and handle long text
    const text = post.text || "";                          // Get text, or empty string if none
    const needsSeeMore = text.length > 150;                // Is text longer than 150 characters?
    
    // If text is long, show first 150 chars + "...seemore"
    // If text is short, show all of it
    const displayText = needsSeeMore ? text.substring(0, 150) + "..." : text;
    
    // STEP 4: Build the complete HTML for the post
    // Using template literals (backticks) to easily insert variables
    // NOTE: Username and text are added via textContent after for security
    postDiv.innerHTML = `
        <!-- POST HEADER: Shows user profile pic, username, and time -->
        <div class="post-header" onclick="window.location.href='../profile/?view=profile&uid=${post.userId}'">
            <img src="${post.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'}" 
                 alt="Profile picture">
            <p class="post-username"></p>
            <div class="post-status" style="font-size: 12px; color: rgb(88, 86, 86);">${timeAgo}</div>
        </div>
        
        <!-- POST TEXT: Shows the post content -->
        <h4 class="post-text-content">
            <span class="post-text" style="font-size: 15px; color: rgba(197, 194, 194, 1);"></span>
            ${needsSeeMore ? 
                `<a class="see-more-link" data-post-id="${postId}" style="color: #007bff; cursor: pointer;">...see more</a>` 
                : ''}
        </h4>
        
        <!-- POST IMAGE: Shows image if post has one -->
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
        
        <!-- LIKE COUNT: Shows how many likes -->
        <div class="reaction">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b53f2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
            <p class="reaction-count">${post.likeCount || 0} ${post.likeCount === 1 ? 'like' : 'likes'}</p>
        </div>
        
        <!-- ACTION BUTTONS: Like, Comment, Share -->
        <div class="post-actions">
            <button class=" like-btn" data-post-id="${postId}">
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
    
    // STEP 5: Safely add username and text using textContent (prevents XSS attacks)
    // textContent treats everything as plain text, not HTML
    postDiv.querySelector('.post-username').textContent = post.username || "User";
    postDiv.querySelector('.post-text').textContent = displayText;
    
    // STEP 6: Add event listeners to the buttons (make them clickable)
    setupPostInteractions(postDiv, post, postId);
    
    // STEP 7: Return the complete post element
    return postDiv;
}

// =================================================================
// LOADING INDICATORS
// =================================================================

// Show initial loading spinner when page first loads
function showInitialLoadingIndicator() {
    postsContainer.innerHTML = `
        <div id="initial-loading-indicator" style="text-align: center; padding: 50px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 50px; color: #5b53f2;"></i>
            <p style="margin-top: 20px; color: #888; font-size: 16px;">Loading posts...</p>
        </div>
    `;
    
    // Add CSS for spinner animation if not already added
    if (!document.querySelector('style[data-spinner]')) {
        const style = document.createElement('style');
        style.setAttribute('data-spinner', 'true');
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

// Hide initial loading spinner
function hideInitialLoadingIndicator() {
    const loader = document.getElementById('initial-loading-indicator');
    if (loader) {
        loader.remove();
    }
}

// Show a loading spinner at the bottom while fetching more posts
// This keeps spinning as long as there are posts in database that haven't loaded yet
function showLoadingIndicator() {
    // Check if indicator already exists - don't create duplicates
    if (document.getElementById('loading-indicator')) return;
    
    // Create the loading indicator element
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.style.cssText = `
        text-align: center;
        padding: 30px 20px;
        color: #5b53f2;
        font-size: 14px;
    `;
    
    // Create spinner icon
    const spinner = document.createElement('div');
    spinner.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #5b53f2;"></i>';
    
    // Create reload text
    const reloadText = document.createElement('p');
    reloadText.style.cssText = 'margin-top: 2px; padding-bottom: 25px; color: #888; font-size: 14px;';
    reloadText.textContent = 'Try to reload the page';
    
    // Add elements to loader
    loader.appendChild(spinner);
    loader.appendChild(reloadText);
    
    // Add it to the bottom of the posts container
    postsContainer.appendChild(loader);
}

// Remove the loading spinner
function hideLoadingIndicator() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.remove();  // Remove from page
    }
}

// Show "You've reached the end!" message when all posts are loaded
// This only shows when totalPostsLoaded === totalPostsInDatabase
function showEndMessage() {
    // IMPORTANT: First remove loading indicator if it exists
    // We should NEVER show both loading and "no more posts" at the same time
    hideLoadingIndicator();
    
    // Check if message already exists - don't create duplicates
    if (document.getElementById('end-message')) return;
    
    // Double check: Only show this if we've truly loaded all posts
    if (totalPostsLoaded < totalPostsInDatabase) {
        console.log("⚠️ Not showing end message - more posts exist in database");
        return; // Don't show end message if posts still exist
    }
    
    const endMsg = document.createElement('div');
    endMsg.id = 'end-message';
    endMsg.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #888;
        font-size: 14px;
    `;
    
    endMsg.innerHTML = `
        <p style="font-size: 16px; margin-bottom: 5px;">🎉 You've reached the end!</p>
        <p style="font-size: 12px; color: #666;">No more posts to load</p>
    `;
    
    // Add it to the bottom of the posts container
    postsContainer.appendChild(endMsg);
}

// =================================================================
// HELPER FUNCTIONS
// =================================================================

// Convert timestamp to "time ago" format (e.g., "2h ago", "5d ago")
function getTimeAgo(timestamp) {
    // If no timestamp, return "Just now"
    if (!timestamp) return "Just now";
    
    const now = new Date();  // Current time
    
    // Convert Firestore timestamp to JavaScript Date
    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Calculate difference in seconds
    const seconds = Math.floor((now - postDate) / 1000);
    
    // Return appropriate format based on time difference
    if (seconds < 60) return "Just now";                              // Less than 1 minute
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;    // Less than 1 hour
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; // Less than 1 day
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`; // Less than 1 week
    
    return postDate.toLocaleDateString();  // Show actual date for older posts
}

// Set up click handlers for all "see more" links
function setupSeeMoreLinks() {
    // Find all elements with class "see-more-link"
    document.querySelectorAll('.see-more-link').forEach(link => {
        // Add click event to each link
        link.addEventListener('click', function(e) {
            e.preventDefault();  // Prevent default link behavior
            const postId = this.dataset.postId;  // Get post ID from link
            // Navigate to full post page
            window.location.href = `./more/?view=post&id=${postId}`;
        });
    });
}







// Set up click handlers for post buttons (like, comment, share)
 function setupPostInteractions(postElement, post, postId) {
    // ============================================
// LIKE SYSTEM FUNCTIONS
// ============================================


    // Find the like button in this specific post
    const likeBtn = postElement.querySelector('.like-btn');


    async function checkLikeStatus() {
  if (!currentUser) return false;


  try {
    const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error("Error checking like status:", error);
    return false;
  }
}

async function updateLikeButton() {
  const isLiked = await checkLikeStatus();
  likeBtn.classList.toggle('liked', isLiked);
}

updateLikeButton();

likeBtn.addEventListener('click', async () => {
  if (!currentUser) {
    alert("Please log in to like posts.");
    return;
  }

  likeBtn.disabled = true;

  try {
    const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
    const postRef = doc(db, "posts", postId);
    const likeSnap = await getDoc(likeRef);
    const userRef = doc(db, "users", post.userId);

    if (likeSnap.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likeCount: increment(-1) });
      await updateDoc(userRef, { likesCount: increment(-1) });
    } else {
      await setDoc(likeRef, {
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      await updateDoc(postRef, { likeCount: increment(1) });
        await updateDoc(userRef, { likesCount: increment(1) });
    }

    await updateLikeButton();
   const postSnap = await getDoc(postRef);
const updatedCount = postSnap.data().likeCount || 0;

postElement.querySelector('.reaction-count').textContent =
  `${updatedCount} ${updatedCount === 1 ? 'like' : 'likes'}`;




  } catch (error) {
    console.error("Error toggling like:", error);
  } finally {
    likeBtn.disabled = false;
  }
});






























    
    // Find the comment button
    const commentBtn = postElement.querySelector('.comment-btn');
    if (commentBtn) {
        commentBtn.addEventListener('click', () => alert("Comment functionality coming soon!"));
    }
    
    // Find the share button
    const shareBtn = postElement.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => handleShare(postId, post.text));
    }
}

// Handle sharing a post
function handleShare(postId, text) {
    // Check if browser supports native sharing
    if (navigator.share) {
        // Use native share dialog (works on mobile)
        navigator.share({
            title: 'Check out this post on JOYIN',
            url: `./more/?tab=shared_post&id=${postId}`
        });
    } else {
        // Fallback: Copy link to clipboard
        const link = `${window.location.origin}/post/?id=${postId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Post link copied to clipboard!');
        });
    }
}

// Show error message when posts fail to load
function showErrorMessage(message) {
    postsContainer.innerHTML = `
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

console.log("✅ Home feed system with infinite scroll loaded!");






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