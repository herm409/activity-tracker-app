import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, limit, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronUp, ChevronDown, Plus, X, List, BarChart2, Target, Users, PhoneCall, Briefcase, Trash2, Trophy, LogOut, Share2, Flame, Edit2, Calendar } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyB3vzQe54l3ajY2LrwF_ZlwImxvhKwvLLw",
    authDomain: "activitytracker-e2b7a.firebaseapp.com",
    databaseURL: "https://activitytracker-e2b7a-default-rtdb.firebaseio.com",
    projectId: "activitytracker-e2b7a",
    storageBucket: "activitytracker-e2b7a.firebasestorage.app",
    messagingSenderId: "242270405649",
    appId: "1:242270405649:web:4492617a8bac02d551ddb0",
    measurementId: "G-PJ70LQMDVG"
};
const finalFirebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : firebaseConfig;
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

// --- Helper Functions ---
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// --- Main App Component ---
const App = () => {
    // --- State Management ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState({});
    const [showNameModal, setShowNameModal] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [lastMonthData, setLastMonthData] = useState({});
    const [monthlyGoals, setMonthlyGoals] = useState({ exposures: 0, followUps: 0, sitdowns: 0, pbrs: 0, threeWays: 0 });
    const [hotlist, setHotlist] = useState([]);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [activeTab, setActiveTab] = useState('tracker');
    const [showAddHotlistModal, setShowAddHotlistModal] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState(null);

    // --- Firebase Initialization ---
    useEffect(() => {
        try {
            const app = initializeApp(finalFirebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
                setUser(currentUser);
                setLoading(false);
            });
            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase initialization error:", error);
            setLoading(false);
        }
    }, []);
    
    // --- Data Fetching and Saving ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthYearId = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonthYearId = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;


    const fetchData = useCallback(async () => {
        if (!user || !db) return;

        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            setUserProfile({ ...profileData, uid: user.uid });
            if (!profileData.displayName) {
                setShowNameModal(true);
            }
        } else {
            setShowNameModal(true);
        }

        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setMonthlyData(data.dailyData || {});
            setMonthlyGoals(data.monthlyGoals || { exposures: 0, followUps: 0, sitdowns: 0, pbrs: 0, threeWays: 0 });
        } else {
            setMonthlyData({});
            setMonthlyGoals({ exposures: 0, followUps: 0, sitdowns: 0, pbrs: 0, threeWays: 0 });
        }
        
        const lastMonthDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', lastMonthYearId);
        const lastMonthDocSnap = await getDoc(lastMonthDocRef);
        if (lastMonthDocSnap.exists()) {
            setLastMonthData(lastMonthDocSnap.data().dailyData || {});
        } else {
            setLastMonthData({});
        }

        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const hotlistQuery = query(hotlistColRef, limit(10));
        const hotlistSnapshot = await getDocs(hotlistQuery);
        setHotlist(hotlistSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

    }, [user, db, monthYearId, lastMonthYearId]);

    const handleSetDisplayName = async (name) => {
        if (!user || !db || !name.trim()) {
            setShowNameModal(false);
            return;
        }
        const trimmedName = name.trim();
        const newProfile = { ...userProfile, displayName: trimmedName };
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, newProfile, { merge: true });
        setUserProfile(newProfile);
        setShowNameModal(false);
    };

    const fetchAnalytics = useCallback(async () => {
        if (!user || !db) return;
        const analyticsPromises = [];
        const monthLabels = [];
        let tempDate = new Date();
        for (let i = 0; i < 6; i++) {
            const y = tempDate.getFullYear();
            const m = tempDate.getMonth();
            const myId = `${y}-${String(m + 1).padStart(2, '0')}`;
            monthLabels.unshift(tempDate.toLocaleString('default', { month: 'short', year: 'numeric' }));
            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', myId);
            analyticsPromises.unshift(getDoc(docRef));
            tempDate.setMonth(tempDate.getMonth() - 1);
        }
        const docSnaps = await Promise.all(analyticsPromises);
        const processedData = docSnaps.map((snap, index) => {
            const totals = { name: monthLabels[index], Exposures: 0, 'Follow Ups': 0, Sitdowns: 0 };
            if (snap.exists()) {
                const data = snap.data().dailyData || {};
                Object.values(data).forEach(day => {
                    totals.Exposures += Number(day.exposures) || 0;
                    totals['Follow Ups'] += Number(day.followUps) || 0;
                    totals.Sitdowns += Array.isArray(day.sitdowns) ? day.sitdowns.length : 0;
                });
            }
            return totals;
        });
        setAnalyticsData(processedData);
    }, [user, db]);

    useEffect(() => {
        if (user && db) {
           if(activeTab === 'hotlist' && !hotlist.length) fetchData();
           if(activeTab === 'analytics') fetchAnalytics();
           if (activeTab === 'tracker') fetchData();
        }
    }, [user, db, currentDate, fetchData, fetchAnalytics, activeTab, hotlist.length]);

    const updateLeaderboard = useCallback(async (currentMonthData) => {
        if (!user || !db || !userProfile.displayName) return;
        const totalExposures = Object.values(currentMonthData).reduce((sum, day) => sum + (Number(day.exposures) || 0), 0);
        const leaderboardRef = doc(db, 'artifacts', appId, 'leaderboard', monthYearId, 'entries', user.uid);
        await setDoc(leaderboardRef, {
            displayName: userProfile.displayName,
            exposures: totalExposures,
            userId: user.uid
        });
    }, [user, db, userProfile.displayName, monthYearId]);

    const debouncedSave = useMemo(() => debounce(async (dataToSave, goalsToSave) => {
        if (!user || !db) return;
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        await setDoc(docRef, { dailyData: dataToSave, monthlyGoals: goalsToSave }, { merge: true });
        if (dataToSave) {
            updateLeaderboard(dataToSave);
        }
    }, 1500), [user, db, monthYearId, updateLeaderboard]);

    const handleDataChange = (day, field, value) => {
        const updatedData = { ...monthlyData, [day]: { ...monthlyData[day], [field]: value } };
        setMonthlyData(updatedData);
        debouncedSave(updatedData, monthlyGoals);
    };

    const handleGoalChange = (goalKey, value) => {
        const newGoals = { ...monthlyGoals, [goalKey]: Number(value) || 0 };
        setMonthlyGoals(newGoals);
        debouncedSave(monthlyData, newGoals);
    };
    
    const addHotlistItem = () => setShowAddHotlistModal(true);
    
    const handleConfirmAddHotlistItem = async (name) => {
        if (!user || !db || !name) { setShowAddHotlistModal(false); return; }
        const newItem = { name, notes: "" };
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist'), newItem);
        setHotlist([...hotlist, { id: docRef.id, ...newItem }]);
        setShowAddHotlistModal(false);
    };
    
    const updateHotlistItem = async (id, field, value) => {
        if (!user || !db) return;
        const updatedList = hotlist.map(item => item.id === id ? { ...item, [field]: value } : item);
        setHotlist(updatedList);
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hotlist', id);
        await setDoc(docRef, { [field]: value }, { merge: true });
    };

    const deleteHotlistItem = (id) => setDeletingItemId(id);
    
    const handleConfirmDelete = async () => {
        if (!user || !db || !deletingItemId) { setDeletingItemId(null); return; }
        setHotlist(hotlist.filter(item => item.id !== deletingItemId));
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'hotlist', deletingItemId));
        setDeletingItemId(null);
    };
    
    const handleSignOut = async () => auth && await signOut(auth);
    
    const handleShareReport = async () => {
        if (navigator.share) {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23,59,59,999);
            const startOfLastWeek = new Date(startOfWeek);
            startOfLastWeek.setDate(startOfWeek.getDate() - 7);
            const endOfLastWeek = new Date(startOfWeek);
            endOfLastWeek.setDate(startOfWeek.getDate() - 1);
            
            const getWeekTotals = (startDate, endDate) => {
                const totals = { Exposures: 0, 'Follow Ups': 0, Sitdowns: 0, PBRS: 0 };
                let current = new Date(startDate);
                while(current <= endDate) {
                    const monthDataDocId = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                    if (monthDataDocId === monthYearId) {
                        const dayData = monthlyData[current.getDate()];
                        if(dayData) {
                            totals.Exposures += Number(dayData.exposures) || 0;
                            totals['Follow Ups'] += Number(dayData.followUps) || 0;
                            totals.Sitdowns += Array.isArray(dayData.sitdowns) ? dayData.sitdowns.length : 0;
                            totals.PBRS += Number(dayData.pbrs) || 0;
                        }
                    }
                    current.setDate(current.getDate() + 1);
                }
                return totals;
            };

            const thisWeekTotals = getWeekTotals(startOfWeek, endOfWeek);
            const lastWeekTotals = getWeekTotals(startOfLastWeek, endOfLastWeek);

            let shareText = `My Activity Tracker Report\nFrom: ${userProfile.displayName}\nWeek of: ${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}\n\n`;
            shareText += `**This Week's Numbers:**\n- Exposures: ${thisWeekTotals.Exposures}\n- Follow Ups: ${thisWeekTotals['Follow Ups']}\n- Sitdowns: ${thisWeekTotals.Sitdowns}\n- PBRS: ${thisWeekTotals.PBRS}\n\n`;
            shareText += `**Last Week's Numbers:**\n- Exposures: ${lastWeekTotals.Exposures}\n- Follow Ups: ${lastWeekTotals['Follow Ups']}\n- Sitdowns: ${lastWeekTotals.Sitdowns}\n- PBRS: ${lastWeekTotals.PBRS}\n\n`;
            shareText += "--------------------\n\n";
            shareText += `My "10 in Play" Hotlist\n\n`;
            if (hotlist.length === 0) {
                shareText += "My list is currently empty.";
            } else {
                hotlist.forEach((item, index) => {
                    shareText += `${index + 1}. ${item.name}\n`;
                    if (item.notes) {
                        shareText += `- Notes: ${item.notes}\n\n`;
                    } else {
                        shareText += `\n`;
                    }
                });
            }
            shareText += "\nSent from my Activity Tracker App";

            try {
                await navigator.share({ title: 'My Weekly Activity Report', text: shareText });
            } catch (error) { console.error('Error sharing:', error); }
        } else {
            alert('Your browser does not support the share feature.');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading...</div></div>;
    
    if (!user) return <AuthPage auth={auth} />;

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Header displayName={userProfile.displayName} onSignOut={handleSignOut} />
                <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="mt-6">
                    {activeTab === 'tracker' && <ActivityTracker date={currentDate} setDate={setCurrentDate} goals={monthlyGoals} onGoalChange={handleGoalChange} data={{current: monthlyData, last: lastMonthData}} onDataChange={handleDataChange} onShare={handleShareReport} user={user} userProfile={userProfile} setUserProfile={setUserProfile} />}
                    {activeTab === 'hotlist' && <HotList list={hotlist} onAdd={addHotlistItem} onUpdate={updateHotlistItem} onDelete={deleteHotlistItem} />}
                    {activeTab === 'analytics' && <AnalyticsDashboard data={analyticsData} />}
                    {activeTab === 'leaderboard' && <Leaderboard db={db} monthYearId={monthYearId} />}
                </main>
                {showNameModal && <DisplayNameModal onSave={handleSetDisplayName} />}
                {showAddHotlistModal && <AddHotlistItemModal onClose={() => setShowAddHotlistModal(false)} onAdd={handleConfirmAddHotlistItem} />}
                {deletingItemId && <ConfirmDeleteModal onClose={() => setDeletingItemId(null)} onConfirm={handleConfirmDelete} />}
            </div>
        </div>
    );
};

const AuthPage = ({ auth }) => {
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const handleAction = async (e) => {
        e.preventDefault();
        setError('');
        if (!auth) { setError("Authentication service is not available."); return; }
        try {
            if (isSignUp) { await createUserWithEmailAndPassword(auth, email, password); } 
            else { await signInWithEmailAndPassword(auth, email, password); }
        } catch (err) { setError(err.message); }
    };
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="text-center mb-8"><h1 className="text-4xl font-bold">Activity Tracker</h1><p className="text-lg text-gray-500 mt-1">Sign in or create an account.</p></div>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <form onSubmit={handleAction}>
                    <div className="p-6 space-y-4">
                        {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md">{error}</p>}
                        <div><label className="block text-sm font-medium">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md" /></div>
                        <div><label className="block text-sm font-medium">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md" /></div>
                    </div>
                    <div className="p-4 bg-gray-50 flex flex-col items-center space-y-2 rounded-b-lg">
                        <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">{isSignUp ? 'Sign Up' : 'Login'}</button>
                        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-indigo-600 hover:underline">{isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Header = ({ displayName, onSignOut }) => (
    <header className="mb-6 flex justify-between items-start">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Activity Tracker</h1>
            <p className="text-md sm:text-lg text-gray-500 mt-1">{displayName ? `Welcome, ${displayName}` : 'Your dashboard for business growth.'}</p>
        </div>
        <button onClick={onSignOut} className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition text-sm">
            <LogOut className="h-4 w-4 mr-2"/>Sign Out
        </button>
    </header>
);

const TabBar = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'tracker', name: 'Tracker', icon: Calendar },
        { id: 'leaderboard', name: 'Leaderboard', icon: Trophy }, 
        { id: 'hotlist', name: '10 in Play', icon: List }, 
        { id: 'analytics', name: 'Analytics', icon: BarChart2 } 
    ];

    return (
        <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${ activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' } whitespace-nowrap py-3 px-1 sm:py-4 border-b-2 font-medium text-sm flex items-center`}>
                <tab.icon className="mr-2 h-5 w-5" />{tab.name}
            </button>))}
        </nav></div>
    );
};

const Leaderboard = ({ db, monthYearId }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchScores = async () => {
            if (!db) return;
            setLoading(true);
            const scoresColRef = collection(db, 'artifacts', appId, 'leaderboard', monthYearId, 'entries');
            const q = query(scoresColRef, orderBy('exposures', 'desc'), limit(25));
            try {
                const querySnapshot = await getDocs(q);
                setScores(querySnapshot.docs.map(doc => doc.data()));
            } catch (error) { console.error("Error fetching leaderboard:", error); }
            setLoading(false);
        };
        fetchScores();
    }, [db, monthYearId]);

    if (loading) return <div className="text-center p-10">Loading Leaderboard...</div>;
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Top 25 Performers</h2>
            {scores.length === 0 ? (<p className="text-gray-500">The leaderboard is empty.</p>) : (
                <ol className="space-y-3">
                    {scores.map((score, index) => (
                        <li key={score.userId} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                            <div className="flex items-center"><span className="text-lg font-bold text-gray-400 w-8">{index + 1}</span><span className="font-medium">{score.displayName}</span></div>
                            <span className="font-bold text-lg text-indigo-600">{score.exposures}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};

const ActivityTracker = ({ date, setDate, goals, onGoalChange, data, onDataChange, onShare, user, userProfile, setUserProfile }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const year = date.getFullYear();
    const month = date.getMonth();
    const changeMonth = (offset) => { const newDate = new Date(date); newDate.setMonth(date.getMonth() + offset); setDate(newDate); };
    
    const calendarDays = useMemo(() => {
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) { days.push({ isBlank: true, day: `blank-${i}` }); }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayData = data.current[day] || {};
            const isPast = isCurrentMonth && day < today.getDate();
            const noActivity = Object.keys(dayData).filter(k => k !== 'exerc' && k !== 'read').length === 0 || (Number(dayData.exposures || 0) === 0 && Number(dayData.followUps || 0) === 0 && (dayData.sitdowns || []).length === 0);
            days.push({ day, isBlank: false, data: dayData, hasNoActivity: isPast && noActivity });
        }
        return days;
    }, [year, month, data]);

    const monthlyTotals = useMemo(() => {
        return Object.values(data.current).reduce((acc, dayData) => {
            acc.exposures += Number(dayData.exposures) || 0;
            acc.followUps += Number(dayData.followUps) || 0;
            acc.sitdowns += Array.isArray(dayData.sitdowns) ? dayData.sitdowns.length : 0;
            acc.pbrs += Number(dayData.pbrs) || 0;
            acc.threeWays += Number(dayData.threeWays) || 0;
            return acc;
        }, { exposures: 0, followUps: 0, sitdowns: 0, pbrs: 0, threeWays: 0 });
    }, [data.current]);

    const streaks = useMemo(() => {
        const calculateAndUpdateStreak = (activityKey) => {
            if (!user || !userProfile.uid || !data) return 0;
            
            let currentStreak = 0;
            const today = new Date();
            let dayToCheck = new Date(today);
    
            while (true) {
                const monthData = dayToCheck.getMonth() === today.getMonth() ? data.current : data.last;
                if (!monthData) break;
    
                const dayData = monthData[dayToCheck.getDate()];
                let hasActivity = false;
                if (dayData) {
                    if (Array.isArray(dayData[activityKey])) hasActivity = dayData[activityKey].length > 0;
                    else hasActivity = Number(dayData[activityKey]) > 0;
                }
    
                if (hasActivity) {
                    currentStreak++;
                    dayToCheck.setDate(dayToCheck.getDate() - 1);
                } else {
                    break;
                }
            }
            
            const longestStreaks = userProfile.longestStreaks || {};
            if (currentStreak > (longestStreaks[activityKey] || 0)) {
                const newLongestStreaks = {...longestStreaks, [activityKey]: currentStreak };
                const db = getFirestore();
                const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
                setDoc(profileRef, { longestStreaks: newLongestStreaks }, { merge: true });
                setUserProfile(prev => ({...prev, longestStreaks: newLongestStreaks}));
            }
            return currentStreak;
        };
        
        return {
            exposures: calculateAndUpdateStreak('exposures'),
            followUps: calculateAndUpdateStreak('followUps'),
            sitdowns: calculateAndUpdateStreak('sitdowns'),
            pbrs: calculateAndUpdateStreak('pbrs'),
            threeWays: calculateAndUpdateStreak('threeWays'),
        };

    }, [data, user, userProfile, setUserProfile]);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const handleDayClick = (day) => { if(!day.isBlank) setSelectedDay(day.day); };
    const closeModal = () => setSelectedDay(null);
    const handleModalDataChange = (field, value) => onDataChange(selectedDay, field, value);

    const activityColors = {
        exposures: 'bg-blue-500',
        followUps: 'bg-green-500',
        sitdowns: 'bg-amber-500',
        pbrs: 'bg-purple-500',
        threeWays: 'bg-pink-500',
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div className="flex items-center mb-4 sm:mb-0">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronDown className="h-5 w-5 rotate-90" /></button>
                    <h2 className="text-xl sm:text-2xl font-semibold w-36 sm:w-48 text-center">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronUp className="h-5 w-5 rotate-90" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, index) => <div key={`${day}-${index}`} className="text-center font-semibold text-xs text-gray-500 py-2">{day}</div>)}
                {calendarDays.map((d) => (
                    <div key={d.day} onClick={() => handleDayClick(d)} className={`border rounded-md aspect-square p-1 sm:p-2 flex flex-col ${d.isBlank ? 'bg-gray-50' : 'cursor-pointer hover:bg-indigo-50'}`}>
                        {!d.isBlank && (
                            <>
                                <span className={`font-medium text-xs sm:text-sm ${d.hasNoActivity ? 'text-red-500' : ''}`}>{d.day}</span>
                                <div className="flex justify-center items-end space-x-1 mt-auto h-2">
                                    {d.data.exposures > 0 && <div className={`h-2 w-2 ${activityColors.exposures} rounded-full`}></div>}
                                    {d.data.followUps > 0 && <div className={`h-2 w-2 ${activityColors.followUps} rounded-full`}></div>}
                                    {d.data.sitdowns?.length > 0 && <div className={`h-2 w-2 ${activityColors.sitdowns} rounded-full`}></div>}
                                    {d.data.pbrs > 0 && <div className={`h-2 w-2 ${activityColors.pbrs} rounded-full`}></div>}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            <TotalsFooter totals={monthlyTotals} onShare={onShare} streaks={streaks} goals={goals} onGoalChange={onGoalChange} userProfile={userProfile}/>
            {selectedDay && <DayEntryModal day={selectedDay} data={data.current[selectedDay] || {}} onClose={closeModal} onChange={handleModalDataChange} />}
        </div>
    );
};

const TotalsFooter = ({ totals, onShare, streaks, goals, onGoalChange, userProfile }) => {
    const [editingGoal, setEditingGoal] = useState(null); 
    const longestStreaks = userProfile.longestStreaks || {};

    const metrics = [
        { key: 'exposures', label: 'Total Exposures', value: totals.exposures, icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', value: totals.followUps, icon: Users, color: 'green' },
        { key: 'sitdowns', label: 'Sitdowns', value: totals.sitdowns, icon: Briefcase, color: 'amber' },
        { key: 'pbrs', label: 'PBRS', value: totals.pbrs, icon: Users, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: totals.threeWays, icon: PhoneCall, color: 'pink' }
    ];
    
    const handleGoalEdit = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            onGoalChange(editingGoal, e.target.value);
            setEditingGoal(null);
        }
    };
    
    const WEEKS_IN_MONTH = 4.33;

    return (
        <div className="mt-6 pt-5 border-t border-gray-200">
            <div className="flex justify-end mb-4">
                 <button onClick={onShare} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm">
                    <Share2 className="h-4 w-4 mr-2" /> Share Weekly Report
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map(metric => {
                    const goal = goals[metric.key] || 0;
                    const progress = goal > 0 ? (metric.value / goal) * 100 : 0;
                    const weeklyPace = Math.ceil(goal / WEEKS_IN_MONTH);
                    const currentStreak = streaks[metric.key] || 0;
                    const longestStreak = longestStreaks[metric.key] || 0;

                    return (
                        <div key={metric.key} className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className={`text-sm sm:text-md font-semibold text-gray-600`}>{metric.label}</h4>
                                    <p className={`text-4xl sm:text-5xl font-bold text-gray-900 mt-1`}>{metric.value}</p>
                                </div>
                                <metric.icon className={`h-8 w-8 text-${metric.color}-400`} />
                            </div>
                            <div className="mt-4 flex space-x-4">
                                <div className="flex items-center text-xs text-gray-500">
                                    <Flame className="h-4 w-4 mr-1 text-amber-500"/>
                                    <span>Current: <strong>{currentStreak}</strong></span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                     <Trophy className="h-4 w-4 mr-1 text-gray-400"/>
                                     <span>Longest: <strong>{longestStreak}</strong></span>
                                </div>
                            </div>
                            <div className="mt-auto pt-4">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span 
                                        onClick={() => setEditingGoal(metric.key)}
                                        className="cursor-pointer hover:text-indigo-600"
                                    >
                                        Goal: {editingGoal === metric.key ? 
                                            <input 
                                                type="number"
                                                defaultValue={goal}
                                                onKeyDown={handleGoalEdit}
                                                onBlur={handleGoalEdit}
                                                autoFocus
                                                className="w-12 text-center bg-gray-100 rounded"
                                            /> : <span>{goal} <Edit2 className="h-3 w-3 inline-block ml-1"/></span>
                                        }
                                    </span>
                                    {goal > 0 && <span className="font-semibold">(~{weeklyPace}/wk)</span>}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                    <div className={`bg-${metric.color}-500 h-2.5 rounded-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const DayEntryModal = ({ day, data, onClose, onChange }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center"><h3 className="text-lg sm:text-xl font-semibold">Activities for Day {day}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Exposures</label><NumberInput value={data.exposures || ''} onChange={e => onChange('exposures', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Follow Ups</label><NumberInput value={data.followUps || ''} onChange={e => onChange('followUps', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Team Calls</label><NumberInput value={data.teamCalls || ''} onChange={e => onChange('teamCalls', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">3 Ways</label><NumberInput value={data.threeWays || ''} onChange={e => onChange('threeWays', e.target.value)} /></div>
                   <SitdownTracker value={data.sitdowns} onChange={val => onChange('sitdowns', val)} />
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">PBRS</label><NumberInput value={data.pbrs || ''} onChange={e => onChange('pbrs', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Gameplans</label><NumberInput value={data.gameplans || ''} onChange={e => onChange('gameplans', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Exercise</label><CheckboxInput checked={!!data.exerc} onChange={e => onChange('exerc', e.target.checked)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Read</label><CheckboxInput checked={!!data.read} onChange={e => onChange('read', e.target.checked)} /></div>
                </div>
                <div className="p-4 bg-gray-50 text-right rounded-b-lg"><button onClick={onClose} className="bg-indigo-600 text-white px-5 py-2 rounded-md">Done</button></div>
            </div>
        </div>
    );
};

const SitdownTracker = ({ value = [], onChange }) => {
    const options = { 'P': 'Phone', 'Z': 'Zoom', 'V': 'Video', 'D': 'DM Mtg', 'E': 'Enroll' };
    const [isAdding, setIsAdding] = useState(false);
    const handleAdd = (type) => { const newValue = [...value, type]; onChange(newValue); setIsAdding(false); };
    const handleRemove = (indexToRemove) => { const newValue = value.filter((_, index) => index !== indexToRemove); onChange(newValue); };
    return (
        <div className="pt-2">
            <label className="font-medium text-gray-700">Sitdowns ({value.length})</label>
            <div className="mt-2 space-y-2">
                {value.map((sitdown, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                        <span className="text-sm">{options[sitdown] || 'Unknown'}</span>
                        <button onClick={() => handleRemove(index)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
                {isAdding ? (
                     <select onChange={(e) => handleAdd(e.target.value)} onBlur={() => setIsAdding(false)} className="w-full bg-white border p-2 rounded-md" autoFocus>
                        <option value="">Select type...</option>
                        {Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                     </select>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full flex items-center justify-center bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md"><Plus className="h-4 w-4 mr-2" /> Add Sitdown</button>
                )}
            </div>
        </div>
    );
};

const HotList = ({ list, onAdd, onUpdate, onDelete }) => {
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl sm:text-2xl font-semibold">10 in Play / Hot List</h2>{list.length < 10 && <button onClick={onAdd} className="flex items-center bg-indigo-600 text-white px-3 py-2 rounded-md"><Plus className="h-5 w-5 mr-1" /> Add Item</button>}</div>
            <div className="space-y-4">
                {list.map(item => (
                    <div key={item.id} className="p-4 border rounded-lg">
                         <div className="flex justify-between items-start">
                             <input type="text" value={item.name} onChange={(e) => onUpdate(item.id, 'name', e.target.value)} className="text-md sm:text-lg font-semibold border-none p-0 w-full" placeholder="Enter name..." />
                             <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-500"><X className="h-5 w-5"/></button>
                         </div>
                         <textarea value={item.notes} onChange={(e) => onUpdate(item.id, 'notes', e.target.value)} placeholder="Add notes..." className="mt-2 w-full text-sm text-gray-600 border-gray-200 rounded-md" rows="2"></textarea>
                     </div>
                ))}
                {list.length === 0 && <p className="text-gray-500">Your hot list is empty.</p>}
            </div>
        </div>
    );
};

const DisplayNameModal = ({ onSave }) => {
    const [name, setName] = useState('');
    const handleSave = () => { if (name.trim()) { onSave(name.trim()); } };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Welcome!</h3><p className="text-sm text-gray-600 mt-1">Please set your display name for the leaderboard.</p></div>
                <div className="p-6">
                    <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input type="text" id="display-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end"><button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Save Name</button></div>
            </div>
        </div>
    );
};

const AnalyticsDashboard = ({ data }) => {
    return (
        <div className="bg-white p-2 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center sm:text-left">Month-Over-Month Performance</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis tick={{fontSize: 12}} /><Tooltip /><Legend wrapperStyle={{fontSize: "14px"}} />
                        <Bar dataKey="Exposures" fill="#8884d8" /><Bar dataKey="Follow Ups" fill="#82ca9d" /><Bar dataKey="Sitdowns" fill="#ffc658" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const NumberInput = (props) => (
    <input type="number" min="0" className="w-20 p-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 transition" {...props} />
);
const CheckboxInput = (props) => (
    <input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition" {...props} />
);
const AddHotlistItemModal = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const handleAdd = () => { if (name.trim()) { onAdd(name.trim()); } };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Add New Hotlist Item</h3></div>
                <div className="p-6">
                    <label htmlFor="hotlist-name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" id="hotlist-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2"><button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Add</button></div>
            </div>
        </div>
    );
};
const ConfirmDeleteModal = ({ onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6"><h3 className="text-xl font-semibold">Confirm Deletion</h3><p className="mt-2 text-gray-600">Are you sure? This cannot be undone.</p></div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2"><button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded-md">Delete</button></div>
            </div>
        </div>
    );
};

export default App;

