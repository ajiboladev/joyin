/* 
 * JOYIN VIDEO FEED - JAVASCRIPT
 * TikTok-style video feed with Firebase integration
 * (c) 2025 JOYIN
 */

import { doc, getDoc, collection, orderBy, query, where, getDocs, limit, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ============================================
// GLOBAL VARIABLES
// ============================================

let currentUser = null;                      // Current logged-in user
let currentVideoIndex = 0;                   // Which video is currently visible
let allVideos = [];                          // Array of all loaded video posts
let videoElements = [];                      // Array of actual video DOM elements

// Video loading configuration
const VIDEOS_PER_BATCH = 5;                  // Load 5 videos at a time
let totalVideosInDB = 0;                     // Total videos with random_index in database
let totalVideosLoaded = 0;                   // How many videos we've loaded
let loadedVideoIds = new Set();              // Track loaded video IDs (prevent duplicates)
let isLoadingVideos = false;                 // Prevent simultaneous loading
let hasMoreVideos = true;                    // Are there more videos to load?

// DOM elements
const videoFeedContainer = document.getElementById('videoFeedContainer');
const loadingScreen = document.getElementById('loadingScreen');
const backBtn = document.getElementById('backBtn');
const uploadBtn = document.getElementById('uploadBtn');

// ============================================
// AUTHENTICATION CHECK
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("✅ User authenticated:", user.uid);
        currentUser = user;
        
        // Start loading videos
        await initializeVideoFeed();
        
    } else {
        console.log("❌ No user logged in, redirecting...");
        window.location.href = "../../login/?view=login";
    }
});

// ============================================
// INITIALIZE VIDEO FEED
// ============================================

async function initializeVideoFeed() {
    try {
        console.log("🎬 Initializing video feed...");
        
        // Show loading screen
        showLoading();
        
        // Get total video count from database
        totalVideosInDB = await getTotalVideosCount();
        console.log(`📊 Total videos in database: ${totalVideosInDB}`);
        
        // Check if any videos exist
        if (totalVideosInDB === 0) {
            hideLoading();
            showNoVideosMessage();
            return;
        }
        
        // Load first batch of videos
        await loadInitialVideos();
        
        // Hide loading screen
        hideLoading();
        
        // Set up scroll detection for infinite scroll
        setupScrollDetection();
        
        // Set up intersection observer to play/pause videos
        setupVideoObserver();
        
    } catch (error) {
        console.error("❌ Error initializing video feed:", error);
        hideLoading();
        showErrorMessage("Failed to load videos. Please refresh the page.");
    }
}

// ============================================
// GET TOTAL VIDEOS COUNT
// ============================================
// Count how many videos exist in database (only with random_index)

async function getTotalVideosCount() {
    try {
        // Query: Count all video-posts with random_index field
        const videosQuery = query(
            collection(db, "video-posts"),
            where("random_index", ">=", 0)  // Only videos with random_index
        );
        
        // Get count (efficient - doesn't download all videos)
        const snapshot = await getCountFromServer(videosQuery);
        const count = snapshot.data().count;
        
        return count;
        
    } catch (error) {
        console.error("❌ Error getting video count:", error);
        return 0;
    }
}

// ============================================
// LOAD INITIAL VIDEOS
// ============================================

async function loadInitialVideos() {
    try {
        console.log("📥 Loading initial videos...");
        
        // Reset state
        isLoadingVideos = true;
        totalVideosLoaded = 0;
        loadedVideoIds.clear();
        allVideos = [];
        videoElements = [];
        videoFeedContainer.innerHTML = '';
        
        // Fetch first batch of videos
        const videos = await fetchVideos(VIDEOS_PER_BATCH);
        
        if (videos.length === 0) {
            showNoVideosMessage();
            isLoadingVideos = false;
            return;
        }
        
        // Display videos
        displayVideos(videos);
        
        // Check if more videos exist
        if (totalVideosLoaded >= totalVideosInDB) {
            hasMoreVideos = false;
            console.log("✅ All videos loaded");
        }
        
        isLoadingVideos = false;
        
    } catch (error) {
        console.error("❌ Error loading initial videos:", error);
        isLoadingVideos = false;
        throw error;
    }
}

// ============================================
// FETCH VIDEOS (Random + Fallback Strategy)
// ============================================
// Same logic as Discovery Feed - random_index based

async function fetchVideos(batchSize) {
    // Generate random starting point (0.0 to 1.0)
    const randomStart = Math.random();
    console.log(`🎲 Generated random start: ${randomStart.toFixed(4)}`);
    
    try {
        // Try to fetch videos with random_index >= generated number
        const randomQuery = query(
            collection(db, "video-posts"),
            where("random_index", ">=", randomStart),
            orderBy("random_index"),
            orderBy("createdAt", "desc"),  // Newer videos first
            limit(batchSize)
        );
        
        const randomSnapshot = await getDocs(randomQuery);
        let fetchedVideos = randomSnapshot.docs;
        
        console.log(`✅ Random query (>= ${randomStart.toFixed(4)}) returned ${fetchedVideos.length} videos`);
        
        // If not enough videos, fallback to random_index >= 0
        if (fetchedVideos.length < batchSize) {
            console.log(`⚠️ Only got ${fetchedVideos.length}/${batchSize} videos from random query`);
            console.log(`🔄 Using fallback query from random_index >= 0...`);
            
            const fallbackQuery = query(
                collection(db, "video-posts"),
                where("random_index", ">=", 0),
                orderBy("random_index"),
                orderBy("createdAt", "desc"),
                limit(batchSize)
            );
            
            const fallbackSnapshot = await getDocs(fallbackQuery);
            fetchedVideos = fallbackSnapshot.docs;
            
            console.log(`✅ Fallback query returned ${fetchedVideos.length} videos`);
        }
        
        // Filter out already loaded videos (prevent duplicates)
        const newVideos = fetchedVideos.filter(doc => !loadedVideoIds.has(doc.id));
        
        console.log(`📊 After filtering duplicates: ${newVideos.length} new videos`);
        
        return newVideos;
        
    } catch (error) {
        console.error("❌ Error fetching videos:", error);
        return [];
    }
}

// ============================================
// DISPLAY VIDEOS
// ============================================
// Create video elements and add to page

function displayVideos(videoDocs) {
    videoDocs.forEach((doc) => {
        const videoData = doc.data();
        const videoId = doc.id;
        
        // Skip if already loaded
        if (loadedVideoIds.has(videoId)) {
            console.log("⏭️ Skipping duplicate video:", videoId);
            return;
        }
        
        // Mark as loaded
        loadedVideoIds.add(videoId);
        totalVideosLoaded++;
        
        console.log(`📹 Displaying video ${videoId} (${totalVideosLoaded}/${totalVideosInDB})`);
        
        // Store video data
        allVideos.push({ id: videoId, data: videoData });
        
        // Create video element
        const videoElement = createVideoElement(videoData, videoId);
        videoFeedContainer.appendChild(videoElement);
        
        // Store video DOM element
        const videoPlayer = videoElement.querySelector('.video-player');
        videoElements.push(videoPlayer);
    });
}

// ============================================
// CREATE VIDEO ELEMENT
// ============================================
// Build HTML structure for a single video post

function createVideoElement(videoData, videoId) {
    // Create container
    const videoPost = document.createElement('div');
    videoPost.className = 'video-post';
    videoPost.dataset.videoId = videoId;
    videoPost.dataset.videoIndex = videoElements.length;
    
    // Build HTML structure
    videoPost.innerHTML = `
        <!-- VIDEO PLAYER -->
        <video 
            class="video-player" 
            src="${videoData.videoUrl}" 
            loop
            playsinline
            preload="metadata"
        ></video>
        
        <!-- PLAY/PAUSE OVERLAY (appears when tapping) -->
        <div class="play-pause-overlay">
            <i class="fas fa-play"></i>
        </div>
        
        <!-- VIDEO INFO (Bottom Left) -->
        <div class="video-info">
            <!-- User Profile -->
            <div class="video-user" onclick="window.location.href='../../video-profile/?view=video-profile&uid=${videoData.userId}'">
                <img 
                    src="${videoData.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'}" 
                    alt="User avatar" 
                    class="video-user-avatar"
                >
                <span class="video-username">@${videoData.username || 'User'}</span>
            </div>
            
            <!-- Caption/Text (if exists) -->
            ${videoData.text ? `<p class="video-caption">${escapeHtml(videoData.text)}</p>` : ''}
        </div>
        
        <!-- ACTION BUTTONS (Right Side) -->
        <div class="video-actions">
            <!-- Like Button -->
            <button class="action-btn like-btn" data-video-id="${videoId}">
                <i class="fas fa-heart"></i>
                <span class="action-count">${formatCount(videoData.likeCount || 0)}</span>
            </button>
            
            <!-- Comment Button -->
            <button class="action-btn comment-btn" data-video-id="${videoId}">
                <i class="fas fa-comment"></i>
                <span class="action-count">${formatCount(videoData.commentCount || 0)}</span>
            </button>
            
            <!-- Share Button -->
            <button class="action-btn share-btn" data-video-id="${videoId}">
                <i class="fas fa-share"></i>
                <span class="action-count">Share</span>
            </button>
        </div>
    `;
    
    // Set up video interactions
    setupVideoInteractions(videoPost, videoData, videoId);
    
    return videoPost;
}

// ============================================
// SETUP VIDEO INTERACTIONS
// ============================================
// Handle taps, likes, comments, etc.

function setupVideoInteractions(videoPost, videoData, videoId) {
    const videoPlayer = videoPost.querySelector('.video-player');
    const playPauseOverlay = videoPost.querySelector('.play-pause-overlay');
    const likeBtn = videoPost.querySelector('.like-btn');
    const commentBtn = videoPost.querySelector('.comment-btn');
    const shareBtn = videoPost.querySelector('.share-btn');
    
    // TAP TO PLAY/PAUSE
    let tapTimeout;
    videoPlayer.addEventListener('click', () => {
        clearTimeout(tapTimeout);
        
        if (videoPlayer.paused) {
            videoPlayer.play();
            playPauseOverlay.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            videoPlayer.pause();
            playPauseOverlay.innerHTML = '<i class="fas fa-pause"></i>';
        }
        
        // Show overlay briefly
        playPauseOverlay.classList.add('show');
        tapTimeout = setTimeout(() => {
            playPauseOverlay.classList.remove('show');
        }, 500);
    });
    
    // LIKE BUTTON
    likeBtn.addEventListener('click', () => {
        // Toggle liked state
        likeBtn.classList.toggle('liked');
        
        // TODO: Update like count in Firebase
        alert('Like functionality coming soon!');
    });
    
    // COMMENT BUTTON
    commentBtn.addEventListener('click', () => {
        // TODO: Open comments modal
        alert('Comment functionality coming soon!');
    });
    
    // SHARE BUTTON
    shareBtn.addEventListener('click', () => {
        handleShare(videoId, videoData.text);
    });
}

// ============================================
// SETUP VIDEO OBSERVER
// ============================================
// Automatically play/pause videos as user scrolls

function setupVideoObserver() {
    // Intersection Observer - detects which video is in view
    const observerOptions = {
        root: null,
        threshold: 0.5  // Video must be 50% visible
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            
            if (entry.isIntersecting) {
                // Video is in view - play it
                video.play().catch(err => {
                    console.log("⚠️ Autoplay prevented:", err);
                });
                
                // Update current video index
                const videoPost = video.closest('.video-post');
                currentVideoIndex = parseInt(videoPost.dataset.videoIndex);
                
                console.log(`▶️ Playing video ${currentVideoIndex + 1}/${videoElements.length}`);
                
            } else {
                // Video is out of view - pause it
                video.pause();
            }
        });
    }, observerOptions);
    
    // Observe all video elements
    videoElements.forEach(video => {
        observer.observe(video);
    });
}

// ============================================
// SETUP SCROLL DETECTION
// ============================================
// Load more videos when user scrolls near bottom

function setupScrollDetection() {
    videoFeedContainer.addEventListener('scroll', () => {
        // Skip if already loading
        if (isLoadingVideos) return;
        
        // Skip if all videos loaded
        if (totalVideosLoaded >= totalVideosInDB) return;
        
        // Calculate scroll position
        const scrollTop = videoFeedContainer.scrollTop;
        const scrollHeight = videoFeedContainer.scrollHeight;
        const clientHeight = videoFeedContainer.clientHeight;
        
        // Check if near bottom (within 2 video heights)
        const nearBottom = scrollHeight - scrollTop - clientHeight < (clientHeight * 2);
        
        if (nearBottom) {
            console.log("🎯 Near bottom - loading more videos");
            loadMoreVideos();
        }
    });
}

// ============================================
// LOAD MORE VIDEOS
// ============================================
// Infinite scroll - load next batch

async function loadMoreVideos() {
    // Prevent simultaneous loading
    if (isLoadingVideos) return;
    
    // Check if more videos exist
    if (totalVideosLoaded >= totalVideosInDB) {
        console.log("✅ All videos loaded");
        hasMoreVideos = false;
        return;
    }
    
    try {
        isLoadingVideos = true;
        console.log("📥 Loading more videos...");
        
        // Calculate remaining videos
        const remainingVideos = totalVideosInDB - totalVideosLoaded;
        const videosToFetch = Math.min(VIDEOS_PER_BATCH, remainingVideos);
        
        console.log(`📊 Remaining videos: ${remainingVideos}, will fetch: ${videosToFetch}`);
        
        // Fetch next batch
        const videos = await fetchVideos(videosToFetch);
        
        if (videos.length === 0) {
            console.log("✅ No more new videos");
            hasMoreVideos = false;
            isLoadingVideos = false;
            return;
        }
        
        // Display new videos
        displayVideos(videos);
        
        // Re-setup observer for new videos
        setupVideoObserver();
        
        // Check if all loaded
        if (totalVideosLoaded >= totalVideosInDB) {
            hasMoreVideos = false;
            console.log("✅ All videos now loaded");
        }
        
        isLoadingVideos = false;
        
    } catch (error) {
        console.error("❌ Error loading more videos:", error);
        isLoadingVideos = false;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format large numbers (1000 -> 1K, 1000000 -> 1M)
function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

// Escape HTML to prevent XSS attacks
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle share functionality
function handleShare(videoId, text) {
    const shareUrl = `${window.location.origin}/video/?id=${videoId}`;
    
    // Use native share API if available (mobile)
    if (navigator.share) {
        navigator.share({
            title: 'Check out this video on JOYIN',
            text: text || 'Watch this video!',
            url: shareUrl
        }).catch(err => console.log('Share cancelled', err));
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Video link copied to clipboard!');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('Share link: ' + shareUrl);
        });
    }
}

// Show loading screen
function showLoading() {
    loadingScreen.style.display = 'flex';
}

// Hide loading screen
function hideLoading() {
    loadingScreen.style.display = 'none';
}

// Show "no videos" message
function showNoVideosMessage() {
    videoFeedContainer.innerHTML = `
        <div class="no-videos">
            <i class="fas fa-video-slash"></i>
            <p>No videos yet</p>
            <p style="font-size: 14px; color: #666; margin-top: 10px;">
                Be the first to upload a video!
            </p>
            <button onclick="window.location.href='../../video-upload/'">
                Upload Video
            </button>
        </div>
    `;
}

// Show error message
function showErrorMessage(message) {
    videoFeedContainer.innerHTML = `
        <div class="no-videos">
            <i class="fas fa-exclamation-triangle"></i>
            <p style="color: #ff6b6b;">${message}</p>
            <button onclick="location.reload()">
                Try Again
            </button>
        </div>
    `;
}

// ============================================
// NAVIGATION BUTTONS
// ============================================

// Back button
backBtn.addEventListener('click', () => {
    window.history.back();
});

// Upload button
uploadBtn.addEventListener('click', () => {
    window.location.href = '.../../video-upload/';
});

console.log("✅ Video Feed system loaded!");