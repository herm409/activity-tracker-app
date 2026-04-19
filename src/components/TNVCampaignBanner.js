import React, { useState, useEffect } from 'react';
import { ExternalLink, Target, Users, Star } from 'lucide-react';
import { appId } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { getWeekId } from '../utils/helpers';

const SPRINT_SCHEDULE = [
    { label: "Exposures",             key: "exposures",     baseline: 12, emoji: '🎯', tip: "Plant new seeds — every conversation is a door." },
    { label: "Follow Ups",            key: "followUps",     baseline: 15, emoji: '📞', tip: "The fortune is in the follow-up. Circle back and convert." },
    { label: "Presentations / 3-Ways",key: "presentations", baseline: 3,  emoji: '🎤', tip: "Get prospects in front of the system. 3-Ways count!" },
    { label: "Definitive No's",       key: "nos",           baseline: 10, emoji: '❌', tip: "Every No is one step closer to a Yes. Go collect them!" },
];

// Shared utility — also used by Leaderboard
export const getSprintWeek = () => {
    // START_DATE is the Sunday before campaign launch so weeks align with Sun–Sat calendar weeks.
    // April 17 (Thu) launch → anchor to Sunday April 13 → Week 1: Apr 13–19 (Exposures)
    const START_DATE = new Date('2026-04-13T00:00:00');
    const now = new Date();
    if (now < START_DATE) return 1; // Pre-launch preview
    const daysSinceStart = Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceStart / 7) + 1;
};

export const getSprintFocus = (weekNum) => {
    if (weekNum <= 0) return null;
    const index = (weekNum - 1) % SPRINT_SCHEDULE.length;
    return SPRINT_SCHEDULE[index];
};

const TOTAL_SPRINT_WEEKS = 14; // Apr 13 → Jul 19 = 98 days = 14 weeks

const TNVCampaignBanner = ({ weeklyFocusCount }) => {
    const { db } = useAppContext();
    const EVENT_DATE = new Date('2026-07-16T00:00:00');
    const END_DATE   = new Date('2026-07-19T23:59:59');

    const calculateTimeLeft = () => {
        const difference = EVENT_DATE - new Date();
        if (difference > 0) {
            return {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hrs:  Math.floor((difference / (1000 * 60 * 60)) % 24),
                min:  Math.floor((difference / 1000 / 60) % 60),
                sec:  Math.floor((difference / 1000) % 60),
            };
        }
        return { days: 0, hrs: 0, min: 0, sec: 0 };
    };

    const [timeLeft, setTimeLeft]   = useState(calculateTimeLeft());
    const [isPast, setIsPast]       = useState(new Date() > END_DATE);

    useEffect(() => {
        if (isPast) return;
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
            if (new Date() > END_DATE) setIsPast(true);
        }, 1000);
        return () => clearTimeout(timer);
    });

    const currentWeek = getSprintWeek();
    const focus = getSprintFocus(currentWeek);

    // "New Week!" pulse — true for the first 24 hours of each Sunday (week flip day)
    const now = new Date();
    const isNewWeekDay = now.getDay() === 0 && now.getHours() < 24;

    const [teamProgress, setTeamProgress] = useState({ current: 0, target: 0, activeUsers: 0 });

    useEffect(() => {
        if (currentWeek <= 0 || currentWeek > TOTAL_SPRINT_WEEKS || !db || !focus) return;

        const weekId = getWeekId(new Date());
        const leaderboardColRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');

        const unsubscribe = onSnapshot(query(leaderboardColRef), (snapshot) => {
            let activeCount = 0;
            let currentScore = 0;

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                activeCount++;
                if (focus.key === 'presentations') {
                    currentScore += (Number(data.presentations) || 0) + (Number(data.threeWays) || 0);
                } else {
                    currentScore += (Number(data[focus.key]) || 0);
                }
            });

            const effectiveUsers = Math.max(activeCount, 5);
            const targetScore    = Math.max(effectiveUsers * focus.baseline, 1);
            setTeamProgress({ current: currentScore, target: targetScore, activeUsers: activeCount });
        }, (err) => {
            console.error("Error subscribing to sprint progress:", err);
        });

        return () => unsubscribe();
    }, [currentWeek, db, focus]);

    if (isPast) return null;

    const pct = Math.min((teamProgress.current / Math.max(teamProgress.target, 1)) * 100, 100);

    return (
        <div
            className="relative overflow-hidden rounded-xl mb-6 shadow-lg flex flex-col md:flex-row border-2"
            style={{
                backgroundImage: 'linear-gradient(to bottom right, #4a0a0a, #2a0505, #120000)',
                borderColor: '#8b1c1c'
            }}
        >
            {/* Background glow blobs */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-red-500 blur-3xl" />
                <div className="absolute top-1/2 right-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: '#4cbce4' }} />
            </div>

            {/* LEFT — Sprint info & thermometer */}
            <div className="relative z-10 p-5 md:p-6 flex-1 flex flex-col justify-center">
                {/* Badge row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <div
                        className="inline-flex items-center space-x-2 border rounded-full px-3 py-1 bg-opacity-50 w-max"
                        style={{ backgroundColor: 'rgba(50, 0, 0, 0.5)', borderColor: 'rgba(150, 0, 0, 0.5)' }}
                    >
                        <Target className="h-4 w-4" style={{ color: '#4cbce4' }} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                            90 Day All Out Sprint to Houston
                        </span>
                    </div>
                    {/* New Week pulse badge */}
                    {isNewWeekDay && currentWeek > 1 && (
                        <div className="inline-flex items-center gap-1 border border-yellow-400 rounded-full px-2.5 py-1 animate-pulse"
                            style={{ backgroundColor: 'rgba(234,179,8,0.15)' }}>
                            <Star className="h-3 w-3 text-yellow-400" />
                            <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest">New Week!</span>
                        </div>
                    )}
                </div>

                <h3
                    className="text-2xl md:text-3xl font-black leading-tight tracking-tight uppercase"
                    style={{ color: '#4cbce4' }}
                >
                    Team NuVision Financial Independence Weekend
                </h3>
                <p className="text-white text-lg md:text-xl font-bold mt-1 tracking-wide">
                    JULY 16–19, 2026
                </p>

                {/* Sprint Thermometer */}
                {currentWeek > 0 && currentWeek <= TOTAL_SPRINT_WEEKS && teamProgress.target > 0 && focus && (
                    <div className="mt-5 bg-black bg-opacity-30 p-4 rounded-xl border border-white border-opacity-10 w-full max-w-sm shadow-inner overflow-hidden relative">
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none" style={{ backgroundColor: '#4cbce4' }} />

                        {/* Header row */}
                        <div className="flex justify-between items-end mb-2 relative z-10">
                            <div>
                                <span className="text-[9px] font-bold text-white uppercase tracking-wider opacity-60 flex items-center mb-0.5">
                                    Sprint Week {currentWeek} of {TOTAL_SPRINT_WEEKS}
                                </span>
                                <div className="text-sm font-black text-white leading-tight uppercase tracking-wide" style={{ color: '#4cbce4' }}>
                                    {focus.emoji} Team Focus: {focus.label}
                                </div>
                            </div>
                            <div className="text-right pl-3 flex flex-col items-end">
                                <div className="text-2xl font-black text-white leading-none">
                                    {teamProgress.current} <span className="text-xs font-bold opacity-40 uppercase">/ {teamProgress.target}</span>
                                </div>
                                <span className="text-[10px] font-bold mt-1 text-white opacity-70">
                                    {Math.round(pct) || 0}% Complete
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2.5 w-full bg-black bg-opacity-50 rounded-full overflow-hidden shadow-inner border border-white border-opacity-10 relative z-10">
                            <div
                                className="h-full transition-all duration-1000 ease-in-out rounded-full"
                                style={{
                                    width: `${pct}%`,
                                    backgroundImage: 'linear-gradient(to right, #2a7a9c, #4cbce4)',
                                    boxShadow: '0 0 10px rgba(76, 188, 228, 0.5)'
                                }}
                            />
                        </div>

                        {/* Focus tip */}
                        <p className="text-[9px] text-white opacity-40 mt-1.5 italic relative z-10">{focus.tip}</p>

                        {/* Team count */}
                        <div className="mt-1 flex justify-between items-center text-[8px] text-white opacity-40 uppercase tracking-widest font-bold relative z-10">
                            <span className="flex items-center">
                                <Users className="w-2.5 h-2.5 mr-1" />
                                Goal scaled for {teamProgress.activeUsers < 5 ? '5' : teamProgress.activeUsers} runners
                            </span>
                            {/* Personal contribution */}
                            {weeklyFocusCount !== undefined && (
                                <span className="text-yellow-300 opacity-80 font-black normal-case tracking-normal text-[9px]">
                                    You: {weeklyFocusCount} {focus.label}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT — Countdown */}
            <div
                className="relative z-10 p-5 md:p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l md:min-w-[280px]"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
                <div className="flex gap-3 mb-4">
                    {[
                        { val: timeLeft.days, label: 'Days' },
                        { val: timeLeft.hrs,  label: 'Hrs'  },
                        { val: timeLeft.min,  label: 'Min'  },
                        { val: timeLeft.sec,  label: 'Sec'  },
                    ].map(({ val, label }) => (
                        <div key={label} className="flex flex-col items-center">
                            <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center shadow-inner" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <span className="text-2xl font-bold text-white">{val}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">{label}</span>
                        </div>
                    ))}
                </div>

                <a
                    href="https://TNVEvents.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-black font-black uppercase text-sm py-2.5 px-4 rounded transition-colors flex items-center justify-center tracking-wide hover:opacity-90"
                    style={{ backgroundColor: '#4cbce4' }}
                >
                    Register Here <ExternalLink className="ml-2 h-4 w-4" />
                </a>
            </div>
        </div>
    );
};

export default TNVCampaignBanner;
