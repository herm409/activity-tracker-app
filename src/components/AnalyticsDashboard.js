import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Lightbulb, Users, ChevronsRight, Target, XCircle, Info } from 'lucide-react';
import { appId } from '../firebaseConfig';

const AnalyticsDashboard = ({ db, user }) => {
    const [stats, setStats] = useState({
        funnelExposures: 0,
        funnelPresentations: 0,
        funnelEnrolls: 0,
        expToPresentationRatio: 0,
        presentationToEnrollRatio: 0,
        noToEnrollRatio: 0,
        lifetimeNos: 0,
        lifetimeExposures: 0,
        lifetimeEnrolls: 0
    });
    const [teamAvg, setTeamAvg] = useState({ expToPresentation: 0, presentationToEnroll: 0 });
    const [loading, setLoading] = useState(true);
    const [historicalData, setHistoricalData] = useState([]);
    const [monthName, setMonthName] = useState('');
    const [goalInput, setGoalInput] = useState(1);

    useEffect(() => {
        const fetchAllAnalyticsData = async () => {
            if (!user || !db) return;
            setLoading(true);

            const today = new Date();
            setMonthName(today.toLocaleString('default', { month: 'long' }));
            const currentMonthYearId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

            let lifetimeExposures = 0, lifetimePresentations = 0, lifetimeEnrolls = 0, lifetimeNos = 0;
            let currentMonthExposures = 0, currentMonthPresentations = 0, currentMonthEnrolls = 0;

            // OPTIMIZATION NOTE: Fetching ALL docs is expensive as data grows. 
            // Future Plan: Use an aggregated 'stats' document that updates on daily writes.
            const activitiesCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'activities');
            const allDocsSnap = await getDocs(activitiesCollectionRef);

            allDocsSnap.forEach(doc => {
                const data = doc.data().dailyData || {};
                const isCurrentMonth = doc.id === currentMonthYearId;

                Object.values(data).forEach(day => {
                    const exposures = Number(day.exposures) || 0;
                    const presentations = (Array.isArray(day.presentations) ? day.presentations.length : Number(day.presentations) || 0) + (Number(day.pbrs) || 0);
                    const enrolls = (Number(day.enrolls) || 0) + (Array.isArray(day.sitdowns) ? day.sitdowns.filter(s => s === 'E').length : 0);
                    const nos = Number(day.nos) || 0;

                    lifetimeExposures += exposures;
                    lifetimePresentations += presentations;
                    lifetimeEnrolls += enrolls;
                    lifetimeNos += nos;

                    if (isCurrentMonth) {
                        currentMonthExposures += exposures;
                        currentMonthPresentations += presentations;
                        currentMonthEnrolls += enrolls;
                    }
                });
            });

            const expToPresentationRatio = lifetimePresentations > 0 ? (lifetimeExposures / lifetimePresentations) : 0;
            const presentationToEnrollRatio = lifetimeEnrolls > 0 ? (lifetimePresentations / lifetimeEnrolls) : 0;
            const noToEnrollRatio = lifetimeEnrolls > 0 ? (lifetimeNos / lifetimeEnrolls) : 0;

            setStats({
                funnelExposures: currentMonthExposures,
                funnelPresentations: currentMonthPresentations,
                funnelEnrolls: currentMonthEnrolls,
                expToPresentationRatio,
                presentationToEnrollRatio,
                noToEnrollRatio,
                lifetimeNos,
                lifetimeExposures,
                lifetimeEnrolls
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
                        monthlyTotals[doc.id].Presentations += (Array.isArray(day.presentations) ? day.presentations.length : Number(day.presentations) || 0) + (Number(day.pbrs) || 0);
                    });
                }
            });

            setHistoricalData(Object.values(monthlyTotals).reverse());

            // Fetch team avg ratios from leaderboard (current week)
            try {
                const today = new Date();
                const wd = today.getDay();
                const sun = new Date(today); sun.setDate(today.getDate() - wd); sun.setHours(0,0,0,0);
                const weekId = sun.toISOString().slice(0,10);
                const lbRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');
                const lbSnap = await getDocs(lbRef);
                let teamExposures = 0, teamPresentations = 0, teamEnrolls = 0, teamCount = 0;
                lbSnap.forEach(d => {
                    const e = d.data();
                    if ((e.exposures || 0) > 0) {
                        teamExposures += (e.exposures || 0);
                        teamPresentations += (e.presentations || 0);
                        teamEnrolls += (e.enrolls || 0);
                        teamCount++;
                    }
                });
                if (teamCount > 1) {
                    const avgExpToPresentation = teamPresentations > 0 ? teamExposures / teamPresentations : 0;
                    const avgPresentationToEnroll = teamEnrolls > 0 ? teamPresentations / teamEnrolls : 0;
                    setTeamAvg({ expToPresentation: avgExpToPresentation, presentationToEnroll: avgPresentationToEnroll });
                }
            } catch (_) { /* team avg is optional — fail silently */ }

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

    const RatioCard = ({ title, value, detail, icon: Icon, teamAvgLabel }) => (
        <div className="bg-gray-50 p-4 rounded-lg flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full shadow">
                <Icon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{detail}</p>
                {teamAvgLabel && (
                    <div className="mt-1.5 inline-flex items-center bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        <Users className="h-3 w-3 text-indigo-400 mr-1" />
                        <span className="text-[11px] text-indigo-700 font-medium">Team avg: {teamAvgLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Business Analytics</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm flex flex-col h-full">
                    <h3 className="font-semibold mb-3 text-center text-gray-700">{monthName} Funnel</h3>
                    <div className="space-y-1 flex-grow flex flex-col justify-center">
                        <FunnelStep value={stats.funnelExposures} label="Exposures" color="bg-indigo-500" isTop />
                        <div className="my-1 flex items-center justify-center">
                            <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-full shadow-sm flex items-center">
                                🎯 {stats.expToPresentationRatio > 0 ? stats.expToPresentationRatio.toFixed(1) : '0'} : 1 Ratio
                            </div>
                        </div>
                        <FunnelStep value={stats.funnelPresentations} label="Presentations" color="bg-purple-500" />
                        <div className="my-1 flex items-center justify-center">
                            <div className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold rounded-full shadow-sm flex items-center">
                                🎯 {stats.presentationToEnrollRatio > 0 ? stats.presentationToEnrollRatio.toFixed(1) : '0'} : 1 Ratio
                            </div>
                        </div>
                        <FunnelStep value={stats.funnelEnrolls} label="Memberships Sold" color="bg-green-500" isBottom />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <RatioCard
                        title="The Scorecard: Value of a 'No'"
                        value={stats.noToEnrollRatio > 0 ? `${stats.noToEnrollRatio.toFixed(1)} No's = 1 Membership` : 'N/A'}
                        detail="Average number of No's historically required to close one deal."
                        icon={XCircle}
                    />
                    <RatioCard
                        title="Lifetime Exposure-to-Presentation"
                        value={stats.expToPresentationRatio > 0 ? `${stats.expToPresentationRatio.toFixed(1)} : 1` : 'N/A'}
                        detail="Exposures needed for one presentation. Lower = better first contact quality."
                        icon={Users}
                        teamAvgLabel={teamAvg.expToPresentation > 0 ? `${teamAvg.expToPresentation.toFixed(1)} : 1` : null}
                    />
                    <RatioCard
                        title="Lifetime Presentation-to-Membership"
                        value={stats.presentationToEnrollRatio > 0 ? `${stats.presentationToEnrollRatio.toFixed(1)} : 1` : 'N/A'}
                        detail="Presentations needed for one membership. Lower = sharper closing skill."
                        icon={Award}
                        teamAvgLabel={teamAvg.presentationToEnroll > 0 ? `${teamAvg.presentationToEnroll.toFixed(1)} : 1` : null}
                    />

                    {/* Why Ratios Matter — educational block */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-blue-800">Your Personal Numbers Game Formula</p>
                                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                    {(stats.lifetimeExposures >= 10 && stats.lifetimeEnrolls >= 1) ? (
                                        <span>Based on your lifetime stats, your exact formula for success is mathematically proven: <strong>{(stats.expToPresentationRatio * stats.presentationToEnrollRatio).toFixed(1)} Exposures ➡️ {stats.presentationToEnrollRatio.toFixed(1)} Presentations ➡️ 1 Membership</strong>. That means your only goal is to execute {(stats.expToPresentationRatio * stats.presentationToEnrollRatio).toFixed(1)} exposures as fast as possible. Stop worrying about the outcome and start running your formula!</span>
                                    ) : (
                                        <span>Your ratios are your personal batting average — they tell you how efficiently your activity converts. A high exposure-to-presentation ratio means you're having lots of conversations before getting a sit-down. The good news: <strong>consistent activity automatically unlocks your exact formula!</strong> (Unlocks at 10 Exposures & 1 Membership).</span>
                                    )}
                                </p>
                                {teamAvg.expToPresentation > 0 && (
                                    <p className="text-xs text-blue-600 mt-2 font-medium bg-blue-100 px-2 py-1 rounded inline-block">
                                        📊 Compare yourself to the team averages above to see your ultimate leverage points!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Interactive Goal Calculator */}
                    {(stats.lifetimeExposures >= 10 && stats.lifetimeEnrolls >= 1) ? (
                        <div className="bg-white border-2 border-indigo-100 rounded-lg p-5 shadow-sm mt-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="text-[15px] font-black text-indigo-900 uppercase tracking-wide flex items-center">
                                        <Target className="h-5 w-5 text-indigo-500 mr-2" /> Goal Calculator
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-snug">Want to sell a specific number of memberships? Enter your target below and the Coach will calculate the exact hustle required based solely on your personal ratios.</p>
                                </div>
                                <div className="flex-shrink-0 flex items-center bg-gray-50 border rounded-lg p-2 mt-3 sm:mt-0">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mr-2 hidden sm:inline-block">Target Memberships:</label>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 mr-2 sm:hidden flex-shrink-0">Target:</label>
                                    <div className="flex items-center">
                                        <button 
                                            type="button" 
                                            onClick={() => setGoalInput(Math.max(1, (goalInput || 1) - 1))}
                                            className="w-8 h-8 rounded-l bg-white border border-gray-300 text-indigo-600 font-bold text-lg hover:bg-gray-100 flex items-center justify-center -mr-px"
                                        >
                                            -
                                        </button>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={goalInput} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setGoalInput(val === '' ? '' : parseInt(val));
                                            }}
                                            onBlur={() => {
                                                if (!goalInput || goalInput < 1) setGoalInput(1);
                                            }}
                                            className="w-12 h-8 border-y border-x-0 border-gray-300 text-center font-black text-lg text-indigo-700 p-0 focus:ring-0 focus:border-gray-300"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setGoalInput((goalInput || 0) + 1)}
                                            className="w-8 h-8 rounded-r bg-white border border-gray-300 text-indigo-600 font-bold text-lg hover:bg-gray-100 flex items-center justify-center -ml-px"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center bg-indigo-50 px-2 sm:px-6 py-4 rounded-xl shadow-inner">
                                <div className="text-center flex-1 min-w-0">
                                    <span className="block text-2xl sm:text-3xl font-black text-indigo-600">{Math.ceil((stats.expToPresentationRatio * stats.presentationToEnrollRatio) * (goalInput || 1))}</span>
                                    <span className="block text-[9px] sm:text-xs font-bold text-indigo-800 uppercase mt-1 truncate tracking-tighter sm:tracking-normal">Exposures</span>
                                </div>
                                <div className="text-indigo-300 px-1"><ChevronsRight className="h-5 w-5 sm:h-8 sm:w-8" /></div>
                                <div className="text-center flex-1 min-w-0">
                                    <span className="block text-2xl sm:text-3xl font-black text-purple-600">{Math.ceil(stats.presentationToEnrollRatio * (goalInput || 1))}</span>
                                    <span className="block text-[9px] sm:text-xs font-bold text-purple-800 uppercase mt-1 truncate tracking-tighter sm:tracking-normal">Presentations</span>
                                </div>
                                <div className="text-purple-300 px-1"><ChevronsRight className="h-5 w-5 sm:h-8 sm:w-8" /></div>
                                <div className="text-center flex-1 min-w-0">
                                    <span className="block text-2xl sm:text-3xl font-black text-green-600">{goalInput || 1}</span>
                                    <span className="block text-[9px] sm:text-xs font-bold text-green-800 uppercase mt-1 truncate tracking-tighter sm:tracking-normal">Memberships</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mt-4 opacity-75">
                            <div className="flex items-center mb-2">
                                <Target className="h-5 w-5 text-gray-400 mr-2" /> 
                                <h4 className="text-[15px] font-black text-gray-500 uppercase tracking-wide">Goal Calculator (Locked) 🔒</h4>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Log at least <strong>10 Exposures</strong> and <strong>1 Membership</strong> to unlock the AI Goal Calculator. We need a minimum baseline of data to accurately calculate your personal success formula!</p>
                            <div className="mt-3 bg-gray-100 rounded-full h-2 w-full overflow-hidden">
                                <div className="bg-indigo-300 h-full" style={{ width: `${Math.min(100, Math.max((stats.lifetimeExposures / 10) * 50, (stats.lifetimeEnrolls / 1) * 50))}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 100 No's Jar */}
            <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between border-t-4 border-red-500">
                <div className="md:w-1/2 mb-4 md:mb-0 md:pr-6">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center">
                            <XCircle className="h-6 w-6 text-red-500 mr-2" />
                            The 100 No's Jar
                        </h3>
                        {Math.floor(stats.lifetimeNos / 100) > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-sm">
                                🏆 {Math.floor(stats.lifetimeNos / 100)} Jars Filled!
                            </div>
                        )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-2">
                        Your goal isn't to get a "Yes". Your daily goal is to collect "No's" and fill this jar. Every "No" is a required step towards a "Yes".
                    </p>
                    
                    <div className="bg-red-50 p-3 rounded-md border border-red-100 mt-4 leading-snug">
                        <span className="text-xs font-bold text-red-800 uppercase tracking-widest block mb-1">Coach's Insight:</span>
                        <span className="text-sm text-red-700 font-medium italic">"{[
                            "Every No pays the toll to a Yes. Keep filling the jar!",
                            "Rejection isn't failure, it's data. Go collect more data!",
                            "Stop playing it safe. Go hunt for No's!",
                            "A clear No is better than a polite maybe. Clear the pipeline!",
                            "The fastest way to a Yes is through a mountain of No's. Dig in!",
                            "Get rejected faster! That means you're actually doing the work.",
                            "Faith without works is dead. Don't fear the No, chase it!"
                        ][(stats.lifetimeNos || 0) % 7]}"</span>
                    </div>

                    <div className="mt-5 flex items-end">
                        <span className="text-4xl font-black text-red-600">{stats.lifetimeNos % 100}</span>
                        <span className="text-xl text-gray-500 font-semibold mb-1 ml-1"> / 100</span>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1.5 ml-3">
                            Current Jar Status
                        </p>
                    </div>
                </div>

                <div className="md:w-1/2 flex justify-center">
                    {/* Visual Jar CSS */}
                    <div className="relative w-40 h-48 border-4 border-gray-300 rounded-b-3xl rounded-t-lg overflow-hidden flex flex-col justify-end bg-gray-50">
                        <div className="absolute top-0 w-full h-4 bg-gray-200 border-b-4 border-gray-300"></div>
                        <div
                            className="bg-red-400 w-full transition-all duration-1000 ease-in-out flex items-center justify-center relative overflow-hidden"
                            style={{ height: `${Math.max((stats.lifetimeNos % 100), 5)}%` }} // Minimum 5% to show something
                        >
                            {/* Bubbles / Fill effect */}
                            <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]"></div>
                            {stats.lifetimeNos % 100 === 0 && stats.lifetimeNos > 0 ? (
                                <span className="text-white font-bold animate-bounce z-10">FULL!</span>
                            ) : null}
                        </div>
                    </div>
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
                            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar dataKey="Exposures" fill="#6366f1" /><Bar dataKey="Presentations" fill="#a855f7" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
