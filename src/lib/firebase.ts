import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let auth: any = null;
let isFirebaseActive = false;

// Check if credentials are set and not empty placeholders
if (
  firebaseConfig && 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.trim() !== '' && 
  firebaseConfig.apiKey !== 'YOUR_API_KEY'
) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    isFirebaseActive = true;
    console.log("SplitSmart Firebase Auth is active with live user credentials in production mode!");
  } catch (err) {
    console.error("SplitSmart Firebase Auth initialization failed:", err);
  }
} else {
  console.info("Firebase API Key is empty. Running SplitSmart Sandbox mode for local testing.");
}

export { auth, isFirebaseActive, firebaseConfig };
