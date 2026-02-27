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
  where,
  orderBy,
  addDoc,
  Timestamp,
  limit
};
