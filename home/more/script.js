// =================================================================
// POST DETAIL PAGE - SEE MORE / FULL POST VIEW FOR JOYIN
// =================================================================
// This page shows a single post in full detail when users click "see more"
// =================================================================

// Import Firebase tools we need
// These are like getting specific tools from Google's Firebase toolbox
import { 
  doc,           // Tool to point to ONE specific document (like one post)
  getDoc,        // Tool to READ a document one time (not real-time)
  onSnapshot     // Tool to WATCH a document for changes (real-time updates)
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Import our Firebase configuration from our setup file
// This connects us to OUR specific Firebase project
import { auth, db } from "../../firebase.js";

// =================================================================
// 1. GET THE POST ID FROM THE URL
// =================================================================
// When someone clicks "see more", the URL looks like:
// ../post-detail/?view=post&id=abc123
// We need to extract "abc123" from that URL

// Create a URL search params object - this helps us read URL parameters
const urlParams = new URLSearchParams(window.location.search);
// window.location.search gives us everything after ? in the URL

// Get the 'id' parameter from the URL
// Example: If URL is ?view=post&id=abc123, this returns "abc123"
const postId = urlParams.get('id');

// =================================================================
// 2. GET HTML ELEMENTS WE'LL WORK WITH
// =================================================================
// We're finding all the HTML elements we need to update or interact with

const loadingElement = document.getElementById('loading');
// This is the loading spinner that shows "Loading post..."

const postContentElement = document.getElementById('post-content');
// This is the empty container where we'll put the post content

const errorStateElement = document.getElementById('error-state');
// This is the error message area that shows if something goes wrong

const backButton = document.getElementById('back-button');
// We'll add this button to your HTML header - see note at bottom

// =================================================================
// 3. CREATE GLOBAL ACCESS TO OUR FUNCTIONS
// =================================================================
// When we use type="module" in our script tag, functions become private
// We need to make them available to the HTML onclick attributes

// Create a global object called Joyin to store our functions
// This makes them accessible as Joyin.goBack(), Joyin.openImageModal(), etc.
window.Joyin = {
    goBack: function() {
        // Go back to previous page
        window.history.back();
    },
    openImageModal: function(imageUrl) {
        // We'll define this function later
        // For now, just show the image
        window.open(imageUrl, '_blank');
    },
    viewUserProfile: function(userId) {
        // Navigate to user's profile
        window.location.href = `../../profile/?view=profile&uid=${userId}`;
    }
};

// =================================================================
// 4. WAIT FOR PAGE TO LOAD, THEN START
// =================================================================
// We wait for the entire page to finish loading before running our code

document.addEventListener('DOMContentLoaded', function() {
    // Log to console so we can see the page started (developers only)
    console.log("📄 Post detail page loading...");
    console.log("Looking for post ID:", postId);
    
    // Check if we actually got a post ID from the URL
    // If the URL doesn't have ?id=something, postId will be empty
    if (!postId || postId.trim() === '') {
        // No post ID was provided in the URL
        showError("No post specified. Please go back and select a post.");
        return; // Stop here, don't continue
    }
    
    // We have a valid post ID, so let's load the post
    loadPostDetail(postId);
});

// =================================================================
// 5. LOAD POST DETAIL FROM FIREBASE DATABASE
// =================================================================
// This is the main function that fetches the post data from Firebase

async function loadPostDetail(postId) {
    // async means this function will wait for Firebase responses
    
    try {
        // Try to execute this code. If anything fails, catch will handle it
        console.log("📥 Loading post details for ID:", postId);
        
        // Create a reference to the specific post document
        // Think of this like getting the exact address of a book in a library
        // doc(db, "posts", postId) means:
        // - In database 'db'
        // - In collection 'posts' 
        // - Get document with ID = postId
        const postRef = doc(db, "posts", postId);
        
        // Fetch the document from Firebase
        // getDoc() goes to Firebase, gets the data, and returns it
        // await means "wait here until the data arrives"
        const docSnap = await getDoc(postRef);
        
        // Check if the document actually exists
        // Maybe it was deleted, or the ID is wrong
        if (!docSnap.exists()) {
            console.log("❌ Post not found");
            showError("This post doesn't exist or has been deleted.");
            return; // Stop here
        }
        
        // Get the actual post data from the document
        // docSnap.data() extracts all the fields (text, image, username, etc.)
        const post = docSnap.data();
        
        // Get the document ID (should be same as postId, but just in case)
        const fullPostId = docSnap.id;
        
        console.log("✅ Post loaded successfully");
        
        // console.log("Post data:", post);
        
        // Hide the loading spinner
        loadingElement.style.display = 'none';
        
        // Show the post content area
        postContentElement.style.display = 'block';
        
        // Display the post on the page
        displayPostDetail(post, fullPostId);
        
    } catch (error) {
        // This runs only if something went wrong in the try block
        console.error("Error loading post:", error);
        showError("Failed to load post. Please check your connection and try again.");
    }
}

// =================================================================
// 6. DISPLAY THE POST ON THE PAGE
// =================================================================
// This function takes the post data and creates HTML to show it

function displayPostDetail(post, postId) {
    // First, clear any existing content (in case we're reloading)
    postContentElement.innerHTML = '';
    
    // Calculate how long ago the post was created
    // Turns "2023-12-15 14:30:00" into "2 hours ago"
    const timeAgo = getTimeAgo(post.createdAt);
    
    // Escape any HTML in user content for security
    // This prevents XSS attacks (malicious code injection)
    const safeText = escapeHtml(post.text || '');
    const safeUsername = escapeHtml(post.username || "User");
    const safeUserId = escapeHtml(post.userId || "");
    
    // Create the HTML for the post using template literals (backticks)
    // Template literals let us easily insert variables with ${variable}
    const postHTML = `
        <!-- POST HEADER - Shows user info -->
        <div class="post-header">
            <!-- User profile picture -->
            <img src="${post.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'}" 
                 alt="${safeUsername}'s profile picture"
                 class="profile-pic">
            
            <!-- User info container -->
            <div class="post-user-info">
                <!-- Username -->
                <p class="post-username"></p>
                
                <!-- Time when post was created -->
                <div class="post-status">${timeAgo}</div>
            </div>
        </div>
        
        <!-- POST TEXT CONTENT - Shows full text (not truncated like home page) -->
        <div class="post-text-content">
            
        </div>
        
        <!-- POST IMAGE - Only shown if post has an image -->
        ${post.imageUrl ? `
        <div class="post-image-container">
            <img src="${post.imageUrl}" 
                 alt="Post image" 
                 class="post-image"
                 onclick="openImageModal('${post.imageUrl}')"
                 style="cursor: pointer;">
        </div>
    ` : ''}
        
        <!-- LIKES SECTION - Shows how many likes the post has -->
        <div class="reaction-section">
            <div class="reaction-icon">
                <i class="fas fa-heart"></i>
            </div>
            <p class="reaction-count">
                ${post.likeCount || 0} 
                ${post.likeCount === 1 ? 'like' : 'likes'}
            </p>
        </div>
        
        <!-- ACTION BUTTONS - Like, Comment, Share -->
        <div class="post-actions">
            <!-- LIKE BUTTON -->
            <button class="action-button like-btn" onclick="handleLike('${postId}')">
                <i class="far fa-heart"></i>
                <span>Like</span>
            </button>
            
            <!-- COMMENT BUTTON -->
            <button class="action-button comment-btn" onclick="handleComment('${postId}')">
                <i class="far fa-comment"></i>
                <span>Comment</span>
            </button>
            
            <!-- SHARE BUTTON -->
            <button class="action-button share-btn" onclick="sharePost('${postId}', '${safeText}')">
                <i class="fas fa-share"></i>
                <span>Share</span>
            </button>
        </div>
        
        <!-- PROFILE LINK - Make entire header clickable to go to profile -->
        <script>
            // Add click handler to post header to go to user's profile
            document.querySelector('.post-header').addEventListener('click', function() {
                window.location.href = '../profile/?view=profile&uid=${safeUserId}';
            });
        </script>
    `;
    
    // Insert the HTML into the post content container
    postContentElement.innerHTML = postHTML;

    postContentElement.querySelector('.post-username').textContent =safeUsername || "User";
    postContentElement.querySelector('.post-text-content').textContent = safeText || "";
    
    // Now that HTML is added, we need to make the buttons work
    setupButtonListeners(postId, safeText, post.imageUrl || '');
}

// =================================================================
// 7. SETUP BUTTON EVENT LISTENERS
// =================================================================
// This function makes all the buttons on the post actually work

function setupButtonListeners(postId, postText, imageUrl) {
    // Get all the buttons we just created
    const likeBtn = postContentElement.querySelector('.like-btn');
    const commentBtn = postContentElement.querySelector('.comment-btn');
    const shareBtn = postContentElement.querySelector('.share-btn');
    const postImage = postContentElement.querySelector('.post-image');
    
    // Setup LIKE button
    if (likeBtn) {
        // Remove any existing onclick (from HTML) and add proper event listener
        likeBtn.onclick = null; // Clear the HTML onclick
        likeBtn.addEventListener('click', function() {
            handleLike(postId);
        });
    }
    
    // Setup COMMENT button
    if (commentBtn) {
        commentBtn.onclick = null;
        commentBtn.addEventListener('click', function() {
            handleComment(postId);
        });
    }
    
    // Setup SHARE button
    if (shareBtn) {
        shareBtn.onclick = null;
        shareBtn.addEventListener('click', function() {
            sharePost(postId, postText);
        });
    }
    
    // Setup IMAGE click (if post has image)
    if (postImage) {
        postImage.onclick = null;
        postImage.addEventListener('click', function() {
            openImageModal(imageUrl);
        });
    }
}

// =================================================================
// 8. HELPER FUNCTIONS - SMALL TOOLS WE USE
// =================================================================

// Function to convert Firebase timestamp to "time ago" format
function getTimeAgo(timestamp) {
    // If no timestamp exists, return "Just now"
    if (!timestamp) return "Just now";
    
    // Get current time
    const now = new Date();
    
    // Convert Firestore timestamp to JavaScript Date
    // Firestore timestamps have a special .toDate() method
    let postDate;
    if (timestamp.toDate) {
        postDate = timestamp.toDate(); // Firestore timestamp
    } else {
        postDate = new Date(timestamp); // Regular date string
    }
    
    // Calculate difference in seconds
    const seconds = Math.floor((now - postDate) / 1000);
    
    // Return appropriate string based on time difference
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;      // Minutes
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;   // Hours
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`; // Days
    
    // If more than a week, show the actual date
    return postDate.toLocaleDateString(); // Example: "12/15/2023"
}

// Function to escape HTML for security
function escapeHtml(text) {
    // Create a temporary div element
    const div = document.createElement('div');
    
    // Set the text as plain text (not HTML)
    // This automatically escapes any HTML tags
    div.textContent = text;
    
    // Get the HTML back (now safely escaped)
    return div.innerHTML;
    
    // Example: 
    // Input: "<script>alert('hack')</script>"
    // Output: "&lt;script&gt;alert('hack')&lt;/script&gt;"
    // Browser shows it as text, doesn't execute it
}

// Function to show error messages
function showError(message) {
    // Hide the loading spinner
    loadingElement.style.display = 'none';
    
    // Show the error state container
    errorStateElement.style.display = 'block';
    
    // Update the error message text if we have a message element
    const errorMessage = errorStateElement.querySelector('p');
    if (errorMessage && message) {
        errorMessage.textContent = message;
    }
    
    // Also update the button to use our global Joyin.goBack function
    const errorButton = errorStateElement.querySelector('button');
    if (errorButton) {
        errorButton.onclick = Joyin.goBack;
    }
}

// =================================================================
// 9. POST INTERACTION FUNCTIONS - WHAT HAPPENS WHEN BUTTONS ARE CLICKED
// =================================================================

// Handle LIKE button click
async function handleLike(postId) {
    console.log("User wants to like post:", postId);
    
    // Check if user is logged in
    if (!auth.currentUser) {
        alert("Please log in to like posts");
        return;
    }
    
    // TODO: You need to implement actual like functionality here
    // Steps you'll need to add:
    // 1. Check if user already liked this post
    // 2. Add/remove like in Firestore database
    // 3. Update the like count on the screen
    
    // For now, just show a message
    alert("Like functionality coming soon! Post ID: " + postId);
    
    // Example of what you might do later:
    /*
    try {
        // Reference to the likes subcollection for this post
        const likeRef = doc(db, "posts", postId, "likes", auth.currentUser.uid);
        
        // Check if user already liked
        const likeDoc = await getDoc(likeRef);
        
        if (likeDoc.exists()) {
            // User already liked - unlike it
            await deleteDoc(likeRef);
            console.log("Post unliked");
        } else {
            // User hasn't liked - like it
            await setDoc(likeRef, {
                userId: auth.currentUser.uid,
                likedAt: serverTimestamp()
            });
            console.log("Post liked");
        }
    } catch (error) {
        console.error("Error liking post:", error);
    }
    */
}

// Handle COMMENT button click
function handleComment(postId) {
    console.log("User wants to comment on post:", postId);
    
    // Check if user is logged in
    if (!auth.currentUser) {
        alert("Please log in to comment");
        return;
    }
    
    // TODO: Implement comment functionality
    // Options for implementation:
    // 1. Show a comment input form below the post
    // 2. Navigate to a comments page
    // 3. Open a comment modal/popup
    
    // For now, just show a message
    alert("Comment functionality coming soon!");
    
    // Example of what you might do:
    /*
    // Create comment input area
    const commentHTML = `
        <div class="comment-input-area">
            <textarea id="comment-text" placeholder="Write a comment..."></textarea>
            <button onclick="submitComment('${postId}')">Post Comment</button>
        </div>
    `;
    // Add it to the page
    */
}

// Handle SHARE button click
function sharePost(postId, text) {
    console.log("Sharing post:", postId);
    
    // Create the URL to share (current page URL)
    const shareUrl = window.location.href;
    
    // Check if browser supports the Web Share API (modern browsers/mobile)
    if (navigator.share) {
        // Use native share dialog (looks best on phones)
        navigator.share({
            title: 'Check out this post on JOYIN',
            // text: text || 'Interesting post on JOYIN',
            url: shareUrl
        }).then(() => {
            console.log("Post shared successfully");
        }).catch(error => {
            console.log("Sharing cancelled or failed:", error);
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        // Copy the link to clipboard
        
        // Create a temporary textarea to copy from
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        
        // Try to copy to clipboard
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert('Post link copied to clipboard!');
            } else {
                alert('Failed to copy link. Please copy it manually:\n' + shareUrl);
            }
        } catch (err) {
            alert('Failed to copy link. Please copy it manually:\n' + shareUrl);
        }
        
        // Clean up
        document.body.removeChild(textArea);
    }
}

// Open image in modal/lightbox
// =================================================================
// IMAGE MODAL FUNCTIONS
// =================================================================

// Open image in modal
function openImageModal(imageUrl) {
    console.log("Opening image modal:", imageUrl);
    
    if (!imageUrl || imageUrl.trim() === '') {
        console.log("No image to open");
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-modal');
    
    if (!modal) {
        // Create modal HTML
        modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <button class="close-modal" id="modal-close-btn">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-content">
                <img src="${imageUrl}" alt="Full size post image" class="modal-image">
            </div>
        `;
        
        // Add modal to page
        document.body.appendChild(modal);
        
        // Add click event to close button
        const closeBtn = document.getElementById('modal-close-btn');
        closeBtn.addEventListener('click', closeImageModal);
        
        // Close when clicking outside image
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeImageModal();
            }
        });
        
        // Close with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeImageModal();
            }
        });
        
    } else {
        // Update image if modal already exists
        modal.querySelector('.modal-image').src = imageUrl;
    }
    
    // Show the modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

// Close image modal
function closeImageModal() {
    console.log("Closing image modal");
    
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
        
        // Optional: Remove modal from DOM after animation
        setTimeout(() => {
            if (modal && !modal.classList.contains('active')) {
                document.body.removeChild(modal);
            }
        }, 300); // Wait for CSS transition
    }
}

// =================================================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// =================================================================
// This is CRITICAL for onclick attributes to work
window.closeImageModal = closeImageModal;
window.openImageModal = openImageModal;
window.goBack = function() {
    window.history.back();
};
// =================================================================
// 10. INITIALIZATION COMPLETE
// =================================================================

console.log("✅ Post detail system loaded and ready!");










// // SIMPLE VERSION - Add this to your script
// window.openImageModal = function(imageUrl) {
//     // Just open in new tab for now
//     window.open(imageUrl, '_blank');
// };

// window.closeImageModal = function() {
//     // Simple close function
//     const modal = document.getElementById('image-modal');
//     if (modal) {
//         modal.style.display = 'none';
//     }
// };

// window.goBack = function() {
//     window.history.back();
// };