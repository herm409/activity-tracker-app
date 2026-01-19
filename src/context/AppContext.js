import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig, appId } from '../firebaseConfig';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                setUser(currentUser);
                if (currentUser) {
                    // Fetch profile immediately on auth
                    const profileRef = doc(dbInstance, 'artifacts', appId, 'users', currentUser.uid);
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists()) {
                        setUserProfile({ ...profileSnap.data(), uid: currentUser.uid });
                    } else {
                        setUserProfile({ uid: currentUser.uid });
                    }
                } else {
                    setUserProfile({});
                }
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization error:", error);
            setLoading(false);
        }
    }, []);

    const signOut = async () => {
        if (auth) {
            await firebaseSignOut(auth);
            setUserProfile({});
        }
    };

    return (
        <AppContext.Provider value={{ db, auth, user, userProfile, setUserProfile, loading, signOut }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
