// ============================================
// SECTION 1: IMPORT FIREBASE MODULES
// ============================================
// These imports bring in specific Firebase functions we need.
// Think of them like tools from a toolbox - we only take what we need.

// Firestore tools (for database operations):
// doc - Creates a reference to a specific document (like a file in a folder)
// getDoc - Gets data from a document
// collection - Creates a reference to a collection (like a folder of files)
// addDoc - Adds a new document to a collection
// serverTimestamp - Gets the current time from Firebase server (more accurate than local time)
import { doc, getDoc, collection, addDoc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Storage tools (for file uploads):
// ref - Creates a reference to a storage location (like a file path)
// uploadBytes - Uploads a file to Firebase Storage
// getDownloadURL - Gets a public web URL for an uploaded file
import { ref, uploadBytes, getDownloadURL } 
    from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Import our Firebase configuration that we set up in firebase.js
// auth - Handles user authentication (login/logout)
// db - Reference to our Firestore database
// storage - Reference to our Firebase Storage
import { auth, db, storage } from "../firebase.js";

// Import the authentication state listener
// onAuthStateChanged - Listens for changes in login status (logs in/out)
import { onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ============================================
// SECTION 2: GET ALL HTML ELEMENTS (DOM CACHE)
// ============================================
// We get references to all HTML elements we'll work with.
// This is like bookmarking pages in a book - we can quickly go back to them.

// TEXT ELEMENTS (for post content):
const postText = document.getElementById('post-text');          // The textarea where user types
const charCount = document.getElementById('char-count');        // The number showing character count
const charCounter = document.getElementById('char-counter');    // The container for character counter

// IMAGE ELEMENTS (for image upload):
const imageInput = document.getElementById('image-input');      // Hidden file input element
const uploadBox = document.getElementById('upload-box');        // Visible upload area user clicks
const previewImage = document.getElementById('preview-image');  // Image tag for preview
const imagePreview = document.getElementById('image-preview');  // Container for image preview
const removeImageBtn = document.getElementById('remove-image'); // Button to remove uploaded image

// POST TYPE ELEMENTS (for selecting post format):
const typeTextImage = document.getElementById('type-text-image');  // "Text & Image" button
const typeTextOnly = document.getElementById('type-text-only');    // "Text Only" button
const typeImageOnly = document.getElementById('type-image-only');  // "Image Only" button
const textContainer = document.getElementById('text-container');    // Container for text area
const imageUploadArea = document.getElementById('image-upload-area'); // Container for upload area

// PREVIEW ELEMENTS (for showing live preview):
const previewText = document.getElementById('preview-text');    // Where post text appears in preview
const previewImageContainer = document.getElementById('preview-image-container'); // Where image appears in preview
const previewType = document.getElementById('preview-type');    // Label showing post type in preview
const postPreview = document.getElementById('post-preview');    // The entire preview container
const previewAvatar = document.getElementById('preview-avatar'); // User's profile picture in preview
const previewUsername = document.getElementById('preview-username'); // Username in preview

// BUTTON ELEMENTS (for user actions):
const postBtn = document.getElementById('post-btn');            // Main "Post" button
const clearBtn = document.getElementById('clear-btn');          // "Clear All" button

// STATUS ELEMENT (for showing messages to user):
const uploadStatus = document.getElementById('upload-status');  // Where we show success/error messages

// ============================================
// SECTION 3: GLOBAL VARIABLES (APP STATE)
// ============================================
// These variables track the current state of our application.
// They're like memory boxes that remember what the user is doing.

let currentPostType = 'text-image';  // Tracks which post type is selected. Default is "text-image"
let uploadedImage = null;            // Stores the actual image file object (or null if no image)
let imageUrl = '';                   // Stores a temporary URL for image preview (not the final Firebase URL)
let currentUser = null;              // Will store the logged-in user's information

// ============================================
// SECTION 4: AUTHENTICATION CHECK
// ============================================
// This runs when the page finishes loading.
// It checks if the user is logged in before allowing them to post.

document.addEventListener('DOMContentLoaded', function() {
    // Log to console for debugging
    console.log("📱 Upload page loading...");
    
    // Check authentication status
    // onAuthStateChanged listens for login/logout events
    onAuthStateChanged(auth, (user) => {
        // The callback function runs whenever auth state changes
        
        if (user) {
            // USER IS LOGGED IN
            console.log("✅ User logged in:", user.uid);
            currentUser = user;  // Store the user object for later use
            
            // Now that we know user is logged in, set up the page
            initializePage();
            
        } else {
            // NO USER LOGGED IN - REDIRECT TO LOGIN
            console.log("❌ No user logged in, redirecting to login...");
            window.location.href = "../login/?view=login";
        }
    });
});

// ============================================
// SECTION 5: INITIALIZE PAGE (AFTER AUTH SUCCESS)
// ============================================
// This function sets up everything AFTER we confirm user is logged in.
// It's called from the auth check above.

async function initializePage() {
    // try/catch handles errors gracefully
    try {
        // Step 1: Load user's data (username, profile picture) from Firestore
        await loadUserData();
        
        // Step 2: Make all buttons and inputs work (attach click handlers)
        setupEventListeners();
        
        // Step 3: Set the initial state of the Post button (enabled/disabled)
        updatePostButton();
        
        // Success log
        console.log("✅ Page initialized for user:", currentUser.uid);
        
    } catch (error) {
        // If anything goes wrong, show error in console and to user
        console.error("Error initializing page:", error);
        showStatus("Error loading page", "error");
    }
}

// ============================================
// SECTION 6: LOAD USER DATA FROM FIRESTORE
// ============================================
// Gets the logged-in user's information to display in the preview.

async function loadUserData() {
    try {
        // Safety check: make sure we have a user
        if (!currentUser) return;
        
        // Get reference to the user's document in Firestore
        // Path: "users/{userId}" - like opening a specific file
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        
        // Check if the document exists
        if (userDoc.exists()) {
            // Extract the data from the document
            const userData = userDoc.data();
            
            // Update the preview with user's information:
            
            // Set profile picture in preview (or use default if none exists)
            if (previewAvatar) {
                // userData.profilePic is the URL from Firebase Storage
                // If it doesn't exist, use a default image
                previewAvatar.src = userData.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
            }
            
            // Set username in preview (or "You" if no username)
            if (previewUsername) {
                previewUsername.textContent = userData.username || "You";
            }
            
            // Success log
            console.log("✅ User data loaded:", userData.username);
        }
        
    } catch (error) {
        // Handle errors
        console.error("Error loading user data:", error);
        showStatus("Could not load profile", "warning");
    }
}

// ============================================
// SECTION 7: SET UP EVENT LISTENERS
// ============================================
// This function connects JavaScript functions to HTML elements.
// When user interacts with HTML, these listeners trigger our functions.

function setupEventListeners() {
    // POST TYPE BUTTONS - Change between text/image/text+image
    typeTextImage.addEventListener('click', () => selectPostType('text-image'));
    typeTextOnly.addEventListener('click', () => selectPostType('text-only'));
    typeImageOnly.addEventListener('click', () => selectPostType('image-only'));
    
    // TEXT AREA - Update character count as user types
    postText.addEventListener('input', updateCharCount);
    
    // IMAGE UPLOAD - Handle image selection
    uploadBox.addEventListener('click', () => alert("Image upload are coming soon. You can still post Text for now - thank you for being an early user!"));  // Click upload box = open file picker    // imageInput.click()
    imageInput.addEventListener('change', handleImageUpload);       // When file is selected
    removeImageBtn.addEventListener('click', removeImage);          // Remove uploaded image
    
    // DRAG & DROP - Allow dragging images onto upload area
    setupDragAndDrop();
    
    // ACTION BUTTONS - Main functionality
    postBtn.addEventListener('click', createPost);  // Create and upload post
    clearBtn.addEventListener('click', clearForm);  // Clear the form
    
    // KEYBOARD SHORTCUTS - Convenience features
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ============================================
// ⭐ NEW: GENERATE RANDOM INDEX FOR DISCOVERY FEED
// ============================================
// This function generates a random number between 0 and 1
// Used for the Discovery Feed to show different posts to different users

function generateRandomIndex() {
    // Math.random() generates a number between 0 (inclusive) and 1 (exclusive)
    // Examples: 0.123456, 0.789012, 0.456789
    return Math.random();
}

// ============================================
// SECTION 8: MAIN POST CREATION FUNCTION
// ============================================
// This is the MOST IMPORTANT function - it creates and uploads the post.
// Called when user clicks the "Post" button.

async function createPost() {
    // DOUBLE-CHECK: Make sure user is still logged in
    if (!currentUser) {
        showStatus("Please log in", "error");
        window.location.href = "../login/?view=login";
        return;  // Stop here if not logged in
    }
    
    // STEP 1: Get the content user entered
    const text = postText.value.trim();  // Get text and remove extra spaces
    const imageFile = uploadedImage;     // Get the image file (if any)
    
    // STEP 2: Validate the post based on selected type
    if (!validatePost(text, imageFile)) {
        return;  // Stop if validation fails
    }
    
    // STEP 3: Show loading state (disable button, show spinner)
    postBtn.disabled = true;  // Prevent double-clicks
    const originalText = postBtn.innerHTML;  // Save original button text
    postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    // STEP 4: Try to upload the post
    try {
        // Show status message
        showStatus("Uploading post...", "info");
        
        // Get fresh user data from Firestore (in case it changed)
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const userData = userDoc.data();
        
        // Check if we got user data
        if (!userData) {
            throw new Error("User data not found");
        }
        
        // STEP 5: UPLOAD IMAGE TO STORAGE (if exists)
        let finalImageUrl = "";  // Will store the Firebase Storage URL
        if (imageFile) {
            showStatus("Uploading image...", "info");
            finalImageUrl = await uploadToStorage(imageFile);  // Upload and get URL
        }
        
        // STEP 6: SAVE POST TO FIRESTORE
        showStatus("Saving post...", "info");
        
        // Create the post data object
        // This is what gets saved to the database
        const postData = {
            userId: currentUser.uid,                  // Who created the post
            username: userData.username || "User",    // Display name
            userProfilePic: userData.profilePic || "", // Profile picture URL
            text: text,                                // Post text content
            imageUrl: finalImageUrl,                   // Image URL (empty if no image)
            postType: currentPostType,                 // Type: text-image, text-only, or image-only
            likeCount: 0,                              // Start with 0 likes
            commentCount: 0,                           // Start with 0 comments
            createdAt: serverTimestamp(),              // Timestamp from Firebase server
            random_index: generateRandomIndex()        // ⭐ NEW: Random number for Discovery Feed (0 to 1)
        };
        
        // Save to Firestore
        // collection(db, "posts") - Reference to the "posts" collection
        // addDoc() - Creates new document with auto-generated ID
        await addDoc(collection(db, "posts"), postData);
        
        
        // STEP 7: SHOW SUCCESS AND CLEAN UP
        showStatus("✅ Post uploaded successfully!", "success");
        
        // Clear the form after 1 second (let user see success message)
        setTimeout(() => {
            clearForm();
            showStatus("", "info");  // Clear status message
        }, 1000);
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
            window.location.href = "../home/?view=home&tab=post&filter=popular";
        }, 2000);
        
    } catch (error) {
        // STEP 8: HANDLE ERRORS
        console.error("Upload error:", error);
        showStatus("❌ Upload failed: " + error.message, "error");
        
        // Reset button to original state
        postBtn.disabled = false;
        postBtn.innerHTML = originalText;
    }
}

// ============================================
// SECTION 9: HELPER FUNCTIONS
// ============================================

// VALIDATE POST - Check if post has required content based on type
function validatePost(text, imageFile) {
    // Check based on current post type
    
    if (currentPostType === 'text-only' && !text) {
        // Text-only posts must have text
        showStatus("Please add some text", "warning");
        return false;  // Validation failed
    }
    
    if (currentPostType === 'image-only' && !imageFile) {
        // Image-only posts must have an image
        showStatus("Please add an image", "warning");
        return false;
    }
    
    if (currentPostType === 'text-image' && !text && !imageFile) {
        // Text+image posts need either text OR image (or both)
        showStatus("Please add text and/or an image", "warning");
        return false;
    }
    
    return true;  // Validation passed
}

// UPLOAD TO STORAGE - Upload image file to Firebase Storage
async function uploadToStorage(imageFile) {
    // Step 1: Create a unique filename
    // Date.now() gets current timestamp in milliseconds (like 1705324800000)
    // This ensures every file has a unique name (prevents overwriting)
    const timestamp = Date.now();
    
    // imageFile.name.replace(/\s+/g, '_') replaces spaces with underscores
    // Example: "my vacation.jpg" becomes "my_vacation.jpg"
    const fileName = `post_${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
    
    // Step 2: Create storage reference (like a file path)
    // Path format: posts/{userId}/{filename}
    // Example: posts/user123/post_1705324800000_my_vacation.jpg
    const storageRef = ref(storage, `posts/${currentUser.uid}/${fileName}`);
    
    // Step 3: Upload the file bytes to Firebase Storage
    await uploadBytes(storageRef, imageFile);
    
    // Step 4: Get a public URL that anyone can access
    // This URL is what we save in Firestore
    const downloadURL = await getDownloadURL(storageRef);
    
    // Step 5: Return the URL to use in the post
    return downloadURL;
}

// SHOW STATUS - Display messages to user (success, error, warning, info)
function showStatus(message, type = "info") {
    // Check if status element exists
    if (!uploadStatus) return;
    
    // Set the message text
    uploadStatus.textContent = message;
    
    // Set color based on message type
    // Using emoji icons makes it more visual
    uploadStatus.style.color = {
        'success': '#10b981',  // Green for success
        'error': '#ef4444',    // Red for errors
        'warning': '#f59e0b',  // Orange for warnings
        'info': '#5b53f2'      // Purple for info (your brand color)
    }[type];
}

// ============================================
// SECTION 10: UI FUNCTIONS
// ============================================

// SELECT POST TYPE - Switch between text/image/text+image modes
function selectPostType(type) {
    // Update global state
    currentPostType = type;
    
    // Update button appearance (make active button stand out)
    [typeTextImage, typeTextOnly, typeImageOnly].forEach(btn => {
        btn.classList.remove('active');  // Remove active class from all
    });
    
    // Add active class to selected button
    document.getElementById(`type-${type.replace('-', '-')}`).classList.add('active');
    
    // Show/hide text area based on type
    if (type === 'image-only') {
        textContainer.style.display = 'none';  // Hide text area for image-only
    } else {
        textContainer.style.display = 'block'; // Show text area for other types
    }
    
    // Show/hide image upload area
    if (type === 'text-only') {
        imageUploadArea.classList.remove('active');  // Hide for text-only
    } else {
        imageUploadArea.classList.add('active');     // Show for other types
    }
    
    // Update preview label
    previewType.textContent = {
        'text-image': 'Text & Image',
        'text-only': 'Text Only',
        'image-only': 'Image Only'
    }[type];
    
    // Update button state and preview
    updatePostButton();
    updatePreview();
}

// UPDATE CHARACTER COUNT - Track text length as user types
function updateCharCount() {
    // Get current text length
    const count = postText.value.length;
    
    // Update the counter display
    charCount.textContent = count;
    
    // Show warning when approaching limit (450/500)
    if (count > 450) {
        charCounter.classList.add('warning');      // Add warning class (turns orange)
    } else {
        charCounter.classList.remove('warning');   // Remove warning class
    }
    
    // Update button and preview
    updatePostButton();
    updatePreview();
}

// HANDLE IMAGE UPLOAD - Process when user selects an image
function handleImageUpload(event) {
    // Get the selected file (first file if multiple selected)
    const file = event.target.files[0];
    if (!file) return;  // Exit if no file
    
    // VALIDATION: Check file size (5MB max)
    // 5 * 1024 * 1024 = 5 megabytes in bytes
    if (file.size > 5 * 1024 * 1024) {
        showStatus("File is too large (max 5MB)", "error");
        return;  // Stop if file too large
    }
    
    // VALIDATION: Check file type (only images)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showStatus("Please upload JPG, PNG, GIF, or WebP", "error");
        return;  // Stop if wrong file type
    }
    
    // Store the file in global variable
    uploadedImage = file;
    
    // Create a temporary URL for preview
    // URL.createObjectURL() creates a local URL that points to the file
    // This lets us show preview without uploading to server yet
    imageUrl = URL.createObjectURL(file);
    
    // Update upload box to show file info
    uploadBox.classList.add('has-image');  // Add visual indicator
    
    // Replace upload box content with file info
    uploadBox.innerHTML = `
        <div class="upload-text" style="color: var(--accent-color);">
            <i class="fas fa-check-circle"></i> Image Selected
        </div>
        <div class="upload-subtext">${file.name}</div>
        <div class="upload-subtext">${(file.size / 1024 / 1024).toFixed(2)} MB • Click to change</div>
    `;
    
    // Show image preview
    previewImage.src = imageUrl;           // Set image source to temp URL
    imagePreview.classList.add('active');  // Make preview visible
    
    // Update UI
    updatePostButton();
    updatePreview();
}

// REMOVE IMAGE - Clear uploaded image
function removeImage() {
    // Clear global variables
    uploadedImage = null;
    imageUrl = '';
    
    // Reset upload box to original state
    uploadBox.classList.remove('has-image');
    uploadBox.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <div class="upload-text">Upload an Image</div>
        <div class="upload-subtext">Click or drag & drop • JPG, PNG, GIF up to 5MB</div>
    `;
    
    // Hide preview
    imagePreview.classList.remove('active');
    
    // Clear file input (so user can select same file again)
    imageInput.value = '';
    
    // Update UI
    updatePostButton();
    updatePreview();
}

// SETUP DRAG & DROP - Allow dragging files onto upload area
function setupDragAndDrop() {
    // When user drags file OVER upload box
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();  // Prevent default browser behavior
        
        // Visual feedback: change border color and background
        uploadBox.style.borderColor = 'var(--accent-color)';
        uploadBox.style.backgroundColor = 'rgba(91, 83, 242, 0.1)';
    });
    
    // When user drags file OUT of upload box
    uploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        
        // Reset visual styles
        uploadBox.style.borderColor = 'var(--border-color)';
        uploadBox.style.backgroundColor = '';
    });
    
    // When user DROPS file onto upload box
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();  // Prevent default browser behavior
        
        // Reset visual styles
        uploadBox.style.borderColor = 'var(--border-color)';
        uploadBox.style.backgroundColor = '';
        
        // Check if files were dropped
        if (e.dataTransfer.files.length) {
            // Get the first dropped file
            const file = e.dataTransfer.files[0];
            
            // Create a fake event object to match handleImageUpload's expectation
            const event = { target: { files: [file] } };
            
            // Call the same function as regular file selection
            handleImageUpload(event);
        }
    });
}

// UPDATE PREVIEW - Show live preview of post
function updatePreview() {
    // Get current text
    const text = postText.value.trim();
    
    // Update text preview
    if (text && currentPostType !== 'image-only') {
        // Show user's text if they typed something (and not image-only mode)
        previewText.textContent = text;
    } else if (currentPostType === 'image-only') {
        // Clear text for image-only mode
        previewText.textContent = '';
    } else {
        // Default message when no text
        previewText.textContent = 'Your post will appear here...';
    }
    
    // Update image preview
    previewImageContainer.innerHTML = '';  // Clear previous preview
    
    if (imageUrl && currentPostType !== 'text-only') {
        // Create image element for preview
        const img = document.createElement('img');
        img.src = imageUrl;                // Set source to temp URL
        img.alt = 'Post image';            // Accessibility: alt text
        img.style.width = '100%';          // Full width
        img.style.maxHeight = '300px';     // Limit height
        img.style.objectFit = 'contain';   // Fit image nicely
        img.style.borderRadius = '8px';    // Rounded corners
        
        // Add image to preview container
        previewImageContainer.appendChild(img);
    }
    
    // Show/hide entire preview based on content
    const hasText = text.length > 0;
    const hasImage = imageUrl.length > 0;
    
    // Show preview if:
    // - Has text AND not image-only mode, OR
    // - Has image AND not text-only mode
    if ((hasText && currentPostType !== 'image-only') || 
        (hasImage && currentPostType !== 'text-only')) {
        postPreview.classList.add('active');      // Show preview
    } else {
        postPreview.classList.remove('active');   // Hide preview
    }
}

// UPDATE POST BUTTON - Enable/disable Post button based on content
function updatePostButton() {
    // Check what content exists
    const text = postText.value.trim();
    const hasText = text.length > 0;
    const hasImage = uploadedImage !== null;
    
    // Determine if button should be enabled
    let isValid = false;
    
    // Rules by post type:
    switch(currentPostType) {
        case 'text-image':
            // Text+image posts need EITHER text OR image (or both)
            isValid = hasText || hasImage;
            break;
        case 'text-only':
            // Text-only posts need text
            isValid = hasText;
            break;
        case 'image-only':
            // Image-only posts need an image
            isValid = hasImage;
            break;
    }
    
    // Update button state
    postBtn.disabled = !isValid;  // Disable if not valid, enable if valid
}

// CLEAR FORM - Reset everything to initial state
function clearForm() {
    // Clear text
    postText.value = '';
    updateCharCount();  // Update character counter (shows 0)
    
    // Clear image
    removeImage();
    
    // Reset to default post type
    selectPostType('text-image');
    
    // Reset preview
    updatePreview();
}

// HANDLE KEYBOARD SHORTCUTS - Quick actions with keyboard
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Enter = Post
    // Check if Ctrl (Windows) or Cmd (Mac) is pressed AND Enter key
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        // Only trigger if Post button is enabled
        if (!postBtn.disabled) {
            createPost();
        }
    }
    
    // Escape key = Go back
    if (event.key === 'Escape') {
        window.history.back();  // Go to previous page
    }
}

// ============================================
// FINAL LOG - Confirmation that code loaded
// ============================================
console.log("✅ Upload system with Discovery Feed support loaded!");













































// upload.js - Fixed with proper authentication



// // ============================================
// // 1. IMPORT FIREBASE
// // ============================================
// import { doc, getDoc, collection, addDoc, serverTimestamp } 
//     from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
// import { ref, uploadBytes, getDownloadURL } 
//     from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
// import { auth, db, storage } from "../../firebase.js";
// import { onAuthStateChanged } 
//     from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// // ============================================
// // 2. GET ALL HTML ELEMENTS
// // ============================================
// // Text elements
// const postText = document.getElementById('post-text');
// const charCount = document.getElementById('char-count');
// const charCounter = document.getElementById('char-counter');

// // Image elements
// const imageInput = document.getElementById('image-input');
// const uploadBox = document.getElementById('upload-box');
// const previewImage = document.getElementById('preview-image');
// const imagePreview = document.getElementById('image-preview');
// const removeImageBtn = document.getElementById('remove-image');

// // Post type elements
// const typeTextImage = document.getElementById('type-text-image');
// const typeTextOnly = document.getElementById('type-text-only');
// const typeImageOnly = document.getElementById('type-image-only');
// const textContainer = document.getElementById('text-container');
// const imageUploadArea = document.getElementById('image-upload-area');

// // Preview elements
// const previewText = document.getElementById('preview-text');
// const previewImageContainer = document.getElementById('preview-image-container');
// const previewType = document.getElementById('preview-type');
// const postPreview = document.getElementById('post-preview');
// const previewAvatar = document.getElementById('preview-avatar');
// const previewUsername = document.getElementById('preview-username');

// // Button elements
// const postBtn = document.getElementById('post-btn');
// const clearBtn = document.getElementById('clear-btn');

// // Status element
// const uploadStatus = document.getElementById('upload-status');

// // ============================================
// // 3. GLOBAL VARIABLES
// // ============================================
// let currentPostType = 'text-image';
// let uploadedImage = null;
// let imageUrl = '';
// let currentUser = null;

// // ============================================
// // 4. AUTHENTICATION - Your way!
// // ============================================
// document.addEventListener('DOMContentLoaded', function() {
//     console.log("📱 Upload page loading...");
    
//     // Check authentication status
//     onAuthStateChanged(auth, (user) => {
//         if (user) {
//             console.log("✅ User logged in:", user.uid);
//             currentUser = user;
            
//             // Initialize the page now that user is logged in
//             initializePage();
//         } else {
//             console.log("❌ No user logged in, redirecting to login...");
//             window.location.href = "../login/?view=login";
//         }
//     });
// });

// // ============================================
// // 5. INITIALIZE PAGE (ONLY AFTER AUTH)
// // ============================================
// async function initializePage() {
//     try {
//         // Load user data for preview
//         await loadUserData();
        
//         // Setup event listeners
//         setupEventListeners();
        
//         // Initialize button state
//         updatePostButton();
        
//         console.log("✅ Page initialized for user:", currentUser.uid);
//     } catch (error) {
//         console.error("Error initializing page:", error);
//         showStatus("Error loading page", "error");
//     }
// }

// // ============================================
// // 6. LOAD USER DATA
// // ============================================
// async function loadUserData() {
//     try {
//         if (!currentUser) return;
        
//         const userDoc = await getDoc(doc(db, "users", currentUser.uid));
//         if (userDoc.exists()) {
//             const userData = userDoc.data();
            
//             // Set preview avatar and username
//             if (previewAvatar) {
//                 previewAvatar.src = userData.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
//             }
//             if (previewUsername) {
//                 previewUsername.textContent = userData.username || "You";
//             }
            
//             console.log("✅ User data loaded:", userData.username);
//         }
//     } catch (error) {
//         console.error("Error loading user data:", error);
//         showStatus("Could not load profile", "warning");
//     }
// }

// // ============================================
// // 7. SETUP EVENT LISTENERS
// // ============================================
// function setupEventListeners() {
//     // Post type buttons
//     typeTextImage.addEventListener('click', () => selectPostType('text-image'));
//     typeTextOnly.addEventListener('click', () => selectPostType('text-only'));
//     typeImageOnly.addEventListener('click', () => selectPostType('image-only'));
    
//     // Text area
//     postText.addEventListener('input', updateCharCount);
    
//     // Image upload
//     uploadBox.addEventListener('click', () => imageInput.click());
//     imageInput.addEventListener('change', handleImageUpload);
//     removeImageBtn.addEventListener('click', removeImage);
    
//     // Drag and drop for images
//     setupDragAndDrop();
    
//     // Action buttons
//     postBtn.addEventListener('click', createPost);
//     clearBtn.addEventListener('click', clearForm);
    
//     // Keyboard shortcuts
//     document.addEventListener('keydown', handleKeyboardShortcuts);
// }

// // ============================================
// // 8. MAIN POST CREATION FUNCTION
// // ============================================
// async function createPost() {
//     // Double-check user is logged in
//     if (!currentUser) {
//         showStatus("Please log in", "error");
//         window.location.href = "../login/?view=login";
//         return;
//     }
    
//     // Get post content
//     const text = postText.value.trim();
//     const imageFile = uploadedImage;
    
//     // Validate
//     if (!validatePost(text, imageFile)) {
//         return;
//     }
    
//     // Disable button and show loading
//     postBtn.disabled = true;
//     const originalText = postBtn.innerHTML;
//     postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
//     try {
//         showStatus("Uploading post...", "info");
        
//         // Get user data
//         const userDoc = await getDoc(doc(db, "users", currentUser.uid));
//         const userData = userDoc.data();
        
//         if (!userData) {
//             throw new Error("User data not found");
//         }
        
//         // Step 1: Upload image to Firebase Storage (if exists)
//         let finalImageUrl = "";
//         if (imageFile) {
//             showStatus("Uploading image...", "info");
//             finalImageUrl = await uploadToStorage(imageFile);
//         }
        
//         // Step 2: Save post to Firestore
//         showStatus("Saving post...", "info");
        
//         const postData = {
//             userId: currentUser.uid,
//             username: userData.username || "User",
//             userProfilePic: userData.profilePic || "",
//             text: text,
//             imageUrl: finalImageUrl,
//             postType: currentPostType,
//             likeCount: 0,
//             commentCount: 0,
//             createdAt: serverTimestamp()
//         };
        
//         await addDoc(collection(db, "posts"), postData);
        
//         // Success!
//         showStatus("✅ Post uploaded successfully!", "success");
        
//         // Clear form after 1 second
//         setTimeout(() => {
//             clearForm();
//             showStatus("", "info");
//         }, 1000);
        
//         // Redirect after 2 seconds
//         setTimeout(() => {
//             window.location.href = "../home/?view=home&tab=post&filter=popular";
//         }, 2000);
        
//     } catch (error) {
//         console.error("Upload error:", error);
//         showStatus("❌ Upload failed: " + error.message, "error");
        
//         // Re-enable button
//         postBtn.disabled = false;
//         postBtn.innerHTML = originalText;
//     }
// }

// // ============================================
// // 9. HELPER FUNCTIONS
// // ============================================
// function validatePost(text, imageFile) {
//     if (currentPostType === 'text-only' && !text) {
//         showStatus("Please add some text", "warning");
//         return false;
//     }
    
//     if (currentPostType === 'image-only' && !imageFile) {
//         showStatus("Please add an image", "warning");
//         return false;
//     }
    
//     if (currentPostType === 'text-image' && !text && !imageFile) {
//         showStatus("Please add text and/or an image", "warning");
//         return false;
//     }
    
//     return true;
// }

// async function uploadToStorage(imageFile) {
//     // Create unique filename
//     const timestamp = Date.now();
//     const fileName = `post_${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
    
//     // Upload to Firebase Storage
//     const storageRef = ref(storage, `posts/${currentUser.uid}/${fileName}`);
//     await uploadBytes(storageRef, imageFile);
    
//     // Get public URL
//     return await getDownloadURL(storageRef);
// }

// function showStatus(message, type = "info") {
//     if (!uploadStatus) return;
    
//     uploadStatus.textContent = message;
//     uploadStatus.style.color = {
//         'success': '#10b981',
//         'error': '#ef4444',
//         'warning': '#f59e0b',
//         'info': '#5b53f2'
//     }[type];
// }

// // ============================================
// // 10. OTHER FUNCTIONS (Same as before)
// // ============================================

// function selectPostType(type) {
//     currentPostType = type;
    
//     // Update active button
//     [typeTextImage, typeTextOnly, typeImageOnly].forEach(btn => {
//         btn.classList.remove('active');
//     });
    
//     document.getElementById(`type-${type.replace('-', '-')}`).classList.add('active');
    
//     // Show/hide text area
//     if (type === 'image-only') {
//         textContainer.style.display = 'none';
//     } else {
//         textContainer.style.display = 'block';
//     }
    
//     // Show/hide image upload area
//     if (type === 'text-only') {
//         imageUploadArea.classList.remove('active');
//     } else {
//         imageUploadArea.classList.add('active');
//     }
    
//     // Update preview
//     previewType.textContent = {
//         'text-image': 'Text & Image',
//         'text-only': 'Text Only',
//         'image-only': 'Image Only'
//     }[type];
    
//     updatePostButton();
//     updatePreview();
// }

// function updateCharCount() {
//     const count = postText.value.length;
//     charCount.textContent = count;
    
//     if (count > 450) {
//         charCounter.classList.add('warning');
//     } else {
//         charCounter.classList.remove('warning');
//     }
    
//     updatePostButton();
//     updatePreview();
// }

// function handleImageUpload(event) {
//     const file = event.target.files[0];
//     if (!file) return;
    
//     // Check file size (5MB max)
//     if (file.size > 5 * 1024 * 1024) {
//         showStatus("File is too large (max 5MB)", "error");
//         return;
//     }
    
//     // Check file type
//     const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
//     if (!validTypes.includes(file.type)) {
//         showStatus("Please upload JPG, PNG, GIF, or WebP", "error");
//         return;
//     }
    
//     uploadedImage = file;
    
//     // Create temporary URL for preview
//     imageUrl = URL.createObjectURL(file);
    
//     // Update upload box
//     uploadBox.classList.add('has-image');
//     uploadBox.innerHTML = `
//         <div class="upload-text" style="color: var(--accent-color);">
//             <i class="fas fa-check-circle"></i> Image Selected
//         </div>
//         <div class="upload-subtext">${file.name}</div>
//         <div class="upload-subtext">${(file.size / 1024 / 1024).toFixed(2)} MB • Click to change</div>
//     `;
    
//     // Show preview
//     previewImage.src = imageUrl;
//     imagePreview.classList.add('active');
    
//     updatePostButton();
//     updatePreview();
// }

// function removeImage() {
//     uploadedImage = null;
//     imageUrl = '';
    
//     // Reset upload box
//     uploadBox.classList.remove('has-image');
//     uploadBox.innerHTML = `
//         <div class="upload-icon">
//             <i class="fas fa-cloud-upload-alt"></i>
//         </div>
//         <div class="upload-text">Upload an Image</div>
//         <div class="upload-subtext">Click or drag & drop • JPG, PNG, GIF up to 5MB</div>
//     `;
    
//     // Hide preview
//     imagePreview.classList.remove('active');
//     imageInput.value = '';
    
//     updatePostButton();
//     updatePreview();
// }

// function setupDragAndDrop() {
//     uploadBox.addEventListener('dragover', (e) => {
//         e.preventDefault();
//         uploadBox.style.borderColor = 'var(--accent-color)';
//         uploadBox.style.backgroundColor = 'rgba(91, 83, 242, 0.1)';
//     });
    
//     uploadBox.addEventListener('dragleave', (e) => {
//         e.preventDefault();
//         uploadBox.style.borderColor = 'var(--border-color)';
//         uploadBox.style.backgroundColor = '';
//     });
    
//     uploadBox.addEventListener('drop', (e) => {
//         e.preventDefault();
//         uploadBox.style.borderColor = 'var(--border-color)';
//         uploadBox.style.backgroundColor = '';
        
//         if (e.dataTransfer.files.length) {
//             const file = e.dataTransfer.files[0];
//             const event = { target: { files: [file] } };
//             handleImageUpload(event);
//         }
//     });
// }

// function updatePreview() {
//     const text = postText.value.trim();
    
//     // Update text preview
//     if (text && currentPostType !== 'image-only') {
//         previewText.textContent = text;
//     } else if (currentPostType === 'image-only') {
//         previewText.textContent = '';
//     } else {
//         previewText.textContent = 'Your post will appear here...';
//     }
    
//     // Update image preview
//     previewImageContainer.innerHTML = '';
//     if (imageUrl && currentPostType !== 'text-only') {
//         const img = document.createElement('img');
//         img.src = imageUrl;
//         img.alt = 'Post image';
//         img.style.width = '100%';
//         img.style.maxHeight = '300px';
//         img.style.objectFit = 'contain';
//         img.style.borderRadius = '8px';
//         previewImageContainer.appendChild(img);
//     }
    
//     // Show/hide preview based on content
//     const hasText = text.length > 0;
//     const hasImage = imageUrl.length > 0;
    
//     if ((hasText && currentPostType !== 'image-only') || 
//         (hasImage && currentPostType !== 'text-only')) {
//         postPreview.classList.add('active');
//     } else {
//         postPreview.classList.remove('active');
//     }
// }

// function updatePostButton() {
//     const text = postText.value.trim();
//     const hasText = text.length > 0;
//     const hasImage = uploadedImage !== null;
    
//     let isValid = false;
    
//     switch(currentPostType) {
//         case 'text-image':
//             isValid = hasText || hasImage;
//             break;
//         case 'text-only':
//             isValid = hasText;
//             break;
//         case 'image-only':
//             isValid = hasImage;
//             break;
//     }
    
//     postBtn.disabled = !isValid;
// }

// function clearForm() {
//     // Clear text
//     postText.value = '';
//     updateCharCount();
    
//     // Clear image
//     removeImage();
    
//     // Reset to default type
//     selectPostType('text-image');
    
//     // Reset preview
//     updatePreview();
// }

// function handleKeyboardShortcuts(event) {
//     // Ctrl/Cmd + Enter to post
//     if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
//         if (!postBtn.disabled) {
//             createPost();
//         }
//     }
    
//     // Escape to go back
//     if (event.key === 'Escape') {
//         window.history.back();
//     }
// }

// console.log("✅ Upload system loaded!");












// const postBtn = document.getElementById("postBtn");
// const postText = document.getElementById("postText");
// const postImage = document.getElementById("postImage");
// const uploadStatus = document.getElementById("uploadStatus");

// postBtn.addEventListener("click", async () => {
//   const user = auth.currentUser;

//   if (!user) {
//     alert("You must be logged in");
//     return;
//   }

//   const text = postText.value.trim();
//   const imageFile = postImage.files[0];

//   if (!text && !imageFile) {
//     alert("Post cannot be empty");
//     return;
//   }

//   uploadStatus.textContent = "Uploading...";

//   try {
//     // 🔹 Get user info
//     const userSnap = await getDoc(doc(db, "users", user.uid));
//     const userData = userSnap.data();

//     // 🔹 Create post first (no image yet)
//     const postRef = await addDoc(collection(db, "posts"), {
//       userId: user.uid,
//       username: userData.username,
//       userProfilePic: userData.profilePic || "",
//       text: text || "",
//       imageUrl: "",
//       likeCount: 0,
//       createdAt: serverTimestamp()
//     });

//     // 🔹 If image exists → upload it
//     if (imageFile) {
//       const imageRef = ref(
//         storage,
//         `posts/${user.uid}/${postRef.id}.jpg`
//       );

//       await uploadBytes(imageRef, imageFile);

//       const imageUrl = await getDownloadURL(imageRef);

//       // 🔹 Update post with image URL
//       await updateDoc(postRef, {
//         imageUrl: imageUrl
//       });
//     }

//     uploadStatus.textContent = "Post uploaded successfully ✅";
//     postText.value = "";
//     postImage.value = "";

//   } catch (error) {
//     console.error(error);
//     uploadStatus.textContent = "Upload failed ❌";
//   }
// });
