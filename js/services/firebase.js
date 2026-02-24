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
  where
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD2AEivu-d8kiqpaXtcpAKfkxoItdlgj-U",
  authDomain: "business-woman-e3fc4.firebaseapp.com",
  projectId: "business-woman-e3fc4",
  storageBucket: "business-woman-e3fc4.firebasestorage.app",
  messagingSenderId: "1076636008936",
  appId: "1:1076636008936:web:1dec6f502b8425b5b1245d",
  measurementId: "G-73WF828EQV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
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
  where
};
