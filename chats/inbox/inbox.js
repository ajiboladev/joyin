// ============================================
// INBOX PAGE SCRIPT
// This script manages the inbox/chat list page
// It shows all conversations for the logged-in user
// ============================================

// ============================================
// FIREBASE IMPORTS
// These are Firebase functions we need to interact with the database
// ============================================

// Import Firestore functions for database operations
import { 
    collection,      // Gets a reference to a collection (like a folder of data)
    query,          // Creates a query to filter data
    where,          // Adds a filter condition to a query
    orderBy,        // Sorts the results
    onSnapshot,     // Listens for real-time updates (auto-refreshes when data changes)
    getDocs,        // Gets documents once (not used in current code but imported)
    doc,            // Gets a reference to a single document
    getDoc,         // Reads a single document's data
    limit,          // Limits how many results we get
    serverTimestamp // Gets timestamp from server (not used but imported)
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Import authentication function to check if user is logged in
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Import our Firebase configuration (auth = authentication, db = database)
import { auth, db } from "../../firebase.js";



onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Not logged in
       window.location.replace("../login/");
        return;
    }

    if (!user.emailVerified) {
        // Logged in but email not verified
        window.location.replace("../login/");
        return;
    }
});
// ============================================
// DOM ELEMENTS
// These are references to HTML elements on the page
// We store them in one object so they're easy to access
// ============================================
const elements = {
    // Main container where chat items are displayed
    inboxContainer: document.getElementById('inboxContainer'),
    
    // Message shown when there are no chats
    emptyState: document.getElementById('emptyState'),
    
    // Loading spinner/message while chats are loading
    loadingState: document.getElementById('loadingState'),
    
    // Container for the search input (can be shown/hidden)
    searchContainer: document.getElementById('searchContainer'),
    
    // The actual text input where users type their search
    searchInput: document.getElementById('searchInput'),
    
    // Button to clear the search text
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    
    // Button to show/hide the search bar
    searchBtn: document.getElementById('searchBtn'),
    
    // Button to start a new chat
    newChatBtn: document.getElementById('newChatBtn'),
    
    // Alternative button to start a chat (shown in empty state)
    startChatBtn: document.getElementById('startChatBtn'),
    
    // Modal (popup) that shows errors
    errorModal: document.getElementById('errorModal'),
    
    // Text element that displays the error message
    errorMessage: document.getElementById('errorMessage'),
    
    // Button to close the error modal
    closeErrorModal: document.getElementById('closeErrorModal'),
    
    // Cancel button in the error modal
    cancelBtn: document.getElementById('cancelBtn'),
    
    // Retry button in the error modal (tries the failed action again)
    retryBtn: document.getElementById('retryBtn')
};

// ============================================
// GLOBAL VARIABLES
// These variables are accessible throughout the entire script
// ============================================

// Stores the currently logged-in user's information
// null means no one is logged in yet
let currentUser = null;

// Function that stops listening to chat updates
// When called, it unsubscribes from real-time database changes
let unsubscribeChats = null;

// Array that stores all loaded chat data
// Each item contains: chat info, other user's data, etc.
let allChats = [];

// ============================================
// UTILITY FUNCTIONS
// Helper functions used throughout the code
// ============================================

/**
 * Shows the loading spinner/message
 * Called when we start loading data from the database
 */
function showLoading() {
    // Make loading state visible
    elements.loadingState.style.display = 'block';
    
    // Hide the "no chats" message
    elements.emptyState.style.display = 'none';
    
    // Prevent scrolling while loading
    elements.inboxContainer.style.overflow = 'hidden';
}

/**
 * Hides the loading spinner/message
 * Called when loading is complete
 */
function hideLoading() {
    // Hide the loading state
    elements.loadingState.style.display = 'none';
    
    // Allow scrolling again
    elements.inboxContainer.style.overflow = 'auto';
}

/**
 * Shows an error modal (popup) with a message
 * @param {string} message - The error message to display
 * @param {Function} retryCallback - Optional function to call if user clicks "Retry"
 */
function showError(message, retryCallback = null) {
    // Set the error message text
    elements.errorMessage.textContent = message;
    
    // Show the modal by adding 'active' class
    elements.errorModal.classList.add('active');
    
    // If a retry function was provided
    if (retryCallback) {
        // Set up the retry button to call that function
        elements.retryBtn.onclick = () => {
            hideError();           // Close the error modal first
            retryCallback();       // Then try the action again
        };
        // Show the retry button
        elements.retryBtn.style.display = 'block';
    } else {
        // No retry function, so hide the retry button
        elements.retryBtn.style.display = 'none';
    }
}

/**
 * Hides the error modal
 */
function hideError() {
    // Remove the 'active' class to hide the modal
    elements.errorModal.classList.remove('active');
}

/**
 * Formats a Firestore timestamp into a human-readable string
 * Examples: "Just now", "5m ago", "2h ago", "Yesterday", "Jan 15"
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Formatted time string
 */
function formatTime(timestamp) {
    // Check if timestamp exists and has the toDate method
    if (!timestamp || !timestamp.toDate) return '';
    
    // Convert Firestore timestamp to JavaScript Date object
    const date = timestamp.toDate();
    
    // Get current time
    const now = new Date();
    
    // Calculate difference in milliseconds
    const diffMs = now - date;
    
    // Calculate difference in minutes (60,000 ms = 1 minute)
    const diffMins = Math.floor(diffMs / 60000);
    
    // Calculate difference in hours (3,600,000 ms = 1 hour)
    const diffHours = Math.floor(diffMs / 3600000);
    
    // Calculate difference in days (86,400,000 ms = 1 day)
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Return appropriate format based on how long ago it was
    if (diffMins < 1) return 'Just now';                    // Less than 1 minute
    if (diffMins < 60) return `${diffMins}m ago`;          // Less than 1 hour
    if (diffHours < 24) return `${diffHours}h ago`;        // Less than 1 day
    if (diffDays === 1) return 'Yesterday';                // Exactly 1 day
    if (diffDays < 7) return `${diffDays}d ago`;           // Less than 1 week
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;  // Less than 1 month
    
    // For older messages, show the actual date (e.g., "Jan 15")
    return date.toLocaleDateString('en-US', { 
        month: 'short',  // Abbreviated month name
        day: 'numeric'   // Day number
    });
}

/**
 * Shortens text if it's too long, adding "..." at the end
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncating (default 40)
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 40) {
    // If no text, return empty string
    if (!text) return '';
    
    // If text is short enough, return as-is
    if (text.length <= maxLength) return text;
    
    // Cut text at maxLength and add "..."
    return text.substring(0, maxLength) + '...';
}

// ============================================
// CHAT ITEM FUNCTIONS
// Functions that create and display chat list items
// ============================================

/**
 * Creates a single chat item (the box you click to open a conversation)
 * @param {Object} chatData - Data about the chat (last message, time, etc.)
 * @param {string} otherUserId - The ID of the person you're chatting with
 * @param {Object} userData - Profile data of the other person (name, picture)
 * @returns {HTMLElement} A div element containing the chat item
 */
function createChatItem(chatData, otherUserId, userData) {
    // Create a new div element
    const chatItem = document.createElement('div');
    
    // Add the 'chat-item' CSS class for styling
    chatItem.className = 'chat-item';
    
    // Store chat ID in the element (useful for clicking)
    chatItem.dataset.chatId = chatData.id;
    
    // Store other user's ID in the element
    chatItem.dataset.userId = otherUserId;
    
    // Get the last message, truncated to 40 characters
    const lastMessage = truncateText(chatData.lastMessage || 'No messages yet');
    
    // Format when the last message was sent
    const lastTime = formatTime(chatData.lastUpdated);
    
    // Get unread message count (0 if not set)
    const unreadCount = chatData.unreadCount || 0;
    
    // TEMPORARY: Random online status (should be replaced with real data)
    const isOnline = Math.random() > 0.5;
    
    // Get user's profile picture, or generate a default avatar
    // Uses dicebear.com API to create unique avatars based on user ID
    const avatarUrl = userData.profilePic || 
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}`;
    
    // Build the HTML content for this chat item
    chatItem.innerHTML = `
        <!-- Profile picture -->
        <img src="${avatarUrl}" 
             alt="${userData.username || 'User'}" 
             class="chat-avatar"
             onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserId}'">
        
        <!-- Chat information container -->
        <div class="chat-info">
            <!-- Top row: name and time -->
            <div class="chat-header">
                <span class="chat-name">${userData.username || 'Unknown User'}</span>
                <span class="chat-time">${lastTime}</span>
            </div>
            
            <!-- Last message preview -->
            <div class="chat-preview">${lastMessage}</div>
            
            <!-- Bottom row: unread badge and online status -->
            <div class="chat-meta">
                ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                <div class="status-indicator ${isOnline ? 'online' : ''}"></div>
            </div>
        </div>
    `;
    
    // Add click event: when clicked, go to the chat page
    chatItem.addEventListener('click', () => {
        // Navigate to chat page with this chat's ID in the URL
        window.location.href = `../?chatId=${chatData.id}`;
    });
    
    // Return the created element
    return chatItem;
}

/**
 * Displays all chats in the inbox container
 * Clears existing content and adds new chat items
 * @param {Array} chats - Array of chat objects to display
 */
function renderChats(chats) {
    // Clear all existing chat items from the container
    elements.inboxContainer.innerHTML = '';
    
    // If there are no chats to show
    if (chats.length === 0) {
        // Show the "no chats yet" message
        elements.emptyState.style.display = 'block';
        return;  // Exit function early
    }
    
    // We have chats, so hide the empty state message
    elements.emptyState.style.display = 'none';
    
    // Loop through each chat and create its display element
    chats.forEach(chat => {
        // Create the chat item element
        const chatItem = createChatItem(
            chat.chatData,      // Chat information
            chat.otherUserId,   // Other person's ID
            chat.userData       // Other person's profile
        );
        
        // Add the chat item to the inbox container
        elements.inboxContainer.appendChild(chatItem);
    });
}

/**
 * Filters the chat list based on a search query
 * Shows only chats that match the search text
 * @param {string} searchQuery - The text to search for
 */
function filterChats(searchQuery) {
    // If search is empty (no text entered)
    if (!searchQuery.trim()) {
        // Show all chats
        renderChats(allChats);
        return;  // Exit function
    }
    
    // Convert search query to lowercase for case-insensitive search
    const queryLower = searchQuery.toLowerCase();
    
    // Filter the chats array
    const filtered = allChats.filter(chat => {
        // Get the username (or empty string if not set)
        const username = chat.userData.username || '';
        
        // Get the last message (or empty string if not set)
        const lastMessage = chat.chatData.lastMessage || '';
        
        // Return true if either username or message contains the search text
        return username.toLowerCase().includes(queryLower) ||
               lastMessage.toLowerCase().includes(queryLower);
    });
    
    // Display only the filtered chats
    renderChats(filtered);
}

// ============================================
// FIREBASE OPERATIONS
// Functions that interact with the Firebase database
// ============================================

/**
 * Gets a user's profile information from the database
 * @param {string} userId - The ID of the user to fetch
 * @returns {Promise<Object>} User profile data (username, picture, etc.)
 */
async function fetchUserProfile(userId) {
    try {
        // Get a reference to the user's document in the 'users' collection
        // Then fetch the document's data
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        // If the user document doesn't exist in the database
        if (!userDoc.exists()) {
            // Return a default user object
            return {
                username: 'Unknown User',
                profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
            };
        }
        
        // User exists, return their actual data
        return userDoc.data();
        
    } catch (error) {
        // Something went wrong (network error, permission denied, etc.)
        console.error('Error fetching user profile:', error);
        
        // Return a fallback user object
        return {
            username: 'Error loading user',
            profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
        };
    }
}

/**
 * Processes a chat document from Firestore
 * Extracts chat data and fetches the other user's profile
 * @param {Object} chatDoc - Firestore document snapshot
 * @returns {Promise<Object>} Processed chat data ready for display
 */
async function processChatDocument(chatDoc) {
    // Get the data from the document
    const chatData = chatDoc.data();
    
    // Get the document's ID
    const chatId = chatDoc.id;
    
    // Get the list of participants in this chat
    const participants = chatData.participants || [];
    
    // Find the OTHER person in the chat (not the current user)
    // participants is an array like ['user1_id', 'user2_id']
    // We filter out the current user's ID to get the other person
    const otherUserId = participants.find(id => id !== currentUser.uid) || participants[0];
    
    // Fetch the other user's profile from the database
    const userData = await fetchUserProfile(otherUserId);
    
    // Return an object with all the information we need
    return {
        id: chatId,                    // Chat ID
        chatData: {                    // Chat information
            ...chatData,               // All original chat data
            id: chatId                 // Add ID to chat data
        },
        otherUserId,                   // Other person's ID
        userData                       // Other person's profile
    };
}

/**
 * Loads all chats for the current user from Firestore
 * Sets up a real-time listener so chats update automatically
 */
async function loadUserChats() {
    // Show loading spinner
    showLoading();
    
    try {
        // Get a reference to the 'chats' collection in the database
        const chatsRef = collection(db, 'chats');
        
        // Build a query to find this user's chats
        const chatsQuery = query(
            chatsRef,                                           // Which collection to search
            where('participants', 'array-contains', currentUser.uid),  // Find chats where I'm a participant
            orderBy('lastUpdated', 'desc'),                    // Sort by most recent first
            limit(1000)                                        // Maximum 1000 chats
        );
        
        // Set up real-time listener
        // This function will run every time the data changes
        unsubscribeChats = onSnapshot(
            chatsQuery,              // The query to listen to
            async (snapshot) => {    // This runs when data arrives or changes
                try {
                    // snapshot.docs is an array of all chat documents
                    // We map each document to a promise that processes it
                    const chatPromises = snapshot.docs.map(doc => 
                        processChatDocument(doc)
                    );
                    
                    // Wait for all chats to be processed in parallel
                    // Promise.all waits for all promises to complete
                    allChats = await Promise.all(chatPromises);
                    
                    // Display the chats on the page
                    renderChats(allChats);
                    
                    // Hide loading spinner
                    hideLoading();
                    
                } catch (error) {
                    // Error while processing the chat data
                    console.error('Error processing chats:', error);
                    hideLoading();
                    showError('Failed to process conversations');
                }
            },
            (error) => {    // This runs if there's an error with the listener
                console.error('Error listening to chats:', error);
                hideLoading();
                // Show error with retry option
                showError('Failed to load conversations. Please check your connection.', loadUserChats);
            }
        );
        
    } catch (error) {
        // Error setting up the listener
        console.error('Error setting up chat listener:', error);
        hideLoading();
        // Show error with retry option
        showError('Failed to load conversations', loadUserChats);
    }
}

// ============================================
// EVENT HANDLERS
// Functions that respond to user actions (clicks, typing, etc.)
// ============================================

/**
 * Sets up all event listeners for the page
 * Called once when the page loads
 */
function setupEventListeners() {
    
    // -------- SEARCH FUNCTIONALITY --------
    
    // Track whether search bar is visible or hidden
    let searchVisible = false;
    
    // When user clicks the search button (magnifying glass icon)
    elements.searchBtn.addEventListener('click', () => {
        // Toggle visibility (true becomes false, false becomes true)
        searchVisible = !searchVisible;
        
        // Show or hide the search container
        elements.searchContainer.style.display = searchVisible ? 'block' : 'none';
        
        // If we just showed the search bar
        if (searchVisible) {
            // Put cursor in the search input
            elements.searchInput.focus();
        }
    });
    
    // When user types in the search box
    elements.searchInput.addEventListener('input', (e) => {
        // Filter chats based on what they typed
        // e.target.value is the current text in the input
        filterChats(e.target.value);
    });
    
    // When user clicks the X button to clear search
    elements.clearSearchBtn.addEventListener('click', () => {
        // Clear the search input
        elements.searchInput.value = '';
        
        // Show all chats again
        filterChats('');
        
        // Hide the clear button
        elements.clearSearchBtn.style.display = 'none';
    });
    
    // Show/hide the clear button based on whether there's text
    elements.searchInput.addEventListener('input', () => {
        // If there's text, show the clear button; otherwise hide it
        elements.clearSearchBtn.style.display = 
            elements.searchInput.value ? 'block' : 'none';
    });
    
    // -------- NEW CHAT BUTTONS --------
    
    // When user clicks "New Chat" button
    elements.newChatBtn.addEventListener('click', () => {
        // Go to the users page to find someone to chat with
        window.location.href = '../../searchbar/';
    });
    
    // When user clicks "Start Chat" button (in empty state)
    elements.startChatBtn.addEventListener('click', () => {
        // Same as new chat button
        window.location.href = '../../searchbar/';
    });
    
    // -------- ERROR MODAL --------
    
    // When user clicks X button to close error
    elements.closeErrorModal.addEventListener('click', hideError);
    
    // When user clicks Cancel button
    elements.cancelBtn.addEventListener('click', hideError);
    
    // When user clicks outside the error modal (on the dark background)
    elements.errorModal.addEventListener('click', (e) => {
        // e.target is the element that was clicked
        // If they clicked the modal background itself (not the content inside)
        if (e.target === elements.errorModal) {
            hideError();
        }
    });
    
    // -------- KEYBOARD SHORTCUTS --------
    
    // Listen for keyboard key presses on the whole page
    document.addEventListener('keydown', (e) => {
        // If user pressed Escape AND error modal is open
        if (e.key === 'Escape' && elements.errorModal.classList.contains('active')) {
            hideError();
        }
    });
    
    // When user presses a key while in the search box
    elements.searchInput.addEventListener('keydown', (e) => {
        // If they pressed Enter
        if (e.key === 'Enter') {
            // Trigger search with current text
            filterChats(e.target.value);
        }
    });
}

// ============================================
// INITIALIZATION
// Main startup function that runs when page loads
// ============================================

/**
 * Initializes the entire inbox page
 * Checks if user is logged in, sets up listeners, loads chats
 */
async function initializeInbox() {
    try {
        // Wait for Firebase to tell us if someone is logged in
        // This creates a Promise that resolves when we know auth status
        currentUser = await new Promise((resolve, reject) => {
            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                // Stop listening (we only need to check once)
                unsubscribe();
                
                // If a user is logged in
                if (user) {
                    resolve(user);  // Success! Return user object
                } else {
                    reject(new Error('Not authenticated'));  // No one logged in
                }
            });
        });
        
        // User is logged in, so continue setup
        
        // Set up all click handlers and event listeners
        setupEventListeners();
        
        // Load chats from database
        await loadUserChats();
        
    } catch (error) {
        // Something went wrong during initialization
        console.error('Initialization error:', error);
        
        // If the error was "not authenticated"
        if (error.message === 'Not authenticated') {
            // Redirect to login page
            window.location.href = '../../login/';
        } else {
            // Some other error, show error message
            showError('Failed to initialize inbox');
        }
    }
}

// ============================================
// PAGE LOAD & CLEANUP
// Code that runs when page loads or when user leaves
// ============================================

// When the HTML document has finished loading
document.addEventListener('DOMContentLoaded', initializeInbox);

// When user is about to leave the page (close tab, navigate away, etc.)
window.addEventListener('beforeunload', () => {
    // If we have an active listener to chats
    if (unsubscribeChats) {
        // Stop listening (cleanup to prevent memory leaks)
        unsubscribeChats();
    }
});

// When user switches tabs or minimizes window
document.addEventListener('visibilitychange', () => {
    // If page is now hidden (user switched tabs)
    if (document.hidden && unsubscribeChats) {
        // Stop listening to save resources
        unsubscribeChats();
        unsubscribeChats = null;  // Clear the reference
    } 
    // If page is now visible again AND we have a user AND not currently listening
    else if (!document.hidden && currentUser && !unsubscribeChats) {
        // Start listening again
        loadUserChats();
    }
});