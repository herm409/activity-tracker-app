// --- Firebase Configuration ---
// Shared project: activitytracker-e2b7a (also hosts the Mighty auth bridge).
const defaultFirebaseConfig = {
    apiKey: "AIzaSyB3vzQe54l3ajY2LrwF_ZlwImxvhKwvLLw",
    authDomain: "activitytracker-e2b7a.firebaseapp.com",
    databaseURL: "https://activitytracker-e2b7a-default-rtdb.firebaseio.com",
    projectId: "activitytracker-e2b7a",
    storageBucket: "activitytracker-e2b7a.firebasestorage.app",
    messagingSenderId: "242270405649",
    appId: "1:242270405649:web:4492617a8bac02d551ddb0",
    measurementId: "G-PJ70LQMDVG"
};

export const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : defaultFirebaseConfig;
export const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

/** Central Mighty ↔ Firebase auth bridge (do not put OAuth secrets in this app). */
export const MIGHTY_LOGIN_BASE = 'https://mightylogin-vc2epchfzq-uc.a.run.app';

/**
 * Build the bridge login URL. After OAuth, bridge returns to this origin with ?token=.
 * Uses /callback so SPA can land cleanly (Netlify /* → index.html).
 */
export function getMightyLoginUrl() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://activity.wearetnv.com';
    const redirectUri = `${origin}/callback`;
    return `${MIGHTY_LOGIN_BASE}?redirect_uri=${encodeURIComponent(redirectUri)}`;
}
