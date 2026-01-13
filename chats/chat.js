// ============================================
// CHAT PAGE SCRIPT
// ============================================

// Firebase Imports - Bringing in tools from Firebase library
import { 
    doc,              // Creates a reference to a single document in Firestore
    getDoc,           // Fetches (reads) a single document from Firestore
    setDoc,           // Creates or overwrites a document in Firestore
    updateDoc,        // Updates specific fields in an existing document
    collection,       // Creates a reference to a collection (folder of documents)
    query,            // Creates a database query (like asking a question to the database)
    orderBy,          // Sorts query results (oldest first, newest first, etc.)
    onSnapshot,       // Sets up real-time listener - watches for changes in database
    serverTimestamp,  // Gets the current time from Firebase servers (not your computer)
    limit,            // Limits how many results to get (e.g., only 50 messages)
    writeBatch        // Allows multiple database writes at once (all or nothing)
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { 
    onAuthStateChanged  // Listens for login/logout events
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import { auth, db } from "../firebase.js";  // Import our Firebase configuration

// ============================================
// DOM Elements - Grabbing HTML elements to control them with JavaScript
// ============================================
const elements = {
    // Think of this as creating shortcuts to all the HTML elements we need
    messagesContainer: document.getElementById('messagesContainer'),   // Where chat bubbles appear
    messageInput: document.getElementById('messageInput'),             // Text box where you type
    sendBtn: document.getElementById('sendBtn'),                       // Send button
    emptyState: document.getElementById('emptyState'),                 // "No messages yet" display
    loadingOverlay: document.getElementById('loadingOverlay'),         // Loading spinner
    partnerName: document.getElementById('partnerName'),               // Other person's name at top
    partnerAvatar: document.getElementById('partnerAvatar'),           // Other person's profile pic
    partnerStatus: document.getElementById('partnerStatus'),           // Online/offline indicator
    partnerStatusText: document.getElementById('partnerStatusText'),   // "Online" or "Offline" text
    typingIndicator: document.getElementById('typingIndicator'),       // "Bob is typing..." indicator
    errorModal: document.getElementById('errorModal'),                 // Error popup box
    errorMessage: document.getElementById('errorMessage'),             // Error text inside popup
    closeErrorModal: document.getElementById('closeErrorModal'),       // X button on error popup
    retryButton: document.getElementById('retryButton')                // "Try Again" button
};

// ============================================
// Global Variables - Information we need to remember throughout the page
// ============================================
let currentUser = null;          // Stores info about who's logged in (null = nobody)
let chatId = null;               // Unique ID for this conversation (e.g., "alice_bob")
let partnerId = null;            // User ID of the person we're chatting with
let unsubscribeMessages = null;  // Function to stop listening to new messages (cleanup)
let isSending = false;           // True when sending a message (prevents double-sending)

// ============================================
// UTILITY FUNCTIONS - Helper functions used throughout the app
// ============================================

/**
 * Shows loading overlay
 * Purpose: Display a spinner while waiting for data to load
 */
function showLoading() {
    // Add 'active' class to loading overlay (CSS makes it visible)
    elements.loadingOverlay.classList.add('active');
}

/**
 * Hides loading overlay
 * Purpose: Remove the spinner when data has loaded
 */
function hideLoading() {
    // Remove 'active' class (CSS makes it invisible again)
    elements.loadingOverlay.classList.remove('active');
}

/**
 * Shows error modal with custom message
 * @param {string} message - Error message to display to user
 * @param {Function} retryCallback - Optional function to run if user clicks "Retry"
 * 
 * Purpose: Show a friendly error popup instead of breaking the app
 */
function showError(message, retryCallback = null) {
    // Put the error message text into the modal
    elements.errorMessage.textContent = message;
    
    // Make the modal visible
    elements.errorModal.classList.add('active');
    
    // If a retry function was provided...
    if (retryCallback) {
        // When retry button is clicked, hide error and run the retry function
        elements.retryButton.onclick = () => {
            hideError();           // Close the error popup
            retryCallback();       // Try the failed action again
        };
        // Show the retry button
        elements.retryButton.style.display = 'block';
    } else {
        // No retry function provided, so hide the retry button
        elements.retryButton.style.display = 'none';
    }
}

/**
 * Hides error modal
 * Purpose: Close the error popup
 */
function hideError() {
    // Remove 'active' class to hide the modal
    elements.errorModal.classList.remove('active');
}

/**
 * Formats timestamp to readable time
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} Formatted time like "2m ago" or "Yesterday"
 * 
 * Purpose: Convert database timestamp to human-friendly format
 */
function formatTime(timestamp) {
    // If no timestamp or it's invalid, show "Just now"
    if (!timestamp || !timestamp.toDate) return 'Just now';
    
    // Convert Firestore timestamp to JavaScript Date object
    const date = timestamp.toDate();
    
    // Get current time
    const now = new Date();
    
    // Calculate difference in milliseconds
    const diffMs = now - date;
    
    // Convert milliseconds to minutes (1000ms × 60 = 1 minute)
    const diffMins = Math.floor(diffMs / 60000);
    
    // Return different formats based on how long ago
    if (diffMins < 1) return 'Just now';                    // Less than 1 minute
    if (diffMins < 60) return `${diffMins}m ago`;          // Less than 1 hour: "5m ago"
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;  // Less than 24 hours: "3h ago"
    
    // More than a day ago: show actual date
    return date.toLocaleDateString('en-US', { 
        month: 'short',      // "Jan" instead of "January"
        day: 'numeric',      // "15"
        hour: '2-digit',     // "03"
        minute: '2-digit'    // "45"
    });
}

/**
 * Creates a message bubble element
 * @param {Object} messageData - Message data from Firestore
 * @returns {HTMLElement} Message bubble element ready to be displayed
 * 
 * Purpose: Turn raw message data into a chat bubble (HTML)
 */
function createMessageElement(messageData) {
    // Create a new div element (will become the message bubble)
    const messageDiv = document.createElement('div');
    
    // Check if this message was sent by me (not received from partner)
    const isSent = messageData.senderId === currentUser.uid;
    
    // Set CSS class: 'message sent' (blue, right side) or 'message received' (gray, left side)
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    // Format the timestamp for display
    const time = formatTime(messageData.timestamp);
    
    // Build the HTML for the message bubble
    messageDiv.innerHTML = `
        <div class="message-content">${formatMessage(messageData.text)}</div>
        <div class="message-meta">
            <span class="message-time">${time}</span>
            ${isSent ? '<div class="message-status">✓</div>' : ''}
        </div>
    `;
    // escapeHtml() prevents hackers from injecting malicious code
    // If sent by me, show checkmark; if received, don't show checkmark
    
    // Return the completed message element
    return messageDiv;
}



/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text that might contain dangerous HTML
 * @returns {string} Safe text with HTML characters escaped
 * 
 * Purpose: Security - prevents users from injecting malicious code
 * Example: Converts "<script>alert('hack')</script>" to safe text
 */
function escapeHtml(text) {
    // Create a temporary div element
    const div = document.createElement('div');
    
    // Set text content (automatically escapes HTML)
    div.textContent = text;
    
    // Get the escaped HTML
    return div.innerHTML;
    
    // Example:
    // Input: "<b>Hello</b>"
    // Output: "&lt;b&gt;Hello&lt;/b&gt;" (displays as "<b>Hello</b>" not bold text)
}

/**
 * Formats message text with clickable links, emails, and phone numbers
 * @param {string} text - Raw message text
 * @returns {string} Formatted HTML with clickable links
 * 
 * Purpose: Make URLs, emails, and phone numbers clickable in chat messages
 */
function formatMessage(text) {
    // First, escape HTML to prevent XSS attacks
    let formattedText = escapeHtml(text);
    
    // Links - Convert URLs to clickable links
    formattedText = formattedText.replace(
        /(https?:\/\/[^\s]+|www\.[^\s]+)/g,
        (url) => {
            const fullUrl = url.startsWith("http") ? url : `https://${url}`;
            return `<a href="${fullUrl}" target="_blank">${url}</a>`;
        }
    );
    
    // Emails - Convert email addresses to mailto links
    formattedText = formattedText.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        `<a href="mailto:$1">$1</a>`
    );
    
    // Phone numbers - Convert phone numbers to tel links
    formattedText = formattedText.replace(
        /(\+?\d{10,14})/g,
        `<a href="tel:$1">$1</a>`
    );
    
    return formattedText;
}


/**
 * Scrolls to the bottom of messages container
 * Purpose: Auto-scroll to newest message (like WhatsApp does)
 */
function scrollToBottom() {
    // scrollTop = how far scrolled down
    // scrollHeight = total height of content
    // Setting scrollTop to scrollHeight = scroll all the way down
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}





/**
 * Auto-expands textarea based on content
 * Purpose: Make text input grow taller as you type more lines
 */
function autoExpandTextarea() {
    // Get the textarea element
    const textarea = elements.messageInput;
    
    // Reset height to auto (collapses to content size)
    textarea.style.height = 'auto';
    
    // Set height to content height, but max 120px (scrollHeight = how tall content needs to be)
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    // Enable send button only if there's text AND not currently sending
    // .trim() removes spaces from start/end
    elements.sendBtn.disabled = textarea.value.trim().length === 0 || isSending;
}

// ============================================
// FIREBASE OPERATIONS - Functions that interact with the database
// ============================================

/**
 * Fetches partner's profile information
 * Purpose: Get the other person's name and profile picture from database
 */
async function fetchPartnerProfile() {
    try {
        // Create a reference to the partner's user document
        // Path: users/partnerId (e.g., users/bob123)
        const userDoc = await getDoc(doc(db, 'users', partnerId));
        
        // Check if the document exists in database
        if (!userDoc.exists()) {
            // Partner's profile not found - throw error
            throw new Error('User profile not found');
        }
        
        // Extract the data from the document
        const userData = userDoc.data();
        
        // Update the UI with partner's information
        // Display partner's username (or "Unknown User" if missing)
        elements.partnerName.textContent = userData.username || 'Unknown User';
        
        // Set partner's profile picture (or use generated avatar if missing)
        elements.partnerAvatar.src = userData.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + partnerId;
        
        // If profile pic fails to load, use generated avatar as fallback
        elements.partnerAvatar.onerror = () => {
            elements.partnerAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + partnerId;
        };
        
        // Update status indicator to show "Online" (in real app, check actual status)
        elements.partnerStatus.classList.add('online');
        elements.partnerStatusText.textContent = 'Online';
        
    } catch (error) {
        // Something went wrong - log error to console
        console.error('Error fetching partner profile:', error);
        
        // Show fallback UI
        elements.partnerName.textContent = 'Unknown User';
        elements.partnerStatusText.textContent = 'Offline';
        
        // Show error message to user
        showError('Could not load user profile. The user may not exist.');
    }
}

/**
 * Creates a new chat document in Firestore
 * Purpose: Initialize a brand new conversation in the database
 * Returns: true if successful, false if failed
 */
async function createChatDocument() {
    try {
        // Create reference to the chat document
        // Path: chats/alice_bob
        const chatRef = doc(db, 'chats', chatId);
        
        // Create the chat document with initial data
        await setDoc(chatRef, {
            // Array of user IDs in this chat
            participants: [currentUser.uid, partnerId],
            
            // Last message sent (empty for new chat)
            lastMessage: '',
            
            // When chat was last updated (server time, not your computer time)
            lastUpdated: serverTimestamp(),
            
            // When chat was created
            createdAt: serverTimestamp(),
            
            // Store usernames for quick access (avoid extra database reads)
            userNames: {
                [currentUser.uid]: currentUser.displayName || 'You',  // Your name
                [partnerId]: elements.partnerName.textContent         // Partner's name
            },
            
            // Store profile pictures for quick access
            userAvatars: {
                [currentUser.uid]: currentUser.photoURL || '',        // Your avatar
                [partnerId]: elements.partnerAvatar.src               // Partner's avatar
            }
        });
        
        // Log success message
        console.log('Chat document created:', chatId);
        
        // Return true to indicate success
        return true;
        
    } catch (error) {
        // Log error to console
        console.error('Error creating chat document:', error);
        
        // Show error popup with retry option
        showError('Failed to create chat. Please try again.', () => createChatDocument());
        
        // Return false to indicate failure
        return false;
    }
}

/**
 * Sends a new message
 * Purpose: Save your message to the database and update chat metadata
 */
async function sendMessage() {
    // Get the text from input box and remove extra spaces
    const messageText = elements.messageInput.value.trim();
    
    // VALIDATION: Don't send if...
    // - No text entered
    // - User not logged in
    // - No chat ID
    // - Already sending a message
    if (!messageText || !currentUser || !chatId || isSending) return;
    
    // Set flag to prevent double-sending
    isSending = true;
    
    // Disable send button (can't click while sending)
    elements.sendBtn.disabled = true;
    
    // Disable text input (can't type while sending)
    elements.messageInput.disabled = true;
    
    try {
        // Create reference to the chat document
        const chatRef = doc(db, 'chats', chatId);
        
        // Create reference to the messages subcollection
        // Path: chats/alice_bob/messages
        const messagesRef = collection(chatRef, 'messages');
        
        // Check if chat document exists
        const chatDoc = await getDoc(chatRef);
        
        // If chat doesn't exist yet (first message), create it
        if (!chatDoc.exists()) {
            const created = await createChatDocument();
            // If creation failed, stop here
            if (!created) return;
        }
        
        // Create the message data object
        const messageData = {
            senderId: currentUser.uid,        // Who sent it (your ID)
            text: messageText,                // What was said
            timestamp: serverTimestamp(),     // When it was sent
            read: false                       // Has partner seen it? (no, it's new)
        };
        
        // Create a batch (group of database operations that happen together)
        const batch = writeBatch(db);
        
        // Create a new document reference for this message
        const messageRef = doc(messagesRef);
        
        // Add message to batch (operation 1)
        batch.set(messageRef, messageData);
        
        // Update chat metadata in batch (operation 2)
        batch.update(chatRef, {
            lastMessage: messageText,        // Update preview text
            lastUpdated: serverTimestamp()   // Update time for sorting in inbox
        });
        
        // Execute both operations together (all or nothing)
        await batch.commit();
        
        // SUCCESS! Clear the input box
        elements.messageInput.value = '';
        
        // Reset textarea height
        elements.messageInput.style.height = 'auto';
        
        // Disable send button (no text now)
        elements.sendBtn.disabled = true;
        
        // Log success
        console.log('Message sent successfully');
        
    } catch (error) {
        // Something went wrong - log error
        console.error('Error sending message:', error);
        
        // Show error popup with option to retry
        showError('Failed to send message. Please try again.', sendMessage);
        
    } finally {
        // ALWAYS run this code (success or error)
        
        // Re-enable sending
        isSending = false;
        
        // Re-enable text input
        elements.messageInput.disabled = false;
        
        // Put cursor back in input box
        elements.messageInput.focus();
    }
}

/**
 * Sets up real-time listener for messages
 * Purpose: Watch database for new messages and display them instantly
 * This is the MAGIC that makes chat real-time!
 */
function setupMessageListener() {
    // Safety check: don't setup if no chat ID
    if (!chatId) return;
    
    try {
        // Create reference to messages subcollection
        // Path: chats/alice_bob/messages
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        
        // Create query: get all messages, sorted by timestamp (oldest first)
        const messagesQuery = query(messagesRef, orderBy('timestamp'));
        
        // Set up the real-time listener (this is the camera watching the database!)
        unsubscribeMessages = onSnapshot(
            messagesQuery,    // What to watch
            
            // SUCCESS CALLBACK: Runs every time messages change
            (snapshot) => {
                // If we have messages, hide "No messages yet" display
                if (!snapshot.empty) {
                    elements.emptyState.style.display = 'none';
                }
                
                // Process each change in the database
                snapshot.docChanges().forEach((change) => {
                    // If a new message was added (not modified or deleted)
                    if (change.type === 'added') {
                        // Get the message data
                        const messageData = change.doc.data();
                        
                        // Create HTML element for message bubble
                        const messageElement = createMessageElement(messageData);
                        
                        // Add message bubble to chat container
                        elements.messagesContainer.appendChild(messageElement);
                        
                        // If this is the newest message (last in list)
                        if (change.newIndex === snapshot.size - 1) {
                            // Scroll to bottom after a tiny delay (let DOM update first)
                            setTimeout(scrollToBottom, 100);
                        }
                    }
                    // Note: We only handle 'added' type
                    // Could also handle 'modified' (message edited) or 'removed' (deleted)
                });
                
                // Hide loading spinner
                hideLoading();
            },
            
            // ERROR CALLBACK: Runs if listener fails
            (error) => {
                // Log error to console
                console.error('Error listening to messages:', error);
                
                // Hide loading spinner
                hideLoading();
                
                // Show error popup with retry option
                showError('Failed to load messages. Please refresh.', setupMessageListener);
            }
        );
        
    } catch (error) {
        // Error setting up listener
        console.error('Error setting up message listener:', error);
        
        // Show error popup
        showError('Could not connect to chat.', () => setupMessageListener());
    }
}

/**
 * Loads existing messages
 * Purpose: Check if chat exists, then start listening for messages
 */
async function loadExistingMessages() {
    try {
        // Create reference to chat document
        const chatRef = doc(db, 'chats', chatId);
        
        // Try to fetch the chat document
        const chatDoc = await getDoc(chatRef);
        
        // Check if chat exists in database
        if (!chatDoc.exists()) {
            // No existing chat (this will be a brand new conversation)
            
            // Show "Start the conversation" message
            elements.emptyState.style.display = 'flex';
            
            // Hide loading spinner
            hideLoading();
            
            // Still setup listener so first message appears instantly
            setupMessageListener();
            
            // Exit function
            return;
        }
        
        // Chat exists! Setup listener to load and watch messages
        setupMessageListener();
        
    } catch (error) {
        // Error checking for chat
        console.error('Error checking for existing chat:', error);
        
        // Hide loading spinner
        hideLoading();
        
        // Show error popup with retry option
        showError('Failed to load chat.', () => loadExistingMessages());
    }
}

// ============================================
// EVENT HANDLERS & INITIALIZATION
// ============================================

/**
 * Initializes the chat page
 * Purpose: Main startup function - runs when page loads
 */
async function initializeChat() {
    // Show loading spinner while initializing
    showLoading();
    
    try {
        // STEP 1: Wait for user to be logged in
        currentUser = await new Promise((resolve, reject) => {
            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                // Stop listening (we only need this once)
                unsubscribe();
                
                // If user is logged in
                if (user) {
                    resolve(user);  // Return user object
                } else {
                    // Nobody logged in
                    reject(new Error('Not authenticated'));
                }
            });
        });
        
        // STEP 2: Get chat info from URL
        // Example URL: chat.html?chatId=alice_bob
        // Or: chat.html?uid=bob123
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdParam = urlParams.get('chatId');  // Try to get chatId parameter
        const uidParam = urlParams.get('uid');        // Try to get uid parameter
        
        // CASE 1: Chat ID was provided in URL
        if (chatIdParam) {
            // Use the provided chat ID
            chatId = chatIdParam;
            
            // Chat IDs are formatted as "userId1_userId2"
            // Split by underscore to get both user IDs
            const participants = chatId.split('_');
            
            // Find which ID is NOT me (that's my partner)
            partnerId = participants.find(id => id !== currentUser.uid) || participants[0];
            
        // CASE 2: User ID was provided (coming from profile page)
        } else if (uidParam) {
            // Partner's ID was provided
            partnerId = uidParam;
            
            // Create chat ID by combining both user IDs, sorted alphabetically
            // This ensures alice_bob and bob_alice both become alice_bob
            chatId = [currentUser.uid, partnerId].sort().join('_');
            
        // CASE 3: No chat info provided
        } else {
            // Can't proceed without knowing who to chat with
            throw new Error('No chat specified');
        }
        
        // STEP 3: Fetch partner's profile (name, picture)
        await fetchPartnerProfile();
        
        // STEP 4: Load messages
        await loadExistingMessages();
        
    } catch (error) {
        // Something went wrong during initialization
        console.error('Initialization error:', error);
        
        // Hide loading spinner
        hideLoading();
        
        // If error is "not authenticated"
        if (error.message === 'Not authenticated') {
            // Redirect to login page
            window.location.href = '../login/';
        } else {
            // Show error message
            showError(error.message || 'Failed to initialize chat');
        }
    }
}

/**
 * Sets up event listeners
 * Purpose: Attach functions to user actions (clicks, key presses, etc.)
 */
function setupEventListeners() {
    // SEND BUTTON: When clicked, send message
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // ENTER KEY: When Enter is pressed in text input
    elements.messageInput.addEventListener('keydown', (e) => {
        // If Enter key pressed (not Shift+Enter)
        if (e.key === 'Enter' && !e.shiftKey) {
            // Prevent default (adding new line)
            e.preventDefault();
            
            // Send the message
            sendMessage();
        }
        // Note: Shift+Enter will still create a new line (default behavior)
    });
    
    // AUTO-EXPAND: When typing in text input
    elements.messageInput.addEventListener('input', autoExpandTextarea);
    
    // ERROR MODAL CLOSE: When X button clicked
    elements.closeErrorModal.addEventListener('click', hideError);
    
    // CLICK OUTSIDE MODAL: When clicking the dark overlay
    elements.errorModal.addEventListener('click', (e) => {
        // If clicked element is the modal itself (not content inside)
        if (e.target === elements.errorModal) {
            hideError();
        }
    });
    
    // ESCAPE KEY: When Escape key pressed anywhere on page
    document.addEventListener('keydown', (e) => {
        // If Escape key AND error modal is visible
        if (e.key === 'Escape' && elements.errorModal.classList.contains('active')) {
            hideError();
        }
    });
}

// ============================================
// PAGE LOAD & CLEANUP
// ============================================

// When HTML is fully loaded (DOM ready)
document.addEventListener('DOMContentLoaded', () => {
    // Setup all click/keyboard listeners
    setupEventListeners();
    
    // Start the initialization process
    initializeChat();
});

// When user is about to leave the page
window.addEventListener('beforeunload', () => {
    // If we have an active message listener
    if (unsubscribeMessages) {
        // Stop listening (cleanup, saves resources)
        unsubscribeMessages();
    }
});

// When user switches tabs or minimizes browser
document.addEventListener('visibilitychange', () => {
    // If page is hidden (user switched tabs)
    if (document.hidden && unsubscribeMessages) {
        // Stop listening (save resources)
        unsubscribeMessages();
    } 
    // If page is visible again AND we have a chat ID AND no listener active
    else if (!document.hidden && chatId && !unsubscribeMessages) {
        // Restart the listener
        setupMessageListener();
    }
});