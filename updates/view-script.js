// user/view-script.js
import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
       <p> ${update.content || 'No content available.'}</p>
      </div>
      <div style="margin-top: 30px; display: flex; gap: 15px;">
        <button class="back-btn" onclick="goBack()" style="flex: 1;">← Back</button>
        <button class="read-btn" onclick="shareUpdate()" style="flex: 1;">🔗 Share</button>
      </div>
    `;
    
    // Update last seen time
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        lastSeenUpdates: serverTimestamp()
      });
    }
    
  } catch (error) {
    console.error("Error loading update:", error);
    const container = document.getElementById('update-content');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error loading update</h3>
        <p>Please try again later.</p>
        <button class="back-btn" onclick="goBack()" style="margin-top: 20px;">Go Back</button>
      </div>
    `;
  }
}

function goBack() {
  window.history.back();
}

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

// Get update ID from URL and load it
document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const updateId = urlParams.get('id');
  
  if (updateId) {
    loadUpdate(updateId);
  } else {
    document.getElementById('update-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3>Update not found</h3>
        <p>No update ID provided.</p>
        <button class="back-btn" onclick="goBack()" style="margin-top: 20px;">Go Back</button>
      </div>
    `;
  }
});