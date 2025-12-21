/* 
 *  JOYIN Social Media - User Search
 *  WORKING VERSION
 *  © 2025 JOYIN. All rights reserved.
 */

import { db } from "../firebase.js";
import { 
    collection, 
    getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// DOM Elements
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const resultsDiv = document.getElementById("searchResults");
const resultsTitle = document.getElementById("resultsTitle");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");

// Initialize
function init() {
    console.log("🔍 JOYIN Search initialized - Working version");
    
    // Event Listeners
    searchBtn.addEventListener("click", searchUsers);
    
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchUsers();
        }
    });
    
    searchInput.addEventListener("input", function() {
        const value = this.value.trim();
        
        // Show/hide clear button
        if (value.length > 0) {
            clearBtn.classList.add("visible");
        } else {
            clearBtn.classList.remove("visible");
        }
        
        // Clear results if input is empty
        if (value.length === 0) {
            showEmptyState();
        }
    });
    
    clearBtn.addEventListener("click", function() {
        searchInput.value = "";
        searchInput.focus();
        clearBtn.classList.remove("visible");
        showEmptyState();
    });
}

// Show empty state
function showEmptyState() {
    resultsDiv.innerHTML = "";
    resultsDiv.appendChild(emptyState);
    emptyState.style.display = "block";
    loadingState.style.display = "none";
    resultsTitle.textContent = "Search Results";
    resultsCount.textContent = "0";
}

// Show loading state
function showLoading() {
    emptyState.style.display = "none";
    loadingState.style.display = "block";
    resultsDiv.innerHTML = "";
    resultsDiv.appendChild(loadingState);
}

// Show no results
function showNoResults(searchTerm) {
    loadingState.style.display = "none";
    resultsDiv.innerHTML = `
        <div class="no-results">
            <i class="fas fa-user-slash"></i>
            <h3>No users found</h3>
            <p>No user matches "${searchTerm}"</p>
            <p class="search-tip">Try a different username</p>
        </div>
    `;
}

// Show error message
function showError(message) {
    loadingState.style.display = "none";
    resultsDiv.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Search Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// Create user card
function createUserCard(userData, userId) {
    const div = document.createElement("div");
    div.className = "user-result";
    
    // Get profile pic or use default
    const avatarUrl = userData.profilePic || "https://tse1.mm.bing.net/th/id/OIP.cEvbluCvNFD_k4wC3k-_UwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
    
    // Truncate bio if too long
    const bioText = userData.bio || "No bio yet";
    const shortBio = bioText.length > 100 ? bioText.substring(0, 100) + "..." : bioText;
    
    div.innerHTML = `
        <img src="${userData.profilePic || avatarUrl}" alt="${userData.username}" class="user-avatar">
        <div class="user-info">
            <div class="user-name">${userData.username}</div>
            <div class="user-bio">${shortBio}</div>
            <div class="user-stats">
                <span>${userData.followersCount || 0} followers</span>
                <span>•</span>
                <span>${userData.followingCount || 0} following</span>
            </div>
        </div>
        <i class="fas fa-chevron-right"></i>
    `;
    
    // Click to view profile
    div.addEventListener("click", () => {
        viewUserProfile(userId);
    });
    
    return div;
}

// View user profile
function viewUserProfile(userId) {
    // Show loading message
    showMessage("Loading profile...", "info");
    
    // Navigate to user profile
    setTimeout(() => {
        window.location.href = `../profile/?uid=${userId}`;
    }, 300);
}

// Show message
function showMessage(text, type = "info") {
    // Remove existing message
    const existingMsg = document.querySelector(".message");
    if (existingMsg) existingMsg.remove();
    
    // Create new message
    const msg = document.createElement("div");
    msg.className = `message ${type}`;
    msg.textContent = text;
    document.body.appendChild(msg);
    
    // Show message
    msg.style.display = "block";
    
    // Remove after 3 seconds
    setTimeout(() => {
        msg.style.display = "none";
        setTimeout(() => msg.remove(), 300);
    }, 3000);
}

// WORKING SEARCH FUNCTION
async function searchUsers() {
    const searchTerm = searchInput.value.trim();
    
    // Validate input
    if (!searchTerm) {
        showMessage("Please enter a username to search", "info");
        return;
    }
    
    if (searchTerm.length < 2) {
        showMessage("Please enter at least 2 characters", "info");
        return;
    }
    
    // Show loading
    showLoading();
    
    try {
        console.log("Searching for:", searchTerm);
        
        // Get ALL users from Firestore
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        
        console.log("Total users in database:", snapshot.size);
        
        const users = [];
        
        // Loop through all users and filter
        snapshot.forEach((doc) => {
            const userData = doc.data();
            const userId = doc.id;
            
            // Debug: log each user
            // console.log("Checking user:", {
            //     username: userData.username,
            //     username_lowercase: userData.username_lowercase,
            //     searchTerm: searchTerm.toLowerCase()
            // });
            
            // FIRST: Try exact match with username_lowercase
            if (userData.username_lowercase && 
                userData.username_lowercase === searchTerm.toLowerCase()) {
                console.log("✓ Exact match found!");
                users.push({
                    id: userId,
                    ...userData,
                    matchType: "exact"
                });
            }
            // SECOND: Try partial match with username_lowercase
            else if (userData.username_lowercase && 
                     userData.username_lowercase.includes(searchTerm.toLowerCase())) {
                console.log("✓ Partial match found!");
                users.push({
                    id: userId,
                    ...userData,
                    matchType: "partial"
                });
            }
            // THIRD: Try with username field directly (fallback)
            else if (userData.username && 
                     userData.username.toLowerCase().includes(searchTerm.toLowerCase())) {
                console.log("✓ Fallback match found!");
                users.push({
                    id: userId,
                    ...userData,
                    matchType: "fallback"
                });
            }
        });
        
        console.log("Total matches found:", users.length);
        
        // Hide loading
        loadingState.style.display = "none";
        
        // Check if no results
        if (users.length === 0) {
            showNoResults(searchTerm);
            resultsTitle.textContent = "No Results";
            resultsCount.textContent = "0";
            return;
        }
        
        // Sort results: exact matches first, then alphabetical
        users.sort((a, b) => {
            // Exact matches first
            if (a.matchType === "exact" && b.matchType !== "exact") return -1;
            if (a.matchType !== "exact" && b.matchType === "exact") return 1;
            
            // Then partial matches
            if (a.matchType === "partial" && b.matchType === "fallback") return -1;
            if (a.matchType === "fallback" && b.matchType === "partial") return 1;
            
            // Then alphabetically by username_lowercase
            const aLower = a.username_lowercase || a.username.toLowerCase();
            const bLower = b.username_lowercase || b.username.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            // Starts with search term comes first
            if (aLower.startsWith(searchLower) && !bLower.startsWith(searchLower)) return -1;
            if (!aLower.startsWith(searchLower) && bLower.startsWith(searchLower)) return 1;
            
            // Then alphabetical
            return aLower.localeCompare(bLower);
        });
        
        // Clear results div
        resultsDiv.innerHTML = "";
        
        // Update header
        resultsTitle.textContent = "Search Results";
        resultsCount.textContent = users.length.toString();
        
        // Display results
        users.forEach(user => {
            const userCard = createUserCard(user, user.id);
            
            // Add match indicator if debug mode
            if (user.matchType === "exact") {
                userCard.style.borderLeft = "4px solid #5b53f2";
            }
            
            resultsDiv.appendChild(userCard);
        });
        
        // Show success message
        if (users.length === 1) {
            showMessage(`Found 1 user matching "${searchTerm}"`, "info");
        } else {
            showMessage(`Found ${users.length} users matching "${searchTerm}"`, "info");
        }
        
    } catch (error) {
        console.error("Search error:", error);
        console.error("Error details:", {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        showError("Failed to search. Please check console for details.");
        resultsTitle.textContent = "Search Error";
        resultsCount.textContent = "0";
    }
}

// Add CSS for search
const style = document.createElement('style');
style.textContent = `
    .loading-state {
        text-align: center;
        padding: 40px;
    }
    
    .loading-state .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #2d2d2d;
        border-top-color: #5b53f2;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .user-stats {
        display: flex;
        gap: 10px;
        margin-top: 8px;
        font-size: 12px;
        color: #666;
    }
    
    .search-tip {
        margin-top: 10px;
        font-size: 14px;
        color: #888;
    }
    
    .user-result {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: #121212;
        border: 1px solid #2d2d2d;
        border-radius: 10px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .user-result:hover {
        background: rgba(91, 83, 242, 0.1);
        border-color: #5b53f2;
        transform: translateY(-2px);
    }
    
    .user-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #5b53f2;
    }
    
    .user-info {
        flex: 1;
    }
    
    .user-name {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 5px;
        color: white;
    }
    
    .user-bio {
        color: #aaa;
        font-size: 14px;
        line-height: 1.4;
    }
    
    .user-result i.fa-chevron-right {
        color: #5b53f2;
        opacity: 0.7;
        transition: all 0.2s ease;
    }
    
    .user-result:hover i.fa-chevron-right {
        opacity: 1;
        transform: translateX(3px);
    }
    
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #5b53f2;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    }
    
    .message.error {
        background: #dc3545;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Add debug function to check data
window.debugSearch = async function() {
    console.log("=== DEBUG MODE ===");
    console.log("Search input value:", searchInput.value);
    
    try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        
        console.log("Total users:", snapshot.size);
        
        const allUsers = [];
        snapshot.forEach((doc) => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log("All users data:", allUsers);
        
        // Show in UI for debugging
        resultsDiv.innerHTML = `
            <div style="background: #121212; padding: 20px; border-radius: 10px;">
                <h3>Debug Info</h3>
                <p>Total users: ${allUsers.length}</p>
                <div style="max-height: 300px; overflow-y: auto; margin-top: 15px;">
                    ${allUsers.map(user => `
                        <div style="padding: 10px; border-bottom: 1px solid #2d2d2d;">
                            <strong>${user.username}</strong><br>
                            <small>username_lowercase: "${user.username_lowercase}"</small><br>
                            <small>ID: ${user.id}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error("Debug error:", error);
    }
};

// Initialize when page loads
document.addEventListener("DOMContentLoaded", init);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + / to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
    
    // Escape to clear search
    if (e.key === "Escape" && searchInput.value.length > 0) {
        searchInput.value = "";
        searchInput.focus();
        clearBtn.classList.remove("visible");
        showEmptyState();
    }
    
    // F12 for debug mode
    if (e.key === "F12") {
        e.preventDefault();
        window.debugSearch();
    }
});

console.log("✅ Search script loaded. Press F12 for debug mode.");