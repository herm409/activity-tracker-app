import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, limit, addDoc, deleteDoc, orderBy, where, getCountFromServer, updateDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronUp, ChevronDown, Plus, X, List, BarChart2, Target, Users, PhoneCall, Briefcase, Trash2, Trophy, LogOut, Share2, Flame, Edit2, Calendar, Minus, Info, Archive, ArchiveRestore } from 'lucide-react';
// Note: This implementation assumes html2canvas is loaded via a script tag in the main HTML file.
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

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
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showGoalInstruction, setShowGoalInstruction] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [lastMonthData, setLastMonthData] = useState({});
    const [monthlyGoals, setMonthlyGoals] = useState({ exposures: 0, followUps: 0, sitdowns: 0, pbrs: 0, threeWays: 0 });
    const [analyticsData, setAnalyticsData] = useState([]);
    const [activeTab, setActiveTab] = useState('tracker');
    
    // State for image report card generation
    const [isSharing, setIsSharing] = useState(false);
    const [reportCardData, setReportCardData] = useState(null);
    const reportCardRef = useRef(null);

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
        
        let profileData = {};
        if (profileSnap.exists()) {
            profileData = profileSnap.data();
            setUserProfile({ ...profileData, uid: user.uid });
            if (!profileData.displayName) {
                setShowNameModal(true);
            }
            if (!profileData.hasCompletedOnboarding) {
                setShowOnboarding(true);
            }
        } else {
            setShowNameModal(true);
            setShowOnboarding(true);
        }

        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        const docSnap = await getDoc(docRef);
        let currentGoals = { exposures: 0, followUps: 0, sitdowns: 0, pbrs: 0, threeWays: 0 };
        if (docSnap.exists()) {
            const data = docSnap.data();
            setMonthlyData(data.dailyData || {});
            currentGoals = data.monthlyGoals || currentGoals;
            setMonthlyGoals(currentGoals);
        } else {
            setMonthlyData({});
            setMonthlyGoals(currentGoals);
        }

        const allGoalsZero = Object.values(currentGoals).every(goal => goal === 0);
        if (!profileData.hasSeenGoalInstruction && allGoalsZero) {
            setShowGoalInstruction(true);
        }
        
        const lastMonthDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', lastMonthYearId);
        const lastMonthDocSnap = await getDoc(lastMonthDocRef);
        if (lastMonthDocSnap.exists()) {
            setLastMonthData(lastMonthDocSnap.data().dailyData || {});
        } else {
            setLastMonthData({});
        }
    }, [user, db, monthYearId, lastMonthYearId]);

    const handleSetDisplayName = async (name) => {
        if (!user || !db || !name.trim()) {
            setShowNameModal(false);
            setShowEditNameModal(false);
            return;
        }
        const trimmedName = name.trim();
        const newProfile = { ...userProfile, displayName: trimmedName };
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, newProfile, { merge: true });
        setUserProfile(newProfile);
        setShowNameModal(false);
        setShowEditNameModal(false);
    };

    const handleDismissOnboarding = async () => {
        if (!user || !db) return;
        setShowOnboarding(false);
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, { hasCompletedOnboarding: true }, { merge: true });
        setUserProfile(prev => ({ ...prev, hasCompletedOnboarding: true }));
    };

    const handleDismissGoalInstruction = async () => {
        if (!user || !db) return;
        setShowGoalInstruction(false);
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, { hasSeenGoalInstruction: true }, { merge: true });
        setUserProfile(prev => ({ ...prev, hasSeenGoalInstruction: true }));
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
            const totals = { name: monthLabels[index], Exposures: 0, 'Follow Ups': 0 };
            if (snap.exists()) {
                const data = snap.data().dailyData || {};
                Object.values(data).forEach(day => {
                    totals.Exposures += Number(day.exposures) || 0;
                    totals['Follow Ups'] += Number(day.followUps) || 0;
                });
            }
            return totals;
        });
        setAnalyticsData(processedData);
    }, [user, db]);

    useEffect(() => {
        if (user && db) {
           if(activeTab === 'analytics') fetchAnalytics();
           if (activeTab === 'tracker') fetchData();
        }
    }, [user, db, currentDate, fetchData, fetchAnalytics, activeTab]);

    const updateLeaderboard = useCallback(async (currentMonthData, targetMonthId) => {
        if (!user || !db || !userProfile.displayName) return;
        const totalExposures = Object.values(currentMonthData).reduce((sum, day) => sum + (Number(day.exposures) || 0), 0);
        const leaderboardRef = doc(db, 'artifacts', appId, 'leaderboard', targetMonthId, 'entries', user.uid);
        await setDoc(leaderboardRef, {
            displayName: userProfile.displayName,
            exposures: totalExposures,
            userId: user.uid
        });
    }, [user, db, userProfile.displayName]);

    const debouncedSave = useMemo(() => debounce(async (dataToSave, goalsToSave) => {
        if (!user || !db) return;
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        await setDoc(docRef, { dailyData: dataToSave, monthlyGoals: goalsToSave }, { merge: true });
        if (dataToSave) {
            updateLeaderboard(dataToSave, monthYearId);
        }
    }, 1500), [user, db, monthYearId, updateLeaderboard]);

    const handleDataChange = (date, field, value) => {
        const day = date.getDate();
        const targetMonthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (targetMonthId === monthYearId) {
            const updatedData = { ...monthlyData, [day]: { ...monthlyData[day], [field]: value } };
            setMonthlyData(updatedData);
            debouncedSave(updatedData, monthlyGoals);
        } else {
            const handleSave = async () => {
                if (!user || !db) return;
                
                if(targetMonthId === lastMonthYearId) {
                    const updatedLastMonthData = { ...lastMonthData, [day]: { ...lastMonthData[day], [field]: value } };
                    setLastMonthData(updatedLastMonthData);
                }

                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', targetMonthId);
                const docSnap = await getDoc(docRef);
                const existingData = docSnap.exists() ? docSnap.data() : { dailyData: {}, monthlyGoals: {} };
                const updatedDailyData = { ...existingData.dailyData, [day]: { ...existingData.dailyData[day], [field]: value } };
                
                await setDoc(docRef, { ...existingData, dailyData: updatedDailyData }, { merge: true });
                updateLeaderboard(updatedDailyData, targetMonthId);
            };
            handleSave();
        }
    };

    const handleQuickAdd = (metricKey, amount) => {
        const today = new Date();
        if (today.getFullYear() !== year || today.getMonth() !== month) {
            alert("Quick add is only available for the current day on the current month's view.");
            return;
        }
        const todayData = monthlyData[today.getDate()] || {};
        const currentValue = Number(todayData[metricKey]) || 0;
        const newValue = Math.max(0, currentValue + amount);

        handleDataChange(today, metricKey, newValue);
    };

    const handleGoalChange = (goalKey, value) => {
        const newGoals = { ...monthlyGoals, [goalKey]: Number(value) || 0 };
        setMonthlyGoals(newGoals);
        debouncedSave(null, newGoals);
    };
        
    const handleSignOut = async () => auth && await signOut(auth);

    const getWeekDataForReport = useCallback(async () => {
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
            const totals = { exposures: 0, followUps: 0, pbrs: 0, threeWays: 0 };
            let current = new Date(startDate);
            while(current <= endDate) {
                const dataSet = current.getMonth() === today.getMonth() ? monthlyData : lastMonthData;
                const dayData = dataSet[current.getDate()];
                if(dayData) {
                    totals.exposures += Number(dayData.exposures) || 0;
                    totals.followUps += Number(dayData.followUps) || 0;
                    totals.pbrs += Number(dayData.pbrs) || 0;
                    totals.threeWays += Number(dayData.threeWays) || 0;
                }
                current.setDate(current.getDate() + 1);
            }
            return totals;
        };

        const thisWeekTotals = getWeekTotals(startOfWeek, endOfWeek);
        const lastWeekTotals = getWeekTotals(startOfLastWeek, endOfLastWeek);
        const dateRange = `${startOfWeek.toLocaleDateString('default', {month: 'short', day: 'numeric'})} - ${endOfWeek.toLocaleDateString('default', {month: 'short', day: 'numeric'})}`;
        
        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const allDocsSnap = await getDocs(hotlistColRef);
        const allItems = allDocsSnap.docs.map(d => ({id: d.id, ...d.data()}));
        const hotlistForReport = allItems.filter(item => item.isArchived !== true).slice(0, 10);

        return { totals: thisWeekTotals, lastWeekTotals, dateRange, hotlist: hotlistForReport };
    }, [monthlyData, lastMonthData, user, db]);

    const handleShareReportAsText = useCallback(async () => {
        const { totals, lastWeekTotals, dateRange, hotlist: reportHotlist } = await getWeekDataForReport();

        let shareText = `My Activity Tracker Report\nFrom: ${userProfile.displayName}\nWeek of: ${dateRange}\n\n`;
        shareText += `**This Week's Numbers:**\n- Exposures: ${totals.exposures}\n- Follow Ups: ${totals.followUps}\n- PBRs: ${totals.pbrs}\n\n`;
        shareText += `**Last Week's Numbers:**\n- Exposures: ${lastWeekTotals.exposures}\n- Follow Ups: ${lastWeekTotals.followUps}\n- PBRs: ${lastWeekTotals.pbrs}\n\n`;
        shareText += "--------------------\n\n";
        shareText += `My "10 in Play" Hotlist\n\n`;
        reportHotlist.forEach((item, index) => { shareText += `${index + 1}. ${item.name}\n${item.notes ? `- Notes: ${item.notes}\n\n` : '\n'}`;});
        shareText += "\nSent from my Activity Tracker App";

        try {
            await navigator.share({ title: 'My Weekly Activity Report', text: shareText });
        } catch (error) { console.error('Error sharing text:', error); }
    }, [getWeekDataForReport, userProfile.displayName]);
    
    const handleShare = async () => {
        if (typeof window.html2canvas === 'undefined') {
            console.error("html2canvas library is not available. Falling back to text share.");
            await handleShareReportAsText();
            return;
        }
        setIsSharing(true);
        const weekData = await getWeekDataForReport();
        setReportCardData(weekData);
    };

    useEffect(() => {
        if (!reportCardData || !reportCardRef.current) return;
    
        const generateAndShareImage = async () => {
            try {
                const element = reportCardRef.current;
                const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f9fafb' });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                
                if (!blob) throw new Error("Canvas to Blob conversion failed.");
    
                const file = new File([blob], 'activity-report.png', { type: 'image/png' });
                const shareData = {
                    files: [file],
                    title: 'My Weekly Activity Report',
                    text: `Here's my activity report for the week of ${reportCardData.dateRange}.`,
                };
    
                if (navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    console.log("File sharing not supported, falling back to text.");
                    await handleShareReportAsText();
                }
    
            } catch (error) {
                console.error('Error generating or sharing report image:', error);
                alert('Could not generate report card. Sharing as text instead.');
                await handleShareReportAsText();
            } finally {
                setIsSharing(false);
                setReportCardData(null);
            }
        };
    
        const timer = setTimeout(generateAndShareImage, 100);
        return () => clearTimeout(timer);
    
    }, [reportCardData, handleShareReportAsText]);
    
    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading...</div></div>;
    if (!user) return <AuthPage auth={auth} />;

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Header displayName={userProfile.displayName} onSignOut={handleSignOut} onEditName={() => setShowEditNameModal(true)} />
                <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="mt-6">
                    {activeTab === 'tracker' && <ActivityTracker date={currentDate} setDate={setCurrentDate} goals={monthlyGoals} onGoalChange={handleGoalChange} data={{current: monthlyData, last: lastMonthData}} onDataChange={handleDataChange} onShare={handleShare} isSharing={isSharing} user={user} userProfile={userProfile} setUserProfile={setUserProfile} onQuickAdd={handleQuickAdd} showGoalInstruction={showGoalInstruction} onDismissGoalInstruction={handleDismissGoalInstruction} />}
                    {activeTab === 'hotlist' && <HotList user={user} db={db} />}
                    {activeTab === 'analytics' && <AnalyticsDashboard data={analyticsData} />}
                    {activeTab === 'leaderboard' && <Leaderboard db={db} monthYearId={monthYearId} user={user} />}
                </main>
                {showNameModal && <DisplayNameModal onSave={handleSetDisplayName} />}
                {showEditNameModal && <DisplayNameModal onSave={handleSetDisplayName} onClose={() => setShowEditNameModal(false)} currentName={userProfile.displayName} />}
                {showOnboarding && <OnboardingModal onDismiss={handleDismissOnboarding} />}
                {reportCardData && (
                    <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
                        <ReportCard ref={reportCardRef} profile={userProfile} weekData={reportCardData} goals={monthlyGoals} />
                    </div>
                )}
            </div>
            <footer className="text-center p-4 mt-8 text-xs text-gray-400 border-t border-gray-200">
                <p>&copy; 2025 Platinum Toolkit. All Rights Reserved.</p>
                <p>Unauthorized duplication or distribution is strictly prohibited.</p>
            </footer>
        </div>
    );
};


// ... (AuthPage, Header, TabBar components remain unchanged)
const AuthPage = ({ auth }) => {
    const [isSignUp, setIsSignUp] = useState(false);
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

const Header = ({ displayName, onSignOut, onEditName }) => (
    <header className="mb-6 flex justify-between items-start">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Activity Tracker</h1>
            <div className="flex items-center space-x-2 mt-1">
                <p className="text-md sm:text-lg text-gray-500">{displayName ? `Welcome, ${displayName}` : 'Your dashboard for business growth.'}</p>
                {displayName && (
                    <button onClick={onEditName} className="text-gray-400 hover:text-gray-600" title="Edit your name">
                        <Edit2 className="h-4 w-4" />
                    </button>
                )}
            </div>
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

const Leaderboard = ({ db, monthYearId, user }) => {
    const [scores, setScores] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [userScore, setUserScore] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            if (!db || !user) return;
            setLoading(true);

            try {
                const scoresColRef = collection(db, 'artifacts', appId, 'leaderboard', monthYearId, 'entries');
                
                // 1. Fetch top 25
                const top25Query = query(scoresColRef, orderBy('exposures', 'desc'), limit(25));
                const top25Snapshot = await getDocs(top25Query);
                const top25Scores = top25Snapshot.docs.map(doc => doc.data());
                setScores(top25Scores);

                // 2. Fetch current user's score
                const userDocRef = doc(scoresColRef, user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const currentUserData = userDocSnap.data();
                    setUserScore(currentUserData);
                    
                    // 3. Calculate user's rank
                    const higherRankQuery = query(scoresColRef, where('exposures', '>', currentUserData.exposures));
                    const higherRankSnapshot = await getCountFromServer(higherRankQuery);
                    setUserRank(higherRankSnapshot.data().count + 1);
                } else {
                    setUserRank(null);
                    setUserScore(null);
                }
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchScores();
    }, [db, monthYearId, user]);

    const isUserInTop25 = scores.some(score => score.userId === user.uid);

    if (loading) return <div className="text-center p-10">Loading Leaderboard...</div>;
    
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Top 25 Performers</h2>
            {scores.length === 0 ? (
                <p className="text-gray-500">The leaderboard is empty for this month.</p>
            ) : (
                <ol className="space-y-3">
                    {scores.map((score, index) => {
                        const isCurrentUser = score.userId === user.uid;
                        return (
                            <li 
                                key={score.userId} 
                                className={`flex items-center justify-between p-3 rounded-md ${isCurrentUser ? 'bg-indigo-100 border-l-4 border-indigo-500' : 'bg-gray-50'}`}
                            >
                                <div className="flex items-center">
                                    <span className="text-lg font-bold text-gray-400 w-8">{index + 1}</span>
                                    <span className="font-medium">{score.displayName}</span>
                                    {isCurrentUser && <span className="ml-2 text-xs font-semibold text-indigo-700 bg-indigo-200 px-2 py-0.5 rounded-full">You</span>}
                                </div>
                                <span className="font-bold text-lg text-indigo-600">{score.exposures}</span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {userRank && userScore && !isUserInTop25 && (
                <div className="mt-6 border-t pt-4">
                     <h3 className="text-md font-semibold text-gray-600 mb-2">Your Position</h3>
                     <div className="flex items-center justify-between p-3 rounded-md bg-indigo-50 border border-indigo-200">
                        <div className="flex items-center">
                            <span className="text-lg font-bold text-gray-500 w-8">#{userRank}</span>
                            <span className="font-medium">{userScore.displayName}</span>
                        </div>
                        <span className="font-bold text-lg text-indigo-600">{userScore.exposures}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivityTracker = ({ date, setDate, goals, onGoalChange, data, onDataChange, onShare, isSharing, user, userProfile, setUserProfile, onQuickAdd, showGoalInstruction, onDismissGoalInstruction }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const [viewMode, setViewMode] = useState('week');
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthYearId = `${year}-${String(month + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(date);
    lastMonthDate.setMonth(date.getMonth() - 1);
    const lastMonthYearId = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const changeMonth = (offset) => { const newDate = new Date(date); newDate.setMonth(date.getMonth() + offset); setDate(newDate); };
    const changeWeek = (offset) => { const newDate = new Date(date); newDate.setDate(date.getDate() + (7 * offset)); setDate(newDate); };

    const weekDisplayDays = useMemo(() => {
        const today = new Date();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        startOfWeek.setHours(0,0,0,0);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            const dataSet = currentDay.getMonth() === date.getMonth() ? data.current : data.last;
            const dayData = dataSet ? (dataSet[currentDay.getDate()] || {}) : {};
            
            const isPast = currentDay < today && today.toDateString() !== currentDay.toDateString();
            const noActivity = !dayData || ((Number(dayData.exposures || 0) === 0) && (Number(dayData.followUps || 0) === 0) && (Array.isArray(dayData.sitdowns) ? dayData.sitdowns.length === 0 : true));
            const isToday = today.toDateString() === currentDay.toDateString();
            const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;

            days.push({ date: currentDay, day: currentDay.getDate(), data: dayData, hasNoActivity: isPast && noActivity, isBlank: false, isToday, isWeekend });
        }
        return days;
    }, [date, data]);

    const calendarDays = useMemo(() => {
        const today = new Date();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
    
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) { days.push({ isBlank: true, day: `blank-${i}` }); }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDateObj = new Date(year, month, day);
            const dayData = data.current[day] || {};
            const isTodayFlag = today.toDateString() === currentDateObj.toDateString();
            const isPast = currentDateObj < today && !isTodayFlag;
            const noActivity = Object.keys(dayData).filter(k => k !== 'exerc' && k !== 'read').length === 0 || (Number(dayData.exposures || 0) === 0 && Number(dayData.followUps || 0) === 0 && (dayData.sitdowns || []).length === 0);
            const dayOfWeek = currentDateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
            days.push({ day, date: currentDateObj, isBlank: false, data: dayData, hasNoActivity: isPast && noActivity, isToday: isTodayFlag, isWeekend });
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
    }, [data]);

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
    
    const handleDayClick = (dayObj) => {
        if (dayObj.isBlank) return;
        setSelectedDay(dayObj.date);
    };
    const closeModal = () => setSelectedDay(null);
    const handleModalDataChange = (field, value) => onDataChange(selectedDay, field, value);

    const activityColors = { exposures: 'bg-blue-500', followUps: 'bg-green-500', sitdowns: 'bg-amber-500', pbrs: 'bg-purple-500', threeWays: 'bg-pink-500' };
    
    let modalData = {};
    if (selectedDay) {
        const targetMonthId = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}`;
        const dataSet = targetMonthId === monthYearId ? data.current : (targetMonthId === lastMonthYearId ? data.last : {});
        modalData = dataSet[selectedDay.getDate()] || {};
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div className="flex items-center mb-4 sm:mb-0">
                    <button onClick={() => viewMode === 'week' ? changeWeek(-1) : changeMonth(-1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronDown className="h-5 w-5 rotate-90" /></button>
                    <h2 className="text-xl sm:text-2xl font-semibold w-40 sm:w-56 text-center">
                        {viewMode === 'week' 
                            ? `${weekDisplayDays[0].date.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekDisplayDays[6].date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
                            : date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => viewMode === 'week' ? changeWeek(1) : changeMonth(1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronUp className="h-5 w-5 rotate-90" /></button>
                </div>
                <button onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')} className="text-sm bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition">
                    {viewMode === 'week' ? 'View Month' : 'View Week'}
                </button>
            </div>
            {viewMode === 'week' ? (
                <div className="grid grid-cols-7 gap-2 text-center">
                    {weekDisplayDays.map(d => {
                        const dayClasses = `cursor-pointer hover:bg-indigo-50 p-2 rounded-lg border flex flex-col items-center justify-between aspect-square ${d.isToday ? 'border-2 border-indigo-500' : ''} ${d.isWeekend ? 'bg-gray-50' : ''}`;
                        return (
                            <div key={d.date.toISOString()} onClick={() => handleDayClick(d)} className={dayClasses}>
                                <div className="text-xs text-gray-500">{d.date.toLocaleDateString('default', { weekday: 'short' })}</div>
                                <div className={`font-semibold text-lg ${d.hasNoActivity ? 'text-red-500' : ''}`}>{d.day}</div>
                                <div className="flex justify-center items-center space-x-1 h-2">
                                    {d.data.exposures > 0 && <div className={`h-2 w-2 ${activityColors.exposures} rounded-full`}></div>}
                                    {d.data.followUps > 0 && <div className={`h-2 w-2 ${activityColors.followUps} rounded-full`}></div>}
                                    {d.data.sitdowns?.length > 0 && <div className={`h-2 w-2 ${activityColors.sitdowns} rounded-full`}></div>}
                                    {d.data.pbrs > 0 && <div className={`h-2 w-2 ${activityColors.pbrs} rounded-full`}></div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`${day}-${index}`} className="text-center font-semibold text-xs text-gray-500 py-2">{day}</div>)}
                    {calendarDays.map((d, index) => {
                        const dayClasses = `border rounded-md aspect-square p-1 sm:p-2 flex flex-col ${
                            d.isBlank ? 'bg-transparent border-transparent' : 'cursor-pointer hover:bg-indigo-50'
                        } ${d.isToday ? 'border-2 border-indigo-500' : ''} ${d.isWeekend && !d.isBlank ? 'bg-gray-50' : ''}`;
                        
                        return (
                            <div key={d.day || `blank-${index}`} onClick={() => handleDayClick(d)} className={dayClasses}>
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
                        )
                    })}
                </div>
            )}
            <TotalsFooter totals={monthlyTotals} onShare={onShare} isSharing={isSharing} streaks={streaks} goals={goals} onGoalChange={onGoalChange} userProfile={userProfile} onQuickAdd={onQuickAdd} showGoalInstruction={showGoalInstruction} onDismissGoalInstruction={onDismissGoalInstruction} />
            {selectedDay && <DayEntryModal day={selectedDay.getDate()} data={modalData} onClose={closeModal} onChange={handleModalDataChange} />}
        </div>
    );
};

const TotalsFooter = ({ totals, onShare, isSharing, streaks, goals, onGoalChange, userProfile, onQuickAdd, showGoalInstruction, onDismissGoalInstruction }) => {
    const [editingGoal, setEditingGoal] = useState(null); 
    const longestStreaks = userProfile.longestStreaks || {};
    const metrics = [
        { key: 'exposures', label: 'Total Exposures', value: totals.exposures, icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', value: totals.followUps, icon: Users, color: 'green' },
        { key: 'pbrs', label: 'PBRs', value: totals.pbrs, icon: Users, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: totals.threeWays, icon: PhoneCall, color: 'pink' }
    ];
    const handleGoalEdit = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            onGoalChange(editingGoal, e.target.value);
            setEditingGoal(null);
        }
    };
    const WEEKS_IN_MONTH = 4.33;

    const streakStyles = {
        active: {
            text: 'text-gray-700',
            flame: 'text-amber-500'
        },
        inactive: {
            text: 'text-gray-500',
            flame: 'text-gray-400'
        }
    };

    return (
        <div className="mt-6 pt-5 border-t border-gray-200">
             {showGoalInstruction && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start space-x-3">
                    <Info className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-800">Set your monthly goals!</p>
                        <p className="text-sm text-indigo-700 mt-1">Click the <Edit2 className="h-3 w-3 inline-block mx-1" /> icon next to "Goal" on any card below to set your targets for the month.</p>
                    </div>
                    <button onClick={onDismissGoalInstruction} className="text-indigo-500 hover:text-indigo-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}
            <div className="flex justify-end mb-4">
                <button onClick={onShare} disabled={isSharing} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm disabled:bg-indigo-400 disabled:cursor-wait">
                    <Share2 className="h-4 w-4 mr-2" /> {isSharing ? 'Generating...' : 'Share Weekly Report'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map(metric => {
                    const goal = goals[metric.key] || 0;
                    const progress = goal > 0 ? (metric.value / goal) * 100 : 0;
                    const weeklyPace = Math.ceil(goal / WEEKS_IN_MONTH);
                    const currentStreak = streaks[metric.key] || 0;
                    const longestStreak = longestStreaks[metric.key] || 0;
                    const streakStyle = currentStreak > 0 ? streakStyles.active : streakStyles.inactive;

                    return (
                        <div key={metric.key} className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className={`text-sm sm:text-md font-semibold text-gray-600`}>{metric.label}</h4>
                                    <div className="flex items-center mt-1">
                                        {metric.key !== 'sitdowns' ? (
                                            <div className="flex items-center space-x-3">
                                                <button onClick={() => onQuickAdd(metric.key, -1)} className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <p className={`text-4xl sm:text-5xl font-bold text-gray-900 text-center w-14`}>{metric.value}</p>
                                                <button onClick={() => onQuickAdd(metric.key, 1)} className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className={`text-4xl sm:text-5xl font-bold text-gray-900`}>{metric.value}</p>
                                        )}
                                    </div>
                                </div>
                                <metric.icon className={`h-8 w-8 text-${metric.color}-400`} />
                            </div>
                            <div className="mt-4 flex space-x-4">
                                <div className={`flex items-center text-xs ${streakStyle.text}`}>
                                    <Flame className={`h-4 w-4 mr-1 ${streakStyle.flame}`}/>
                                    <span>Current: <strong>{currentStreak}</strong></span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                    <Trophy className="h-4 w-4 mr-1 text-gray-400"/>
                                    <span>Longest: <strong>{longestStreak}</strong></span>
                                </div>
                            </div>
                            <div className="mt-auto pt-4">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span onClick={() => setEditingGoal(metric.key)} className="cursor-pointer hover:text-indigo-600">
                                        Goal: {editingGoal === metric.key ? 
                                            <input type="number" defaultValue={goal} onKeyDown={handleGoalEdit} onBlur={handleGoalEdit} autoFocus className="w-12 text-center bg-gray-100 rounded"/> : <span>{goal} <Edit2 className="h-3 w-3 inline-block ml-1"/></span>
                                        }
                                    </span>
                                    {goal > 0 && <span className="font-semibold">(~{weeklyPace}/wk)</span>}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div className={`bg-${metric.color}-500 h-2.5 rounded-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div></div>
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
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">PBRs</label><NumberInput value={data.pbrs || ''} onChange={e => onChange('pbrs', e.target.value)} /></div>
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

const HotList = ({ user, db }) => {
    const [hotlist, setHotlist] = useState([]);
    const [isArchiveView, setIsArchiveView] = useState(false);
    const [activeProspectsCount, setActiveProspectsCount] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [sortBy, setSortBy] = useState('name');

    const hotlistColRef = useMemo(() => collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist'), [db, user.uid]);

    const fetchHotlist = useCallback(async () => {
        const allDocsSnap = await getDocs(hotlistColRef);
        const allItems = allDocsSnap.docs.map(d => ({id: d.id, ...d.data()}));
        
        setHotlist(allItems.filter(item => (isArchiveView ? item.isArchived === true : item.isArchived !== true)));
        setActiveProspectsCount(allItems.filter(item => item.isArchived !== true).length);

    }, [hotlistColRef, isArchiveView]);

    useEffect(() => {
        fetchHotlist();
    }, [isArchiveView, fetchHotlist]);


    const handleAdd = async (name) => {
        setShowAddModal(false);
        if (!name) return;
        const newItem = { 
            name, 
            notes: "",
            status: 'Warm',
            lastContacted: null,
            isArchived: false
        };
        await addDoc(hotlistColRef, newItem);
        fetchHotlist();
    };

    const debouncedUpdate = useMemo(() => debounce(async (id, field, value) => {
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, { [field]: value });
    }, 1000), [hotlistColRef]);

    const handleUpdate = (id, field, value) => {
        setHotlist(prevList => prevList.map(item => item.id === id ? { ...item, [field]: value } : item));
        debouncedUpdate(id, field, value);
    };

    const handleInstantUpdate = async (id, field, value) => {
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, { [field]: value });
        fetchHotlist();
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        const docRef = doc(hotlistColRef, itemToDelete);
        await deleteDoc(docRef);
        fetchHotlist();
        setItemToDelete(null);
    };

    const statusConfig = {
        Hot: { text: 'Hot', color: 'text-red-800', bg: 'bg-red-100', ring: 'ring-red-500' },
        Warm: { text: 'Warm', color: 'text-amber-800', bg: 'bg-amber-100', ring: 'ring-amber-500' },
        Cold: { text: 'Cold', color: 'text-blue-800', bg: 'bg-blue-100', ring: 'ring-blue-500' },
    };

    const progress = Math.min((activeProspectsCount / 10) * 100, 100);

    const sortedList = useMemo(() => {
        const statusOrder = { Hot: 1, Warm: 2, Cold: 3 };
        return [...hotlist].sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            if (sortBy === 'lastContacted') {
                if (!a.lastContacted) return 1;
                if (!b.lastContacted) return -1;
                return new Date(b.lastContacted) - new Date(a.lastContacted);
            }
            if (sortBy === 'status') {
                return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
            }
            return 0;
        });
    }, [hotlist, sortBy]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
             {showAddModal && <AddHotlistItemModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
             {itemToDelete && <ConfirmDeleteModal onConfirm={handleDelete} onClose={() => setItemToDelete(null)} />}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl sm:text-2xl font-semibold">{isArchiveView ? 'Archived Prospects' : '10 in Play / Hot List'}</h2>
                <button onClick={() => setIsArchiveView(!isArchiveView)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    {isArchiveView ? <><List className="h-4 w-4 mr-1"/> View Active List</> : <><Archive className="h-4 w-4 mr-1"/> View Archive</>}
                </button>
            </div>

            {!isArchiveView && (
                 <div className="mb-4">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-1">
                        <span>Progress to 10 Prospects</span>
                        <span>{activeProspectsCount}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            
            <div className="my-4 flex items-center justify-end space-x-2">
                <label htmlFor="sort-prospects" className="text-sm font-medium text-gray-600">Sort by:</label>
                <select 
                    id="sort-prospects"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm text-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                >
                    <option value="name">Name (A-Z)</option>
                    <option value="lastContacted">Last Contact (Newest)</option>
                    <option value="status">Status (Hot-Cold)</option>
                </select>
            </div>

            <div className="space-y-4">
                {sortedList.length > 0 ? sortedList.map(item => {
                    const currentStatus = item.status || 'Warm';
                    const { text, color, bg } = statusConfig[currentStatus];

                    return (
                        <div key={item.id} className="p-4 border rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <input
                                    type="text"
                                    defaultValue={item.name}
                                    onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                                    className="text-md sm:text-lg font-semibold border-none p-0 w-full focus:ring-0"
                                    placeholder="Enter name..."
                                />
                                {!isArchiveView && (
                                    <button onClick={() => handleInstantUpdate(item.id, 'isArchived', true)} className="text-gray-400 hover:text-indigo-600 ml-2" title="Archive Prospect">
                                        <Archive className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
                                    {text}
                                </span>
                                <div className="text-xs text-gray-500">
                                    Last Contact: {' '}
                                    <span className="font-semibold">
                                        {item.lastContacted 
                                            ? new Date(item.lastContacted).toLocaleDateString()
                                            : 'Never'}
                                    </span>
                                </div>
                            </div>

                            <textarea
                                defaultValue={item.notes}
                                onChange={(e) => handleUpdate(item.id, 'notes', e.target.value)}
                                placeholder="Add notes..."
                                className="mt-3 w-full text-sm text-gray-600 border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                rows="2"
                            ></textarea>

                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
                                {isArchiveView ? (
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleInstantUpdate(item.id, 'isArchived', false)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition">
                                            <ArchiveRestore className="h-3 w-3" />
                                            <span>Unarchive</span>
                                        </button>
                                        <button onClick={() => setItemToDelete(item.id)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition">
                                            <Trash2 className="h-3 w-3" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-medium text-gray-500 hidden sm:inline">Status:</span>
                                            {Object.keys(statusConfig).map(statusKey => {
                                                const { text, ring } = statusConfig[statusKey];
                                                const isSelected = currentStatus === statusKey;
                                                return (
                                                    <button
                                                        key={statusKey}
                                                        onClick={() => handleInstantUpdate(item.id, 'status', statusKey)}
                                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                                            isSelected
                                                                ? `${statusConfig[statusKey].bg} ${statusConfig[statusKey].color} ring-2 ${ring}`
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {text}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button 
                                            onClick={() => handleInstantUpdate(item.id, 'lastContacted', new Date().toISOString())}
                                            className="flex w-full sm:w-auto items-center justify-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
                                        >
                                            <Calendar className="h-3 w-3" />
                                            <span>Log Today's Contact</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                }) : (
                     <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                        {isArchiveView ? (
                            <>
                                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-lg font-semibold text-gray-900">Archive is Empty</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    When you archive prospects, they will appear here.
                                </p>
                            </>
                        ) : (
                            <>
                                <List className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-lg font-semibold text-gray-900">Build Your Hot List</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    This is your list of key prospects. Click the button below to add your first one.
                                </p>
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                                        Add First Prospect
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {!isArchiveView && (
                <div className="mt-4 flex justify-end">
                    <button onClick={() => setShowAddModal(true)} className="flex items-center bg-indigo-600 text-white px-3 py-2 rounded-md">
                        <Plus className="h-5 w-5 mr-1" /> Add Prospect
                    </button>
                </div>
            )}
        </div>
    );
};

const DisplayNameModal = ({ onSave, onClose, currentName }) => {
    const [name, setName] = useState(currentName || '');
    const handleSave = () => { if (name.trim()) { onSave(name.trim()); } };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">{currentName ? 'Edit Your Name' : 'Welcome!'}</h3><p className="text-sm text-gray-600 mt-1">Please set your display name for the leaderboard.</p></div>
                <div className="p-6">
                    <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input type="text" id="display-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    {onClose && <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>}
                    <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Save Name</button>
                </div>
            </div>
        </div>
    );
};

const OnboardingModal = ({ onDismiss }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
                <Trophy className="h-12 w-12 mx-auto text-amber-500" />
                <h3 className="mt-4 text-xl font-semibold">Welcome to Your Activity Tracker!</h3>
                <p className="mt-2 text-gray-600">Here's how to get started:</p>
            </div>
            <div className="px-6 pb-6 space-y-4 text-left">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                        <h4 className="font-semibold">For Quick Entries</h4>
                        <p className="text-sm text-gray-600">Use the <Plus className="h-3 w-3 inline-block mx-1"/>/<Minus className="h-3 w-3 inline-block mx-1"/> buttons on the summary cards to quickly add or remove today's activity.</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                        <h4 className="font-semibold">For More Detail</h4>
                        <p className="text-sm text-gray-600">Tap any day on the calendar to open the full activity log for that date.</p>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center">
                <button onClick={onDismiss} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Got it!</button>
            </div>
        </div>
    </div>
);


const AnalyticsDashboard = ({ data }) => {
    return (
        <div className="bg-white p-2 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center sm:text-left">Month-Over-Month Performance</h2>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis tick={{fontSize: 12}} /><Tooltip /><Legend wrapperStyle={{fontSize: "14px"}} />
                        <Bar dataKey="Exposures" fill="#8884d8" /><Bar dataKey="Follow Ups" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const NumberInput = ({ value, onChange, ...props }) => {
    const currentValue = Number(value) || 0;

    const handleIncrement = () => {
        const newValue = currentValue + 1;
        onChange({ target: { value: String(newValue) } });
    };

    const handleDecrement = () => {
        const newValue = Math.max(0, currentValue - 1);
        onChange({ target: { value: String(newValue) } });
    };

    const handleChange = (e) => {
        const typedValue = e.target.value;
        // Allow empty string to clear the input, otherwise parse as a number
        if (typedValue === '' || (!isNaN(typedValue) && Number(typedValue) >= 0)) {
            onChange(e);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <button type="button" onClick={handleDecrement} className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50" disabled={currentValue <= 0}>
                <Minus className="h-4 w-4" />
            </button>
            <input 
                type="text" // Use text to better control value and avoid default browser number input UI
                inputMode="numeric" // Brings up number pad on mobile
                pattern="[0-9]*"
                value={value} 
                onChange={handleChange}
                className="w-16 p-1 border border-gray-300 rounded-md text-center text-sm focus:ring-indigo-500 focus:border-indigo-500 transition" 
                {...props} 
            />
            <button type="button" onClick={handleIncrement} className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
};
const CheckboxInput = (props) => (
    <input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition" {...props} />
);
const AddHotlistItemModal = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const handleAdd = () => { if (name.trim()) { onAdd(name.trim()); } };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Add New Prospect</h3></div>
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
                <div className="p-6"><h3 className="text-xl font-semibold">Confirm Deletion</h3><p className="mt-2 text-gray-600">Are you sure? This action is permanent and cannot be undone.</p></div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2"><button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded-md">Delete</button></div>
            </div>
        </div>
    );
};

// --- New Report Card Component ---
const ReportCard = forwardRef(({ profile, weekData, goals }, ref) => {
    const WEEKS_IN_MONTH = 4.33;
    const metrics = [
        { key: 'exposures', label: 'Exposures', value: weekData.totals.exposures, lastWeek: weekData.lastWeekTotals.exposures, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', value: weekData.totals.followUps, lastWeek: weekData.lastWeekTotals.followUps, color: 'green' },
        { key: 'pbrs', label: 'PBRs', value: weekData.totals.pbrs, lastWeek: weekData.lastWeekTotals.pbrs, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: weekData.totals.threeWays, lastWeek: weekData.lastWeekTotals.threeWays, color: 'pink' }
    ];

    return (
        <div ref={ref} className="bg-white p-6 font-sans border border-gray-200 rounded-lg shadow-md" style={{ width: '450px' }}>
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Weekly Activity Report</h1>
                <p className="text-md text-gray-600">{profile.displayName || 'User'}</p>
                <p className="text-sm text-gray-500 font-medium">{weekData.dateRange}</p>
            </div>
            
            <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-gray-700 border-b pb-2">This Week's Activity</h3>
                {metrics.map(metric => {
                    const monthlyGoal = goals[metric.key] || 0;
                    const weeklyGoal = Math.ceil(monthlyGoal / WEEKS_IN_MONTH);
                    const progress = weeklyGoal > 0 ? (metric.value / weeklyGoal) * 100 : 0;
                    
                    return (
                        <div key={metric.key}>
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-semibold text-gray-600">{metric.label}</h4>
                                <div className="text-right">
                                    <p className="font-bold text-xl text-gray-800">{metric.value}</p>
                                    <p className="text-xs text-gray-400">Last Week: {metric.lastWeek}</p>
                                </div>
                            </div>
                            {weeklyGoal > 0 && (
                                <>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className={`bg-${metric.color}-500 h-1.5 rounded-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                    </div>
                                    <p className="text-right text-xs text-gray-500 mt-1">Weekly Goal: {weeklyGoal}</p>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div>
                <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">10 in Play</h3>
                {weekData.hotlist && weekData.hotlist.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-2">
                        {weekData.hotlist.map((item, index) => (
                             <li key={item.id} className="flex justify-between items-center border-b border-gray-100 py-1">
                                <span>{index + 1}. {item.name}</span>
                                <span className="text-xs text-gray-500">
                                    {item.lastContacted 
                                        ? `${new Date(item.lastContacted).toLocaleDateString()}`
                                        : 'Never'}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No items in the hotlist.</p>
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                <p>&copy; 2025 Platinum Toolkit. All Rights Reserved.</p>
                <p>Unauthorized duplication or distribution is strictly prohibited.</p>
            </div>
        </div>
    );
});

export default App;


