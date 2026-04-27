import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4RIOriKLn8Q5f0sfsCjM7iUqhOEzz6Ac",
  authDomain: "loveapp-76fc7.firebaseapp.com",
  projectId: "loveapp-76fc7",
  storageBucket: "loveapp-76fc7.firebasestorage.app",
  messagingSenderId: "574970484156",
  appId: "1:574970484156:web:1793ed47bcc004813d07b9",
  measurementId: "G-6K8XMFQR1T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);