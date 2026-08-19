import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyA4RIOriKLn8Q5f0sfsCjM7iUqhOEzz6Ac",
  authDomain: "loveapp-76fc7.firebaseapp.com",
  projectId: "loveapp-76fc7",
  storageBucket: "loveapp-76fc7.firebasestorage.app",
  messagingSenderId: "574970484156",
  appId: "1:574970484156:web:1793ed47bcc004813d07b9",
  measurementId: "G-6K8XMFQR1T"
};

// =====================================================
// INITIALIZE FIREBASE
// =====================================================

const app = initializeApp(firebaseConfig);

// =====================================================
// FIRESTORE
// =====================================================

export const db = getFirestore(app);

// =====================================================
// AUTHENTICATION
// =====================================================

export const auth = getAuth(app);

// =====================================================
// APP CHECK
// =====================================================

// THAY GIÁ TRỊ NÀY BẰNG reCAPTCHA Enterprise SITE KEY
const appCheckSiteKey = "6Lf_LI4tAAAAAHNI9NVAqbWJ1EIOWqS6nSAyvYxC";

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),

  // Giai đoạn đầu để false để test trước
  isTokenAutoRefreshEnabled: true,
});