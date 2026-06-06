import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDc8_soIXMxHZbiJJctQkksZjHjd60YvZM",
  authDomain: "bell-dashboard.firebaseapp.com",
  projectId: "bell-dashboard",
  storageBucket: "bell-dashboard.firebasestorage.app",
  messagingSenderId: "931931634848",
  appId: "1:931931634848:web:68411cba14a594b8f21dc5",
  measurementId: "G-ZP2F3Q9733"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (optional, might not work in all environments if measurementId is not active)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Initialize Firestore for saving logs
export const db = getFirestore(app);
export { app, analytics };
