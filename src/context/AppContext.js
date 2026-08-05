import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    signInWithCustomToken,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig, appId, getMightyLoginUrl } from '../firebaseConfig';
import {
    shouldAutoLoginViaBridge,
    startMightyIframeAutoLogin,
    clearIframeAutoLoginAttempt,
    isMightyIframeContext,
} from '../utils/mightyEmbed';

const AppContext = createContext();

/** Read bridge custom token from URL (?token=) and remove it from the address bar. */
function extractBridgeTokenFromUrl() {
    if (typeof window === 'undefined') return null;
    try {
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        if (!token) return null;

        url.searchParams.delete('token');
        const clean =
            url.pathname === '/callback' || url.pathname === '/callback/'
                ? `${url.origin}/`
                : `${url.origin}${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, document.title, clean);
        return token;
    } catch (err) {
        console.warn('Could not parse bridge token from URL:', err);
        return null;
    }
}

async function loadProfileAndClaims(dbInstance, currentUser) {
    let profile = { uid: currentUser.uid };
    try {
        const profileRef = doc(dbInstance, 'artifacts', appId, 'users', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            profile = { ...profileSnap.data(), uid: currentUser.uid };
        }
    } catch (err) {
        console.warn('Profile fetch failed:', err);
    }

    let claims = {};
    let plan = 'FREE';
    try {
        // Force refresh so bridge custom claims (plan, mightyId) are present
        const tokenResult = await currentUser.getIdTokenResult(true);
        claims = tokenResult.claims || {};
        plan = claims.plan || 'FREE';
    } catch (err) {
        console.warn('Claims refresh failed:', err);
    }

    return { profile, claims, plan };
}

export const AppProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState({});
    const [claims, setClaims] = useState({});
    const [plan, setPlan] = useState('FREE');
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    /** True while Approach A is sending the iframe to the bridge (show spinner). */
    const [iframeAutoLogin, setIframeAutoLogin] = useState(false);

    useEffect(() => {
        let unsubscribe = () => {};

        const init = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setAuth(authInstance);
                setDb(dbInstance);

                // Step 1: consume Mighty bridge custom token if present
                const bridgeToken = extractBridgeTokenFromUrl();
                if (bridgeToken) {
                    // Successful return from bridge — allow future iframe auto-login later
                    clearIframeAutoLoginAttempt();
                    try {
                        setAuthError(null);
                        await signInWithCustomToken(authInstance, bridgeToken);
                        // onAuthStateChanged will finish loading + claims
                    } catch (err) {
                        console.error('Bridge token sign-in failed:', err);
                        setAuthError(
                            err?.message ||
                                'Mighty sign-in failed. Please try again.'
                        );
                        setLoading(false);
                    }
                }

                unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                    setUser(currentUser);
                    if (currentUser) {
                        clearIframeAutoLoginAttempt();
                        const { profile, claims: nextClaims, plan: nextPlan } =
                            await loadProfileAndClaims(dbInstance, currentUser);
                        setUserProfile(profile);
                        setClaims(nextClaims);
                        setPlan(nextPlan);
                        setAuthError(null);
                        setIframeAutoLogin(false);
                        setLoading(false);
                        return;
                    }

                    setUserProfile({});
                    setClaims({});
                    setPlan('FREE');

                    // Approach A: unsigned + Mighty iframe → auto bridge (once per session)
                    const loginUrl = getMightyLoginUrl();
                    const { shouldRedirect, reason } = shouldAutoLoginViaBridge({
                        isSignedIn: false,
                        loginUrl,
                    });

                    if (shouldRedirect) {
                        console.log('[MightyEmbed] Auto-login via bridge:', reason);
                        setIframeAutoLogin(true);
                        // Keep loading=true so AuthPage does not flash
                        startMightyIframeAutoLogin(loginUrl);
                        return;
                    }

                    if (reason === 'already-attempted' && isMightyIframeContext()) {
                        console.log(
                            '[MightyEmbed] Auto-login already attempted; showing AuthPage'
                        );
                    }

                    setIframeAutoLogin(false);
                    setLoading(false);
                });
            } catch (error) {
                console.error('Firebase initialization error:', error);
                setAuthError(error?.message || 'Failed to start the app.');
                setLoading(false);
            }
        };

        init();
        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        if (auth) {
            await firebaseSignOut(auth);
            setUserProfile({});
            setClaims({});
            setPlan('FREE');
        }
    };

    /** Re-fetch custom claims (e.g. after a plan webhook update). */
    const refreshClaims = async () => {
        if (!auth?.currentUser) return null;
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        const nextClaims = tokenResult.claims || {};
        setClaims(nextClaims);
        setPlan(nextClaims.plan || 'FREE');
        return nextClaims;
    };

    return (
        <AppContext.Provider
            value={{
                db,
                auth,
                user,
                userProfile,
                setUserProfile,
                claims,
                plan,
                loading,
                authError,
                setAuthError,
                signOut,
                refreshClaims,
                iframeAutoLogin,
                isMightyIframe: typeof window !== 'undefined' ? isMightyIframeContext() : false,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
