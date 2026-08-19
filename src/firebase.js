import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken
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
// APP CHECK
// =====================================================

// THAY GIÁ TRỊ NÀY BẰNG reCAPTCHA Enterprise SITE KEY

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    "6Lf_LI4tAAAAAHNI9NVAqbWJ1EIOWqS6nSAyvYxC"
  ),
  isTokenAutoRefreshEnabled: true,
});

getToken(appCheck, true)
  .then((result) => {
    console.log("🔥 APP CHECK TOKEN OK:", result.token);
  })
  .catch((error) => {
    console.error("❌ APP CHECK ERROR:", error);
  });

// =====================================================
// FIRESTORE
// =====================================================

export const db = getFirestore(app);

// =====================================================
// AUTHENTICATION
// =====================================================

export const auth = getAuth(app);

