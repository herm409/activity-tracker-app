import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Dumbbell, BookOpen, Share2, HelpCircle, XCircle, Flame, Lightbulb, AlertTriangle, HeartHandshake } from 'lucide-react';
import { ActivityCard, PresentationActivityCard, DisciplineCheckbox } from './ActivityCards';
import { calculatePoints } from '../utils/scoring';
import confetti from 'canvas-confetti';

// --- Daily Par Progress Ring ---
const DailyParRing = ({ todayPoints, dailyPar }) => {
    const radius = 44;
    const stroke = 9;
    const normalizedRadius = radius - stroke / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const progress = Math.min(todayPoints / Math.max(dailyPar, 1), 1);
    const strokeDashoffset = circumference - progress * circumference;

    const isUnder = todayPoints > dailyPar;
    const isEven = todayPoints === dailyPar;
    const isOver = todayPoints < dailyPar;
    const deficit = dailyPar - todayPoints;

    let strokeColor = '#ef4444';
    let statusText = 'Over Par';
    let statusColor = 'text-red-600';
    let bgColor = 'bg-red-50 border-red-100';
    if (isEven) { strokeColor = '#3b82f6'; statusText = 'Even Par ✓'; statusColor = 'text-blue-600'; bgColor = 'bg-blue-50 border-blue-100'; }
    if (isUnder) { strokeColor = '#22c55e'; statusText = 'Under Par 🏌️'; statusColor = 'text-green-600'; bgColor = 'bg-green-50 border-green-100'; }

    return (
        <div className={`${bgColor} rounded-xl p-4 mb-5 flex items-center justify-between border shadow-sm`}>
            <div className="flex flex-col ml-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Daily Par Status</span>
                <span className={`text-2xl font-black mt-1 ${statusColor}`}>{statusText}</span>
                <span className="text-sm text-gray-500 mt-1">
                    {isOver
                        ? `${deficit} more pt${Math.abs(deficit) !== 1 ? 's' : ''} to reach par`
                        : isEven ? "You've hit your daily goal!"
                        : `${Math.abs(deficit)} pt${Math.abs(deficit) !== 1 ? 's' : ''} under — you're winning!`}
                </span>
            </div>
            <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx={radius} cy={radius} r={normalizedRadius} fill="transparent" stroke="#e5e7eb" strokeWidth={stroke} />
                <circle
                    cx={radius} cy={radius} r={normalizedRadius} fill="transparent"
                    stroke={strokeColor} strokeWidth={stroke}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
                />
                <text x={radius} y={radius} dominantBaseline="middle" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#111827"
                    style={{ transform: `rotate(90deg)`, transformOrigin: `${radius}px ${radius}px` }}>
                    {todayPoints}/{dailyPar}
                </text>
            </svg>
        </div>
    );
};

// --- Active Streak Chips ---
const StreakRow = ({ streaks, todayData }) => {
    const items = [
        { key: 'ironman', label: 'Ironman', emoji: '🔥', streak: streaks.ironman || 0, done: [
            (Number(todayData.exposures) || 0) > 0,
            ((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0,
            (Number(todayData.nos) || 0) > 0,
            (Number(todayData.threeWays) || 0) > 0,
            !!todayData.exerc,
            !!(todayData.personalDevelopment || todayData.read || todayData.audio),
        ].every(Boolean) },
        { key: 'exposures',          label: 'Exposures',  emoji: '📞', streak: streaks.exposures || 0,          done: (Number(todayData.exposures) || 0) > 0 },
        { key: 'followUps',          label: 'Follow Ups', emoji: '👥', streak: streaks.followUps || 0,          done: ((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0 },
        { key: 'nos',                label: "No's",       emoji: '❌', streak: streaks.nos || 0,                done: (Number(todayData.nos) || 0) > 0 },
        { key: 'exerc',              label: 'Exercise',   emoji: '💪', streak: streaks.exerc || 0,              done: !!todayData.exerc },
        { key: 'personalDevelopment',label: 'Personal Dev',emoji:'📚', streak: streaks.personalDevelopment || 0, done: !!(todayData.personalDevelopment || todayData.read || todayData.audio) },
    ];
    const active = items.filter(i => i.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 4);
    if (active.length === 0) return null;
    return (
        <div className="mb-5 flex flex-wrap gap-2">
            {active.map(item => {
                const atRisk = !item.done;
                return (
                    <div key={item.key}
                        className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            atRisk ? 'bg-amber-50 border-amber-300 text-amber-800 animate-pulse' : 'bg-green-50 border-green-200 text-green-800'
                        }`}
                        title={atRisk ? `${item.streak}-day streak at risk! Log today to keep it.` : `${item.streak}-day streak — keep it up!`}
                    >
                        <Flame className={`h-3.5 w-3.5 mr-1 ${atRisk ? 'text-amber-500' : 'text-green-500'}`} />
                        {item.emoji} {item.label}: {item.streak}d{atRisk ? ' ⚠️' : ''}
                    </div>
                );
            })}
        </div>
    );
};

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, onShareMonthly, isSharing, onLogFollowUp, onLogExposure, dailyPar, onShowLegend, hotlist, onNavigateToPipeline }) => {
    const [showInsight, setShowInsight] = useState(false);
    const [visibilityNudge, setVisibilityNudge] = useState(false);
    const today = new Date();
    const todayKey = today.getDate();
    const todayData = useMemo(() => monthlyData[todayKey] || {}, [monthlyData, todayKey]);

    const metrics = [
        { key: 'exposures', label: 'Exposures', icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', icon: Users, color: 'green' },
        { key: 'nos', label: 'Definitive No\'s', icon: XCircle, color: 'red' },
        { key: 'presentations', label: 'Presentations', icon: BarChart2, color: 'purple', isPresentation: true },
        { key: 'threeWays', label: '3-Way Calls', icon: PhoneCall, color: 'pink' },
        { key: 'teamSupport', label: 'Team Support', icon: HeartHandshake, color: 'blue' },
        { key: 'enrolls', label: 'Memberships Sold', icon: UserCheck, color: 'teal' }
    ];

    const disciplines = [
        { key: 'exerc', label: 'Exercise', icon: Dumbbell },
        { key: 'personalDevelopment', label: 'Personal Development', icon: BookOpen },
    ];

    const currentPar = dailyPar || 2;
    const todayPoints = calculatePoints(todayData);

    // Ironman Progress
    const ironmanProgress = [
        { label: 'Exposures', done: (Number(todayData.exposures) || 0) > 0 },
        { label: 'Follow Ups', done: ((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0 },
        { label: 'No\'s', done: (Number(todayData.nos) || 0) > 0 },
        { label: '3-Ways', done: (Number(todayData.threeWays) || 0) > 0 },
        { label: 'Exercise', done: !!todayData.exerc },
        { label: 'Personal Dev', done: !!(todayData.personalDevelopment || todayData.read || todayData.audio) },
    ];
    const ironmanCompleted = ironmanProgress.filter(i => i.done).length;
    const isIronman = ironmanCompleted === 6;

    const currentEnrolls = (Number(todayData.enrolls) || 0) + (Array.isArray(todayData.sitdowns) ? todayData.sitdowns.filter(s => s === 'E').length : 0);

    // Track previous values for milestone celebrations
    const prevPointsRef = useRef(todayPoints);
    const prevIsIronmanRef = useRef(isIronman);
    const prevEnrollsRef = useRef(currentEnrolls);

    useEffect(() => {
        const prev = prevPointsRef.current;
        const prevIronman = prevIsIronmanRef.current;
        const prevEnrolls = prevEnrollsRef.current;

        // 🟢 Hit Par celebration
        if (prev < currentPar && todayPoints >= currentPar) {
            confetti({ particleCount: 120, spread: 70, origin: { x: 0.5, y: 0.4 }, colors: ['#22c55e', '#4ade80', '#86efac'] });
        }
        // 🔥 Ironman / Daily Cycle celebration
        if (!prevIronman && isIronman) {
            confetti({ particleCount: 180, spread: 85, origin: { x: 0.5, y: 0.3 }, colors: ['#f97316', '#fb923c', '#fed7aa', '#fef3c7'] });
        }
        // 🎉 Membership Sold celebration
        if (currentEnrolls > prevEnrolls) {
            confetti({ particleCount: 220, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: ['#6366f1', '#8b5cf6', '#fbbf24', '#34d399', '#f472b6'] });
        }

        prevPointsRef.current = todayPoints;
        prevIsIronmanRef.current = isIronman;
        prevEnrollsRef.current = currentEnrolls;
    }, [todayPoints, isIronman, currentEnrolls, currentPar]);

    // Active category count (for auto-coach trigger)
    const activeCategories = useMemo(() => {
        let count = 0;
        if ((Number(todayData.exposures) || 0) > 0) count++;
        if (((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0) count++;
        if ((Number(todayData.threeWays) || 0) > 0) count++;
        if ((Number(todayData.nos) || 0) > 0) count++;
        return count;
    }, [todayData]);

    // Auto-show insight once when 3+ activity types are active.
    // Uses a ref so the effect only opens it ONE time per session —
    // after that the user's manual hide is respected.
    const autoShownInsightRef = useRef(false);
    useEffect(() => {
        if (activeCategories >= 3 && !autoShownInsightRef.current) {
            autoShownInsightRef.current = true;
            setShowInsight(true);
        }
    }, [activeCategories]);


    // Page Visibility API — nudge when returning after 4+ hrs with no activity
    const hiddenAtRef = useRef(null);
    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) {
                hiddenAtRef.current = Date.now();
            } else if (hiddenAtRef.current) {
                const hrs = (Date.now() - hiddenAtRef.current) / 3600000;
                if (hrs >= 4 && todayPoints === 0) setVisibilityNudge(true);
                hiddenAtRef.current = null;
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [todayPoints]);

    // Today's Prospects (overdue/stale Hot or Warm, excluding snoozed)
    const urgentProspects = useMemo(() => {
        if (!hotlist) return [];
        const now = new Date(); now.setHours(0, 0, 0, 0);
        return hotlist
            .filter(p => !p.isArchived && (p.status === 'Hot' || p.status === 'Warm'))
            .filter(p => {
                const nextAction = p.nextActionDate ? new Date(p.nextActionDate) : null;
                // Exclude snoozed (nextActionDate in the future)
                if (nextAction && nextAction > now) return false;
                const lastContact = p.lastContacted ? new Date(p.lastContacted) : null;
                const daysSince = lastContact ? (now - lastContact) / 86400000 : 999;
                return (nextAction && nextAction <= now) || daysSince > 5;
            })
            .sort((a, b) => {
                const aOD = a.nextActionDate && new Date(a.nextActionDate) < new Date();
                const bOD = b.nextActionDate && new Date(b.nextActionDate) < new Date();
                return aOD === bOD ? 0 : aOD ? -1 : 1;
            })
            .slice(0, 3);
    }, [hotlist]);

    // Count snoozed Hot/Warm prospects so user knows why they're missing
    const snoozedCount = useMemo(() => {
        if (!hotlist) return 0;
        const now = new Date(); now.setHours(0, 0, 0, 0);
        return hotlist.filter(p => {
            if (p.isArchived || (p.status !== 'Hot' && p.status !== 'Warm')) return false;
            const nextAction = p.nextActionDate ? new Date(p.nextActionDate) : null;
            return nextAction && nextAction > now;
        }).length;
    }, [hotlist]);


    // --- Coaching Feedback ---
    const getCoachingAdvice = () => {
        const E = Number(todayData.exposures) || 0;
        const F = (Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0);
        const N = Number(todayData.nos) || 0;
        const T = Number(todayData.threeWays) || 0;
        const A = E + F + T;

        let grade = 'C', gradeDesc = 'Needs More Balance', gradeColor = 'text-red-700 bg-red-100';
        if (activeCategories >= 3) { grade = 'A'; gradeDesc = 'Excellent Balance'; gradeColor = 'text-green-700 bg-green-100'; }
        else if (activeCategories === 2) { grade = 'B'; gradeDesc = 'Good Balance'; gradeColor = 'text-amber-700 bg-amber-100'; }

        let message = "Good effort today, but your activity is focused on only one area. Try diversifying your efforts to build a healthier pipeline.";
        if (activeCategories === 0) { message = "You haven't logged any core prospecting activities yet today! Time to plant some seeds."; grade = 'N/A'; gradeDesc = 'No Activity'; gradeColor = 'text-gray-700 bg-gray-100'; }
        if (E > 3 && F < E) message = "You're making great new contacts! Make sure your follow-ups keep pace so prospects don't fall through the cracks.";
        else if (F > 3 && T === 0) message = "You're doing a lot of follow-ups! Consider using a 3-way call to provide third-party validation.";
        else if (F > 3 && E === 0) message = "Great job following up today! Remember to also plant new seeds with fresh exposures.";
        else if (A >= 5 && N === 0) message = "You're putting in a lot of activity! Are you asking the tough questions? Don't be afraid to push for a definitive No.";
        else if (activeCategories >= 3) message = "Outstanding balance! You're planting seeds, watering them, and asking for decisions. Keep it up!";

        return { grade, gradeDesc, gradeColor, message };
    };

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-1">Today's Focus</h2>
                            {onShowLegend && (
                                <button onClick={onShowLegend} className="flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-full ml-2 transition-colors">
                                    <HelpCircle className="h-3 w-3 mr-1" /> Rules
                                </button>
                            )}
                        </div>
                        <p className="text-gray-500">Log your key business activities for {today.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto mt-3 sm:mt-0">
                        <button onClick={onShareMonthly} disabled={isSharing} className="flex items-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm disabled:bg-green-400 disabled:cursor-wait justify-center">
                            <Share2 className="h-4 w-4 mr-2" /> Share Monthly
                        </button>
                        <button onClick={onShare} disabled={isSharing} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm disabled:bg-indigo-400 disabled:cursor-wait justify-center">
                            <Share2 className="h-4 w-4 mr-2" /> {isSharing ? 'Generating...' : 'Share Weekly'}
                        </button>
                    </div>
                </div>

                {/* Visibility Nudge Banner */}
                {visibilityNudge && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                            <span className="text-sm font-medium text-amber-800">You haven't logged any activity yet today — go get those No's! 🔥</span>
                        </div>
                        <button onClick={() => setVisibilityNudge(false)} className="text-amber-500 hover:text-amber-700 ml-3 flex-shrink-0 font-bold">✕</button>
                    </div>
                )}

                {/* Daily Par Progress Ring */}
                <DailyParRing todayPoints={todayPoints} dailyPar={currentPar} />

                {/* Active Streak Chips */}
                <StreakRow streaks={streaks} todayData={todayData} />

                {/* Ironman / Daily Cycle Tracker */}
                <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-orange-100 flex flex-col md:flex-row items-center justify-between mb-6">
                    <div className="flex items-center mb-3 md:mb-0 w-full md:w-auto">
                        <div className={`p-3 rounded-full mr-4 ${isIronman ? 'bg-orange-100' : 'bg-gray-100'}`}>
                            <Flame className={`h-8 w-8 ${isIronman ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg flex items-center">
                                The Daily Cycle
                                {isIronman && <span className="ml-2 bg-orange-500 text-white text-[10px] uppercase px-2 py-0.5 rounded-full font-bold animate-pulse">+15 PTS</span>}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {isIronman ? "You crushed it! Full cycle complete." : `Complete all 6 core activities for a +15 pt bonus. (${ironmanCompleted}/6)`}
                            </p>
                        </div>
                    </div>
                    <div className="flex space-x-2 w-full md:w-auto justify-center">
                        {ironmanProgress.map((item, idx) => (
                            <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all cursor-help ${item.done ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-400'}`} title={item.label}>
                                {item.label.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Today's Prospects Panel */}
                {(urgentProspects.length > 0 || snoozedCount > 0) && (
                    <div className="bg-white border border-amber-200 rounded-lg p-4 mb-6 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-800 flex items-center text-sm">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                                Today's Prospects
                                {urgentProspects.length > 0 && <span className="ml-1 text-amber-600">— {urgentProspects.length} need attention</span>}
                            </h3>
                            {onNavigateToPipeline && (
                                <button onClick={onNavigateToPipeline} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold whitespace-nowrap ml-2">
                                    Open Pipeline →
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {urgentProspects.map(p => {
                                const now = new Date(); now.setHours(0, 0, 0, 0);
                                const isOverdue = p.nextActionDate && new Date(p.nextActionDate) < now;
                                const actionLabel = p.status === 'Hot' ? 'Log Follow Up' : 'Did Presentation';
                                const actionColor = p.status === 'Hot' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200';
                                return (
                                    <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                        <div className="flex items-center min-w-0 mr-2">
                                            <span className="font-semibold text-sm text-gray-800 truncate">{p.name}</span>
                                            <span className={`ml-2 flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${p.status === 'Hot' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                                            {isOverdue && <span className="ml-1 flex-shrink-0 text-[10px] font-bold text-red-600">⚠️</span>}
                                        </div>
                                        <button onClick={p.status === 'Hot' ? onLogFollowUp : () => onQuickAdd('presentations', 1)} className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition ${actionColor}`}>
                                            {actionLabel}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Snoozed notice — helps user find accidentally-snoozed prospects */}
                        {snoozedCount > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-blue-600 flex items-center">
                                    💤 <span className="ml-1"><strong>{snoozedCount}</strong> prospect{snoozedCount > 1 ? 's' : ''} snoozed — not showing here until their reminder date</span>
                                </span>
                                {onNavigateToPipeline && (
                                    <button onClick={onNavigateToPipeline} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 ml-2 whitespace-nowrap">
                                        Un-snooze →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}


                {/* Coach's Insight */}
                {!showInsight ? (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 shadow-sm flex items-center justify-between">
                        <div className="flex items-center">
                            <Lightbulb className="h-5 w-5 text-blue-500 mr-3" />
                            <span className="text-sm font-bold text-blue-800">Ready for your coaching insight?</span>
                        </div>
                        <button onClick={() => setShowInsight(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded transition-colors whitespace-nowrap ml-3">
                            Coach, How Am I Doing?
                        </button>
                    </div>
                ) : (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div className="flex">
                                <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="ml-3">
                                    <h3 className="text-sm font-bold text-blue-800">Coach's Insight (Activity Balance)</h3>
                                    <p className="text-sm text-blue-700 mt-1">{getCoachingAdvice().message}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center ml-4 flex-shrink-0">
                                <span className={`text-2xl font-black ${getCoachingAdvice().gradeColor.split(' ')[0]}`}>{getCoachingAdvice().grade}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 mt-1 rounded-full whitespace-nowrap ${getCoachingAdvice().gradeColor}`}>{getCoachingAdvice().gradeDesc}</span>
                            </div>
                        </div>
                        <div className="mt-3 text-right">
                            <button onClick={() => setShowInsight(false)} className="text-xs text-blue-500 hover:text-blue-700 underline">Hide Insight</button>
                        </div>
                    </div>
                )}

                {/* Pre-Action Text Wizard Banner */}
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between">
                    <div className="flex items-center mb-3 sm:mb-0">
                        <div className="bg-indigo-200 p-2 rounded-full mr-3 shrink-0"><BookOpen className="h-6 w-6 text-indigo-700" /></div>
                        <div>
                            <h3 className="text-sm font-bold text-indigo-900">Not sure what to say?</h3>
                            <p className="text-xs text-indigo-700 mt-0.5">Open Text Wizard to snag proven scripts before reaching out.</p>
                        </div>
                    </div>
                    <a href="https://text.wearetnv.com/" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-center shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded transition-colors">
                        Open Text Wizard
                    </a>
                </div>

                {/* 6 Activity Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.map(metric => {
                        if (metric.isPresentation) {
                            const value = (Array.isArray(todayData.presentations) ? todayData.presentations.length : Number(todayData.presentations) || 0) + (Number(todayData.pbrs) || 0);
                            return (<PresentationActivityCard key={metric.key} label={metric.label} value={value} streak={streaks.presentations || 0} icon={metric.icon} color={metric.color} onAddPresentation={onAddPresentation} />);
                        }

                        let rawValue = Number(todayData[metric.key]) || 0;
                        if (metric.key === 'followUps') rawValue = (Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0);
                        if (metric.key === 'enrolls') rawValue = currentEnrolls;

                        let onIncrement;
                        if (metric.key === 'followUps') onIncrement = onLogFollowUp;
                        else if (metric.key === 'exposures') onIncrement = onLogExposure;
                        else if (metric.key === 'nos') onIncrement = () => { if (window.confirm("A true 'No' only counts after they've seen the information. Did this prospect evaluate a presentation or video?")) onQuickAdd(metric.key, 1); };
                        else onIncrement = () => onQuickAdd(metric.key, 1);

                        return (
                            <ActivityCard
                                key={metric.key}
                                label={metric.label}
                                value={rawValue}
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
                        if (discipline.key === 'personalDevelopment') isChecked = !!(todayData.personalDevelopment || todayData.read || todayData.audio);
                        return (<DisciplineCheckbox key={discipline.key} label={discipline.label} icon={discipline.icon} isChecked={isChecked} onChange={(e) => onHabitChange(today, discipline.key, e.target.checked)} />);
                    })}
                </div>
            </div>
        </div>
    );
};

export default TodayDashboard;

