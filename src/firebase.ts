import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyB1sB7Fj53pqYYMS5iI8_ORIKaY2JsyUEo",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "ministylecards-web.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "ministylecards-web",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "ministylecards-web.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1042746385845",
  appId: env.VITE_FIREBASE_APP_ID || "1:1042746385845:web:144185ae459e1f5a0965fc",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-HLGXKC1J2Q"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
