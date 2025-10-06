import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, limit, addDoc, deleteDoc, orderBy, where, getCountFromServer, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, ChevronUp, ChevronDown, Plus, X, List, BarChart2, Target, Users, PhoneCall, Trash2, Trophy, LogOut, Share2, Flame, Edit2, Calendar, Minus, Info, Archive, ArchiveRestore, TrendingUp, ChevronsRight, Award, Lightbulb, UserCheck, Dumbbell, BookOpen, User, Video, ArrowRight, CheckCircle, XCircle, ArrowUp, ArrowDown, MessageSquare, ClipboardCopy } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- Firebase Configuration ---
// A placeholder config is provided, but the app will attempt to use the one injected by the environment.
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

const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};


// --- Child UI Components (Defined before App component) ---

const AuthPage = ({ auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">
                    {isSignUp ? 'Create an Account' : 'Sign In'}
                </h2>
                <form onSubmit={handleAuthAction} className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                               className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" className="w-full py-2 px-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                <p className="text-sm text-center text-gray-600">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="ml-1 font-semibold text-indigo-600 hover:underline">
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};

const Header = ({ displayName, onSignOut, onEditName }) => (
    <header className="flex justify-between items-center pb-4">
        <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{displayName}</h1>
            <button onClick={onEditName} className="ml-3 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
        </div>
        <button onClick={onSignOut} className="flex items-center text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">
            <LogOut className="h-5 w-5 mr-1" /> Sign Out
        </button>
    </header>
);

const TabBar = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'today', name: 'Today', icon: Sun },
        { id: 'tracker', name: 'Calendar', icon: Calendar },
        { id: 'team', name: 'Team', icon: Users, isBeta: true },
        { id: 'leaderboard', name: 'Leaderboard', icon: Trophy },
        { id: 'hotlist', name: 'Prospect Pipeline', icon: List },
        { id: 'analytics', name: 'Analytics', icon: BarChart2 }
    ];
    return (
        <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${ activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' } whitespace-nowrap py-3 px-1 sm:py-4 border-b-2 font-medium text-sm flex items-center`}>
                <tab.icon className="mr-2 h-5 w-5" />
                {tab.name}
                {tab.isBeta && <span className="ml-2 text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">BETA</span>}
            </button>))}
        </nav></div>
    );
};

const ActivityCard = ({ label, value, streak, icon: Icon, color, onIncrement, onDecrement }) => {
    return (
        <div className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col justify-between`}>
            <div className="flex items-start justify-between">
                <h3 className={`font-semibold text-gray-700`}>{label}</h3>
                <Icon className={`h-7 w-7 text-${color}-400`} />
            </div>
            <div className="flex items-center justify-center space-x-4 my-4">
                <button onClick={onDecrement} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" disabled={value <= 0}>
                    <Minus className="h-5 w-5" />
                </button>
                <span className="text-5xl font-bold text-gray-900 w-16 text-center">{value}</span>
                <button onClick={onIncrement} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <Plus className="h-5 w-5" />
                </button>
            </div>
            <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 rounded-full px-3 py-1 self-center">
                <Flame className="h-4 w-4 mr-1.5 text-amber-500"/>
                <span className="font-semibold">{streak} Day Streak</span>
            </div>
        </div>
    );
};

const PresentationActivityCard = ({ label, value, streak, icon: Icon, color, onAddPresentation }) => {
    return (
        <div className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col justify-between`}>
            <div className="flex items-start justify-between">
                <h3 className={`font-semibold text-gray-700`}>{label}</h3>
                <Icon className={`h-7 w-7 text-${color}-400`} />
            </div>
            <div className="text-center my-4">
                <span className="text-5xl font-bold text-gray-900">{value}</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
                <button onClick={() => onAddPresentation('P')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <User className="h-4 w-4 mr-1.5" /> In Person
                </button>
                <button onClick={() => onAddPresentation('V')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <Video className="h-4 w-4 mr-1.5" /> Virtual
                </button>
            </div>
            <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 rounded-full px-3 py-1 self-center mt-3">
                <Flame className="h-4 w-4 mr-1.5 text-amber-500"/>
                <span className="font-semibold">{streak} Day Streak</span>
            </div>
        </div>
    );
};

const DisciplineCheckbox = ({ label, icon: Icon, isChecked, onChange }) => {
    const baseClasses = "flex items-center p-4 rounded-lg cursor-pointer transition-all border-2";
    const checkedClasses = "bg-indigo-50 border-indigo-500 text-indigo-800";
    const uncheckedClasses = "bg-white border-gray-200 hover:border-gray-300";

    return (
        <label className={`${baseClasses} ${isChecked ? checkedClasses : uncheckedClasses}`}>
            <div className={`mr-4 p-2 rounded-full ${isChecked ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <Icon className={`h-6 w-6 ${isChecked ? 'text-indigo-600' : 'text-gray-500'}`}/>
            </div>
            <span className="font-semibold flex-grow">{label}</span>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={onChange}
                className="h-6 w-6 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 self-center"
            />
        </label>
    );
};

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, isSharing, onLogFollowUp, onLogExposure }) => {
    const today = new Date();
    const todayData = monthlyData[today.getDate()] || {};

    const metrics = [
        { key: 'exposures', label: 'Exposures', icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', icon: Users, color: 'green' },
        { key: 'presentations', label: 'Presentations', icon: BarChart2, color: 'purple', isPresentation: true },
        { key: 'threeWays', label: '3-Way Calls', icon: PhoneCall, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', icon: UserCheck, color: 'teal' }
    ];

    const disciplines = [
        { key: 'exerc', label: 'Exercise', icon: Dumbbell },
        { key: 'personalDevelopment', label: 'Personal Development', icon: BookOpen },
    ];

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-1">Today's Focus</h2>
                        <p className="text-gray-500">Log your key business activities for {today.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
                    </div>
                    <button 
                        onClick={onShare} 
                        disabled={isSharing} 
                        className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm disabled:bg-indigo-400 disabled:cursor-wait mt-3 sm:mt-0 w-full sm:w-auto justify-center"
                    >
                        <Share2 className="h-4 w-4 mr-2" /> {isSharing ? 'Generating...' : 'Share Weekly Report'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.map(metric => {
                        if (metric.isPresentation) {
                            const value = (todayData.presentations?.length || 0) + (Number(todayData.pbrs) || 0);
                            return (
                                <PresentationActivityCard
                                    key={metric.key}
                                    label={metric.label}
                                    value={value}
                                    streak={streaks.presentations || 0}
                                    icon={metric.icon}
                                    color={metric.color}
                                    onAddPresentation={onAddPresentation}
                                />
                            );
                        }
                        const value = Number(todayData[metric.key]) || 0;
                        
                        let onIncrement;
                        if (metric.key === 'followUps') {
                            onIncrement = onLogFollowUp;
                        } else if (metric.key === 'exposures') {
                            onIncrement = onLogExposure;
                        } else {
                            onIncrement = () => onQuickAdd(metric.key, 1);
                        }

                        return (
                            <ActivityCard
                                key={metric.key}
                                label={metric.label}
                                value={value}
                                streak={streaks[metric.key] || 0}
                                icon={metric.icon}
                                color={metric.color}
                                onIncrement={onIncrement}
                                onDecrement={() => onQuickAdd(metric.key, -1)}
                            />
                        );
                    })}
                </div>
            </div>
            
            <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-1">Daily Disciplines</h2>
                <p className="text-gray-500">Check off your personal growth habits for today.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {disciplines.map(discipline => {
                        let isChecked = !!todayData[discipline.key];
                        if (discipline.key === 'personalDevelopment') {
                            isChecked = !!(todayData.personalDevelopment || todayData.read || todayData.audio);
                        }
                        return (
                             <DisciplineCheckbox
                                key={discipline.key}
                                label={discipline.label}
                                icon={discipline.icon}
                                isChecked={isChecked}
                                onChange={(e) => onHabitChange(today, discipline.key, e.target.checked)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const Leaderboard = ({ db, monthYearId, user }) => {
    const [scores, setScores] = useState([]);
    const [userRank, setUserRank] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!db) return;
            const leaderboardColRef = collection(db, 'artifacts', appId, 'leaderboard', monthYearId, 'entries');
            const q = query(leaderboardColRef, orderBy('exposures', 'desc'), limit(20));
            const snapshot = await getDocs(q);
            const leaderboardData = snapshot.docs.map(d => ({...d.data(), id: d.id}));
            setScores(leaderboardData);

            const userEntry = leaderboardData.find(entry => entry.userId === user.uid);
            if (userEntry) {
                 const rankQuery = query(leaderboardColRef, where('exposures', '>', userEntry.exposures));
                 const higherScoresSnap = await getCountFromServer(rankQuery);
                 setUserRank(higherScoresSnap.data().count + 1);
            } else {
                setUserRank(null);
            }
        };
        fetchLeaderboard();
    }, [db, monthYearId, user.uid]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Top 20 Leaderboard</h2>
            <div className="space-y-3">
                {scores.map((entry, index) => (
                    <div key={entry.id} className={`p-3 rounded-lg flex items-center justify-between ${entry.userId === user.uid ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center">
                            <span className="font-bold text-lg w-8">{index + 1}</span>
                            <span className="font-medium">{entry.displayName}</span>
                        </div>
                        <span className="font-bold text-lg text-indigo-600">{entry.exposures}</span>
                    </div>
                ))}
            </div>
            {userRank && (
                <div className="mt-4 text-center p-3 bg-amber-100 text-amber-800 font-semibold rounded-lg">
                    Your Rank: {userRank}
                </div>
            )}
        </div>
    );
};

const ActivityTracker = ({ date, setDate, goals, onGoalChange, data, onDataChange, onShare, isSharing, user, userProfile, onQuickAdd, showGoalInstruction, onDismissGoalInstruction, streaks }) => {
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
            const noActivity = !dayData || ((Number(dayData.exposures || 0) === 0) && (Number(dayData.followUps || 0) === 0) && ((dayData.presentations?.length || 0) + (Number(dayData.pbrs) || 0) === 0));
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
            const noActivity = Object.keys(dayData).filter(k => k !== 'exerc' && k !== 'read' && k !== 'pbrs').length === 0 || (Number(dayData.exposures || 0) === 0 && Number(dayData.followUps || 0) === 0 && (dayData.presentations || []).length === 0 && (Number(dayData.pbrs) || 0) === 0);
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
            acc.presentations += (dayData.presentations?.length || 0) + (Number(dayData.pbrs) || 0);
            acc.threeWays += Number(dayData.threeWays) || 0;
            acc.enrolls += (Number(dayData.enrolls) || 0) + (Array.isArray(dayData.sitdowns) ? dayData.sitdowns.filter(s => s === 'E').length : 0);
            return acc;
        }, { exposures: 0, followUps: 0, presentations: 0, threeWays: 0, enrolls: 0 });
    }, [data]);

    const handleDayClick = (dayObj) => {
        if (dayObj.isBlank) return;
        setSelectedDay(dayObj.date);
    };
    const closeModal = () => setSelectedDay(null);
    const handleModalDataChange = (field, value) => onDataChange(selectedDay, field, value);

    const activityColors = { exposures: 'bg-blue-500', followUps: 'bg-green-500', presentations: 'bg-purple-500', threeWays: 'bg-pink-500', enrolls: 'bg-teal-500' };

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
                                    {((d.data.presentations?.length || 0) + (Number(d.data.pbrs) || 0)) > 0 && <div className={`h-2 w-2 ${activityColors.presentations} rounded-full`}></div>}
                                    {(d.data.enrolls > 0 || d.data.sitdowns?.some(s=>s==='E')) && <div className={`h-2 w-2 ${activityColors.enrolls} rounded-full`}></div>}
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
                                            {((d.data.presentations?.length || 0) + (Number(d.data.pbrs) || 0)) > 0 && <div className={`h-2 w-2 ${activityColors.presentations} rounded-full`}></div>}
                                            {(d.data.enrolls > 0 || d.data.sitdowns?.some(s=>s==='E')) && <div className={`h-2 w-2 ${activityColors.enrolls} rounded-full`}></div>}
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
        { key: 'presentations', label: 'Presentations', value: totals.presentations, icon: BarChart2, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: totals.threeWays, icon: PhoneCall, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', value: totals.enrolls, icon: UserCheck, color: 'teal' }
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
                                        {metric.key !== 'presentations' ? (
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
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Memberships Sold</label><NumberInput value={data.enrolls || ''} onChange={e => onChange('enrolls', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">3 Ways</label><NumberInput value={data.threeWays || ''} onChange={e => onChange('threeWays', e.target.value)} /></div>
                   <PresentationTracker value={data.presentations || []} onChange={val => onChange('presentations', val)} />
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Gameplans</label><NumberInput value={data.gameplans || ''} onChange={e => onChange('gameplans', e.target.value)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Exercise</label><CheckboxInput checked={!!data.exerc} onChange={e => onChange('exerc', e.target.checked)} /></div>
                   <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Personal Development</label><CheckboxInput checked={!!(data.personalDevelopment || data.read || data.audio)} onChange={e => onChange('personalDevelopment', e.target.checked)} /></div>
                </div>
                <div className="p-4 bg-gray-50 text-right rounded-b-lg"><button onClick={onClose} className="bg-indigo-600 text-white px-5 py-2 rounded-md">Done</button></div>
            </div>
        </div>
    );
};

const PresentationTracker = ({ value = [], onChange }) => {
    const options = { 'P': 'In Person', 'V': 'Virtual' };
    
    // Legacy support: Map old types to new ones for display
    const getDisplayType = (type) => {
        if (type === 'P') return 'In Person';
        if (['Z', 'V', 'D'].includes(type)) return 'Virtual'; // Old virtual types
        return options[type] || 'Unknown'; // New 'V' type and fallback
    };
    
    const handleAdd = (type) => { 
        const newValue = [...value, type]; // Add to original array to not lose legacy data
        onChange(newValue); 
    };
    const handleRemove = (indexToRemove) => { 
        const newValue = value.filter((_, index) => index !== indexToRemove); 
        onChange(newValue); 
    };

    const totalPresentations = (value.length || 0);

    return (
        <div className="pt-2">
            <label className="font-medium text-gray-700">Presentations ({totalPresentations})</label>
             <div className="mt-2 flex items-center justify-center space-x-2">
                <button onClick={() => handleAdd('P')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <User className="h-4 w-4 mr-1.5" /> Add In Person
                </button>
                <button onClick={() => handleAdd('V')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <Video className="h-4 w-4 mr-1.5" /> Add Virtual
                </button>
            </div>
            <div className="mt-2 space-y-2">
                {value.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                        <span className="text-sm">{getDisplayType(item)}</span>
                        <button onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HotList = ({ user, db, onDataChange, monthlyData, hotlist: allProspects }) => {
    const [isArchiveView, setIsArchiveView] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [itemToDecide, setItemToDecide] = useState(null); // For outcome modal
    const [itemToDelete, setItemToDelete] = useState(null);
    const [collapsedCategories, setCollapsedCategories] = useState({ Warm: true, Cold: true });

    const toggleCategory = (category) => {
        setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const hotlistColRef = useMemo(() => {
        if (!db || !user?.uid) return null;
        return collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
    }, [db, user]);
    
    const hotlist = useMemo(() => {
        return allProspects.filter(item => (isArchiveView ? item.isArchived === true : item.isArchived !== true));
    }, [allProspects, isArchiveView]);
    
    const handleAdd = async (name) => {
        setShowAddModal(false);
        if (!name || !hotlistColRef) return;
        const newItem = {
            name,
            notes: "",
            status: 'Cold', // Start as Cold
            lastContacted: null,
            isArchived: false,
            exposureCount: 0,
            nextActionDate: null,
            outcome: null,
            decisionDate: null
        };
        await addDoc(hotlistColRef, newItem);
    };

    const debouncedUpdate = useMemo(() => debounce(async (id, field, value) => {
        if (!hotlistColRef) return;
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, { [field]: value });
    }, 1000), [hotlistColRef]);

    const handleUpdate = (id, field, value) => {
        debouncedUpdate(id, field, value);
    };
    
    const handleInstantUpdate = async (id, update) => {
        if (!hotlistColRef) return;
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, update);
    };

    const handleSetOutcome = async (outcome) => {
        if (!itemToDecide) return;
        const update = {
            isArchived: true,
            outcome: outcome,
            decisionDate: new Date().toISOString()
        };
        await handleInstantUpdate(itemToDecide.id, update);
        setItemToDecide(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete || !hotlistColRef) return;
        const docRef = doc(hotlistColRef, itemToDelete);
        await deleteDoc(docRef);
        setItemToDelete(null);
    };

    const statusConfig = {
        Hot: { title: 'HOT - Closing Zone', icon: Flame, color: 'red', description: 'Prospects who have seen a presentation. Follow up to close!'},
        Warm: { title: 'WARM - Building Interest', icon: TrendingUp, color: 'amber', description: "Actively sending tools and having conversations. These prospects haven't seen a full presentation yet."},
        Cold: { title: 'COLD - Prospect List', icon: Users, color: 'blue', description: 'New prospects to start conversations with.'},
    };

    const groupedProspects = useMemo(() => {
        const groups = { Hot: [], Warm: [], Cold: [] };
        hotlist.forEach(p => {
            if (p.status === 'Hot' || p.status === 'Warm' || p.status === 'Cold') {
                groups[p.status].push(p);
            }
        });
        return groups;
    }, [hotlist]);

    return (
        <div className="space-y-6">
            {showAddModal && <AddHotlistItemModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
            {itemToDecide && <OutcomeModal onClose={() => setItemToDecide(null)} onDecide={handleSetOutcome} />}
            {itemToDelete && <ConfirmDeleteModal onConfirm={handleDelete} onClose={() => setItemToDelete(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                     <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Prospect Pipeline</h2>
                     <p className="text-sm text-gray-500 mt-1">Manage your prospects from initial contact to decision.</p>
                </div>
                <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                    <button onClick={() => setIsArchiveView(!isArchiveView)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        {isArchiveView ? <><List className="h-4 w-4 mr-1"/> View Active Pipeline</> : <><Archive className="h-4 w-4 mr-1"/> View Archive</>}
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm">
                        <Plus className="h-5 w-5 mr-2" /> Add Prospect
                    </button>
                </div>
            </div>
            
            {isArchiveView ? (
                <ArchivedProspectsList list={hotlist} onUnarchive={handleInstantUpdate} onDelete={setItemToDelete} />
            ) : (
                <div className="space-y-8">
                    {Object.keys(statusConfig).map(statusKey => {
                        const { title, icon: Icon, color, description } = statusConfig[statusKey];
                        const prospects = groupedProspects[statusKey];
                        const isCollapsed = collapsedCategories[statusKey];
                        return (
                            <div key={statusKey}>
                                <button onClick={() => toggleCategory(statusKey)} className={`w-full flex items-center justify-between pb-2 border-b-2 border-${color}-500`}>
                                    <div className="flex items-center">
                                        <Icon className={`h-6 w-6 text-${color}-500 mr-3`} />
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 text-left">{title} ({prospects.length})</h3>
                                            <p className="text-xs text-gray-500 text-left">{description}</p>
                                        </div>
                                    </div>
                                    {isCollapsed ? <ChevronDown className="h-5 w-5 text-gray-400"/> : <ChevronUp className="h-5 w-5 text-gray-400"/>}
                                </button>
                                {!isCollapsed && (
                                    prospects.length > 0 ? (
                                        <div className="mt-4 space-y-4">
                                            {prospects.map(item => (
                                                <ProspectCard 
                                                    key={item.id} 
                                                    item={item} 
                                                    onUpdate={handleUpdate} 
                                                    onInstantUpdate={handleInstantUpdate} 
                                                    onDecide={setItemToDecide}
                                                    onDataChange={onDataChange}
                                                    monthlyData={monthlyData}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 px-4 mt-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-500">No prospects in this stage.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    );
};

const ProspectCard = ({ item, onUpdate, onInstantUpdate, onDecide, onDataChange, monthlyData }) => {
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);
    const isOverdue = item.nextActionDate && new Date(item.nextActionDate) < new Date();
    const exposureCount = item.exposureCount || 0;
    
    const handleLogFollowUp = () => {
        onInstantUpdate(item.id, { exposureCount: exposureCount + 1 });
        const today = new Date();
        const day = today.getDate();
        const currentFollowUps = Number(monthlyData[day]?.followUps || 0);
        const newFollowUps = currentFollowUps + 1;
        onDataChange(today, 'followUps', newFollowUps);
    };

    const getExposureColor = () => {
        if (exposureCount >= 5 && exposureCount <= 12) return 'bg-green-100 text-green-800';
        if (exposureCount > 12) return 'bg-amber-100 text-amber-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className={`p-4 border rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md ${isOverdue ? 'border-red-500 border-2' : ''}`}>
             <div className="flex justify-between items-start">
                <input
                    type="text"
                    defaultValue={item.name}
                    onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
                    className="text-lg font-semibold border-none p-0 w-full focus:ring-0"
                    placeholder="Enter name..."
                />
                 <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getExposureColor()}`}>
                     <span>{exposureCount}</span>
                     <span className="ml-1.5 hidden sm:inline">Exposures</span>
                 </div>
            </div>

            <div className="mt-3 space-y-3">
                 <div className="relative">
                    <textarea
                        defaultValue={item.notes}
                        onChange={(e) => onUpdate(item.id, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full text-sm text-gray-600 border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={isNotesExpanded ? 6 : 2}
                    ></textarea>
                    <button onClick={() => setIsNotesExpanded(!isNotesExpanded)} className="absolute bottom-2 right-2 text-xs flex items-center font-semibold text-indigo-600 hover:text-indigo-800 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-full">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {isNotesExpanded ? 'Hide' : 'View'} Notes
                    </button>
                 </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <label htmlFor={`next-action-${item.id}`} className="text-xs font-medium text-gray-500">Next Action:</label>
                        <input
                            id={`next-action-${item.id}`}
                            type="date"
                            defaultValue={item.nextActionDate}
                            onChange={(e) => onInstantUpdate(item.id, { nextActionDate: e.target.value })}
                            className={`p-1 border rounded-md text-xs ${isOverdue ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        />
                    </div>
                    <button onClick={handleLogFollowUp} className="mt-2 sm:mt-0 flex items-center justify-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition w-full sm:w-auto">
                        <Plus className="h-3 w-3" />
                        <span>Log Follow Up</span>
                    </button>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
                {item.status === 'Cold' && <button onClick={() => onInstantUpdate(item.id, {status: 'Warm'})} className="ActionButton"><ArrowRight className="h-4 w-4 mr-1"/> Move to Warm</button>}
                {item.status === 'Warm' && <>
                    <button onClick={() => onInstantUpdate(item.id, {status: 'Cold'})} className="ActionButton ActionButton-Secondary"><ArrowDown className="h-4 w-4 mr-1"/> Move to Cold</button>
                    <button onClick={() => onInstantUpdate(item.id, {status: 'Hot'})} className="ActionButton"><ArrowUp className="h-4 w-4 mr-1"/> Move to Hot</button>
                </>}
                 {item.status === 'Hot' && <>
                    <button onClick={() => onInstantUpdate(item.id, {status: 'Warm'})} className="ActionButton ActionButton-Secondary"><ArrowDown className="h-4 w-4 mr-1"/> Move to Warm</button>
                    <button onClick={() => onDecide(item)} className="ActionButton ActionButton-Success"><CheckCircle className="h-4 w-4 mr-1"/> Decision Made</button>
                 </>}
            </div>
        </div>
    );
};

const ArchivedProspectsList = ({ list, onUnarchive, onDelete }) => {
    if (list.length === 0) {
        return (
            <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Archive is Empty</h3>
                <p className="mt-1 text-sm text-gray-500">
                    When you mark a prospect's decision as final, they will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {list.map(item => (
                <div key={item.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className={`text-sm font-medium ${item.outcome === 'Member' ? 'text-green-600' : 'text-red-600'}`}>
                            Outcome: {item.outcome || 'Archived'}
                        </p>
                         <p className="text-xs text-gray-500">
                            Decision Date: {item.decisionDate ? new Date(item.decisionDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                        <button onClick={() => onUnarchive(item.id, { isArchived: false, outcome: null })} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                            <ArchiveRestore className="h-3 w-3" />
                            <span>Unarchive</span>
                        </button>
                        <button onClick={() => onDelete(item.id)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition">
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            ))}
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

const AnalyticsDashboard = ({ db, user }) => {
    const [stats, setStats] = useState({
        funnelExposures: 0, 
        funnelPresentations: 0, 
        funnelEnrolls: 0,
        expToPresentationRatio: 0, 
        presentationToEnrollRatio: 0,
    });
    const [loading, setLoading] = useState(true);
    const [historicalData, setHistoricalData] = useState([]);
    const [monthName, setMonthName] = useState('');

    useEffect(() => {
        const fetchAllAnalyticsData = async () => {
            if (!user || !db) return;
            setLoading(true);

            const today = new Date();
            setMonthName(today.toLocaleString('default', { month: 'long' }));
            const currentMonthYearId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            
            let lifetimeExposures = 0, lifetimePresentations = 0, lifetimeEnrolls = 0;
            let currentMonthExposures = 0, currentMonthPresentations = 0, currentMonthEnrolls = 0;
            
            const activitiesCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'activities');
            const allDocsSnap = await getDocs(activitiesCollectionRef);

            allDocsSnap.forEach(doc => {
                const data = doc.data().dailyData || {};
                const isCurrentMonth = doc.id === currentMonthYearId;

                Object.values(data).forEach(day => {
                    const exposures = Number(day.exposures) || 0;
                    const presentations = (day.presentations?.length || 0) + (Number(day.pbrs) || 0);
                    const enrolls = (Number(day.enrolls) || 0) + (Array.isArray(day.sitdowns) ? day.sitdowns.filter(s => s === 'E').length : 0);

                    lifetimeExposures += exposures;
                    lifetimePresentations += presentations;
                    lifetimeEnrolls += enrolls;

                    if (isCurrentMonth) {
                        currentMonthExposures += exposures;
                        currentMonthPresentations += presentations;
                        currentMonthEnrolls += enrolls;
                    }
                });
            });

            const expToPresentationRatio = lifetimePresentations > 0 ? (lifetimeExposures / lifetimePresentations) : 0;
            const presentationToEnrollRatio = lifetimeEnrolls > 0 ? (lifetimePresentations / lifetimeEnrolls) : 0;
            
            setStats({
                funnelExposures: currentMonthExposures,
                funnelPresentations: currentMonthPresentations,
                funnelEnrolls: currentMonthEnrolls,
                expToPresentationRatio,
                presentationToEnrollRatio,
            });
            
            const monthLabels = [];
            let tempDate = new Date();
            const monthlyTotals = {};

            for (let i = 0; i < 6; i++) {
                const y = tempDate.getFullYear();
                const m = tempDate.getMonth();
                const myId = `${y}-${String(m + 1).padStart(2, '0')}`;
                monthLabels.unshift(tempDate.toLocaleString('default', { month: 'short' }));
                monthlyTotals[myId] = { name: monthLabels[0], Exposures: 0, Presentations: 0 };
                tempDate.setMonth(tempDate.getMonth() - 1);
            }

            allDocsSnap.forEach(doc => {
                if (monthlyTotals[doc.id]) {
                    const data = doc.data().dailyData || {};
                    Object.values(data).forEach(day => {
                        monthlyTotals[doc.id].Exposures += Number(day.exposures) || 0;
                        monthlyTotals[doc.id].Presentations += (day.presentations?.length || 0) + (Number(day.pbrs) || 0);
                    });
                }
            });
            
            setHistoricalData(Object.values(monthlyTotals).reverse());
            setLoading(false);
        };
        fetchAllAnalyticsData();
    }, [user, db]);

    const getInsight = () => {
        const { expToPresentationRatio, presentationToEnrollRatio } = stats;
        if (stats.expToPresentationRatio === 0 && stats.presentationToEnrollRatio === 0) {
             return {
                title: "Let's Get Some Data!",
                text: "Start logging your activities—exposures, presentations, and memberships sold—to unlock powerful insights about your business.",
                icon: Lightbulb
            };
        }
        if (expToPresentationRatio > 20 && expToPresentationRatio >= presentationToEnrollRatio) {
            return {
                title: "Opportunity: Improve Exposure Quality",
                text: "Your lifetime data suggests it takes a high number of exposures to get a presentation. Focus on refining your initial approach to convert more contacts into meetings.",
                icon: Target
            };
        }
        if (presentationToEnrollRatio > 12 && presentationToEnrollRatio > expToPresentationRatio) {
            return {
                title: "Opportunity: Refine Your Presentation",
                text: "You're great at getting meetings! Your lifetime data shows an opportunity to improve your closing rate. Consider practicing your presentation or follow-up process.",
                icon: Award
            };
        }
        return {
            title: "Keep Up the Consistent Work!",
            text: "Your business ratios are looking solid. Consistency is key, so continue to focus on your daily activities and filling your funnel.",
            icon: TrendingUp
        };
    };

    if (loading) return <div className="text-center p-10">Loading Analytics...</div>;

    const insight = getInsight();
    
    const FunnelStep = ({ value, label, color, isTop = false, isBottom = false }) => {
        let borderRadius = '';
        if (isTop) borderRadius = 'rounded-t-lg';
        if (isBottom) borderRadius = 'rounded-b-lg';

        return (
            <div className={`p-4 flex justify-between items-center text-white ${color} ${borderRadius}`}>
                <span className="font-medium">{label}</span>
                <span className="text-2xl font-bold">{value}</span>
            </div>
        );
    };

    const RatioCard = ({ title, value, detail, icon: Icon }) => (
        <div className="bg-gray-50 p-4 rounded-lg flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full shadow">
                <Icon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{detail}</p>
            </div>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Business Analytics</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold mb-3 text-center text-gray-700">{monthName} Funnel</h3>
                    <div className="space-y-1">
                        <FunnelStep value={stats.funnelExposures} label="Exposures" color="bg-indigo-500" isTop />
                        <div className="flex justify-center items-center text-gray-400 my-1"><ChevronsRight className="h-5 w-5"/></div>
                        <FunnelStep value={stats.funnelPresentations} label="Presentations" color="bg-purple-500" />
                        <div className="flex justify-center items-center text-gray-400 my-1"><ChevronsRight className="h-5 w-5"/></div>
                        <FunnelStep value={stats.funnelEnrolls} label="Memberships Sold" color="bg-green-500" isBottom />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                     <RatioCard 
                        title="Lifetime Exposure-to-Presentation"
                        value={stats.expToPresentationRatio > 0 ? `${stats.expToPresentationRatio.toFixed(1)} : 1` : 'N/A'}
                        detail="Exposures needed for one presentation"
                        icon={Users}
                     />
                     <RatioCard 
                        title="Lifetime Presentation-to-Membership"
                        value={stats.presentationToEnrollRatio > 0 ? `${stats.presentationToEnrollRatio.toFixed(1)} : 1` : 'N/A'}
                        detail="Presentations needed for one membership"
                        icon={Award}
                     />
                </div>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <insight.icon className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="ml-3">
                        <p className="text-md font-semibold text-indigo-800">{insight.title}</p>
                        <p className="mt-1 text-sm text-indigo-700">{insight.text}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-2 sm:p-6 rounded-lg shadow-sm">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center sm:text-left">6-Month Activity Trends</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{fontSize: 12}} /><YAxis tick={{fontSize: 12}} /><Tooltip /><Legend wrapperStyle={{fontSize: "14px"}} />
                            <Bar dataKey="Exposures" fill="#6366f1" /><Bar dataKey="Presentations" fill="#a855f7" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
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
                type="text"
                inputMode="numeric"
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

const OutcomeModal = ({ onClose, onDecide }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6">
                    <h3 className="text-xl font-semibold">Record Final Decision</h3>
                    <p className="mt-2 text-gray-600">What was the outcome for this prospect?</p>
                </div>
                <div className="p-4 flex flex-col space-y-3">
                     <button onClick={() => onDecide('Member')} className="w-full flex items-center justify-center p-3 text-white bg-green-500 hover:bg-green-600 rounded-md">
                        <CheckCircle className="h-5 w-5 mr-2" /> Became a Member
                    </button>
                    <button onClick={() => onDecide('Not Interested')} className="w-full flex items-center justify-center p-3 text-white bg-red-500 hover:bg-red-600 rounded-md">
                       <XCircle className="h-5 w-5 mr-2" /> Not Interested
                    </button>
                </div>
                 <div className="p-4 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const FollowUpModal = ({ prospects, onClose, onQuickLog, onLogForProspect, onAddNewProspect }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProspectName, setNewProspectName] = useState('');

    const handleAdd = () => {
        if (newProspectName.trim()) {
            onAddNewProspect(newProspectName.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Log a Follow-Up</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-4 space-y-3">
                    {showAddForm ? (
                        <div className="space-y-3 p-2 bg-gray-50 rounded-md">
                            <label htmlFor="new-prospect-name" className="block text-sm font-medium text-gray-700">New Prospect's Name</label>
                            <input
                                id="new-prospect-name"
                                type="text"
                                value={newProspectName}
                                onChange={(e) => setNewProspectName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                autoFocus
                                placeholder="Enter name..."
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setShowAddForm(false)} className="bg-gray-200 px-4 py-2 text-sm rounded-md">Cancel</button>
                                <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-md">Save & Log</button>
                            </div>
                        </div>
                    ) : (
                         <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold"
                        >
                            <Plus className="h-5 w-5 mr-2" /> Add New Prospect & Log
                        </button>
                    )}
                    <div className="text-center text-xs text-gray-400">or select an existing prospect</div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {prospects.length > 0 ? prospects.map(prospect => (
                            <button 
                                key={prospect.id}
                                onClick={() => onLogForProspect(prospect.id)}
                                className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-md flex justify-between items-center"
                            >
                                <span>{prospect.name}</span>
                                <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full">{prospect.exposureCount || 0}</span>
                            </button>
                        )) : (
                            <p className="text-center text-sm text-gray-500 py-4">No "Hot" or "Warm" prospects to select.</p>
                        )}
                    </div>
                     <div className="text-center pt-2">
                        <button onClick={onQuickLog} className="text-xs text-gray-500 hover:text-indigo-600">
                           Just do a quick log (no prospect)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LogExposureModal = ({ prospects, onClose, onLogForProspect, onAddNewProspect }) => {
    const [view, setView] = useState('new'); // 'new' or 'existing'
    const [newProspectName, setNewProspectName] = useState('');

    const handleAdd = () => {
        if (newProspectName.trim()) {
            onAddNewProspect(newProspectName.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Log an Exposure</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-4">
                    <div className="flex justify-center border border-gray-200 rounded-md p-1 bg-gray-100 mb-4">
                        <button onClick={() => setView('new')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${view === 'new' ? 'bg-white shadow' : ''}`}>New Prospect</button>
                        <button onClick={() => setView('existing')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${view === 'existing' ? 'bg-white shadow' : ''}`}>Existing Prospect</button>
                    </div>

                    {view === 'new' && (
                        <div className="space-y-3">
                            <label htmlFor="new-exposure-name" className="block text-sm font-medium text-gray-700">Prospect's Name</label>
                            <input
                                id="new-exposure-name"
                                type="text"
                                value={newProspectName}
                                onChange={(e) => setNewProspectName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                autoFocus
                                placeholder="Enter name..."
                            />
                            <button onClick={handleAdd} className="w-full bg-indigo-600 text-white p-3 rounded-md font-semibold">
                                Add & Log Exposure
                            </button>
                        </div>
                    )}

                    {view === 'existing' && (
                        <div>
                           <p className="text-center text-xs text-gray-500 mb-2">Select a prospect to log the exposure for:</p>
                           <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {prospects.length > 0 ? prospects.map(prospect => (
                                    <button
                                        key={prospect.id}
                                        onClick={() => onLogForProspect(prospect.id)}
                                        className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-md flex justify-between items-center"
                                    >
                                        <span>{prospect.name}</span>
                                        <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full">{prospect.exposureCount || 0}</span>
                                    </button>
                                )) : (
                                    <p className="text-center text-sm text-gray-500 py-4">No prospects found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const ReportCard = forwardRef(({ profile, weekData, goals }, ref) => {
    const { totals, lastWeekTotals, dateRange, activeInPipeline, closingZone, newMembersThisWeek } = weekData;

    const metrics = [
        { key: 'exposures', label: 'Exposures', value: totals.exposures, lastWeek: lastWeekTotals.exposures, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', value: totals.followUps, lastWeek: lastWeekTotals.followUps, color: 'green' },
        { key: 'presentations', label: 'Presentations', value: totals.presentations, lastWeek: lastWeekTotals.presentations, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: totals.threeWays, lastWeek: lastWeekTotals.threeWays, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', value: totals.enrolls, lastWeek: lastWeekTotals.enrolls, color: 'teal' },
    ];

    const pipelineMetrics = [
        { label: 'Active in Pipeline', value: activeInPipeline },
        { label: 'New Members This Week', value: newMembersThisWeek }
    ];

    return (
        <div ref={ref} className="bg-white p-6 font-sans border border-gray-200 rounded-lg shadow-md" style={{ width: '450px' }}>
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Weekly Activity Report</h1>
                <p className="text-md text-gray-600">{profile.displayName || 'User'}</p>
                <p className="text-sm text-gray-500 font-medium">{dateRange}</p>
            </div>

            <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-gray-700 border-b pb-2">This Week's Activity</h3>
                {metrics.map(metric => (
                    <div key={metric.key}>
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-semibold text-gray-600">{metric.label}</h4>
                            <div className="text-right">
                                <p className="font-bold text-xl text-gray-800">{metric.value}</p>
                                <p className="text-xs text-gray-400">Last Week: {metric.lastWeek}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="space-y-4 mb-6">
                 <h3 className="font-semibold text-gray-700 border-b pb-2">Prospect Pipeline</h3>
                 {pipelineMetrics.map(metric => (
                     <div key={metric.label} className="flex justify-between items-center">
                         <h4 className="font-semibold text-gray-600">{metric.label}</h4>
                         <p className="font-bold text-xl text-gray-800">{metric.value}</p>
                     </div>
                 ))}
            </div>

            <div>
                <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Closing Zone (Hot Prospects)</h3>
                {closingZone && closingZone.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-2">
                        {closingZone.map((item, index) => (
                             <li key={item.id} className="flex justify-between items-center border-b border-gray-100 py-1">
                                 <span>{index + 1}. {item.name}</span>
                                 <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                     {item.exposureCount || 0} exposures
                                 </span>
                             </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No prospects in the closing zone.</p>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                <p>&copy; 2025 Platinum Toolkit. All Rights Reserved.</p>
                <p>Unauthorized duplication or distribution is strictly prohibited.</p>
            </div>
        </div>
    );
});

// --- Team Page Components ---
const CreateTeamModal = ({ onClose, onCreateTeam }) => {
    const [teamName, setTeamName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        if (!teamName.trim()) return;
        setIsLoading(true);
        await onCreateTeam(teamName.trim());
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Create a New Team</h3></div>
                <div className="p-6">
                    <label htmlFor="team-name" className="block text-sm font-medium text-gray-700">Team Name</label>
                    <input type="text" id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={handleCreate} disabled={isLoading || !teamName.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:bg-indigo-400">
                        {isLoading ? 'Creating...' : 'Create Team'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const JoinTeamModal = ({ onClose, onJoinTeam }) => {
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!inviteCode.trim()) return;
        setIsLoading(true);
        setError('');
        const success = await onJoinTeam(inviteCode.trim().toUpperCase());
        if (!success) {
            setError('Invalid invite code. Please try again.');
        } else {
            onClose();
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Join an Existing Team</h3></div>
                <div className="p-6">
                    <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700">6-Digit Invite Code</label>
                    <input type="text" id="invite-code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" autoFocus />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={handleJoin} disabled={isLoading || !inviteCode.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:bg-indigo-400">
                        {isLoading ? 'Joining...' : 'Join Team'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TeamDashboard = ({ teamData, teamMembers, onLeaveTeam, onShareInvite, user }) => {
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [copied, setCopied] = useState(false);

    const teamTotals = useMemo(() => {
        return teamMembers.reduce((acc, member) => {
            acc.exposures += member.weeklyExposures || 0;
            acc.presentations += member.weeklyPresentations || 0;
            return acc;
        }, { exposures: 0, presentations: 0 });
    }, [teamMembers]);
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(teamData.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {showConfirmLeave && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6"><h3 className="text-xl font-semibold">Leave Team?</h3><p className="mt-2 text-gray-600">Are you sure you want to leave "{teamData.name}"?</p></div>
                        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                            <button onClick={() => setShowConfirmLeave(false)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                            <button onClick={onLeaveTeam} className="bg-red-600 text-white px-4 py-2 rounded-md">Leave</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{teamData.name}</h2>
                         <div className="mt-2 flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                             <span className="text-sm font-medium text-gray-500">INVITE CODE:</span>
                             <span className="text-lg font-bold text-indigo-600 tracking-widest">{teamData.inviteCode}</span>
                            <button onClick={copyToClipboard} className="text-gray-500 hover:text-indigo-600 p-1">
                                {copied ? <CheckCircle className="h-5 w-5 text-green-500" /> : <ClipboardCopy className="h-5 w-5" />}
                            </button>
                         </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                        <button onClick={onShareInvite} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm text-sm"><Share2 className="h-4 w-4 mr-2"/> Share Invite</button>
                        <button onClick={() => setShowConfirmLeave(true)} className="flex items-center bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 text-sm"><LogOut className="h-4 w-4 mr-2"/> Leave</button>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    <div className="bg-indigo-50 p-4 rounded-lg"><p className="text-sm font-medium text-indigo-700">Team Exposures This Week</p><p className="text-4xl font-bold text-indigo-900">{teamTotals.exposures}</p></div>
                    <div className="bg-purple-50 p-4 rounded-lg"><p className="text-sm font-medium text-purple-700">Team Presentations This Week</p><p className="text-4xl font-bold text-purple-900">{teamTotals.presentations}</p></div>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Weekly Team Leaderboard (by Exposures)</h3>
                <div className="space-y-3">
                    {teamMembers.sort((a, b) => b.weeklyExposures - a.weeklyExposures).map((member, index) => (
                         <div key={member.uid} className={`p-3 rounded-lg flex items-center justify-between ${member.uid === user.uid ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}>
                            <div className="flex items-center">
                                <span className="font-bold text-lg w-8">{index + 1}</span>
                                <span className="font-medium">{member.displayName}</span>
                            </div>
                            <span className="font-bold text-lg text-indigo-600">{member.weeklyExposures}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const TeamPage = ({ user, db, userProfile, setUserProfile }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [teamData, setTeamData] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleCreateTeam = async (teamName) => {
        if (!user || !db || !userProfile.displayName) return;
        setIsLoading(true);
        try {
            let newCode = '';
            let codeExists = true;
            
            while(codeExists) {
                newCode = generateInviteCode();
                const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', newCode);
                const codeSnap = await getDoc(codeRef);
                codeExists = codeSnap.exists();
            }

            const teamColRef = collection(db, 'artifacts', appId, 'public', 'data', 'teams');
            const newTeamRef = doc(teamColRef);

            const batch = writeBatch(db);
            batch.set(newTeamRef, { name: teamName, inviteCode: newCode, creatorId: user.uid, createdAt: new Date() });
            const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', newCode);
            batch.set(codeRef, { teamId: newTeamRef.id });
            const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
            batch.update(userProfileRef, { teamId: newTeamRef.id });

            const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'teamMemberStats', user.uid);
            batch.set(statsRef, {
                displayName: userProfile.displayName,
                teamId: newTeamRef.id,
                weeklyExposures: 0,
                weeklyPresentations: 0,
                lastUpdated: new Date(),
                uid: user.uid
            }, { merge: true });

            await batch.commit();
            setUserProfile(prev => ({ ...prev, teamId: newTeamRef.id }));
        } catch (error) {
            console.error("Error creating team:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinTeam = async (inviteCode) => {
        if (!user || !db || !userProfile.displayName) return false;
        const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', inviteCode);
        const codeSnap = await getDoc(codeRef);
        if (codeSnap.exists()) {
            const { teamId } = codeSnap.data();
            
            const batch = writeBatch(db);
            const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
            batch.update(userProfileRef, { teamId });

            const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'teamMemberStats', user.uid);
            batch.set(statsRef, {
                displayName: userProfile.displayName,
                teamId: teamId,
                weeklyExposures: 0,
                weeklyPresentations: 0,
                lastUpdated: new Date(),
                uid: user.uid
            }, { merge: true });

            await batch.commit();
            setUserProfile(prev => ({ ...prev, teamId }));
            return true;
        }
        return false;
    };

     const handleLeaveTeam = useCallback(async () => {
        if (!user || !db) return;
        const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await updateDoc(userProfileRef, { teamId: null });
        
        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'teamMemberStats', user.uid);
        await updateDoc(statsRef, { teamId: null });

        setUserProfile(prev => ({ ...prev, teamId: null }));
        setTeamData(null);
        setTeamMembers([]);
    }, [user, db, setUserProfile]);

    const handleShareInvite = () => {
        if (teamData) {
            const shareText = `Join my accountability team "${teamData.name}" on the Activity Tracker! Use this code: ${teamData.inviteCode}`;
            navigator.share({ title: 'Join My Team!', text: shareText });
        }
    };

    useEffect(() => {
        let unsubscribe = () => {};

        const fetchTeamData = async () => {
            if (!userProfile.teamId) {
                setIsLoading(false);
                setTeamData(null);
                setTeamMembers([]);
                return;
            }
            setIsLoading(true);

            const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', userProfile.teamId);
            const teamSnap = await getDoc(teamRef);
            if (!teamSnap.exists()) {
                handleLeaveTeam();
                return;
            }
            setTeamData({ id: teamSnap.id, ...teamSnap.data() });
            
            const statsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'teamMemberStats');
            const q = query(statsCollectionRef, where("teamId", "==", userProfile.teamId));
            
            unsubscribe = onSnapshot(q, (snapshot) => {
                const members = snapshot.docs.map(d => d.data());
                setTeamMembers(members);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching team members in real-time:", error);
                setIsLoading(false);
            });
        };

        if (db && user && userProfile.uid) {
            fetchTeamData();
        } else if (!userProfile.teamId) {
            setIsLoading(false);
        }
        
        return () => unsubscribe();

    }, [user, db, userProfile.uid, userProfile.teamId, handleLeaveTeam]);

    if (isLoading) {
        return <div className="text-center p-10">Loading Team...</div>;
    }

    if (!userProfile.teamId) {
        return (
            <div className="text-center bg-white p-8 rounded-lg shadow-sm">
                {showCreateModal && <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreateTeam={handleCreateTeam} />}
                {showJoinModal && <JoinTeamModal onClose={() => setShowJoinModal(false)} onJoinTeam={handleJoinTeam} />}
                <Users className="mx-auto h-12 w-12 text-indigo-400" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">Team Accountability</h2>
                <p className="mt-2 text-gray-600">Create a team to track progress with your peers, or join an existing one.</p>
                <div className="mt-6 flex justify-center space-x-4">
                    <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold">Create a Team</button>
                    <button onClick={() => setShowJoinModal(true)} className="bg-white text-indigo-700 px-6 py-3 rounded-md font-semibold border border-indigo-200 hover:bg-indigo-50">Join a Team</button>
                </div>
            </div>
        );
    }
    
    return <TeamDashboard teamData={teamData} teamMembers={teamMembers} onLeaveTeam={handleLeaveTeam} onShareInvite={handleShareInvite} user={user} />;
};


// --- Main App Component ---
const App = () => {
    // --- Set Page Title ---
    useEffect(() => {
        document.title = 'Activity Tracker';
    }, []);

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
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showExposureModal, setShowExposureModal] = useState(false);
    const [hotlist, setHotlist] = useState([]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [lastMonthData, setLastMonthData] = useState({});
    const [monthlyGoals, setMonthlyGoals] = useState({ exposures: 0, followUps: 0, presentations: 0, threeWays: 0, enrolls: 0 });
    const [activeTab, setActiveTab] = useState('today');
    
    // State for image report card generation
    const [isSharing, setIsSharing] = useState(false);
    const [reportCardData, setReportCardData] = useState(null);
    const reportCardRef = useRef(null);

    // --- Refs for Save-on-Exit Logic ---
    const isDirtyRef = useRef(false); // Tracks if there are unsaved changes
    const monthlyDataRef = useRef(monthlyData); // Ref to hold the latest monthlyData state
    const monthlyGoalsRef = useRef(monthlyGoals); // Ref to hold the latest monthlyGoals state
    
    // Keep refs updated with the latest state for access in cleanup effects
    useEffect(() => {
        monthlyDataRef.current = monthlyData;
        monthlyGoalsRef.current = monthlyGoals;
    }, [monthlyData, monthlyGoals]);


    const updateTeamMemberStats = useCallback(async (currentMonthlyData, currentLastMonthData, currentProfile) => {
        if (!db || !user || !currentProfile.teamId || !currentProfile.displayName) return;

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        let weeklyExposures = 0;
        let weeklyPresentations = 0;
        
        let currentDate = new Date(startOfWeek);
        while (currentDate <= today) {
            const dataSet = currentDate.getMonth() === today.getMonth() ? currentMonthlyData : currentLastMonthData;
            const dayData = dataSet?.[currentDate.getDate()];
            if (dayData) {
                weeklyExposures += Number(dayData.exposures) || 0;
                weeklyPresentations += (dayData.presentations?.length || 0) + (Number(dayData.pbrs) || 0);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const statsRef = doc(db, 'artifacts', appId, 'public', 'data', 'teamMemberStats', user.uid);
        await setDoc(statsRef, {
            displayName: currentProfile.displayName,
            teamId: currentProfile.teamId,
            weeklyExposures,
            weeklyPresentations,
            lastUpdated: new Date(),
            uid: user.uid
        }, { merge: true });

    }, [db, user]);

    const debouncedUpdateStats = useMemo(() => debounce(updateTeamMemberStats, 2500), [updateTeamMemberStats]);

    useEffect(() => {
        if (userProfile.teamId) {
            debouncedUpdateStats(monthlyData, lastMonthData, userProfile);
        }
    }, [monthlyData, lastMonthData, userProfile, debouncedUpdateStats]);


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
    
    useEffect(() => {
        if (user && db) {
            if (activeTab === 'tracker' || activeTab === 'leaderboard' || activeTab === 'today' || activeTab === 'hotlist' || activeTab === 'team') {
               fetchData();
            }
        }
    }, [user, db, currentDate, fetchData, activeTab]);

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

    const debouncedSave = useMemo(() => debounce(async (dataToSave, goalsToSave, targetMonthId) => {
        if (!user || !db) return;
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', targetMonthId);
        try {
            await setDoc(docRef, { dailyData: dataToSave, monthlyGoals: goalsToSave }, { merge: true });
            isDirtyRef.current = false; // Mark changes as saved
            if (dataToSave) {
                updateLeaderboard(dataToSave, targetMonthId);
            }
        } catch (error) {
            console.error("Failed to save data:", error);
            // Optionally, handle the error in the UI
        }
    }, 1500), [user, db, updateLeaderboard]);

    const handleDataChange = (date, field, value) => {
        const day = date.getDate();
        const targetMonthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // --- Logic for CURRENTLY VIEWED month ---
        if (targetMonthId === monthYearId) {
            // Update local state for immediate UI feedback
            const updatedData = { ...monthlyData, [day]: { ...monthlyData[day], [field]: value } };
            setMonthlyData(updatedData);
            
            // Mark as dirty for save-on-exit
            isDirtyRef.current = true;
            
            // Use the existing debounced save which saves the entire object
            debouncedSave(updatedData, monthlyGoals, monthYearId);

        // --- Logic for ANY OTHER month (past or future) ---
        } else {
            // Provide immediate UI feedback if it's the previous month (visible in week view)
            if (targetMonthId === lastMonthYearId) {
                const updatedLastMonthData = { ...lastMonthData, [day]: { ...lastMonthData[day], [field]: value } };
                setLastMonthData(updatedLastMonthData);
            }

            // Perform a direct, atomic update to Firestore. This is safer.
            const saveAtomicUpdate = async () => {
                if (!user || !db) return;
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', targetMonthId);
                const fieldPath = `dailyData.${day}.${field}`;
                
                try {
                    // Atomically update just the one field.
                    await updateDoc(docRef, { [fieldPath]: value });

                    // To update the leaderboard, we need the full month's data.
                    const updatedDocSnap = await getDoc(docRef);
                    if (updatedDocSnap.exists()) {
                        updateLeaderboard(updatedDocSnap.data().dailyData, targetMonthId);
                    }
                } catch (error) {
                    // If the document doesn't exist, updateDoc fails. Fallback to setDoc.
                    if (error.code === 'not-found') {
                        const newDailyData = { [day]: { [field]: value } };
                        await setDoc(docRef, { dailyData: newDailyData }, { merge: true });
                        updateLeaderboard(newDailyData, targetMonthId);
                    } else {
                        console.error("Failed to save atomic update:", error);
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
        isDirtyRef.current = true; // Mark data as dirty
        debouncedSave(monthlyData, newGoals, monthYearId);
    };

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
    
        if (prospect.status === 'Cold') {
            updateData.status = 'Warm';
        }
    
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


    const handleSignOut = async () => auth && await signOut(auth);

    // --- Effect for Save-on-Exit ---
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isDirtyRef.current) {
                console.log("Unsaved changes detected. Attempting to save before unload.");
                // Note: Most modern browsers do not allow reliable asynchronous operations in 'beforeunload'.
                // This synchronous-like call is our best effort but may not always succeed.
                // A better approach for critical data is frequent, small, atomic saves.
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
                setDoc(docRef, { dailyData: monthlyDataRef.current, monthlyGoals: monthlyGoalsRef.current }, { merge: true });
                
                // This part is to warn the user, but it's often blocked by browsers
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Also, save one last time when the component unmounts (e.g., on route change in a larger app)
            if (isDirtyRef.current) {
                const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
                setDoc(docRef, { dailyData: monthlyDataRef.current, monthlyGoals: monthlyGoalsRef.current }, { merge: true });
            }
        };
    }, [db, user, monthYearId]); // Dependencies ensure this effect has access to the correct instances


    const getWeekDataForReport = useCallback(async () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek); // Set to Sunday
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
        const allDocsSnap = await getDocs(hotlistColRef);
        const allItems = allDocsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const activeInPipeline = allItems.filter(item => item.isArchived !== true && (item.status === 'Hot' || item.status === 'Warm')).length;
        const closingZone = allItems.filter(item => item.isArchived !== true && item.status === 'Hot');

        const newMembersThisWeek = allItems.filter(item => {
            if (item.outcome === 'Member' && item.decisionDate) {
                const decisionDate = new Date(item.decisionDate);
                return decisionDate >= startOfWeek && decisionDate <= endOfWeek;
            }
            return false;
        }).length;

        return {
            totals: thisWeekTotals,
            lastWeekTotals,
            dateRange,
            activeInPipeline,
            closingZone,
            newMembersThisWeek
        };
    }, [monthlyData, lastMonthData, user, db]);


    const handleShareReportAsText = useCallback(async () => {
        const { totals, dateRange, activeInPipeline, closingZone, newMembersThisWeek } = await getWeekDataForReport();

        let shareText = `My Activity Tracker Report\nFrom: ${userProfile.displayName}\nWeek of: ${dateRange}\n\n`;
        shareText += `**This Week's Numbers:**\n- Exposures: ${totals.exposures}\n- Follow Ups: ${totals.followUps}\n- Presentations: ${totals.presentations}\n- 3-Way Calls: ${totals.threeWays}\n- Memberships Sold: ${totals.enrolls}\n\n`;
        shareText += `**Prospect Pipeline:**\n- Active Prospects: ${activeInPipeline}\n- New Members This Week: ${newMembersThisWeek}\n\n`;
        shareText += "--------------------\n\n";
        shareText += `My "Closing Zone" Prospects\n\n`;
        closingZone.forEach((item, index) => { shareText += `${index + 1}. ${item.name} (${item.exposureCount || 0} exposures)\n`; });
        shareText += "\nSent from my Activity Tracker App";

        try {
            await navigator.share({ title: 'My Weekly Activity Report', text: shareText });
        } catch (error) { console.error('Error sharing text:', error); }
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

    const streaks = useMemo(() => {
        const calculateStreak = (activityKey) => {
            if (!user || !userProfile.uid) return 0;
            
            let currentStreak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
            
            let dayToCheck = new Date(today);

            // If there's no activity today, our starting point for the streak is yesterday.
            const todayData = monthlyData ? monthlyData[today.getDate()] : null;
            let hasActivityToday = false;
             if (todayData) {
                if (activityKey === 'presentations') hasActivityToday = (todayData.presentations?.length > 0) || (Number(todayData.pbrs) > 0);
                else if (activityKey === 'enrolls') hasActivityToday = (todayData.enrolls && Number(todayData.enrolls) > 0) || (todayData.sitdowns && todayData.sitdowns.some(s => s === 'E'));
                else hasActivityToday = Number(todayData[activityKey]) > 0;
            }

            // If no activity today, start counting from yesterday. Otherwise, start from today.
            if (!hasActivityToday) {
                dayToCheck.setDate(dayToCheck.getDate() - 1);
            }

            // Now, loop backwards to count the streak
            while (true) {
                const monthData = dayToCheck.getMonth() === today.getMonth() ? monthlyData : lastMonthData;
                if (!monthData) break;
                
                const dayData = monthData[dayToCheck.getDate()];
                let hasActivity = false;
                if (dayData) {
                    if (activityKey === 'presentations') hasActivity = (dayData.presentations?.length > 0) || (Number(dayData.pbrs) > 0);
                    else if (activityKey === 'enrolls') hasActivity = (dayData.enrolls && Number(dayData.enrolls) > 0) || (dayData.sitdowns && todayData.sitdowns.some(s => s === 'E'));
                    else hasActivity = Number(dayData[activityKey]) > 0;
                }
                
                if (hasActivity) {
                    currentStreak++;
                    dayToCheck.setDate(dayToCheck.getDate() - 1);
                } else {
                    break;
                }
            }
            return currentStreak;
        };
        return {
            exposures: calculateStreak('exposures'),
            followUps: calculateStreak('followUps'),
            presentations: calculateStreak('presentations'),
            threeWays: calculateStreak('threeWays'),
            enrolls: calculateStreak('enrolls'),
        };
    }, [monthlyData, lastMonthData, user, userProfile.uid]);

    // This new effect handles the side-effect of updating the longest streak in Firestore
    useEffect(() => {
        if (!db || !user || !userProfile.uid || !streaks) return;

        const longestStreaks = userProfile.longestStreaks || {};
        const updates = {};

        for (const key in streaks) {
            if (streaks[key] > (longestStreaks[key] || 0)) {
                updates[key] = streaks[key];
            }
        }

        if (Object.keys(updates).length > 0) {
            const newLongestStreaks = { ...longestStreaks, ...updates };
            const profileRef = doc(db, 'artifacts', appId, 'users', user.uid);
            
            // We create a function to avoid having setUserProfile in dependency array
            const updateProfile = async () => {
                await setDoc(profileRef, { longestStreaks: newLongestStreaks }, { merge: true });
                setUserProfile(prev => ({ ...prev, longestStreaks: newLongestStreaks }));
            };
            updateProfile();
        }
    }, [streaks, user, db, userProfile.longestStreaks, userProfile.uid]);


    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading...</div></div>;
    if (!user) return <AuthPage auth={auth} />;

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                <div className="sticky top-0 z-40 bg-gray-50 pt-4 sm:pt-6 lg:pt-8">
                    <Header displayName={userProfile.displayName} onSignOut={handleSignOut} onEditName={() => setShowEditNameModal(true)} />
                    <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>
                
                <main className="mt-6">
                    {activeTab === 'today' && <TodayDashboard 
                        monthlyData={monthlyData}
                        streaks={streaks}
                        onQuickAdd={handleQuickAdd}
                        onHabitChange={handleDataChange}
                        onAddPresentation={handleAddPresentation}
                        onShare={handleShare}
                        isSharing={isSharing}
                        onLogFollowUp={() => setShowFollowUpModal(true)}
                        onLogExposure={() => setShowExposureModal(true)}
                    /> }
                    {activeTab === 'tracker' && <ActivityTracker date={currentDate} setDate={setCurrentDate} goals={monthlyGoals} onGoalChange={handleGoalChange} data={{current: monthlyData, last: lastMonthData}} onDataChange={handleDataChange} onShare={handleShare} isSharing={isSharing} user={user} userProfile={userProfile} onQuickAdd={handleQuickAdd} showGoalInstruction={showGoalInstruction} onDismissGoalInstruction={handleDismissGoalInstruction} streaks={streaks} />}
                    {activeTab === 'hotlist' && <HotList user={user} db={db} onDataChange={handleDataChange} monthlyData={monthlyData} hotlist={hotlist} />}
                    {activeTab === 'analytics' && <AnalyticsDashboard db={db} user={user} />}
                    {activeTab === 'team' && <TeamPage user={user} db={db} userProfile={userProfile} setUserProfile={setUserProfile} />}
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
                {showFollowUpModal && (
                    <FollowUpModal 
                        prospects={hotlist.filter(p => (p.status === 'Hot' || p.status === 'Warm') && !p.isArchived)}
                        onClose={() => setShowFollowUpModal(false)}
                        onQuickLog={() => { handleQuickAdd('followUps', 1); setShowFollowUpModal(false); }}
                        onLogForProspect={handleLogFollowUpForProspect}
                        onAddNewProspect={handleAddNewProspectAndLogFollowUp}
                    />
                )}
                {showExposureModal && (
                    <LogExposureModal
                        prospects={hotlist.filter(p => p.status === 'Cold')}
                        onClose={() => setShowExposureModal(false)}
                        onAddNewProspect={handleAddNewProspectAndLogExposure}
                        onLogForProspect={handleLogExposureForProspect}
                    />
                )}
            </div>
            <footer className="text-center p-4 mt-8 text-xs text-gray-400 border-t border-gray-200">
                <div className="mb-4">
                     <a href="mailto:info@freedombychoice.com?subject=Activity%20Tracker%20Feedback" 
                        className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors">
                         <MessageSquare className="h-4 w-4 mr-2" />
                         Send Feedback or Report a Bug
                     </a>
                </div>
                <p>&copy; 2025 Platinum Toolkit. All Rights Reserved.</p>
                <p>Unauthorized duplication or distribution is strictly prohibited.</p>
            </footer>
        </div>
    );
};

export default App;




