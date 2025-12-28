// public/js/firebase.js
// 1. Import the specific functions you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
// 👇 Import the services JOYIN needs
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// 2. YOUR exact Firebase configuration (from the console)
const firebaseConfig = {
  apiKey: "AIzaSyDUBllvOmhR7O0KqjeWoxsMnxuHoWoNJYA",
  authDomain: "joyin-001.firebaseapp.com",
  projectId: "joyin-001",
  storageBucket: "joyin-001.firebasestorage.app",
  messagingSenderId: "557041273144",
  appId: "1:557041273144:web:a512b2e9df2c96b93399cd"
};

// 3. Initialize the core Firebase app
const app = initializeApp(firebaseConfig);

// 4. Initialize each SERVICE you need for JOYIN
const auth = getAuth(app);      // For user login/signup
const db = getFirestore(app);   // For storing posts, profiles, comments
const storage = getStorage(app); // For uploading profile pics and post images

// 5. Console log for confirmation

// console.log("🔥 JOYIN Firebase is LIVE! Project:", firebaseConfig.projectId);

// 6. Export the SERVICES, not just the 'app'
export { auth, db, storage };