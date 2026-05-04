import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import { calculatePoints, isIronmanDay } from './utils/scoring';
import * as ActionModals from './components/ActionModals';
import { doc, setDoc, getDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, where, getDocs } from 'firebase/firestore';
import html2canvas from 'html2canvas';

// Context
import { AppProvider, useAppContext } from './context/AppContext';
import { appId } from './firebaseConfig';
import { debounce, getWeekId, getWeekRange, calculateCurrentStreaks } from './utils/helpers';

// Components (Eager Load)
import Header from './components/Header';
import TabBar from './components/TabBar';
import AuthPage from './components/AuthPage';
import TodayDashboard from './components/TodayDashboard';
import ActivityTracker from './components/ActivityTracker';
import QuickLogFAB from './components/QuickLogFAB';
import NotificationBanner from './components/NotificationBanner';
import { DisplayNameModal, OnboardingModal, CutReportModal, ScoringLegendModal, SprintDeclarationModal } from './components/GlobalModals';
import ReportCard from './components/ReportCard';
import CoachingToast from './components/CoachingToast';
import { COACHING_REPOSITORY, getTieredMessage } from './utils/coachingRepository';

// Components (Lazy Load)
const AnalyticsDashboard = React.lazy(() => import('./components/AnalyticsDashboard'));
const TeamPage = React.lazy(() => import('./components/TeamPage'));
const HotList = React.lazy(() => import('./components/HotList'));
const CommunityFeed = React.lazy(() => import('./components/CommunityFeed'));
const DiamondCoach = React.lazy(() => import('./components/DiamondCoach'));

// Community milestone thresholds & streak labels
const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90];
const STREAK_TYPE_LABELS = {
    ironman:             'Ironman',
    exposures:           'Exposures',
    followUps:           'Follow-Ups',
    nos:                 "No's",
    exerc:               'Exercise',
    personalDevelopment: 'Personal Dev',
};

// --- Main App Content Component ---
const AppContent = () => {
    const { db, auth, user, userProfile, setUserProfile, loading } = useAppContext();

    // --- State Management ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [quickAddDate, setQuickAddDate] = useState(new Date()); // The date the FAB will log to

    const [monthlyData, setMonthlyData] = useState({});
    const [lastMonthData, setLastMonthData] = useState({});
    const [monthlyGoals, setMonthlyGoals] = useState({ exposures: 0, followUps: 0, presentations: 0, threeWays: 0, teamSupport: 0, enrolls: 0 });
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

    // Coaching Toast
    const [coachingToast, setCoachingToast] = useState(null);

    // Community Win Feed — badge state
    const [hasUnreadCommunity, setHasUnreadCommunity] = useState(false);

    // Sprint Declaration Modal
    const [showSprintModal, setShowSprintModal] = useState(false);

    // Community post writer — fire-and-forget, silent on failure
    const writeCommunityPost = useCallback(async (postData) => {
        if (!db || !user || !userProfile.displayName) return;
        try {
            const feedRef = collection(db, 'artifacts', appId, 'communityFeed');
            await addDoc(feedRef, {
                authorId: user.uid,
                authorName: userProfile.displayName,
                timestamp: new Date(),
                reactions: { lets_go: [], sw4: [], thats_ironman: [], keep_grinding: [] },
                ...postData,
            });
        } catch (err) {
            console.warn('Community post silently failed:', err);
        }
    }, [db, user, userProfile.displayName]);

    // Badge detection: show dot if there are posts newer than last community visit
    useEffect(() => {
        const lastVisit = localStorage.getItem('lastCommunityVisit');
        if (!lastVisit) { setHasUnreadCommunity(true); return; }
        if (!db) return;
        const checkUnread = async () => {
            try {
                const feedRef = collection(db, 'artifacts', appId, 'communityFeed');
                const q = query(feedRef, where('timestamp', '>', new Date(lastVisit)));
                const snap = await getDocs(q);
                setHasUnreadCommunity(!snap.empty);
            } catch (err) { /* silent */ }
        };
        checkUnread();
    }, [db]);


    // --- Monday Cut Report Logic ---

    const isDirtyRef = useRef(false);
    const pendingUpdatesRef = useRef({});
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

    const fetchActivitiesData = useCallback(async () => {
        if (!user || !db) return;
        console.log("TRACE: fetchActivitiesData FIRED");


        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        const docSnap = await getDoc(docRef);
        let currentGoals = { exposures: 0, followUps: 0, presentations: 0, pbrs: 0, threeWays: 0, teamSupport: 0, enrolls: 0 };
        if (docSnap.exists()) {
            const data = docSnap.data();
            setMonthlyData(data.dailyData || {});
            currentGoals = data.monthlyGoals || currentGoals;
            setMonthlyGoals(currentGoals);
        } else {
            setMonthlyData({});
            setMonthlyGoals(currentGoals);
        }



        const lastMonthDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', lastMonthYearId);
        const lastMonthDocSnap = await getDoc(lastMonthDocRef);
        if (lastMonthDocSnap.exists()) {
            setLastMonthData(lastMonthDocSnap.data().dailyData || {});
        } else {
            setLastMonthData({});
        }
    }, [user, db, monthYearId, lastMonthYearId]);
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

    // Handle initial data load and visibility changes
    useEffect(() => {
        if (user && db) {
            fetchActivitiesData();
        }
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user && db) {
                console.log("TRACE: Tab became visible, aggressively fetching latest data");
                fetchActivitiesData();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user, db, currentDate, fetchActivitiesData]);

    // Handle Profile Modals (Onboarding & Goals)
    useEffect(() => {
        if (!user || loading) return;

        if (!userProfile.displayName) {
            setShowNameModal(true);
        }
        if (!userProfile.hasCompletedOnboarding && !userProfile.displayName) {
            if (userProfile.uid && userProfile.hasCompletedOnboarding === undefined) setShowOnboarding(true);
        }
        if (userProfile.uid && !userProfile.hasCompletedOnboarding) setShowOnboarding(true);

        const allGoalsZero = Object.values(monthlyGoals).every(goal => goal === 0);
        if (userProfile.uid && !userProfile.hasSeenGoalInstruction && allGoalsZero) {
            setShowGoalInstruction(true);
        }
    }, [user, userProfile, loading, monthlyGoals]);


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

    const handleDeclareSprint = async ({ tier, par, days }) => {
        if (!user || !db) return;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        const sprint = { tier, par, days, startDate, endDate };
        const newProfile = { ...userProfile, sprint };
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await setDoc(profileRef, { sprint }, { merge: true });
        setUserProfile(newProfile);
        setShowSprintModal(false);
        // Auto-post to Community Feed
        const tierEmojis = { Pro: '🔵', Elite: '🟣', Champion: '🔴' };
        writeCommunityPost({
            type: 'sprint_declared',
            message: `${userProfile.displayName} just declared a ${tierEmojis[tier] || '⚡'} ${tier} Sprint — ${days} days at ${par} pts/day! Who's ready to push with them? 🔥`,
        });
    };





    const updateLeaderboard = useCallback(async (currentMonthData, targetMonthId, dateOfChange) => {
        if (!user || !db || !userProfile.displayName || !dateOfChange) return;

        const { start, end } = getWeekRange(dateOfChange);
        const weekId = getWeekId(dateOfChange);

        let weeklyExposures = 0;
        let weeklyFollowUps = 0;
        let weeklyPresentations = 0;
        let weeklyThreeWays = 0;
        let weeklyEnrolls = 0;
        let weeklyNos = 0;

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
                weeklyNos += Number(dayData.nos) || 0;
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

        // Calculate current ironman streak to save to leaderboard
        const streaks = calculateCurrentStreaks(
            targetMonthId === monthYearId ? currentMonthData : monthlyDataRef.current,
            targetMonthId === lastMonthYearId ? currentMonthData : lastMonthData,
            new Date()
        );
        const ironmanStreak = streaks.ironman || 0;

        const leaderboardRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);

        const payload = {
            displayName: userProfile.displayName,
            dailyPar: userProfile.dailyPar || 2,
            exposures: weeklyExposures,
            followUps: weeklyFollowUps,
            presentations: weeklyPresentations,
            threeWays: weeklyThreeWays,
            enrolls: weeklyEnrolls,
            nos: weeklyNos,
            ironmanStreak,
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
    }, [user, db, userProfile.displayName, userProfile.dailyPar, userProfile.teamId, monthYearId, lastMonthYearId, lastMonthData]);

    const debouncedSave = useMemo(() => debounce(async (dataToSave, goalsToSave, targetMonthId, dateOfChange) => {
        if (!user || !db) return;
        
        const updates = { ...pendingUpdatesRef.current };
        if (Object.keys(updates).length === 0) return; // Nothing to save via atomic updates
        
        pendingUpdatesRef.current = {}; // clear immediately
        updates.lastUpdated = new Date().toISOString();
        
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', targetMonthId);
        try {
            console.log("TRACE: Flushing pending atomic updates:", updates);
            try {
                await updateDoc(docRef, updates);
            } catch (error) {
                if (error.code === 'not-found') {
                    console.log("TRACE: Document not found, creating with full data merge.");
                    await setDoc(docRef, { dailyData: dataToSave, monthlyGoals: goalsToSave, lastUpdated: updates.lastUpdated }, { merge: true });
                } else {
                    throw error;
                }
            }
            isDirtyRef.current = false;
            if (dataToSave && dateOfChange) {
                updateLeaderboard(dataToSave, targetMonthId, dateOfChange);
            }
        } catch (error) {
            console.error("Failed to save data:", error);
            // Revert pending updates on failure
            pendingUpdatesRef.current = { ...updates, ...pendingUpdatesRef.current };
        }
    }, 1500), [user, db, updateLeaderboard]);

    const evaluateCoaching = (date, metricKey, newValue, prevValue) => {
        let numVal = Array.isArray(newValue) ? newValue.length : Number(newValue) || 0;
        let prevNumVal = Array.isArray(prevValue) ? prevValue.length : Number(prevValue) || 0;
        if (numVal <= prevNumVal) return;

        const categoryMap = { exposures: 'exposures', followUps: 'followUps', tenacityFollowUps: 'followUps', presentations: 'presentations', pbrs: 'presentations', threeWays: 'threeWayCalls', teamSupport: 'teamSupport', enrolls: 'membershipsSold', sitdowns: 'membershipsSold', nos: 'rejections', exerc: 'dailyDisciplines', personalDevelopment: 'dailyDisciplines', read: 'dailyDisciplines', audio: 'dailyDisciplines' };
        const category = categoryMap[metricKey];
        if (!category) return;

        const now = new Date();
        const allTimeBests = userProfile.allTimeBests || {};
        const lastActivityTimestamps = userProfile.lastActivityTimestamps || {};
        let priority = 6;
        let message = '';
        
        if (metricKey === 'nos') {
            priority = 4;
            message = "SW4! Someone's Waiting! Move to the next diamond.";
        } else if (category !== 'dailyDisciplines' && numVal > (allTimeBests[metricKey] || 0)) {
            priority = 1;
            message = "NEW PERSONAL BEST! You are operating at a Diamond level today! 💎🔥";
            if (window.confetti) window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else if (numVal === 1 && lastActivityTimestamps[metricKey]) {
            const lastDate = new Date(lastActivityTimestamps[metricKey]);
            if ((now - lastDate) / (1000 * 60 * 60 * 24) > 3) {
                priority = 2;
                message = "The drought is over! Welcome back to the field. Consistency is the key to the Winner's Circle!";
            }
        } 
        
        if (priority === 6) {
            let currentMonthTotal = (numVal - prevNumVal);
            let previousMonthTotal = 0;
            Object.values(monthlyData).forEach(d => { let v = d[metricKey]; currentMonthTotal += Array.isArray(v) ? v.length : Number(v) || 0; });
            Object.values(lastMonthData).forEach(d => { let v = d[metricKey]; previousMonthTotal += Array.isArray(v) ? v.length : Number(v) || 0; });

            if (currentMonthTotal > previousMonthTotal && previousMonthTotal > 0 && currentMonthTotal - (numVal - prevNumVal) <= previousMonthTotal) {
                priority = 5;
                message = `Massive Growth! You've officially done more this month than you did in all of last month.`;
            }
        }

        if (priority === 6 && COACHING_REPOSITORY[category]) {
           // Use tier-aware message based on monthly total for this metric (#6)
           const monthlyTotal = Object.values(monthlyData).reduce((sum, d) => {
               const v = d[metricKey];
               return sum + (Array.isArray(v) ? v.length : Number(v) || 0);
           }, 0);
           message = getTieredMessage(category, monthlyTotal);
        }

        if (message) setCoachingToast({ priority, message });

        // ── Community milestone detection (additive — silent fail) ────────────
        // Check all streak types at milestone thresholds after the coaching logic fires.
        const checkStreakMilestones = () => {
            const allStreaks = calculateCurrentStreaks(
                metricKey && monthlyData ? { ...monthlyData } : monthlyData,
                lastMonthData,
                new Date()
            );
            const streakKeys = ['ironman', 'exposures', 'followUps', 'nos', 'exerc', 'personalDevelopment'];
            const todayStr = new Date().toDateString();
            
            let profileUpdates = {};
            let hasUpdates = false;

            streakKeys.forEach(key => {
                const streakCount = allStreaks[key] || 0;
                
                // Determine if this specific metric was logged TODAY.
                // If not, the streak count belongs to yesterday and we shouldn't reward it again today.
                const todayData = monthlyData && monthlyData[new Date().getDate()];
                let isTodayDone = false;
                if (todayData) {
                    if (key === 'ironman') {
                        isTodayDone = isIronmanDay(todayData);
                    } else {
                        const val = todayData[key];
                        isTodayDone = Array.isArray(val) ? val.length > 0 : Number(val) > 0;
                    }
                }

                if (STREAK_MILESTONES.includes(streakCount) && isTodayDone) {
                    const milestoneId = `milestone_${key}_${streakCount}`;
                    const localLockKey = `lock_${milestoneId}_${todayStr}`;
                    
                    // Use sessionStorage for immediate cross-closure lock, and userProfile for device state
                    if (userProfile[milestoneId] !== todayStr && !sessionStorage.getItem(localLockKey)) {
                        sessionStorage.setItem(localLockKey, "true");
                        
                        const isIronman = key === 'ironman';
                        const label = STREAK_TYPE_LABELS[key] || key;
                        writeCommunityPost({
                            type: isIronman ? 'ironman_streak' : 'streak_milestone',
                            streakType: key,
                            streakCount,
                            message: isIronman
                                ? `${userProfile.displayName} just completed a ${streakCount}-day Ironman streak! 🔥`
                                : `${userProfile.displayName} just hit a ${streakCount}-day ${label} streak! 📈`,
                        });
                        
                        profileUpdates[milestoneId] = todayStr;
                        hasUpdates = true;
                        
                        // Update local React state immediately
                        setUserProfile(prev => ({...prev, [milestoneId]: todayStr}));
                    }
                }
            });
            
            if (hasUpdates) {
                 const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
                 updateDoc(profileRef, profileUpdates).catch(err => console.error(err));
            }
        };
        // Run milestone check after a short delay so state has settled
        setTimeout(checkStreakMilestones, 500);

        // ── Personal Best opt-in (priority 1) ────────────────────────────────
        // The coaching toast already fires with a NEW PERSONAL BEST message.
        // We surface the opt-in share via the toast priority flag — no extra UI needed here.
        // (Future: add a "Share with Community" CTA inside CoachingToast for priority === 1)

        const newBest = Math.max(allTimeBests[metricKey] || 0, numVal);
        const updatedProfile = { 
            ...userProfile, 
            allTimeBests: { ...allTimeBests, [metricKey]: newBest },
            lastActivityTimestamps: { ...lastActivityTimestamps, [metricKey]: now.toISOString() }
        };
        setUserProfile(updatedProfile);
        
        const profileRefLocal = doc(db, 'artifacts', appId, 'users', user.uid);
        updateDoc(profileRefLocal, { [`allTimeBests.${metricKey}`]: newBest, [`lastActivityTimestamps.${metricKey}`]: now.toISOString() }).catch(err => console.error(err));
    };

    const handleDataChange = (date, field, value) => {
        const day = date.getDate();
        const targetMonthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        console.log(`TRACE: handleDataChange FIRED for field: ${field}, value: ${value}`);

        if (targetMonthId === monthYearId) {
            setMonthlyData(prevData => {
                const prevValue = prevData[day]?.[field];
                const updatedData = { ...prevData, [day]: { ...prevData[day], [field]: value } };
                
                isDirtyRef.current = true;
                pendingUpdatesRef.current[`dailyData.${day}.${field}`] = value;
                debouncedSave(updatedData, monthlyGoals, monthYearId, date);
                evaluateCoaching(date, field, value, prevValue);
                
                return updatedData;
            });
        } else {
            if (targetMonthId === lastMonthYearId) {
                setLastMonthData(prevData => {
                    const prevValue = prevData[day]?.[field];
                    const updatedLastMonthData = { ...prevData, [day]: { ...prevData[day], [field]: value } };
                    evaluateCoaching(date, field, value, prevValue);
                    return updatedLastMonthData;
                });
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
        today.setHours(0, 0, 0, 0);
        // Determine target date — use quickAddDate but never allow future dates
        const targetDate = new Date(quickAddDate);
        targetDate.setHours(0, 0, 0, 0);
        const logDate = targetDate > today ? today : targetDate;

        const targetMonthId = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
        // Fetch day data from the correct month store
        let logDayData = {};
        if (targetMonthId === monthYearId) {
            logDayData = monthlyDataRef.current[logDate.getDate()] || {};
        } else {
            // For prior months we read directly from Firestore via handleDataChange,
            // so we only need the current value for presentation array handling.
            logDayData = {};
        }

        if (metricKey === 'presentations') {
            const currentPresentations = logDayData.presentations || [];
            let newPresentations;
            if (Array.isArray(currentPresentations)) {
                newPresentations = [...currentPresentations];
            } else {
                newPresentations = !isNaN(currentPresentations) && currentPresentations > 0 ? Array(Number(currentPresentations)).fill('P') : [];
            }
            if (amount > 0) {
                newPresentations.push('P');
            } else if (amount < 0 && newPresentations.length > 0) {
                newPresentations.pop();
            }
            handleDataChange(logDate, metricKey, newPresentations);
            return;
        }

        const currentValue = Number(logDayData[metricKey]) || 0;
        const newValue = Math.max(0, currentValue + amount);
        handleDataChange(logDate, metricKey, newValue);
    };

    const handleAddPresentation = (type) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(quickAddDate);
        targetDate.setHours(0, 0, 0, 0);
        const logDate = targetDate > today ? today : targetDate;

        let logDayData = {};
        const targetMonthId = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
        if (targetMonthId === monthYearId) {
            logDayData = monthlyDataRef.current[logDate.getDate()] || {};
        }
        const currentPresentations = logDayData.presentations || [];
        const newPresentations = [...currentPresentations, type];
        handleDataChange(logDate, 'presentations', newPresentations);
    };

    const handleGoalChange = (goalKey, value) => {
        const newGoals = { ...monthlyGoals, [goalKey]: Number(value) || 0 };
        setMonthlyGoals(newGoals);
        isDirtyRef.current = true;
        pendingUpdatesRef.current[`monthlyGoals.${goalKey}`] = Number(value) || 0;
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

        // Use currentDate (view date) instead of real-time today to allow backdated reports
        const targetDate = new Date(currentDate);
        const dayOfWeek = targetDate.getDay();
        const startOfWeek = new Date(targetDate);
        startOfWeek.setDate(targetDate.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfWeek);
        endOfLastWeek.setDate(startOfWeek.getDate() - 1);

        const getWeekTotals = (startDate, endDate) => {
            const totals = { exposures: 0, followUps: 0, nos: 0, presentations: 0, threeWays: 0, teamSupport: 0, enrolls: 0 };
            let current = new Date(startDate);
            while (current <= endDate) {
                const dataSet = current.getMonth() === targetDate.getMonth() ? monthlyData : lastMonthData;
                const dayData = dataSet[current.getDate()];
                if (dayData) {
                    totals.exposures += Number(dayData.exposures) || 0;
                    totals.followUps += Number(dayData.followUps) || 0;
                    totals.nos += Number(dayData.nos) || 0;
                    totals.presentations += (Array.isArray(dayData.presentations) ? dayData.presentations.length : Number(dayData.presentations) || 0) + (Number(dayData.pbrs) || 0);
                    totals.threeWays += Number(dayData.threeWays) || 0;
                    totals.teamSupport += Number(dayData.teamSupport) || 0;
                    totals.enrolls += (Number(dayData.enrolls) || 0) + (Array.isArray(dayData.sitdowns) ? dayData.sitdowns.filter(s => s === 'E').length : 0);
                }
                current.setDate(current.getDate() + 1);
            }
            return totals;
        };

        const thisWeekTotals = getWeekTotals(startOfWeek, endOfWeek);
        const lastWeekTotals = getWeekTotals(startOfLastWeek, endOfLastWeek);
        const dateRange = `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;

        // Compute elapsed working days (Mon-Fri) up to today (or up to the target date if viewing a past week)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const effectiveEnd = targetDate <= now ? targetDate : now;
        let elapsedDays = 0;
        let cur = new Date(startOfWeek);
        while (cur <= effectiveEnd && cur <= endOfWeek) {
            const dow = cur.getDay();
            if (dow >= 1 && dow <= 5) elapsedDays++; // Mon=1 … Fri=5
            cur.setDate(cur.getDate() + 1);
        }
        elapsedDays = Math.max(1, Math.min(elapsedDays, 5)); // clamp 1-5

        const allItems = hotlist;

        const activeInPipeline = allItems.filter(item => item.isArchived !== true && (item.status === 'Hot' || item.status === 'Warm')).length;
        const closingZone = allItems.filter(item => item.isArchived !== true && item.status === 'Hot');

        return { totals: thisWeekTotals, lastWeekTotals, dateRange, activeInPipeline, closingZone, reportTitle: 'Weekly Scoreboard', elapsedDays };
    }, [monthlyData, lastMonthData, db, hotlist, currentDate]);



    const getMonthDataForReport = useCallback(async () => {
        const totals = { exposures: 0, followUps: 0, nos: 0, presentations: 0, threeWays: 0, teamSupport: 0, enrolls: 0 };
        Object.values(monthlyData).forEach(dayData => {
            totals.exposures += Number(dayData.exposures) || 0;
            totals.followUps += Number(dayData.followUps) || 0;
            totals.nos += Number(dayData.nos) || 0;
            totals.presentations += (Array.isArray(dayData.presentations) ? dayData.presentations.length : Number(dayData.presentations) || 0) + (Number(dayData.pbrs) || 0);
            totals.threeWays += Number(dayData.threeWays) || 0;
            totals.teamSupport += Number(dayData.teamSupport) || 0;
            totals.enrolls += (Number(dayData.enrolls) || 0) + (Array.isArray(dayData.sitdowns) ? dayData.sitdowns.filter(s => s === 'E').length : 0);
        });

        const dateRange = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const allItems = hotlist;
        const activeInPipeline = allItems.filter(item => item.isArchived !== true && (item.status === 'Hot' || item.status === 'Warm')).length;

        // Validating data integrity - if monthlyData is empty, we might return zeros, which is fine.
        return { totals, lastWeekTotals: {}, dateRange, activeInPipeline, reportTitle: 'Monthly Scoreboard' };
    }, [monthlyData, currentDate, hotlist]);


    const handleShareMonthly = async () => {
        setIsSharing(true);
        const monthData = await getMonthDataForReport();
        setReportCardData(monthData);
    };


    const handleShareReportAsText = useCallback(async (dataToShare) => {
        // Use passed data or fetch week data as fallback
        const data = dataToShare || await getWeekDataForReport();
        const { totals, dateRange, activeInPipeline, closingZone, reportTitle } = data;

        const isMonthly = reportTitle === 'Monthly Scoreboard';
        const dateLabel = isMonthly ? 'Month of' : 'Week of';
        const titleLabel = reportTitle || 'Activity Report';

        let shareText = `My ${titleLabel}\nFrom: ${userProfile.displayName}\n${dateLabel}: ${dateRange}\n\n`;
        shareText += `**${isMonthly ? "This Month's" : "This Week's"} Numbers:**\n- Exposures: ${totals.exposures}\n- Follow Ups: ${totals.followUps}\n- Definitive No's: ${totals.nos}\n- Presentations: ${totals.presentations}\n- 3-Way Calls: ${totals.threeWays}\n- Team Support: ${totals.teamSupport}\n- Memberships Sold: ${totals.enrolls}\n\n`;
        shareText += `**Prospect Pipeline:**\n- Active Prospects: ${activeInPipeline}\n\n`;
        shareText += "--------------------\n\n";

        if (closingZone && closingZone.length > 0) {
            shareText += `My "Closing Zone" Prospects\n\n`;
            closingZone.forEach((item, index) => { shareText += `${index + 1}. ${item.name} (${item.exposureCount || 0} exposures)\n`; });
        }

        shareText += "\nSent from my Activity Tracker App";
        try {
            if (navigator.share && navigator.canShare && navigator.canShare({ title: `My ${titleLabel}`, text: shareText })) {
                await navigator.share({ title: `My ${titleLabel}`, text: shareText });
            } else {
                throw new Error("Sharing not supported");
            }
        } catch (error) {
            console.log("Share API failed, falling back to clipboard:", error);
            try {
                await navigator.clipboard.writeText(shareText);
                alert("Report copied to clipboard!");
            } catch (clipboardError) {
                console.error("Clipboard copy failed:", clipboardError);
                alert("Could not share report or copy to clipboard.");
            }
        }
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

                const isMonthly = reportCardData.reportTitle === 'Monthly Scoreboard';
                const dateLabel = isMonthly ? 'Month' : 'Week';
                const baseText = `Here's my activity report for the ${dateLabel.toLowerCase()} of ${reportCardData.dateRange}.`;

                const shareData = { files: [file], title: reportCardData.reportTitle || 'My Activity Report', text: baseText };

                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    // Fallback: Download the image
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `ActivityReport-${reportCardData.dateRange}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    // Also try to copy text summary as a bonus fallback, using the existing data
                    await handleShareReportAsText(reportCardData);
                }
            } catch (error) {
                console.error('Error generating report:', error);
                await handleShareReportAsText(reportCardData);
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

            // Suppress Cut Report for users enrolled less than 7 days ago
            if (user?.metadata?.creationTime) {
                const accountAgeDays = (Date.now() - new Date(user.metadata.creationTime).getTime()) / (1000 * 60 * 60 * 24);
                if (accountAgeDays < 7) return;
            }

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
                const updates = { ...pendingUpdatesRef.current };
                if (Object.keys(updates).length > 0) {
                    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
                    updates.lastUpdated = new Date().toISOString();
                    updateDoc(docRef, updates).catch(() => {});
                }
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (isDirtyRef.current) {
                const updates = { ...pendingUpdatesRef.current };
                if (Object.keys(updates).length > 0) {
                    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
                    updates.lastUpdated = new Date().toISOString();
                    updateDoc(docRef, updates).catch(() => {});
                }
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
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-36">
            <NotificationBanner todayPoints={todayPoints} dailyPar={dailyPar} />
            
            <div className="sticky top-0 z-40 bg-gray-50 pt-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Header displayName={userProfile.displayName} onSignOut={() => auth.signOut()} onEditName={() => setShowNameModal(true)} />
                    <TabBar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); if (tab !== 'tracker') setQuickAddDate(new Date()); }} badges={{ today: showTodayBadge, community: hasUnreadCommunity }} />
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
                <main className="mt-6">
                    <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
                        {activeTab === 'today' && (() => {
                            // Compute weekly points + par to pass the pace chip (#5)
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            const startOfWeek = new Date(now);
                            startOfWeek.setDate(now.getDate() - now.getDay());
                            let wPoints = 0;
                            let wPar = 0;
                            for (let i = 0; i < 7; i++) {
                                const d = new Date(startOfWeek);
                                d.setDate(startOfWeek.getDate() + i);
                                if (d > now) break;
                                const dayData = monthlyData[d.getDate()] || {};
                                wPoints += calculatePoints(dayData);
                                wPar += (userProfile.dailyPar || 2);
                            }
                            return (
                                <TodayDashboard
                                    monthlyData={monthlyData}
                                    streaks={currentStreaks}
                                    onQuickAdd={handleQuickAdd}
                                    onHabitChange={handleDataChange}
                                    onAddPresentation={handleAddPresentation}
                                    onShare={handleShare}
                                    onShareMonthly={handleShareMonthly}
                                    isSharing={isSharing}
                                    onLogFollowUp={() => setShowFollowUpModal(true)}
                                    onLogExposure={() => setShowExposureModal(true)}
                                    dailyPar={userProfile.dailyPar}
                                    onShowLegend={() => setShowScoringLegend(true)}
                                    hotlist={hotlist}
                                    onNavigateToPipeline={() => setActiveTab('hotlist')}
                                    weeklyPoints={wPoints}
                                    weeklyPar={wPar}
                                    onLogFollowUpForProspect={handleLogFollowUpForProspect}
                                    sprint={userProfile.sprint || null}
                                    onDeclareSprint={() => setShowSprintModal(true)}
                                />
                            );
                        })()}


                        {activeTab === 'tracker' && <ActivityTracker
                            date={currentDate} setDate={setCurrentDate}
                            goals={monthlyGoals} onGoalChange={handleGoalChange}
                            data={{ current: { ...monthlyData, id: monthYearId }, last: { ...lastMonthData, id: lastMonthYearId } }} onDataChange={handleDataChange}
                            onShare={handleShare} onShareMonthly={handleShareMonthly} isSharing={isSharing}
                            user={user} userProfile={userProfile}
                            onQuickAdd={handleQuickAdd}
                            showGoalInstruction={showGoalInstruction} onDismissGoalInstruction={handleDismissGoalInstruction}
                            streaks={currentStreaks}
                            dailyPar={userProfile.dailyPar}
                            onShowLegend={() => setShowScoringLegend(true)}
                            onDateContext={setQuickAddDate}
                        />}
                        {activeTab === 'team' && <TeamPage user={user} db={db} userProfile={userProfile} setUserProfile={setUserProfile} weekId={getWeekId(currentDate)} />}
                        {activeTab === 'hotlist' && <HotList
                            user={user} db={db}
                            onDataChange={(date, field, val) => handleDataChange(date, field, val)}
                            monthlyData={monthlyData}
                            hotlist={hotlist}
                        />}
                        {activeTab === 'analytics' && <AnalyticsDashboard db={db} user={user} />}
                        {activeTab === 'community' && (
                            <CommunityFeed
                                db={db}
                                user={user}
                                userProfile={userProfile}
                            />
                        )}
                        {activeTab === 'coach' && (
                            <DiamondCoach 
                                userProfile={userProfile}
                                todayData={todayData}
                                ironmanStreak={currentStreaks.ironman || 0}
                                monthlyData={monthlyData}
                                lastMonthData={lastMonthData}
                                monthlyGoals={monthlyGoals}
                            />
                        )}
                    </Suspense>
                </main>
            </div>

            {/* Global Quick Log FAB — visible on all tabs */}
            <QuickLogFAB
                onLogExposure={() => setShowExposureModal(true)}
                onLogFollowUp={() => setShowFollowUpModal(true)}
                onAddPresentation={handleAddPresentation}
                onQuickAdd={handleQuickAdd}
                targetDate={quickAddDate}
            />

            {showNameModal && <DisplayNameModal currentName={userProfile.displayName} currentPar={userProfile.dailyPar} onSave={handleSetDisplayName} onClose={!userProfile.displayName ? null : () => setShowNameModal(false)} />}
            {showEditNameModal && <DisplayNameModal currentName={userProfile.displayName} currentPar={userProfile.dailyPar} onSave={handleSetDisplayName} onClose={() => setShowEditNameModal(false)} />}
            {showOnboarding && <OnboardingModal onDismiss={handleDismissOnboarding} />}
            {showCutReport && <CutReportModal score={cutReportScore} onClose={handleCloseCutReport} />}
            {showScoringLegend && <ScoringLegendModal onClose={() => setShowScoringLegend(false)} />}
            {showSprintModal && <SprintDeclarationModal currentSprint={userProfile.sprint} onSave={handleDeclareSprint} onClose={() => setShowSprintModal(false)} />}

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

            {coachingToast && <CoachingToast message={coachingToast.message} priority={coachingToast.priority} onClose={() => setCoachingToast(null)} />}
        </div>
    );
};


const App = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;
