/* 
 * JOYIN VIDEO PROFILE - JAVASCRIPT
 * User video profile with batch loading
 * (c) 2025 JOYIN
 */

import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, startAfter, updateDoc, increment, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ============================================
// GLOBAL VARIABLES
// ============================================

let viewerId = null;              // Current logged-in user
let profileUserId = null;         // Profile being viewed
let loadedVideos = [];            // Array of loaded video documents
let lastVideoDoc = null;          // Last video document (for pagination)
let isLoadingVideos = false;      // Loading state flag
let hasMoreVideos = true;         // Are there more videos to load?

const VIDEOS_PER_BATCH = 5;       // Load 5 videos at a time

// DOM Elements
const profileAvatar = document.getElementById('profileAvatar');
const profileUsername = document.getElementById('profileUsername');
const profileBio = document.getElementById('profileBio');
const followersCount = document.getElementById('followersCount');
const followingCount = document.getElementById('followingCount');
const likesCount = document.getElementById('LikesCount');
const videosCount = document.getElementById('videosCount');
const followBtn = document.getElementById('followBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const uploadVideoBtn = document.getElementById('uploadVideoBtn');
const uploadPromptBtn = document.getElementById('uploadPromptBtn');
const backBtn = document.getElementById('backBtn');
const menuBtn = document.getElementById('menuBtn');
const loadingState = document.getElementById('loadingState');
const videosGrid = document.getElementById('videosGrid');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const noVideosMessage = document.getElementById('noVideosMessage');
const banMessageContainer = document.getElementById('banMessageContainer');

// Modal Elements
const videoModal = document.getElementById('videoModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const modalVideo = document.getElementById('modalVideo');
const modalUserAvatar = document.getElementById('modalUserAvatar');
const modalUsername = document.getElementById('modalUsername');
const modalCaption = document.getElementById('modalCaption');
const modalLikes = document.getElementById('modalLikes');
const modalComments = document.getElementById('modalComments');

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("✅ User logged in:", user.uid);
        viewerId = user.uid;
        
        // Get profile user ID from URL or default to current user
        const params = new URLSearchParams(window.location.search);
        profileUserId = params.get("uid") || viewerId;
        
        console.log("👤 Viewer:", viewerId);
        console.log("👤 Profile:", profileUserId);
        
        // Check if viewing own profile or someone else's
        if (viewerId === profileUserId) {
            // Own profile - show edit and upload buttons
            editProfileBtn.style.display = 'flex';
            uploadVideoBtn.style.display = 'flex';
            followBtn.style.display = 'none';
        } else {
            // Someone else's profile - show follow button
            followBtn.style.display = 'flex';
            editProfileBtn.style.display = 'none';
            uploadVideoBtn.style.display = 'none';
            
            // Initialize follow system
            await initializeFollowSystem();
        }
        
        // Load profile data
        await loadUserProfile(profileUserId);
        
        // Check if user is banned
        const isBanned = await checkBanStatus(profileUserId);
        
        if (isBanned) {
            console.log("🛑 User is banned");
            return; // Stop here, don't load videos
        }
        
        // Load first batch of videos
        await loadInitialVideos();
        
    } else {
        console.log("❌ No user logged in, redirecting...");
        window.location.href = "../login/?view=login";
    }
});

// ============================================
// LOAD USER PROFILE
// ============================================
// Fetch and display user profile data

async function loadUserProfile(uid) {
    try {
        console.log("📥 Loading profile for:", uid);
        
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Update profile UI
            profileAvatar.src = data.profilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';
            profileUsername.innerHTML = `${data.username || 'User'} <i class="fa-solid fa-circle-check"></i>`;
            profileBio.textContent = data.bio || 'No bio yet';
            followersCount.textContent = data.followersCount || 0;
            followingCount.textContent = data.followingCount || 0;
            likesCount.textContent = data.likesCount || 0;
            
            // Update page title
            document.title = `${data.username || 'User'} - Videos | JOYIN`;
            
            console.log("✅ Profile loaded successfully");
            
        } else {
            console.log("❌ Profile not found");
            showError("Profile not found");
        }
        
    } catch (error) {
        console.error("❌ Error loading profile:", error);
        showError("Failed to load profile");
    }
}

// ============================================
// CHECK BAN STATUS
// ============================================
// Check if user account is banned

async function checkBanStatus(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            // Check if banned
            if (data.softBan === true || data.softBan === "true") {
                console.log("🚨 User is banned");
                showBanMessage();
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error("❌ Error checking ban status:", error);
        return false;
    }
}

// ============================================
// SHOW BAN MESSAGE
// ============================================
// Display ban info card

function showBanMessage() {
    // Hide all other elements
    loadingState.style.display = 'none';
    videosGrid.style.display = 'none';
    loadMoreBtn.style.display = 'none';
    noVideosMessage.style.display = 'none';
    
    // Show ban message
    banMessageContainer.innerHTML = `
        <div class="info-card">
            <div class="info-icon">🔒</div>
            <h2 class="info-title">Account Restricted</h2>
            <p class="info-message">
                This account has been temporarily suspended.
            </p>
        </div>
    `;
}

// ============================================
// LOAD INITIAL VIDEOS
// ============================================
// Load first batch of videos

async function loadInitialVideos() {
    try {
        console.log("📥 Loading initial videos...");
        
        // Show loading state
        showLoadingState();
        
        // Reset state
        loadedVideos = [];
        lastVideoDoc = null;
        hasMoreVideos = true;
        videosGrid.innerHTML = '';
        
        // Fetch first batch
        await loadMoreVideos();
        
    } catch (error) {
        console.error("❌ Error loading initial videos:", error);
        hideLoadingState();
        showError("Failed to load videos");
    }
}

// ============================================
// LOAD MORE VIDEOS (Batch Loading)
// ============================================
// Load next batch of videos

async function loadMoreVideos() {
    // Prevent multiple simultaneous loads
    if (isLoadingVideos) {
        console.log("⏸️ Already loading videos...");
        return;
    }
    
    // Check if more videos exist
    if (!hasMoreVideos) {
        console.log("✅ No more videos to load");
        return;
    }
    
    try {
        isLoadingVideos = true;
        console.log("📥 Loading more videos...");
        
        // Disable load more button
        if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
        
        // Build query
        let videosQuery;
        
        if (lastVideoDoc) {
            // Load next batch (after last document)
            videosQuery = query(
                collection(db, "video-posts"),
                where("userId", "==", profileUserId),
                orderBy("createdAt", "desc"),
                startAfter(lastVideoDoc),
                limit(VIDEOS_PER_BATCH)
            );
        } else {
            // Load first batch
            videosQuery = query(
                collection(db, "video-posts"),
                where("userId", "==", profileUserId),
                orderBy("createdAt", "desc"),
                limit(VIDEOS_PER_BATCH)
            );
        }
        
        // Execute query
        const snapshot = await getDocs(videosQuery);
        
        console.log(`📊 Fetched ${snapshot.docs.length} videos`);
        
        // Check if videos exist
        if (snapshot.empty && loadedVideos.length === 0) {
            // No videos at all
            hideLoadingState();
            showNoVideosMessage();
            isLoadingVideos = false;
            return;
        }
        
        if (snapshot.empty) {
            // No more videos to load
            hasMoreVideos = false;
            console.log("✅ All videos loaded");
            
            // Hide load more button
            if (loadMoreBtn) {
                loadMoreBtn.style.display = 'none';
            }
            
            isLoadingVideos = false;
            return;
        }
        
        // Store last document for next batch
        lastVideoDoc = snapshot.docs[snapshot.docs.length - 1];
        
        // Add videos to loaded array
        snapshot.docs.forEach(doc => {
            loadedVideos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Display videos
        displayVideos(snapshot.docs);
        
        // Hide loading state
        hideLoadingState();
        
        // Show videos grid
        videosGrid.style.display = 'grid';
        
        // Update videos count
        videosCount.textContent = loadedVideos.length;
        
        // Check if more videos might exist
        if (snapshot.docs.length < VIDEOS_PER_BATCH) {
            // Got less than batch size, probably no more
            hasMoreVideos = false;
            loadMoreBtn.style.display = 'none';
        } else {
            // Show load more button
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Videos';
        }
        
        isLoadingVideos = false;
        
    } catch (error) {
        console.error("❌ Error loading more videos:", error);
        
        // Re-enable load more button
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Load More Videos';
        }
        
        isLoadingVideos = false;
    }
}

// ============================================
// DISPLAY VIDEOS
// ============================================
// Render video cards to grid

function displayVideos(videoDocs) {
    videoDocs.forEach(doc => {
        const video = doc.data();
        const videoId = doc.id;
        
        // Create video card
        const videoCard = createVideoCard(video, videoId);
        videosGrid.appendChild(videoCard);
    });
    
    console.log(`📺 Displayed ${videoDocs.length} videos`);
}

// ============================================
// CREATE VIDEO CARD
// ============================================
// Build HTML for single video card

function createVideoCard(video, videoId) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.videoId = videoId;
    
    // Create video element for thumbnail
    const videoElement = document.createElement('video');
    videoElement.className = 'video-thumbnail';
    videoElement.preload = 'metadata';
    videoElement.muted = true;
    
    // Set video source
    const source = document.createElement('source');
    source.src = video.videoUrl + '#t=0.5'; // Get frame at 0.5 seconds
    source.type = 'video/mp4';
    videoElement.appendChild(source);
    
    card.appendChild(videoElement);
    
    // Add play icon overlay
    const playIcon = document.createElement('div');
    playIcon.className = 'video-play-icon';
    playIcon.innerHTML = '<i class="fas fa-play"></i>';
    card.appendChild(playIcon);
    
    // Add video info overlay
    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    
    // Add caption if exists
    if (video.text && video.text.trim() !== '') {
        const caption = document.createElement('p');
        caption.className = 'video-caption';
        caption.textContent = video.text;
        overlay.appendChild(caption);
    }
    
    // Add stats
    const stats = document.createElement('div');
    stats.className = 'video-stats';
    stats.innerHTML = `
        <span><i class="fas fa-heart"></i> ${formatCount(video.likeCount || 0)}</span>
        <span><i class="fas fa-comment"></i> ${formatCount(video.commentCount || 0)}</span>
    `;
    overlay.appendChild(stats);
    
    card.appendChild(overlay);
    
    // Add click handler to open modal
    card.addEventListener('click', () => {
        openVideoModal(video, videoId);
    });
    
    return card;
}

// ============================================
// OPEN VIDEO MODAL
// ============================================
// Show video in fullscreen modal

function openVideoModal(video, videoId) {
    // Set video source
    modalVideo.src = video.videoUrl;
    
    // Set user info
    modalUserAvatar.src = video.userProfilePic || 'https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';
    modalUsername.textContent = '@' + (video.username || 'User');
    
    // Set caption
    if (video.text && video.text.trim() !== '') {
        modalCaption.textContent = video.text;
        modalCaption.style.display = 'block';
    } else {
        modalCaption.style.display = 'none';
    }
    
    // Set stats
    modalLikes.textContent = formatCount(video.likeCount || 0);
    modalComments.textContent = formatCount(video.commentCount || 0);
    
    // Show modal
    videoModal.classList.add('active');
    
    // Play video
    modalVideo.play().catch(err => {
        console.log("⚠️ Autoplay prevented:", err);
    });
    
    console.log("👁️ Opened video modal:", videoId);
}

// ============================================
// CLOSE VIDEO MODAL
// ============================================

function closeVideoModal() {
    videoModal.classList.remove('active');
    modalVideo.pause();
    modalVideo.src = '';
}

// ============================================
// FOLLOW SYSTEM
// ============================================

async function initializeFollowSystem() {
    try {
        // Check follow status
        const isFollowing = await checkFollowStatus();
        
        // Update button
        updateFollowButton(isFollowing);
        
        // Add click handler
        followBtn.addEventListener('click', handleFollowClick);
        
    } catch (error) {
        console.error("❌ Error initializing follow system:", error);
    }
}

async function checkFollowStatus() {
    try {
        const followRef = doc(db, "users", profileUserId, "followers", viewerId);
        const snap = await getDoc(followRef);
        return snap.exists();
    } catch (error) {
        console.error("❌ Error checking follow status:", error);
        return false;
    }
}

function updateFollowButton(isFollowing) {
    if (isFollowing) {
        followBtn.textContent = 'Unfollow';
        followBtn.style.background = '#333';
    } else {
        followBtn.textContent = 'Follow';
        followBtn.style.background = '#5b53f2';
    }
}

async function handleFollowClick() {
    // Disable button
    followBtn.disabled = true;
    followBtn.textContent = '...';
    
    try {
        await toggleFollow();
    } catch (error) {
        console.error("❌ Follow error:", error);
        alert("Failed to update follow status");
    } finally {
        followBtn.disabled = false;
    }
}

async function toggleFollow() {
    const profileFollowersRef = doc(db, "users", profileUserId, "followers", viewerId);
    const viewerFollowingRef = doc(db, "users", viewerId, "following", profileUserId);
    const profileRef = doc(db, "users", profileUserId);
    const viewerRef = doc(db, "users", viewerId);
    
    // Check current status
    const alreadyFollowing = await getDoc(profileFollowersRef);
    
    if (alreadyFollowing.exists()) {
        // Unfollow
        console.log("Unfollowing...");
        
        await deleteDoc(profileFollowersRef);
        await deleteDoc(viewerFollowingRef);
        await updateDoc(profileRef, { followersCount: increment(-1) });
        await updateDoc(viewerRef, { followingCount: increment(-1) });
        
        updateFollowButton(false);
        
        // Update count on page
        const currentCount = parseInt(followersCount.textContent);
        followersCount.textContent = currentCount - 1;
        
    } else {
        // Follow
        console.log("Following...");
        
        await setDoc(profileFollowersRef, {
            followedAt: new Date().toISOString(),
            userId: viewerId
        });
        
        await setDoc(viewerFollowingRef, {
            followedAt: new Date().toISOString(),
            userId: profileUserId
        });
        
        await updateDoc(profileRef, { followersCount: increment(1) });
        await updateDoc(viewerRef, { followingCount: increment(1) });
        
        updateFollowButton(true);
        
        // Update count on page
        const currentCount = parseInt(followersCount.textContent);
        followersCount.textContent = currentCount + 1;
    }
}

// ============================================
// UI STATE FUNCTIONS
// ============================================

function showLoadingState() {
    loadingState.style.display = 'block';
    videosGrid.style.display = 'none';
    loadMoreBtn.style.display = 'none';
    noVideosMessage.style.display = 'none';
}

function hideLoadingState() {
    loadingState.style.display = 'none';
}

function showNoVideosMessage() {
    noVideosMessage.style.display = 'block';
    videosGrid.style.display = 'none';
    loadMoreBtn.style.display = 'none';
    
    // Show upload button if viewing own profile
    if (viewerId === profileUserId) {
        uploadPromptBtn.style.display = 'inline-flex';
    }
}

function showError(message) {
    alert(`❌ ${message}`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format count (1000 -> 1K)
function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Back button
backBtn.addEventListener('click', () => {
    window.history.back();
});

// Load more button
loadMoreBtn.addEventListener('click', () => {
    loadMoreVideos();
});

// Upload video buttons
uploadVideoBtn.addEventListener('click', () => {
    window.location.href = '../video-upload/';
});

uploadPromptBtn.addEventListener('click', () => {
    window.location.href = '../video-upload/';
});

// Edit profile button
editProfileBtn.addEventListener('click', () => {
    window.location.href = '../edit-profile/';
});

//profile menu button
document.getElementById("profile").addEventListener('click', () => {
    window.location.href = `../profile/?uid=${profileUserId}`;
});

// Modal close
modalClose.addEventListener('click', closeVideoModal);
modalBackdrop.addEventListener('click', closeVideoModal);

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('active')) {
        closeVideoModal();
    }
});

console.log("✅ Video Profile system loaded!");