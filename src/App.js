import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { calculatePoints } from './utils/scoring';
import * as ActionModals from './components/ActionModals';
import { doc, setDoc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Ensure this is imported if used directly, or use context
import html2canvas from 'html2canvas';

// Context
import { AppProvider, useAppContext } from './context/AppContext';
import { appId } from './firebaseConfig';
import { debounce, WEEKS_IN_MONTH, getWeekId, getWeekRange, calculateCurrentStreaks } from './utils/helpers';

// Components (Eager Load)
import Header from './components/Header';
import TabBar from './components/TabBar';
import AuthPage from './components/AuthPage';
import TodayDashboard from './components/TodayDashboard';
import ActivityTracker from './components/ActivityTracker';
import { DisplayNameModal, OnboardingModal, CutReportModal, ScoringLegendModal } from './components/GlobalModals'; // Assuming these are exported from GlobalModals
import ReportCard from './components/ReportCard';

// Components (Lazy Load)
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const Leaderboard = React.lazy(() => import('./components/Leaderboard'));
const TeamPage = React.lazy(() => import('./components/TeamPage'));
const HotList = React.lazy(() => import('./components/HotList'));

// --- Main App Content Component ---
const AppContent = () => {
    const { db, auth, user, userProfile, setUserProfile, loading } = useAppContext();

    // --- State Management ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week'); // This was inside ActivityTracker, but used here if needed? No, ActivityTracker had its own state. 
    // ActivityTracker had its own viewMode. App.js doesn't need it unless lifted.

    const [monthlyData, setMonthlyData] = useState({});
    const [lastMonthData, setLastMonthData] = useState({});
    const [monthlyGoals, setMonthlyGoals] = useState({ exposures: 0, followUps: 0, presentations: 0, threeWays: 0, enrolls: 0 });
    const [activeTab, setActiveTab] = useState('today');

    // UI State
    const [showNameModal, setShowNameModal] = useState(false);
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showGoalInstruction, setShowGoalInstruction] = useState(false);

    // Calculated State (Must be before conditional returns)
    const currentStreaks = useMemo(() => {
        return calculateCurrentStreaks(monthlyData, lastMonthData, new Date());
    }, [monthlyData, lastMonthData]);

    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showExposureModal, setShowExposureModal] = useState(false);

    const [hotlist, setHotlist] = useState([]);

    // State for image report card generation
    const [isSharing, setIsSharing] = useState(false);
    const [reportCardData, setReportCardData] = useState(null);
    const reportCardRef = useRef(null);



    // --- Monday Cut Report Logic ---

    const isDirtyRef = useRef(false);
    const monthlyDataRef = useRef(monthlyData);
    const monthlyGoalsRef = useRef(monthlyGoals);

    useEffect(() => {
        monthlyDataRef.current = monthlyData;
        monthlyGoalsRef.current = monthlyGoals;
    }, [monthlyData, monthlyGoals]);

    // --- Data Fetching ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthYearId = `${year}-${String(month + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);
    const lastMonthYearId = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const fetchData = useCallback(async () => {
        if (!user || !db) return;

        // Profile logic is handled in AppContext, but we might need to handle specific flags here or verify
        if (!userProfile.displayName && !loading) {
            setShowNameModal(true);
        }
        if (!userProfile.hasCompletedOnboarding && !loading && !userProfile.displayName) {
            // Logic in original was: if profile exists but no hasCompletedOnboarding -> show.
            // If profile completely missing -> show name modal AND onboarding.
            // AppContext fetches profile.
            if (userProfile.uid && userProfile.hasCompletedOnboarding === undefined) setShowOnboarding(true);
        }
        if (userProfile.uid && !userProfile.hasCompletedOnboarding) setShowOnboarding(true);


        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        const docSnap = await getDoc(docRef);
        let currentGoals = { exposures: 0, followUps: 0, presentations: 0, pbrs: 0, threeWays: 0, enrolls: 0 };
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
        if (userProfile.uid && !userProfile.hasSeenGoalInstruction && allGoalsZero) {
            setShowGoalInstruction(true);
        }

        const lastMonthDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', lastMonthYearId);
        const lastMonthDocSnap = await getDoc(lastMonthDocRef);
        if (lastMonthDocSnap.exists()) {
            setLastMonthData(lastMonthDocSnap.data().dailyData || {});
        } else {
            setLastMonthData({});
        }
    }, [user, db, monthYearId, lastMonthYearId, userProfile, loading]);

    useEffect(() => {
        if (!user || !db) return;
        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const q = query(hotlistColRef, orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setHotlist(list);
        });
        return () => unsubscribe();
    }, [user, db]);

    // Handle initial data load
    useEffect(() => {
        if (user && db) {
            fetchData();
        }
    }, [user, db, currentDate, fetchData]);


    // --- Actions ---
    const handleSetDisplayName = async (name, parValue) => {
        if (!user || !db || !name.trim()) return;
        const trimmedName = name.trim();
        const dailyPar = Number(parValue) || 2;
        const newProfile = { ...userProfile, displayName: trimmedName, dailyPar };
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, newProfile, { merge: true });
        setUserProfile(newProfile);
        setShowNameModal(false);
        setShowEditNameModal(false);
    };

    const handleDismissOnboarding = async () => {
        setShowOnboarding(false);
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, { hasCompletedOnboarding: true }, { merge: true });
        setUserProfile(prev => ({ ...prev, hasCompletedOnboarding: true }));
    };

    const handleDismissGoalInstruction = async () => {
        setShowGoalInstruction(false);
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, { hasSeenGoalInstruction: true }, { merge: true });
        setUserProfile(prev => ({ ...prev, hasSeenGoalInstruction: true }));
    };



    // ... (existing imports)

    // ... inside AppContent ...

    const updateLeaderboard = useCallback(async (currentMonthData, targetMonthId, dateOfChange) => {
        if (!user || !db || !userProfile.displayName || !dateOfChange) return;

        const { start, end } = getWeekRange(dateOfChange);
        const weekId = getWeekId(dateOfChange);

        let weeklyExposures = 0;
        let weeklyFollowUps = 0;
        let weeklyPresentations = 0;
        let weeklyThreeWays = 0;
        let weeklyEnrolls = 0;

        let d = new Date(start);

        while (d <= end) {
            const dMonthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const day = d.getDate();

            let dayData = null;

            if (dMonthId === targetMonthId && currentMonthData) {
                dayData = currentMonthData[day];
            } else {
                if (dMonthId === monthYearId) {
                    dayData = monthlyDataRef.current?.[day];
                } else if (dMonthId === lastMonthYearId) {
                    dayData = lastMonthData?.[day];
                }
            }

            if (dayData) {
                weeklyExposures += Number(dayData.exposures) || 0;
                weeklyFollowUps += Number(dayData.followUps) || 0;
                // Presentations
                if (Array.isArray(dayData.presentations)) {
                    weeklyPresentations += dayData.presentations.length;
                } else {
                    weeklyPresentations += Number(dayData.presentations) || 0;
                }
                weeklyPresentations += (Number(dayData.pbrs) || 0);

                weeklyThreeWays += Number(dayData.threeWays) || 0;

                // Enrolls
                weeklyEnrolls += Number(dayData.enrolls) || 0;
                if (Array.isArray(dayData.sitdowns)) {
                    weeklyEnrolls += dayData.sitdowns.filter(s => s === 'E').length;
                }
            }

            d.setDate(d.getDate() + 1);
        }

        const rankingScore = calculatePoints({
            exposures: weeklyExposures,
            followUps: weeklyFollowUps,
            presentations: weeklyPresentations,
            threeWays: weeklyThreeWays,
            enrolls: weeklyEnrolls
        });

        const leaderboardRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);

        const payload = {
            displayName: userProfile.displayName,
            dailyPar: userProfile.dailyPar || 2,
            exposures: weeklyExposures,
            followUps: weeklyFollowUps,
            presentations: weeklyPresentations,
            threeWays: weeklyThreeWays,
            enrolls: weeklyEnrolls,
            rankingScore, // Store the weighted score for sorting/display
            weeklyExposures, // For backward compatibility / alignment
            weeklyPresentations, // For backward compatibility / alignment
            userId: user.uid,
            weekId: weekId,
            lastUpdated: new Date()
        };

        if (userProfile.teamId) {
            payload.teamId = userProfile.teamId;
        }

        await setDoc(leaderboardRef, payload, { merge: true });
    }, [user, db, userProfile.displayName, userProfile.teamId, monthYearId, lastMonthYearId, lastMonthData]);

    const debouncedSave = useMemo(() => debounce(async (dataToSave, goalsToSave, targetMonthId, dateOfChange) => {
        if (!user || !db) return;
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', targetMonthId);
        try {
            await setDoc(docRef, { dailyData: dataToSave, monthlyGoals: goalsToSave }, { merge: true });
            isDirtyRef.current = false;
            if (dataToSave && dateOfChange) {
                updateLeaderboard(dataToSave, targetMonthId, dateOfChange);
            }
        } catch (error) {
            console.error("Failed to save data:", error);
        }
    }, 1500), [user, db, updateLeaderboard]);

    const handleDataChange = (date, field, value) => {
        const day = date.getDate();
        const targetMonthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (targetMonthId === monthYearId) {
            const updatedData = { ...monthlyData, [day]: { ...monthlyData[day], [field]: value } };
            setMonthlyData(updatedData);
            isDirtyRef.current = true;
            debouncedSave(updatedData, monthlyGoals, monthYearId, date);
        } else {
            if (targetMonthId === lastMonthYearId) {
                const updatedLastMonthData = { ...lastMonthData, [day]: { ...lastMonthData[day], [field]: value } };
                setLastMonthData(updatedLastMonthData);
            }
            // Atomic update for non-current month
            const saveAtomicUpdate = async () => {
                if (!user || !db) return;
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', targetMonthId);
                const fieldPath = `dailyData.${day}.${field}`;
                try {
                    await updateDoc(docRef, { [fieldPath]: value });
                } catch (error) {
                    if (error.code === 'not-found') {
                        const newDailyData = { [day]: { [field]: value } };
                        await setDoc(docRef, { dailyData: newDailyData }, { merge: true });
                    }
                }
            };
            saveAtomicUpdate();
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

    const handleAddPresentation = (type) => {
        const today = new Date();
        if (today.getFullYear() !== year || today.getMonth() !== month) {
            alert("Quick add is only available for the current day on the current month's view.");
            return;
        }
        const todayData = monthlyData[today.getDate()] || {};
        const currentPresentations = todayData.presentations || [];
        const newPresentations = [...currentPresentations, type];
        handleDataChange(today, 'presentations', newPresentations);
    };

    const handleGoalChange = (goalKey, value) => {
        const newGoals = { ...monthlyGoals, [goalKey]: Number(value) || 0 };
        setMonthlyGoals(newGoals);
        isDirtyRef.current = true;
        debouncedSave(monthlyData, newGoals, monthYearId);
    };

    // CRM Logic Handlers 
    const handleLogFollowUpForProspect = async (prospectId) => {
        const prospect = hotlist.find(p => p.id === prospectId);
        if (!prospect) return;
        const prospectRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hotlist', prospectId);
        await updateDoc(prospectRef, { exposureCount: (prospect.exposureCount || 0) + 1, lastContacted: new Date().toISOString() });
        handleQuickAdd('followUps', 1);
        setShowFollowUpModal(false);
    };

    const handleAddNewProspectAndLogFollowUp = async (name) => {
        if (!db || !user) return;
        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const newItem = {
            name,
            notes: "",
            status: 'Warm',
            lastContacted: new Date().toISOString(),
            isArchived: false,
            exposureCount: 1,
            nextActionDate: null,
            outcome: null,
            decisionDate: null
        };
        await addDoc(hotlistColRef, newItem);
        handleQuickAdd('followUps', 1);
        setShowFollowUpModal(false);
    };

    const handleLogExposureForProspect = async (prospectId) => {
        const prospect = hotlist.find(p => p.id === prospectId);
        if (!prospect) return;
        const prospectRef = doc(db, 'artifacts', appId, 'users', user.uid, 'hotlist', prospectId);
        const updateData = {
            exposureCount: (prospect.exposureCount || 0) + 1,
            lastContacted: new Date().toISOString(),
        };
        if (prospect.status === 'Cold') updateData.status = 'Warm';
        await updateDoc(prospectRef, updateData);
        handleQuickAdd('exposures', 1);
        setShowExposureModal(false);
    };

    const handleAddNewProspectAndLogExposure = async (name) => {
        if (!db || !user) return;
        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const newItem = {
            name,
            notes: "",
            status: 'Warm',
            lastContacted: new Date().toISOString(),
            isArchived: false,
            exposureCount: 1,
            nextActionDate: null,
            outcome: null,
            decisionDate: null
        };
        await addDoc(hotlistColRef, newItem);
        handleQuickAdd('exposures', 1);
        setShowExposureModal(false);
    };


    // Report Generation
    const getWeekDataForReport = useCallback(async () => {
        if (!db) return { totals: {}, lastWeekTotals: {}, dateRange: '', activeInPipeline: 0, closingZone: [] };
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfWeek);
        endOfLastWeek.setDate(startOfWeek.getDate() - 1);

        const getWeekTotals = (startDate, endDate) => {
            const totals = { exposures: 0, followUps: 0, presentations: 0, threeWays: 0, enrolls: 0 };
            let current = new Date(startDate);
            while (current <= endDate) {
                const dataSet = current.getMonth() === today.getMonth() ? monthlyData : lastMonthData;
                const dayData = dataSet[current.getDate()];
                if (dayData) {
                    totals.exposures += Number(dayData.exposures) || 0;
                    totals.followUps += Number(dayData.followUps) || 0;
                    totals.presentations += (dayData.presentations?.length || 0) + (Number(dayData.pbrs) || 0);
                    totals.threeWays += Number(dayData.threeWays) || 0;
                    totals.enrolls += (Number(dayData.enrolls) || 0) + (Array.isArray(dayData.sitdowns) ? dayData.sitdowns.filter(s => s === 'E').length : 0);
                }
                current.setDate(current.getDate() + 1);
            }
            return totals;
        };

        const thisWeekTotals = getWeekTotals(startOfWeek, endOfWeek);
        const lastWeekTotals = getWeekTotals(startOfLastWeek, endOfLastWeek);
        const dateRange = `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;

        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const allItems = hotlist;

        const activeInPipeline = allItems.filter(item => item.isArchived !== true && (item.status === 'Hot' || item.status === 'Warm')).length;
        const closingZone = allItems.filter(item => item.isArchived !== true && item.status === 'Hot');

        return { totals: thisWeekTotals, lastWeekTotals, dateRange, activeInPipeline, closingZone };
    }, [monthlyData, lastMonthData, user, db, hotlist]);


    const handleShareReportAsText = useCallback(async () => {
        const { totals, dateRange, activeInPipeline, closingZone } = await getWeekDataForReport();
        let shareText = `My Activity Tracker Report\nFrom: ${userProfile.displayName}\nWeek of: ${dateRange}\n\n`;
        shareText += `**This Week's Numbers:**\n- Exposures: ${totals.exposures}\n- Follow Ups: ${totals.followUps}\n- Presentations: ${totals.presentations}\n- 3-Way Calls: ${totals.threeWays}\n- Memberships Sold: ${totals.enrolls}\n\n`;
        shareText += `**Prospect Pipeline:**\n- Active Prospects: ${activeInPipeline}\n\n`;
        shareText += "--------------------\n\n";
        shareText += `My "Closing Zone" Prospects\n\n`;
        closingZone.forEach((item, index) => { shareText += `${index + 1}. ${item.name} (${item.exposureCount || 0} exposures)\n`; });
        shareText += "\nSent from my Activity Tracker App";
        try { await navigator.share({ title: 'My Weekly Activity Report', text: shareText }); } catch (error) { console.error('Error sharing text:', error); }
    }, [getWeekDataForReport, userProfile.displayName]);

    const handleShare = async () => {
        setIsSharing(true);
        const weekData = await getWeekDataForReport();
        setReportCardData(weekData);
    };

    useEffect(() => {
        if (!reportCardData || !reportCardRef.current) return;
        const generateAndShareImage = async () => {
            try {
                const element = reportCardRef.current;
                const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#f9fafb' });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error("Canvas to Blob conversion failed.");
                const file = new File([blob], 'activity-report.png', { type: 'image/png' });
                const shareData = { files: [file], title: 'My Weekly Activity Report', text: `Here's my activity report for the week of ${reportCardData.dateRange}.` };
                if (navigator.canShare && navigator.canShare(shareData)) { await navigator.share(shareData); }
                else { await handleShareReportAsText(); }
            } catch (error) {
                console.error('Error generating report:', error);
                await handleShareReportAsText();
            } finally { setIsSharing(false); setReportCardData(null); }
        };
        const timer = setTimeout(generateAndShareImage, 100);
        return () => clearTimeout(timer);
    }, [reportCardData, handleShareReportAsText]);





    // --- Monday Cut Report Logic ---
    const [showCutReport, setShowCutReport] = useState(false);
    const [cutReportScore, setCutReportScore] = useState(0);

    const [showScoringLegend, setShowScoringLegend] = useState(false);


    useEffect(() => {
        if (loading || !monthlyData || Object.keys(monthlyData).length === 0) return;

        const checkMondayCut = () => {
            const today = new Date();
            // Production: Check if Monday
            const isMonday = today.getDay() === 1;

            if (!isMonday) return;

            const lastReportDate = localStorage.getItem('lastCutReportDate');
            const todayStr = today.toDateString();

            if (lastReportDate === todayStr) return;

            // Calculate Last Week's Score (Sunday - Saturday)
            // Since today is Monday:
            // i=2: Saturday (2 days ago)
            // ...
            // i=8: Sunday (8 days ago)
            let totalScore = 0;
            const parVal = userProfile.dailyPar || 2;

            for (let i = 2; i <= 8; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);

                const monthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                let dayData = {};

                if (monthId === monthYearId) {
                    dayData = monthlyData[d.getDate()] || {};
                } else if (monthId === lastMonthYearId) {
                    dayData = lastMonthData[d.getDate()] || {};
                }

                const p = calculatePoints(dayData);
                totalScore += (parVal - p);
            }

            setCutReportScore(totalScore);
            setShowCutReport(true);
        };

        checkMondayCut();
    }, [loading, monthlyData, lastMonthData, userProfile.dailyPar, monthYearId, lastMonthYearId]);

    const handleCloseCutReport = () => {
        setShowCutReport(false);
        localStorage.setItem('lastCutReportDate', new Date().toDateString());
    };

    // --- Save on Exit ---
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isDirtyRef.current) {
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
                setDoc(docRef, { dailyData: monthlyDataRef.current, monthlyGoals: monthlyGoalsRef.current }, { merge: true });
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (isDirtyRef.current) {
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
                setDoc(docRef, { dailyData: monthlyDataRef.current, monthlyGoals: monthlyGoalsRef.current }, { merge: true });
            }
        };
    }, [db, user, monthYearId]);

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    if (!user) return <AuthPage auth={auth} />;

    // Par Protocol: Calculate Badge State
    const today = new Date();
    const isSameMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayData = isSameMonth ? (monthlyData[today.getDate()] || {}) : {};

    // Weighted Par Calculation for Badge
    const todayPoints = calculatePoints(todayData);
    const dailyPar = userProfile.dailyPar || 2; // Dynamic Par
    const todayScore = dailyPar - todayPoints;
    const showTodayBadge = todayScore > 0;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Header displayName={userProfile.displayName} onSignOut={() => auth.signOut()} onEditName={() => setShowNameModal(true)} />
                <TabBar activeTab={activeTab} setActiveTab={setActiveTab} badges={{ today: showTodayBadge }} />

                <main className="mt-6">
                    <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                        {activeTab === 'today' && <TodayDashboard
                            monthlyData={monthlyData}
                            streaks={currentStreaks}
                            onQuickAdd={handleQuickAdd}
                            onHabitChange={handleDataChange}
                            onAddPresentation={handleAddPresentation}
                            onShare={handleShare}
                            isSharing={isSharing}
                            onLogFollowUp={() => setShowFollowUpModal(true)}
                            onLogExposure={() => setShowExposureModal(true)}
                            dailyPar={userProfile.dailyPar}
                            onShowLegend={() => setShowScoringLegend(true)}
                        />}
                        {activeTab === 'tracker' && <ActivityTracker
                            date={currentDate} setDate={setCurrentDate}
                            goals={monthlyGoals} onGoalChange={handleGoalChange}
                            data={{ current: monthlyData, last: lastMonthData }} onDataChange={handleDataChange}
                            onShare={handleShare} isSharing={isSharing}
                            user={user} userProfile={userProfile}
                            onQuickAdd={handleQuickAdd}
                            showGoalInstruction={showGoalInstruction} onDismissGoalInstruction={handleDismissGoalInstruction}
                            streaks={currentStreaks}
                            dailyPar={userProfile.dailyPar}
                            onShowLegend={() => setShowScoringLegend(true)}
                        />}
                        {activeTab === 'leaderboard' && <Leaderboard db={db} weekId={getWeekId(currentDate)} user={user} />}
                        {activeTab === 'team' && <TeamPage user={user} db={db} userProfile={userProfile} setUserProfile={setUserProfile} weekId={getWeekId(currentDate)} />}
                        {activeTab === 'hotlist' && <HotList
                            user={user} db={db}
                            onDataChange={(date, field, val) => handleDataChange(date, field, val)}
                            monthlyData={monthlyData}
                            hotlist={hotlist}
                        />}
                        {activeTab === 'analytics' && <AnalyticsDashboard db={db} user={user} />}
                    </Suspense>
                </main>
            </div>

            {showNameModal && <DisplayNameModal currentName={userProfile.displayName} currentPar={userProfile.dailyPar} onSave={handleSetDisplayName} onClose={!userProfile.displayName ? null : () => setShowNameModal(false)} />}
            {showEditNameModal && <DisplayNameModal currentName={userProfile.displayName} currentPar={userProfile.dailyPar} onSave={handleSetDisplayName} onClose={() => setShowEditNameModal(false)} />}
            {showOnboarding && <OnboardingModal onDismiss={handleDismissOnboarding} />}
            {showCutReport && <CutReportModal score={cutReportScore} onClose={handleCloseCutReport} />}
            {showScoringLegend && <ScoringLegendModal onClose={() => setShowScoringLegend(false)} />}

            {/* These should be imported from ActionModals.js which I will create */}
            {showFollowUpModal && <ActionModals.FollowUpModal
                prospects={hotlist.filter(p => !p.isArchived && (p.status === 'Hot' || p.status === 'Warm'))}
                onClose={() => setShowFollowUpModal(false)}
                onQuickLog={() => { handleQuickAdd('followUps', 1); setShowFollowUpModal(false); }}
                onLogForProspect={handleLogFollowUpForProspect}
                onAddNewProspect={handleAddNewProspectAndLogFollowUp}
            />}
            {showExposureModal && <ActionModals.LogExposureModal
                prospects={hotlist}
                onClose={() => setShowExposureModal(false)}
                onLogForProspect={handleLogExposureForProspect}
                onAddNewProspect={handleAddNewProspectAndLogExposure}
            />}

            {/* Hidden Report Card for Generation */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                {reportCardData && <ReportCard ref={reportCardRef} profile={userProfile} weekData={reportCardData} goals={monthlyGoals} />}
            </div>
        </div>
    );
};


const App = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;
