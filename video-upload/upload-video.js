/* 
 * JOYIN VIDEO UPLOAD - JAVASCRIPT
 * Handle video selection, validation, and upload to Firebase
 * (c) 2025 JOYIN
 */

import { auth, db, storage } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// ============================================
// GLOBAL VARIABLES
// ============================================

let currentUser = null;                  // Current logged-in user
let selectedVideoFile = null;            // Selected video file object
let videoMetadata = {                    // Store video info
    duration: 0,
    size: 0,
    name: ''
};

// Video constraints
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100 MB in bytes
const MIN_DURATION = 5;                    // 5 seconds minimum
const MAX_DURATION = 40;                    // 40 seconds maximum

// DOM elements
const cancelBtn = document.getElementById('cancelBtn');
const postBtn = document.getElementById('postBtn');
const selectVideoBtn = document.getElementById('selectVideoBtn');
const changeVideoBtn = document.getElementById('changeVideoBtn');
const videoFileInput = document.getElementById('videoFileInput');
const captionInput = document.getElementById('captionInput');
const charCount = document.getElementById('charCount');
const uploadPrompt = document.getElementById('uploadPrompt');
const videoPreviewContainer = document.getElementById('videoPreviewContainer');
const videoPreview = document.getElementById('videoPreview');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressStatus = document.getElementById('progressStatus');
const videoFileName = document.getElementById('videoFileName');
const videoDuration = document.getElementById('videoDuration');
const videoSize = document.getElementById('videoSize');

// ============================================
// AUTHENTICATION CHECK
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("✅ User authenticated:", user.uid);
        currentUser = user;
        
    } else {
        console.log("❌ No user logged in, redirecting...");
        window.location.href = "../login/?view=login";
    }
});

// ============================================
// BUTTON EVENT LISTENERS
// ============================================

// Cancel button - go back
cancelBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? Your video will not be uploaded.')) {
        window.history.back();
    }
});

// Select video button - trigger file input
selectVideoBtn.addEventListener('click', () => {
    videoFileInput.click();
});

// Change video button - select different video
changeVideoBtn.addEventListener('click', () => {
    videoFileInput.click();
});

// Post button - upload video
postBtn.addEventListener('click', () => {
    handleVideoUpload();
});

// ============================================
// FILE INPUT CHANGE EVENT
// ============================================
// Triggered when user selects a video file

videoFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    
    // Check if file was selected
    if (!file) {
        console.log("⚠️ No file selected");
        return;
    }
    
    console.log("📁 File selected:", file.name);
    
    // STEP 1: Validate file type
    if (!validateFileType(file)) {
        showError("Invalid file type. Please select an MP4, MOV, or WebM video.");
        videoFileInput.value = ''; // Clear input
        return;
    }
    
    // STEP 2: Validate file size
    if (!validateFileSize(file)) {
        showError(`Video file is too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024)} MB.`);
        videoFileInput.value = '';
        return;
    }
    
    // STEP 3: Load and validate video duration
    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) {
        showError(`Video duration must be between ${MIN_DURATION} and ${MAX_DURATION} seconds.`);
        videoFileInput.value = '';
        return;
    }
    
    // STEP 4: All validations passed - show preview
    selectedVideoFile = file;
    displayVideoPreview(file);
    
    // Enable post button
    postBtn.disabled = false;
    
    console.log("✅ Video validated successfully");
});

// ============================================
// CAPTION CHARACTER COUNTER
// ============================================

captionInput.addEventListener('input', () => {
    const length = captionInput.value.length;
    charCount.textContent = length;
    
    // Change color when approaching limit
    if (length > 450) {
        charCount.style.color = '#ff6b6b';
    } else {
        charCount.style.color = '#5b53f2';
    }
});

// ============================================
// VALIDATION FUNCTIONS
// ============================================

// Validate file type (MP4, MOV, WebM)
function validateFileType(file) {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const isValid = allowedTypes.includes(file.type);
    
    console.log(`📋 File type validation: ${isValid ? '✅ PASS' : '❌ FAIL'} (${file.type})`);
    return isValid;
}

// Validate file size (max 100MB)
function validateFileSize(file) {
    const isValid = file.size <= MAX_VIDEO_SIZE;
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📏 File size validation: ${isValid ? '✅ PASS' : '❌ FAIL'} (${sizeMB} MB)`);
    return isValid;
}

// Validate video duration (15-30 seconds)
function validateVideoDuration(file) {
    return new Promise((resolve) => {
        // Create temporary video element to get duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        // When metadata is loaded, we can access duration
        video.onloadedmetadata = function() {
            // Release memory
            window.URL.revokeObjectURL(video.src);
            
            const duration = Math.floor(video.duration);
            videoMetadata.duration = duration;
            
            const isValid = duration >= MIN_DURATION && duration <= MAX_DURATION;
            
            console.log(`⏱️ Duration validation: ${isValid ? '✅ PASS' : '❌ FAIL'} (${duration} seconds)`);
            
            resolve(isValid);
        };
        
        // Handle error loading video
        video.onerror = function() {
            console.error("❌ Error loading video metadata");
            resolve(false);
        };
        
        // Create URL for video file and set as source
        video.src = URL.createObjectURL(file);
    });
}

// ============================================
// DISPLAY VIDEO PREVIEW
// ============================================

function displayVideoPreview(file) {
    // Store video metadata
    videoMetadata.size = file.size;
    videoMetadata.name = file.name;
    
    // Create URL for video preview
    const videoURL = URL.createObjectURL(file);
    videoPreview.src = videoURL;
    
    // Update video info display
    videoFileName.textContent = `📁 ${file.name}`;
    videoDuration.textContent = `⏱️ Duration: ${videoMetadata.duration} seconds`;
    videoSize.textContent = `📦 Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    
    // Hide upload prompt, show preview
    uploadPrompt.style.display = 'none';
    videoPreviewContainer.style.display = 'block';
    
    console.log("👁️ Video preview displayed");
}

// ============================================
// HANDLE VIDEO UPLOAD
// ============================================
// Main upload function - uploads video to Firebase Storage and creates Firestore document

async function handleVideoUpload() {
    // Validate that video is selected
    if (!selectedVideoFile) {
        showError("Please select a video first");
        return;
    }
    
    // Validate user is authenticated
    if (!currentUser) {
        showError("You must be logged in to upload");
        return;
    }
    
    try {
        console.log("🚀 Starting video upload...");
        
        // Disable post button during upload
        postBtn.disabled = true;
        cancelBtn.disabled = true;
        
        // Hide preview, show progress
        videoPreviewContainer.style.display = 'none';
        uploadProgress.style.display = 'block';
        
        // STEP 1: Get user data from Firestore
        updateProgressStatus("Loading user data...");
        const userData = await getUserData(currentUser.uid);
        
        // STEP 2: Upload video to Firebase Storage
        updateProgressStatus("Uploading video...");
        const videoURL = await uploadVideoToStorage(selectedVideoFile);
        
        // STEP 3: Create Firestore document
        updateProgressStatus("Creating post...");
        await createVideoPost(videoURL, userData);
        
        // STEP 4: Upload complete - redirect to video feed
        updateProgressStatus("Success! Redirecting...");
        progressText.textContent = "Upload Complete! 🎉";
        
        setTimeout(() => {
            window.location.href = '../home/video/';
        }, 2000);
        
        console.log("✅ Video upload complete!");
        
    } catch (error) {
        console.error("❌ Upload error:", error);
        
        // Show error message
        showError(`Upload failed: ${error.message}`);
        
        // Re-enable buttons
        postBtn.disabled = false;
        cancelBtn.disabled = false;
        
        // Hide progress, show preview again
        uploadProgress.style.display = 'none';
        videoPreviewContainer.style.display = 'block';
    }
}

// ============================================
// GET USER DATA
// ============================================
// Fetch user profile from Firestore

async function getUserData(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            throw new Error("User profile not found");
        }
        
        return userSnap.data();
        
    } catch (error) {
        console.error("❌ Error getting user data:", error);
        throw new Error("Failed to load user profile");
    }
}

// ============================================
// UPLOAD VIDEO TO STORAGE
// ============================================
// Upload video file to Firebase Storage with progress tracking

function uploadVideoToStorage(file) {
    return new Promise((resolve, reject) => {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            
            // Create storage reference
            // Path: video-posts/{userId}/{filename}
            const storageRef = ref(storage, `video-posts/${currentUser.uid}/${fileName}`);
            
            console.log(`📤 Uploading to: video-posts/${currentUser.uid}/${fileName}`);
            
            // Start upload with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            // Monitor upload progress
            uploadTask.on(
                'state_changed',
                // Progress callback - called multiple times during upload
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    
                    console.log(`📊 Upload progress: ${progress.toFixed(1)}%`);
                    
                    // Update progress bar and text
                    progressBar.style.width = progress + '%';
                    progressText.textContent = `Uploading... ${Math.round(progress)}%`;
                    
                    // Update status based on progress
                    if (progress < 50) {
                        updateProgressStatus("Uploading video...");
                    } else if (progress < 90) {
                        updateProgressStatus("Almost there...");
                    } else {
                        updateProgressStatus("Finalizing upload...");
                    }
                },
                
                // Error callback
                (error) => {
                    console.error("❌ Upload error:", error);
                    
                    // Handle specific error codes
                    let errorMessage = "Upload failed";
                    
                    if (error.code === 'storage/unauthorized') {
                        errorMessage = "You don't have permission to upload";
                    } else if (error.code === 'storage/canceled') {
                        errorMessage = "Upload was canceled";
                    } else if (error.code === 'storage/quota-exceeded') {
                        errorMessage = "Storage quota exceeded";
                    }
                    
                    reject(new Error(errorMessage));
                },
                
                // Success callback - upload complete
                async () => {
                    try {
                        console.log("✅ Upload to Storage complete!");
                        
                        // Get download URL
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log("🔗 Download URL obtained:", downloadURL);
                        
                        resolve(downloadURL);
                        
                    } catch (error) {
                        console.error("❌ Error getting download URL:", error);
                        reject(new Error("Failed to get video URL"));
                    }
                }
            );
            
        } catch (error) {
            console.error("❌ Error starting upload:", error);
            reject(new Error("Failed to start upload"));
        }
    });
}

// ============================================
// CREATE VIDEO POST
// ============================================
// Create Firestore document for the video post

async function createVideoPost(videoURL, userData) {
    try {
        // Get caption text
        const captionText = captionInput.value.trim();
        
        // Generate random index for Discovery Feed
        const randomIndex = generateRandomIndex();
        
        console.log(`🎲 Generated random_index: ${randomIndex.toFixed(6)}`);
        
        // Create post data object
        const postData = {
            userId: currentUser.uid,                  // Who created the post
            username: userData.username || "User",    // Display name
            userProfilePic: userData.profilePic || "", // Profile picture URL
            text: captionText,                        // Caption (empty if no caption)
            videoUrl: videoURL,                       // Firebase Storage video URL
            likeCount: 0,                             // Start with 0 likes
            commentCount: 0,                          // Start with 0 comments
            createdAt: serverTimestamp(),             // Server timestamp
            random_index: randomIndex,                // Random number (0 to 1) for discovery
            duration: videoMetadata.duration,         // Video duration in seconds
            fileSize: videoMetadata.size              // Video file size in bytes
        };
        
        console.log("📝 Creating Firestore document...");
        
        // Save to Firestore - collection: "video-posts"
        const docRef = await addDoc(collection(db, "video-posts"), postData);
        
        console.log("✅ Video post created with ID:", docRef.id);
        
    } catch (error) {
        console.error("❌ Error creating video post:", error);
        throw new Error("Failed to create post");
    }
}

// ============================================
// GENERATE RANDOM INDEX
// ============================================
// Generate random number between 0 and 1 for Discovery Feed

function generateRandomIndex() {
    // Math.random() generates a number between 0 (inclusive) and 1 (exclusive)
    // Examples: 0.123456, 0.789012, 0.456789
    return Math.random();
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

// Update progress status text
function updateProgressStatus(status) {
    progressStatus.textContent = status;
}

// Show error alert
function showError(message) {
    alert(`❌ ${message}`);
    console.error("❌", message);
}

// ============================================
// PREVENT ACCIDENTAL PAGE CLOSE
// ============================================
// Warn user if they try to leave while uploading

let isUploading = false;

// Listen for page close/reload
window.addEventListener('beforeunload', (event) => {
    if (isUploading) {
        event.preventDefault();
        event.returnValue = 'Upload in progress. Are you sure you want to leave?';
        return event.returnValue;
    }
});

// Set uploading flag when post button is clicked
postBtn.addEventListener('click', () => {
    isUploading = true;
});

console.log("✅ Video Upload system loaded!");