// Firebase initialization using ES module CDN imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
  limit
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js';
import {
  getMessaging,
  getToken,
  onMessage
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js';

const firebaseConfig = {
  apiKey: "AIzaSyBn6C812V1sK_lykCOBCtj9JiDzVOS273E",
  authDomain: "accios-core.firebaseapp.com",
  projectId: "accios-core",
  storageBucket: "accios-core.firebasestorage.app",
  messagingSenderId: "164885309575",
  appId: "1:164885309575:web:eb3786008cbc5a7335b022",
  measurementId: "G-K77G92NGZP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase Messaging — may fail in contexts without service worker (e.g., incognito)
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('[Firebase] Messaging init skipped:', e.message);
}

export {
  db,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
  messaging,
  getToken,
  onMessage,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
  limit
};
