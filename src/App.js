import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithCustomToken,
    signInAnonymously
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronUp, ChevronDown, Plus, X, Calendar, List, BarChart2, Target, Users, PhoneCall, Briefcase, Trash2 } from 'lucide-react';

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
// Check for environment-injected config, otherwise use the hardcoded one.
const finalFirebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : firebaseConfig;
const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

// --- Main App Component ---
// NOTE FOR RESPONSIVENESS: Ensure your project's main HTML file (e.g., index.html) includes
// <meta name="viewport" content="width=device-width, initial-scale=1.0"> in the <head> tag.
const App = () => {
    // --- State Management ---
    const [db, setDb] = useState(null);
    const [, setAuth] = useState(null); // 'auth' state is not read, so we can omit it.
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [monthlyGoal, setMonthlyGoal] = useState('');
    const [hotlist, setHotlist] = useState([]);
    const [analyticsData, setAnalyticsData] = useState([]);
    const [activeTab, setActiveTab] = useState('tracker');
    const [showAddHotlistModal, setShowAddHotlistModal] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState(null);

    // --- Firebase Initialization & Anonymous Auth ---
    useEffect(() => {
        try {
            const app = initializeApp(finalFirebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                } else {
                    try {
                        const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;
                        if (initialAuthToken) {
                            await signInWithCustomToken(authInstance, initialAuthToken);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    } catch (error) {
                        console.error("Error signing in anonymously:", error);
                    }
                }
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

    const fetchData = useCallback(async () => {
        if (!user || !db) return;

        // Fetch user profile
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists() && profileSnap.data().displayName) {
            setDisplayName(profileSnap.data().displayName);
        } else {
            setShowNameModal(true);
        }

        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setMonthlyData(data.dailyData || {});
            setMonthlyGoal(data.monthlyGoal || '');
        } else {
            setMonthlyData({});
            setMonthlyGoal('');
        }

        const hotlistColRef = collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
        const hotlistQuery = query(hotlistColRef, limit(10));
        const hotlistSnapshot = await getDocs(hotlistQuery);
        const hotlistItems = hotlistSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setHotlist(hotlistItems);

    }, [user, db, monthYearId]);

    const handleSetDisplayName = async (name) => {
        if (!user || !db || !name.trim()) {
            // If user provides no name, just close modal for now.
            setShowNameModal(false);
            return;
        }
        const trimmedName = name.trim();
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        await setDoc(profileRef, { displayName: trimmedName });
        setDisplayName(trimmedName);
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
           if(activeTab === 'tracker' || (activeTab === 'hotlist' && !hotlist.length)) fetchData();
           if(activeTab === 'analytics') fetchAnalytics();
        }
    }, [user, db, currentDate, fetchData, fetchAnalytics, activeTab, hotlist.length]);

    const debouncedSave = useMemo(
        () => debounce(async (newData, newGoal) => {
            if (!user || !db) return;
            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'activities', monthYearId);
            await setDoc(docRef, { dailyData: newData, monthlyGoal: newGoal }, { merge: true });
        }, 1000),
        [user, db, monthYearId]
    );

    const handleDataChange = (day, field, value) => {
        const updatedData = { ...monthlyData, [day]: { ...monthlyData[day], [field]: value } };
        setMonthlyData(updatedData);
        debouncedSave(updatedData, monthlyGoal);
    };

    const handleGoalChange = (e) => {
        const newGoal = e.target.value;
        setMonthlyGoal(newGoal);
        debouncedSave(monthlyData, newGoal);
    };
    
    // --- Hotlist Actions ---
    const addHotlistItem = () => {
        if (hotlist.length >= 10) return;
        setShowAddHotlistModal(true);
    };
    
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


    // --- Render Logic ---
    if (loading || !user) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl font-semibold">Loading Activity Tracker...</div></div>;
    }
    
    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Header displayName={displayName} />
                <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
                
                <main className="mt-6">
                    {activeTab === 'tracker' && <ActivityTracker date={currentDate} setDate={setCurrentDate} goal={monthlyGoal} onGoalChange={handleGoalChange} data={monthlyData} onDataChange={handleDataChange} />}
                    {activeTab === 'hotlist' && <HotList list={hotlist} onAdd={addHotlistItem} onUpdate={updateHotlistItem} onDelete={deleteHotlistItem} />}
                    {activeTab === 'analytics' && <AnalyticsDashboard data={analyticsData} />}
                </main>
                
                {showNameModal && <DisplayNameModal onSave={handleSetDisplayName} />}
                {showAddHotlistModal && <AddHotlistItemModal onClose={() => setShowAddHotlistModal(false)} onAdd={handleConfirmAddHotlistItem} />}
                {deletingItemId && <ConfirmDeleteModal onClose={() => setDeletingItemId(null)} onConfirm={handleConfirmDelete} />}
            </div>
        </div>
    );
};

// --- Child Components ---
const Header = ({ displayName }) => (
    <header className="mb-6">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Activity Tracker</h1>
            <p className="text-md sm:text-lg text-gray-500 mt-1">
                {displayName ? `Welcome, ${displayName}` : 'Your dashboard for business growth.'}
            </p>
        </div>
    </header>
);

const TabBar = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'tracker', name: 'Monthly Tracker', icon: Calendar },
        { id: 'hotlist', name: '10 in Play', icon: List },
        { id: 'analytics', name: 'Analytics', icon: BarChart2 },
    ];
    return (
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-3 px-1 sm:py-4 border-b-2 font-medium text-sm flex items-center transition-colors duration-200`}
                    >
                        <tab.icon className="mr-2 h-5 w-5" />
                        {tab.name}
                    </button>
                ))}
            </nav>
        </div>
    );
};

const ActivityTracker = ({ date, setDate, goal, onGoalChange, data, onDataChange }) => {
    const [selectedDay, setSelectedDay] = useState(null);

    const year = date.getFullYear();
    const month = date.getMonth();

    const changeMonth = (offset) => {
        const newDate = new Date(date);
        newDate.setMonth(date.getMonth() + offset);
        setDate(newDate);
    };
    
    const calendarDays = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const days = [];
        
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ isBlank: true });
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ day, isBlank: false, data: data[day] || {} });
        }
        return days;
    }, [year, month, data]);
    
    const monthlyTotals = useMemo(() => {
        const initTotals = { exposures: 0, followUps: 0, teamCalls: 0, threeWays: 0, sitdowns: 0, pbrs: 0, gameplans: 0 };
        return Object.values(data).reduce((acc, dayData) => {
            acc.exposures += Number(dayData.exposures) || 0;
            acc.followUps += Number(dayData.followUps) || 0;
            acc.teamCalls += Number(dayData.teamCalls) || 0;
            acc.threeWays += Number(dayData.threeWays) || 0;
            acc.sitdowns += Array.isArray(dayData.sitdowns) ? dayData.sitdowns.length : 0;
            acc.pbrs += Number(dayData.pbrs) || 0;
            acc.gameplans += Number(dayData.gameplans) || 0;
            return acc;
        }, initTotals);
    }, [data]);

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const handleDayClick = (day) => {
        if(day.isBlank) return;
        setSelectedDay(day.day);
    };
    
    const closeModal = () => {
        setSelectedDay(null);
    }
    
    const handleModalDataChange = (field, value) => {
        onDataChange(selectedDay, field, value);
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div className="flex items-center mb-4 sm:mb-0">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronDown className="h-5 w-5 rotate-90" /></button>
                    <h2 className="text-xl sm:text-2xl font-semibold w-36 sm:w-48 text-center">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronUp className="h-5 w-5 rotate-90" /></button>
                </div>
                <input
                    type="text"
                    placeholder="Set monthly goal..."
                    value={goal}
                    onChange={onGoalChange}
                    className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition text-sm sm:text-base"
                />
            </div>

            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, index) => (
                    <div key={`${day}-${index}`} className="text-center font-semibold text-xs text-gray-500 py-2">{day}</div>
                ))}
                {calendarDays.map((day, index) => (
                    <div 
                        key={index} 
                        onClick={() => handleDayClick(day)}
                        className={`border rounded-md aspect-square p-1 sm:p-2 flex flex-col ${day.isBlank ? 'bg-gray-50' : 'cursor-pointer hover:bg-indigo-50 transition-colors'}`}
                    >
                        {!day.isBlank && (
                            <>
                                <span className="font-medium text-xs sm:text-sm">{day.day}</span>
                                <div className="mt-auto text-[10px] sm:text-xs space-y-1">
                                    {day.data.exposures > 0 && <div className="bg-blue-100 text-blue-800 rounded px-1.5 py-0-5">E: {day.data.exposures}</div>}
                                    {day.data.sitdowns?.length > 0 && <div className="bg-green-100 text-green-800 rounded px-1-5 py-0-5">S: {day.data.sitdowns.length}</div>}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <TotalsFooter totals={monthlyTotals} />

            {selectedDay && (
                <DayEntryModal 
                    day={selectedDay} 
                    data={data[selectedDay] || {}} 
                    onClose={closeModal}
                    onChange={handleModalDataChange}
                />
            )}
        </div>
    );
};

const TotalsFooter = ({ totals }) => {
    const primaryMetric = { label: 'Total Exposures', value: totals.exposures, icon: Target };
    const otherMetrics = [
        { label: 'Follow Ups', value: totals.followUps, icon: Users },
        { label: '3 Ways', value: totals.threeWays, icon: PhoneCall },
        { label: 'Sitdowns', value: totals.sitdowns, icon: Briefcase },
    ];

    return (
        <div className="mt-6 pt-5 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 bg-indigo-100 border border-indigo-200 p-4 sm:p-6 rounded-lg flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-indigo-800">{primaryMetric.label}</h3>
                        <p className="text-4xl sm:text-5xl font-bold text-indigo-600 mt-1">{primaryMetric.value}</p>
                    </div>
                    <primaryMetric.icon className="h-12 w-12 sm:h-16 sm:w-16 text-indigo-400" />
                </div>

                {otherMetrics.map(metric => (
                     <div key={metric.label} className="bg-gray-100 border border-gray-200 p-4 rounded-lg flex items-center justify-between">
                        <div>
                           <h4 className="text-sm sm:text-md font-semibold text-gray-700">{metric.label}</h4>
                           <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{metric.value}</p>
                        </div>
                        <metric.icon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                    </div>
                ))}
            </div>
        </div>
    );
};


const DayEntryModal = ({ day, data, onClose, onChange }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg sm:text-xl font-semibold">Activities for Day {day}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">Exposures</label>
                       <NumberInput value={data.exposures || ''} onChange={e => onChange('exposures', e.target.value)} />
                   </div>
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">Follow Ups</label>
                       <NumberInput value={data.followUps || ''} onChange={e => onChange('followUps', e.target.value)} />
                   </div>
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">Team Calls</label>
                       <NumberInput value={data.teamCalls || ''} onChange={e => onChange('teamCalls', e.target.value)} />
                   </div>
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">3 Ways</label>
                       <NumberInput value={data.threeWays || ''} onChange={e => onChange('threeWays', e.target.value)} />
                   </div>
                   
                   <SitdownTracker value={data.sitdowns} onChange={val => onChange('sitdowns', val)} />

                    <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">PBRS</label>
                       <NumberInput value={data.pbrs || ''} onChange={e => onChange('pbrs', e.target.value)} />
                   </div>
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">Gameplans</label>
                       <NumberInput value={data.gameplans || ''} onChange={e => onChange('gameplans', e.target.value)} />
                   </div>
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">Exercise</label>
                       <CheckboxInput checked={!!data.exerc} onChange={e => onChange('exerc', e.target.checked)} />
                   </div>
                   <div className="flex items-center justify-between">
                       <label className="font-medium text-gray-700 text-sm sm:text-base">Read</label>
                       <CheckboxInput checked={!!data.read} onChange={e => onChange('read', e.target.checked)} />
                   </div>
                </div>
                <div className="p-4 bg-gray-50 text-right rounded-b-lg">
                    <button onClick={onClose} className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 transition">Done</button>
                </div>
            </div>
        </div>
    );
}

const NumberInput = (props) => (
    <input type="number" min="0" className="w-20 p-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 transition" {...props} />
);
const CheckboxInput = (props) => (
    <input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition" {...props} />
);

const SitdownTracker = ({ value = [], onChange }) => {
    const options = { 'P': 'Phone', 'Z': 'Zoom', 'V': 'Video', 'D': 'DM Mtg', 'E': 'Enroll' };
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = (type) => {
        const newValue = [...value, type];
        onChange(newValue);
        setIsAdding(false);
    };

    const handleRemove = (indexToRemove) => {
        const newValue = value.filter((_, index) => index !== indexToRemove);
        onChange(newValue);
    };

    return (
        <div className="pt-2">
            <label className="font-medium text-gray-700 text-sm sm:text-base">Sitdowns ({value.length})</label>
            <div className="mt-2 space-y-2">
                {value.map((sitdown, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                        <span className="text-sm text-gray-800">{options[sitdown] || 'Unknown'}</span>
                        <button onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {isAdding ? (
                     <select 
                        onChange={(e) => handleAdd(e.target.value)} 
                        onBlur={() => setIsAdding(false)}
                        className="w-full bg-white border border-gray-300 rounded-md p-2 text-sm"
                        autoFocus
                     >
                        <option value="">Select type...</option>
                        {Object.entries(options).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                     </select>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full flex items-center justify-center bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md hover:bg-indigo-200 transition text-sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Sitdown
                    </button>
                )}
            </div>
        </div>
    );
};


const HotList = ({ list, onAdd, onUpdate, onDelete }) => {
    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold">10 in Play / Hot List</h2>
                {list.length < 10 && (
                    <button onClick={onAdd} className="flex items-center bg-indigo-600 text-white px-3 py-2 sm:px-4 rounded-md hover:bg-indigo-700 transition text-sm">
                        <Plus className="h-5 w-5 mr-1 sm:mr-2" /> Add Item
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {list.map(item => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                         <div className="flex justify-between items-start">
                             <input 
                                 type="text" 
                                 value={item.name}
                                 onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
                                 className="text-md sm:text-lg font-semibold border-none p-0 focus:ring-0 w-full"
                                 placeholder="Enter name..."
                             />
                             <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-500 transition"><X className="h-5 w-5"/></button>
                         </div>
                         <textarea 
                             value={item.notes}
                             onChange={(e) => onUpdate(item.id, 'notes', e.target.value)}
                             placeholder="Add notes..."
                             className="mt-2 w-full text-sm text-gray-600 border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition"
                             rows="2"
                         ></textarea>
                     </div>
                ))}
                {list.length === 0 && <p className="text-gray-500">Your hot list is empty. Add your first prospect!</p>}
            </div>
        </div>
    );
};

const AddHotlistItemModal = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');

    const handleAdd = () => {
        if (name.trim()) {
            onAdd(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold">Add New Hotlist Item</h3>
                </div>
                <div className="p-6">
                    <label htmlFor="hotlist-name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        id="hotlist-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        autoFocus
                    />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition">Cancel</button>
                    <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Add</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmDeleteModal = ({ onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6">
                    <h3 className="text-xl font-semibold">Confirm Deletion</h3>
                    <p className="mt-2 text-gray-600">Are you sure you want to delete this item? This action cannot be undone.</p>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition">Cancel</button>
                    <button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition">Delete</button>
                </div>
            </div>
        </div>
    );
};

const DisplayNameModal = ({ onSave }) => {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold">Welcome!</h3>
                    <p className="text-sm text-gray-600 mt-1">Please set your display name for the leaderboard.</p>
                </div>
                <div className="p-6">
                    <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input
                        type="text"
                        id="display-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        autoFocus
                    />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                    <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">Save Name</button>
                </div>
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
                    <BarChart
                        data={data}
                        margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <Tooltip />
                        <Legend wrapperStyle={{fontSize: "14px"}} />
                        <Bar dataKey="Exposures" fill="#8884d8" />
                        <Bar dataKey="Follow Ups" fill="#82ca9d" />
                        <Bar dataKey="Sitdowns" fill="#ffc658" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


// --- Utility Functions ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default App;


