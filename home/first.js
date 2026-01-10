/* 
 *  JOYIN Social Media - Interactive Functions
 *  This file powers JOYIN's features.
 *  (c) 2025 JOYIN
 */

import { doc, getDoc,  collection, orderBy, query, onSnapshot, getDocs} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"; // Use your Firebase version


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

     // Check if user is banned BEFORE doing anything else
    const isBanned = await softBan(profileUserId);
    
    if (isBanned) {
        console.log("🛑 User is banned, stopping all other functions");
        return; // STOP HERE - don't load other functions
    }

    await followingPage(profileUserId);
    await followersPage(profileUserId);
     loadUserName(profileUserId);

     


  } else {
    window.location.href = "../login/?view=login";
  }
});


// ============================================
// Soft Ban FUNCTIONS - WITH JOYIN HEADER
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
    
    // Clear entire page
    document.body.innerHTML = '';
    
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        /* Ban Screen */
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
        
        /* JOYIN Header */
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
        
        /* Main content */
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
            color: #5b53f2; /* Changed to #5b53f2 */
            filter: drop-shadow(0 0 10px rgba(91, 83, 242, 0.3));
        }
        
        .ban-title {
            font-size: 22px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 12px;
            color: #5b53f2; /* Changed to #5b53f2 */
        }
        
        .ban-subtitle {
            font-size: 15px;
            color: #aaa;
            text-align: center;
            margin-bottom: 24px;
        }
        
        .ban-details {
            background: rgba(91, 83, 242, 0.05); /* Subtle #5b53f2 tint */
            border-radius: 12px;
            padding: 18px;
            margin-bottom: 24px;
            border-left: 4px solid #5b53f2; /* Changed to #5b53f2 */
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
            background: rgba(91, 83, 242, 0.1); /* Changed to #5b53f2 tint */
            border: 1px solid rgba(91, 83, 242, 0.2); /* Changed to #5b53f2 */
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .logout-btn {
            background: #5b53f2; /* Changed to #5b53f2 */
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
            background: #6a63f4; /* Slightly lighter #5b53f2 */
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
            color: #5b53f2; /* Changed to #5b53f2 */
            text-decoration: none;
            font-weight: 600;
        }
        
        /* Responsive */
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
    
    // Format date
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
    
    // Create HTML with JOYIN header
    document.body.innerHTML = `
        <div class="ban-container">
            <!-- JOYIN Header -->
            <div class="joyin-header">
                <div class="joyin-logo">JOYIN</div>
            </div>
            
            <!-- Ban Content -->
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
    
    // Logout handler
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

            //show profile image
     let profileImg = document.getElementById("profileImage");
     profileImg.src = data.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
       } else {
        
       }
    } catch (error) {
        console.log(error);
        
    }
}






/// =================================================================
// SECTION 1: IMPORTING FIREBASE TOOLS
// =================================================================

// Firebase is like a cloud toolbox for building apps. We need to import 
// specific tools from Firebase to work with our database and authentication.

// Import Firestore functions - these are tools for working with the database
// import { 
  // collection: Tool to access a group of documents (like a folder of posts)
//   collection, 
  
  // query: Tool to create a search request to the database
//   query, 
  
  // orderBy: Tool to sort results (like sorting by date)
//   orderBy, 
  
  // onSnapshot: Special tool that listens for real-time changes
//   onSnapshot,
  
  // getDocs: Tool to fetch documents once (one-time grab)
//   getDocs  
// } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Import our Firebase configuration that we set up in another file
// auth: Authentication service - handles login/logout
// db: Database instance - our connection to Firestore
// import { auth, db } from "../firebase.js";

// Import authentication listener tool
// onAuthStateChanged: Watches for when users log in or out
// import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// =================================================================
// SECTION 2: SETTING UP OUR WORKSPACE
// =================================================================

// Find the HTML element where we'll display posts
// document: The entire webpage
// getElementById("posts"): Finds the element with id="posts"
// This is like finding an empty picture frame on the wall where we'll hang photos
const postsContainer = document.getElementById("posts");

// Create a variable to remember who's currently logged in
// let: Creates a variable that can change (unlike const which is permanent)
// currentUser: We'll store the logged-in user's information here
// null: Means "empty" or "nothing" - no user is logged in yet
let currentUser = null;

// =================================================================
// SECTION 3: AUTHENTICATION - CHECKING WHO'S USING THE APP
// =================================================================

// Wait for the entire webpage to finish loading before running our code
// If we try to work with HTML elements before they exist, our code will break
document.addEventListener('DOMContentLoaded', function() {
    // Log a message to the console (developer's view) so we know the page started
    console.log("🏠 Home page loading...");
    
    // Set up a listener that watches for changes in user login status
    // onAuthStateChanged: This is like installing a doorbell camera
    // auth: Our authentication system
    // (user) => { ... }: What happens when someone logs in or out
    onAuthStateChanged(auth, (user) => {
        // Check if we have a user object (someone is logged in)
        // The 'if' statement checks: "Is the user variable NOT empty?"
        if (user) {
            // A user IS logged in
            // Log their unique ID to the console (for debugging)
            console.log("✅ User logged in:", user.uid);
            
            // Save the user information to our currentUser variable
            // This lets us remember who's logged in throughout our app
            currentUser = user;
            
            // Now that we know a user is logged in, we can load their posts
            // Calling the loadPosts function that we'll define later
            loadPosts();
            
        } else {
            // No user is logged in (user is null or undefined)
            console.log("❌ No user logged in, redirecting...");
            
            // Redirect the user to the login page
            // window.location.href: Changes the URL in the browser
            // "../login/?view=login": Go to the login page in the parent folder
            // ?view=login: Adds a parameter telling the login page to show login form
            window.location.href = "../login/?view=login";
        }
    });
});

// =================================================================
// SECTION 4: LOADING POSTS FROM THE DATABASE
// =================================================================

// Define a function called loadPosts
// async: This function might take time to complete (waiting for database)
// We use async when we need to wait for something (like loading data)
async function loadPosts() {
    // Try to execute the code inside the curly braces
    // If anything goes wrong, the 'catch' block will handle it
    try {
        // Log to console so we know the function started
        console.log("📥 Loading posts from Firestore...");
        
        // Create a database query - this is like writing a request to the database
        // query(): Creates a search request
        // collection(db, "posts"): "Look in the 'posts' collection of our database"
        // orderBy("createdAt", "desc"): "Sort by creation date, newest first"
        const q = query(
            collection(db, "posts"),          // Where to look
            orderBy("createdAt", "desc")      // How to sort results
        );
        
        // We have two ways to get data. We're using Method 2 (real-time):
         
        // Method 1 (commented out): One-time fetch
        // const snapshot = await getDocs(q);   // Get data once
        // displayPosts(snapshot);              // Display it
        
        // Method 2 (active): Real-time listener
        // onSnapshot: Sets up a continuous connection to the database
        // Whenever data changes in the 'posts' collection, this runs automatically
        onSnapshot(q, (snapshot) => {
            // snapshot: A picture of what the data looks like right now
            // snapshot.size: How many documents (posts) we received
            
            // Log how many posts we got (using template literal for dynamic text)
            console.log(`📊 Got ${snapshot.size} posts`);
            
            // Call another function to display these posts on the page
            displayPosts(snapshot);
        });
        
    } catch (error) {
        // This runs ONLY if something went wrong in the 'try' block
        // error: Contains information about what went wrong
        
        // Log the error details to the console (for developers)
        console.error("Error loading posts:", error);
        
        // Show a friendly error message to the user
        showErrorMessage("Failed to load posts. Please refresh.");
    }
}

// =================================================================
// SECTION 5: DISPLAYING POSTS ON THE PAGE
// =================================================================

// This function takes raw data from Firebase and turns it into HTML elements
// snapshot: The data we received from Firebase (contains all posts)
function displayPosts(snapshot) {
    // First, clear out any existing posts from the container
    // innerHTML: The HTML content inside an element
    // Setting it to empty string removes everything inside
    postsContainer.innerHTML = "";
    
    // Check if the snapshot is empty (no posts in the database)
    // snapshot.empty: Firebase property that tells us if there are no documents
    if (snapshot.empty) {
        // Create HTML for a "no posts" message
        postsContainer.innerHTML = `
            <div class="no-posts">
                <p>No posts yet. Be the first to post something!</p>
                <button onclick="window.location.href='../upload/'">Create Post</button>
            </div>
        `;
        
        // Return means "stop here, don't run the rest of the function"
        // Since there are no posts, we don't need to try displaying them
        return;
    }
    
    // If we get here, there ARE posts to display
    // Loop through each document (post) in the snapshot
    // forEach: Do something for each item in a collection
    // (doc) => { ... }: For each document, run this code
    snapshot.forEach((doc) => {
        // doc.data(): Gets the actual data from the document
        // This includes text, imageUrl, username, etc.
        const post = doc.data();
        
        // doc.id: Gets the unique ID of this document
        // Every Firestore document has an automatic unique ID
        const postId = doc.id;
        
        // Log which post we're processing (for debugging)
        console.log("📝 Processing post:", postId);
        
        // Create an HTML element for this post
        // We'll look at the createPostElement function next
        const postElement = createPostElement(post, postId);
        
        // Add the created post element to our posts container
        // appendChild: Adds the element as the last child of the container
        postsContainer.appendChild(postElement);
    });
    
    // After creating all posts, set up the "see more" links
    // These links only exist on posts with long text
    setupSeeMoreLinks();
}

// =================================================================
// SECTION 6: CREATING THE HTML FOR A SINGLE POST
// =================================================================

// This function builds the complete HTML structure for one post
// post: The post data (text, image, user info, etc.)
// postId: The unique ID of this post
function createPostElement(post, postId) {
    // Create a new div element (a container for the post)
    // document.createElement("div"): Makes a new empty <div> element
    const postDiv = document.createElement("div");
    
    // Add a CSS class for styling
    // className: Sets the class attribute of the element
    // Our CSS file will have styles for elements with class="post"
    postDiv.className = "post";
    
    // Store the post ID as a data attribute on the div
    // dataset: Special property for storing custom data
    // postId will be accessible as element.dataset.postId
    postDiv.dataset.postId = postId;
    
    // Convert the Firestore timestamp to a human-readable time
    // Example: "2 hours ago" or "3 days ago"
    // We'll look at getTimeAgo function later
    const timeAgo = getTimeAgo(post.createdAt);
    
    // Get the post text, or use empty string if undefined
    // post.text || "": Means "use post.text, but if it's falsy, use empty string"
    const text = post.text || "";
    
    // Check if the text is longer than 150 characters
    // If so, we'll need a "see more" link
    const needsSeeMore = text.length > 150;
    
    // Decide what text to show initially
    // If text is long: Show first 150 characters + "..."
    // If text is short: Show the full text
    // substring(0, 150): Gets characters from position 0 to 149
    const displayText = needsSeeMore ? text.substring(0, 150) + "...seemore" : text;
    
    // Now build the HTML content for the post
    // We use template literals (backticks `) to easily insert variables
    postDiv.innerHTML = `
        <!-- POST HEADER: User information -->
        <div class="post-header" onclick="window.location.href='../profile/?view=profile&uid=${post.userId}'">
            <!-- User profile picture with fallback to default image -->
            <img src="${post.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'}" 
                 alt="${post.username}'s profile picture">
            <!-- Display username or "User" if not available -->
            <p class="post-username">${post.username || "User"}</p>
            <!-- Time when the post was created -->
            <div class="post-status" style="font-size: 12px; color: rgb(88, 86, 86);">${timeAgo}</div>
        </div>
        
        <!-- POST TEXT CONTENT -->
        <h4 class="post-text-content">
            <span class="post-text" style="font-size: 15px; color: rgba(197, 194, 194, 1);">${displayText}</span>
            <!-- Show "see more" link only if text is too long -->
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
        <!-- LIKE COUNT DISPLAY -->
        <div class="reaction">
            <!-- Heart icon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b53f2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
            <!-- Display like count with proper pluralization -->
            <p class="reaction-count">${post.likeCount || 0} ${post.likeCount === 1 ? 'like' : 'likes'}</p>
        </div>
        
        <!-- POST ACTION BUTTONS -->
        <div class="post-actions">
            <!-- LIKE BUTTON -->
            <button class="action-button like-btn" data-post-id="${postId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                Like
            </button>
            
            <!-- COMMENT BUTTON -->
            <button class="action-button comment-btn" data-post-id="${postId}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Comment
            </button>
            
            <!-- SHARE BUTTON -->
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
    
    // Add event listeners to the buttons in this specific post
    // This makes the buttons clickable and responsive
    setupPostInteractions(postDiv, post, postId);
    
    // Return the fully constructed post element
    // This gets sent back to displayPosts function
    return postDiv;
}

// =================================================================
// SECTION 7: HELPER FUNCTIONS (SMALL TOOLS THAT DO SPECIFIC JOBS)
// =================================================================

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

// Set up click handlers for all "see more" links
function setupSeeMoreLinks() {
    // Find ALL elements with class "see-more-link"
    // querySelectorAll: Returns a list of all matching elements
    document.querySelectorAll('.see-more-link').forEach(link => {
        // For each link, add a click event listener
        link.addEventListener('click', function(e) {
            // Prevent the default link behavior (navigation)
            e.preventDefault();
            
            // Get the post ID stored in the link's data attribute
            const postId = this.dataset.postId;
            
            // Navigate to the post detail page with the post ID
            // This is where users can see the full post
            window.location.href = `./more/?view=post&id=${postId}`;
        });
    });
}

// Add click handlers to a post's buttons (like, comment, share)
// postElement: The HTML element of this specific post
// post: The post data
// postId: The post's unique ID
function setupPostInteractions(postElement, post, postId) {
    // Find the like button inside this specific post
    const likeBtn = postElement.querySelector('.like-btn');
    
    // If like button exists (it should), add click handler
    if (likeBtn) {
        // When clicked, call handleLike function with the post ID
        likeBtn.addEventListener('click', () => alert("Like functionality coming soon!"));
        // handleLike(postId)
    }
    
    // Find the comment button
    const commentBtn = postElement.querySelector('.comment-btn');
    if (commentBtn) {
        // When clicked, call handleComment function
        commentBtn.addEventListener('click', () =>  alert("Comment functionality coming soon!"));
        // handleComment(postId)
    }
    
    // Find the share button
    const shareBtn = postElement.querySelector('.share-btn');
    if (shareBtn) {
        // When clicked, call handleShare function with post ID and text
        shareBtn.addEventListener('click', () => handleShare(postId, post.text));
    }
    
    // Find the post image (if it exists)
    const postImage = postElement.querySelector('.post-image');
    if (postImage) {
        // When clicked, call viewPostImage function
        postImage.addEventListener('click', () => viewPostImage(postId));
    }
}

// Handle when a user clicks the like button
// postId: Which post to like
function handleLike(postId) {
    // First, check if a user is logged in
    if (!currentUser) {
        // If not logged in, show alert and stop here
        alert("Please log in to like posts");
        return;  // Exit the function
    }
    
    // Log to console (for debugging)
    console.log("Liking post:", postId);
    
    // TODO: You need to implement the actual like functionality here:
    // 1. Update Firestore: Increment likeCount for this post
    // 2. Add this user to a "likes" subcollection for this post
    // 3. Update the UI to show the new like count
}

// Handle when a user clicks the comment button
// postId: Which post to comment on
function handleComment(postId) {
    // Check if user is logged in
    if (!currentUser) {
        alert("Please log in to comment");
        return;
    }
    
    console.log("Commenting on post:", postId);
    
    // TODO: Implement comment functionality
    // Options:
    // 1. Show a comment input below the post
    // 2. Navigate to a comments page
    // 3. Open a modal/popup for comments
}

// Handle when a user clicks the share button
// postId: Which post to share
// text: The post text to include in the share
function handleShare(postId, text) {
    // Check if the browser supports the Web Share API
    // This API is available on most mobile devices and some desktop browsers
    if (navigator.share) {
        // Use the native share dialog
        navigator.share({
            title: 'Check out this post on JOYIN',  // Share title
            // text: text || 'Interesting post',       // Text to share
            // url: `${window.location.origin}/post/?id=${postId}`  // Link to post
            url: `./more/?tab=shared_post&id=${postId}`
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        // Create the full URL to this post
        const link = `${window.location.origin}/post/?id=${postId}`;
        
        // Copy the link to the clipboard
        navigator.clipboard.writeText(link).then(() => {
            // Show success message to user
            alert('Post link copied to clipboard!');
        });
    }
}

// Handle when a user clicks on a post image
// postId: Which post's image was clicked
function viewPostImage(postId) {
    // TODO: Implement image viewing functionality
    console.log("Viewing image for post:", postId);
    
    // Options for implementation:
    // 1. Open image in a lightbox/modal
    // 2. Navigate to full-screen image viewer
    // 3. Open image in new tab
    
    // For now, navigate to an image viewer page
    // window.location.href = `../image-viewer/?postId=${postId}`;
}

// Display an error message when posts fail to load
// message: The error message to show
function showErrorMessage(message) {
    // Replace the posts container content with error message
    postsContainer.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        </div>
    `;
}

// =================================================================
// SECTION 8: INITIALIZATION COMPLETE
// =================================================================

// Log a message to confirm the code loaded successfully
console.log("✅ Home feed system loaded!");













//LOG OUT
// Import at the TOP of your file (outside event listener)


// Get the logout button
const logoutBtns = document.getElementById("logout");

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











//LOG OUT
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






// async function handleLike(postId) {
//     if (!currentUser) {
//         window.location.href = "../login/?view=login";
//         return;
//     }
    
//     try {
//         const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
//         const likeSnap = await getDoc(likeRef);
        
//         if (likeSnap.exists()) {
//             // Unlike
//             await deleteDoc(likeRef);
//             await updateDoc(doc(db, "posts", postId), {
//                 likeCount: increment(-1)
//             });
//         } else {
//             // Like
//             await setDoc(likeRef, {
//                 userId: currentUser.uid,
//                 likedAt: new Date()
//             });
//             await updateDoc(doc(db, "posts", postId), {
//                 likeCount: increment(1)
//             });
//         }
//     } catch (error) {
//         console.error("Error toggling like:", error);
//     }
// }