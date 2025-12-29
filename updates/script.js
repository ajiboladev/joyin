// user/script.js - Shared JavaScript for all user pages
import { auth, db } from '../firebase.js';
import { 
  doc, getDoc, updateDoc, setDoc, 
  collection, query, where, orderBy, 
  getDocs, serverTimestamp , limit
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ===== GLOBAL FUNCTIONS =====

// Create floating updates button
function createUpdatesButton() {
  if (document.getElementById('updates-btn')) return;
  
  const button = document.createElement('button');
  button.id = 'updates-btn';
  button.innerHTML = `
    <span class="bell">🔔</span>
    <span>Updates</span>
    <div class="notification-dot" id="notification-dot" style="display: none;"></div>
  `;
  
  button.onclick = () => {
    window.location.href = '';
  };
  
  document.body.appendChild(button);
}

// Check for new important updates
async function checkForNewUpdates() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Get user's last seen time
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    let lastSeen = new Date(0);
    if (userSnap.exists() && userSnap.data().lastSeenUpdates) {
      lastSeen = userSnap.data().lastSeenUpdates.toDate();
    }
    
    // Get latest important update
    const updatesRef = collection(db, "updates");
    const q = query(
      updatesRef,
      where("priority", "==", "important"),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const latestUpdate = snapshot.docs[0].data();
      const latestTime = latestUpdate.createdAt.toDate();
      
      const dot = document.getElementById('notification-dot');
      if (dot && latestTime > lastSeen) {
        dot.style.display = 'block';
      } else if (dot) {
        dot.style.display = 'none';
      }
    }
  } catch (error) {
    console.error("Error checking updates:", error);
  }
}

// Update last seen time
async function updateLastSeen() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      lastSeenUpdates: serverTimestamp()
    });
    
    // Hide notification dot
    const dot = document.getElementById('notification-dot');
    if (dot) dot.style.display = 'none';
    
  } catch (error) {
    console.error("Error updating last seen:", error);
  }
}

// ===== UPDATES PAGE FUNCTIONS =====

// Load updates for a specific type
async function loadUpdates(type) {
  try {
    const containerId = type === 'whats_new' ? 'whats-new-list' : 'notices-list';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state">Loading...</div>';
    
    const updatesRef = collection(db, "updates");
    const q = query(
      updatesRef,
      where("type", "==", type),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
      limit(70)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '';
      document.getElementById('empty-state').style.display = 'block';
      return;
    }
    
    document.getElementById('empty-state').style.display = 'none';
    container.innerHTML = '';
    
    // Get user's last seen time
    let lastSeen = new Date(0);
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().lastSeenUpdates) {
        lastSeen = userSnap.data().lastSeenUpdates.toDate();
      }
    }
    
    // Create update cards
    snapshot.forEach(docSnap => {
      const update = docSnap.data();
      const updateTime = update.createdAt.toDate();
      const isNew = updateTime > lastSeen;
      
      const card = document.createElement('div');
      card.className = `update-card ${isNew ? 'new' : ''}`;
      card.onclick = () => viewUpdate(docSnap.id);
      
      const icon = type === 'whats_new' ? '🎉' : '📢';
      const timeAgo = getTimeAgo(update.createdAt);
      
      card.innerHTML = `
        <div class="update-icon">${icon}</div>
        <h3 class="update-title">${update.title}</h3>
        <p class="update-preview">${update.preview || 'Click to read more...'}</p>
        <div class="update-footer">
          <span>${timeAgo}</span>
          <button class="read-btn" onclick="event.stopPropagation(); viewUpdate('${docSnap.id}')">
            Read →
          </button>
        </div>
      `;
      
      container.appendChild(card);
    });
    
  } catch (error) {
    console.error(`Error loading ${type}:`, error);
    const containerId = type === 'whats_new' ? 'whats-new-list' : 'notices-list';
    document.getElementById(containerId).innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Failed to load</h3>
        <p>Please check your connection and try again.</p>
      </div>
    `;
  }
}

// Load single update
async function loadUpdate(updateId) {
  try {
    const container = document.getElementById('update-content');
    if (!container) return;
    
    const updateRef = doc(db, "updates", updateId);
    const updateSnap = await getDoc(updateRef);
    
    if (!updateSnap.exists()) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <h3>Update not found</h3>
          <p>This update may have been removed.</p>
        </div>
      `;
      return;
    }
    
    const update = updateSnap.data();
    const icon = update.type === 'whats_new' ? '🎉' : '📢';
    const date = update.createdAt.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    container.innerHTML = `
      <div class="update-header-full">
        <div class="update-icon-large">${icon}</div>
        <h1 class="update-title-full">${update.title}</h1>
        <div class="update-meta">📅 ${date} | 👤 Admin</div>
      </div>
      <div class="update-content-full">
        ${update.content || '<p>No content available.</p>'}
      </div>
      <div style="margin-top: 30px; display: flex; gap: 15px;">
        <button class="back-btn" onclick="goBack()" style="flex: 1;">← Back</button>
        <button class="read-btn" onclick="shareUpdate()" style="flex: 1;">🔗 Share</button>
      </div>
    `;
    
    // Update last seen time
    updateLastSeen();
    
  } catch (error) {
    console.error("Error loading update:", error);
  }
}

// View update (redirect to view page)
function viewUpdate(updateId) {
  window.location.href = `view.html?id=${updateId}`;
}

// Share update
function shareUpdate() {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({
      title: document.querySelector('.update-title-full')?.textContent || 'JOYIN Update',
      url: url
    });
  } else {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  }
}

// Time ago helper
function getTimeAgo(timestamp) {
  const now = new Date();
  const date = timestamp.toDate();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== BUG REPORT & FEEDBACK =====

// Submit bug report
async function submitBugReport(title, description) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Please login to submit bug report');
      return false;
    }
    
    const bugsRef = collection(db, "bug_reports");
    await setDoc(doc(bugsRef), {
      title: title,
      description: description,
      userId: user.uid,
      status: "pending",
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error submitting bug report:", error);
    return false;
  }
}

// Submit feedback
async function submitFeedback(message, category) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Please login to submit feedback');
      return false;
    }
    
    const feedbackRef = collection(db, "feedback");
    await setDoc(doc(feedbackRef), {
      message: message,
      category: category,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return false;
  }
}

// ===== INITIALIZATION =====

// Initialize updates button on main pages
if (window.location.pathname.includes('index.html') || 
    window.location.pathname === '/' ||
    window.location.pathname.includes('user/')) {
  
  document.addEventListener('DOMContentLoaded', function() {
    createUpdatesButton();
    
    onAuthStateChanged(auth, (user) => {
      if (user) {
        checkForNewUpdates();
        setInterval(checkForNewUpdates, 300000); // Check every 5 minutes
      }
    });
  });
}

// Add this at the END of user/script.js:

// Export all functions for global use
window.createUpdatesButton = createUpdatesButton;
window.checkForNewUpdates = checkForNewUpdates;
window.updateLastSeen = updateLastSeen;
window.loadUpdates = loadUpdates;
window.loadUpdate = loadUpdate;
window.viewUpdate = viewUpdate;
window.shareUpdate = shareUpdate;
window.submitBugReport = submitBugReport;
window.submitFeedback = submitFeedback;