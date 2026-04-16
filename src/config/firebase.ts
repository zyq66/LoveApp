// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCqsEZUI2RMQV6Tju3puVT54va11I3EFso",
  authDomain: "love-slbum.firebaseapp.com",
  projectId: "love-slbum",
  storageBucket: "love-slbum.firebasestorage.app",
  messagingSenderId: "376542289174",
  appId: "1:376542289174:android:b05bc87ec969e07fd78437",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
