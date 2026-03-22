import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAkcnYwx6oE2TkM4S8-OqoHQksgaAgPV18",
  authDomain: "carl-bot-b606c.web.app",
  projectId: "carl-bot-b606c",
  storageBucket: "carl-bot-b606c.firebasestorage.app",
  messagingSenderId: "954326871420",
  appId: "1:954326871420:web:d1488ef6331333ca1ac8f9",
  measurementId: "G-516XE570LE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
