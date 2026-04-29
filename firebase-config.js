// Firebase Configuration & Initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCF3oh-FtpSOFjZchnjXpwf_AfUlxL1oTU",
  authDomain: "message-eval-dashboard.firebaseapp.com",
  projectId: "message-eval-dashboard",
  storageBucket: "message-eval-dashboard.firebasestorage.app",
  messagingSenderId: "542120965377",
  appId: "1:542120965377:web:4eb9948631c17e54de5700"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy };
