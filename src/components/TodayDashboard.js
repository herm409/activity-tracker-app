import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Dumbbell, BookOpen, Share2, HelpCircle, XCircle, Flame, AlertTriangle, HeartHandshake, TrendingUp, Sparkles, RefreshCw, ChevronDown, ChevronUp, Zap, Sun, Moon, Lock, ArrowUpRight } from 'lucide-react';
import { ActivityCard, PresentationActivityCard, DisciplineCheckbox } from './ActivityCards';
import { calculatePoints } from '../utils/scoring';
import confetti from 'canvas-confetti';
import { getDailyBriefing } from '../services/aiService';
import { UPGRADE_URL } from '../utils/planAccess';

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

// --- Active Streak Chips (#2: show all streaks, at-risk float to top) ---
const StreakRow = ({ streaks, todayData }) => {
    const items = [
        { key: 'ironman', label: 'Ironman', emoji: '🔥', streak: streaks.ironman || 0, done: [
            (Number(todayData.exposures) || 0) > 0,
            ((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0,
            (Number(todayData.nos) || 0) > 0,
            ((Array.isArray(todayData.presentations) ? todayData.presentations.length : Number(todayData.presentations) || 0) + (Number(todayData.pbrs) || 0)) > 0,
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
    // Show all active streaks (up to 6). At-risk ones float to the top regardless of streak length.
    const active = items
        .filter(i => i.streak > 0)
        .sort((a, b) => {
            // At-risk (not done today) always sorts before safe
            const aRisk = !a.done ? 1 : 0;
            const bRisk = !b.done ? 1 : 0;
            if (bRisk !== aRisk) return bRisk - aRisk;
            return b.streak - a.streak;
        })
        .slice(0, 6);
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

// --- Time-of-Day Coaching Block (#1) ---
const TimeOfDayCoaching = ({ todayPoints, dailyPar, todayData, sprintFocus }) => {
    const hour = new Date().getHours();
    const E = Number(todayData.exposures) || 0;
    const F = (Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0);
    const N = Number(todayData.nos) || 0;
    const Tw = Number(todayData.threeWays) || 0;
    const Ex = !!todayData.exerc;
    const Pd = !!(todayData.personalDevelopment || todayData.read || todayData.audio);
    const deficit = dailyPar - todayPoints;

    let icon, bg, border, headline, body;

    // Simple hash to grab random phrase from array based on points/date so it feels fresh
    const hash = todayPoints + new Date().getDate();
    const getMsg = (arr) => arr[hash % arr.length];

    if (hour < 10) {
        // Morning: Game Plan
        icon = <Sun className="h-5 w-5 text-amber-500 flex-shrink-0" />;
        bg = 'bg-amber-50'; border = 'border-amber-200';
        headline = 'Good Morning — Game Plan';
        
        if (todayPoints === 0 && !Ex && !Pd) {
            body = getMsg([
                `Wake up and win! Drop an early exposure, get your workout in, or read 10 pages. Set the tone!`,
                `The sun is up and the board is clean. Execute the fundamentals and let's go get these wins.`,
                `Par is ${dailyPar} pts today. Don't wait for things to happen—make them happen. Drop that first exposure!`
            ]);
        } else if (todayPoints === 0 && (Ex || Pd)) {
            body = getMsg([
                `Great job knocking out your daily disciplines early! Now take that energy and drop your first exposure.`,
                `Mind and body are primed. Let's get the business on the board. Make that first dial!`,
                `Disciplines check out. Time to pivot to the pipeline. Go get an exposure!`
            ]);
        } else if (E > 0 && F === 0) {
            body = getMsg([
                `You've planted the seeds early, but don't forget to water yesterday's prospects. Get a follow-up on the board!`,
                `Great early exposures! Now go follow up on the leads from yesterday. Keep that pipeline flowing.`,
                `Off to a strong start with those exposures. Make sure you balance it out—drop a follow-up next!`
            ]);
        } else if (F > 0 && E === 0) {
            body = getMsg([
                `Great job watering the pipeline early, but we need fresh blood. Go drop a brand new exposure!`,
                `You're managing your existing prospects perfectly this morning. Now plant a new seed!`,
                `Follow-ups are key, but the pipeline needs new names. Make a fresh exposure your next move.`
            ]);
        } else if (deficit > 0) {
            body = getMsg([
                `Great start to the morning! You're already on the board. ${deficit} pt${deficit !== 1 ? 's' : ''} left to hit daily par. Keep that momentum!`,
                `Early bird gets the worm. You've got ${todayPoints} pt${todayPoints !== 1 ? 's' : ''} already. Let's keep pushing towards that ${dailyPar} pt par!`,
                `Off to a fast start! Don't slow down now—you're only ${deficit} pt${deficit !== 1 ? 's' : ''} away from par.`
            ]);
        } else if (deficit <= 0 && (!Ex || !Pd)) {
            body = getMsg([
                `Par hit before 10 AM?! Now don't forget your mind and body. Get that workout and reading in to secure the Ironman!`,
                `Absolute champion. You cleared par early! Pivot some of that energy into your personal development today.`,
                `Morning domination on the board! Now win the daily cycle. Go check off your exercise and reading.`
            ]);
        } else {
            body = getMsg([
                `Par hit and disciplines knocked out before 10 AM?! You are a machine. Keep running up the score!`,
                `Flawless execution today. Business and personal habits are dialed in. Let's see how high you can take it!`,
                `Total cycle complete early. Everything from here is extra credit. Let's pad that lead!`
            ]);
        }
    } else if (hour < 17) {
        // Afternoon: Pace Check
        icon = <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0" />;
        bg = 'bg-blue-50'; border = 'border-blue-200';
        headline = 'Midday Pace Check';
        
        if (todayPoints === 0) {
            body = getMsg([
                `It's midday and the board is still blank. Don't let the day slip away. Make that first dial!`,
                `Half the day is gone but there's still time to turn it around. Drop an exposure and get moving.`,
                `Pace check: You're currently at 0 pts. It's time to get off the bench and into the game!`
            ]);
        } else if (E > 2 && F === 0) {
            body = getMsg([
                `You're pitching great, but your follow-ups are at zero. Your seeds aren't gonna water themselves. Get back on the line!`,
                `Heavy exposure work, but the fortune is in the follow-up! Go hit up those prospects right now.`,
                `You've planted a lot of seeds today. Do not leave them hanging—go get a follow-up on the board!`
            ]);
        } else if (F > 2 && E === 0) {
            body = getMsg([
                `You're managing the pipeline perfectly, but it's going to dry up if you don't plant new seeds. Drop a fresh exposure!`,
                `Great follow-up game today, but you need new prospects. Pivot and push an exposure!`,
                `Solid pipeline maintenance. Now let's grow it. It's time to spark a brand new conversation.`
            ]);
        } else if (E > 0 && F > 0 && Tw === 0 && N === 0) {
            body = getMsg([
                `You're working the pipeline well, but no decisions are being made. Push for a definitive No or get a veteran on a 3-way call!`,
                `Activity is high, but we need to close. Force the verdict—hunt for a No or connect a 3-Way.`,
                `You're planting and watering, but are you harvesting? Push a prospect to a decision or loop in a 3-Way call!`
            ]);
        } else if (deficit <= 0 && (!Ex || !Pd)) {
            body = getMsg([
                `You're hitting your numbers, but don't neglect yourself! Make sure you get your daily exercise and reading in.`,
                `Board is looking great. Have you fed your mind and body today? Grab a book or hit the gym!`,
                `On pace for a great day on the score board. Don't forget that building the business requires building yourself!`
            ]);
        } else if (deficit > 0) {
            body = getMsg([
                `You're ${deficit} pt${deficit !== 1 ? 's' : ''} short of par. The afternoon is prime time — flip the switch and drop ${Math.max(1, deficit)} more play${deficit !== 1 ? 's' : ''}.`,
                `Pace check reveals a ${deficit}-point deficit. You're on the board, keep pushing to close this gap!`,
                `${deficit} pt${deficit !== 1 ? 's' : ''} to par. We need you to stay locked in. Make those calls!`
            ]);
        } else {
            body = getMsg([
                `You're crushing it — par hit and disciplines done. Keep duplicating this hustle to pad that lead. Let's eat!`,
                `Total execution so far today. You're on pace and looking dangerous. Don't take your foot off the gas now!`,
                `Sitting solid at ${todayPoints} pts with personal habits checked off. Finish the day strong!`
            ]);
        }
    } else {
        // Evening: Close-of-Day
        icon = <Moon className="h-5 w-5 text-indigo-500 flex-shrink-0" />;
        bg = 'bg-indigo-50'; border = 'border-indigo-200';
        headline = 'Close of Day Recap';
        
        if (todayPoints === 0 && (!Ex && !Pd)) {
            body = getMsg([
                `A clean slate across the board today. Give yourself grace, rest up, and commit to a full reset tomorrow morning.`,
                `A blank board today. Take a breath, reset, and commit to dropping that first exposure early tomorrow morning.`,
                `We all have off days. Zero points today just means tomorrow is a chance for a massive comeback. Rest up!`
            ]);
        } else if (todayPoints === 0 && (Ex || Pd)) {
            body = getMsg([
                `Missed the mark on business activity, but you didn't quit on yourself. Good job getting your disciplines in. Better pipelining tomorrow!`,
                `Zero points today, but a win for personal development. Channel that growth into exposures tomorrow morning.`,
                `You fed your mind and body today, which is a win. Tomorrow, let's put that energy into the pipeline.`
            ]);
        } else if (E > 0 && F === 0 && deficit > 0) {
            body = getMsg([
                `You started strong today by planting seeds, but didn't water them. Tomorrow, start by following up on today's exposures.`,
                `Missed par today, but you've got fresh exposures. Let's convert those into solid follow-ups tomorrow!`,
                `The day is done. You've got seeds in the ground without water. First order of business tomorrow: Follow up!`
            ]);
        } else if (F > 0 && Tw === 0 && deficit > 0) {
            body = getMsg([
                `You followed up hard today, but missed par. Tomorrow, bring in backup. Connect a 3-way call early!`,
                `You put in the follow-up work, but sometimes you need third-party validation. Plan for a 3-Way call tomorrow!`,
                `Pipeline was watered today! To bump those points up tomorrow, let's leverage the team and schedule a 3-way.`
            ]);
        } else if (todayPoints >= dailyPar && (!Ex || !Pd)) {
            const diff = todayPoints - dailyPar;
            body = getMsg([
                `Business is booming today! But you missed your workout or reading. Champions do it all—knock it out before bed!`,
                `You dominated the board today (${diff > 0 ? `${diff} under par` : 'even par'}), but left your physical/mental reps behind. Get that reading in!`,
                `Great hustle on the phones today. Don't forget to take care of yourself too. Finish that personal development.`
            ]);
        } else if (todayPoints >= dailyPar) {
            const diff = todayPoints - dailyPar;
            body = getMsg([
                `Day secured! Points hit (${diff > 0 ? `${diff} under par` : 'even par'}), disciplines done. This is the definition of a perfect day. Rest up!`,
                `Mission accomplished. The board says ${todayPoints} pts and your mind is fed. Shut it down and celebrate your consistency today!`,
                `This is what winning looks like. Total execution. Finish logging your stats, grab some rest, and prepare to do it again tomorrow.`
            ]);
        } else {
            body = getMsg([
                `Day closing out at ${todayPoints} pts — ${deficit} short of par. Shake it off, learn the lesson, and come back with a vengeance tomorrow.`,
                `We fell short today by ${deficit} pts. It happens to the best of us. Rest up and bring that fire back tomorrow!`,
                `Scoreboard check: ${deficit} shy of par. Don't dwell on it. Faith, family, fitness, and get back to the hustle tomorrow.`
            ]);
        }
    }

    // Sprint Focus nudge — injected at the end of body if user hasn't hit the sprint focus today
    let sprintNudge = null;
    if (sprintFocus) {
        const focusKey = sprintFocus.key;
        let focusDoneToday = false;
        if (focusKey === 'presentations') {
            focusDoneToday = ((Array.isArray(todayData.presentations) ? todayData.presentations.length : Number(todayData.presentations) || 0) + (Number(todayData.threeWays) || 0)) > 0;
        } else {
            const val = todayData[focusKey];
            focusDoneToday = Array.isArray(val) ? val.length > 0 : Number(val) > 0;
        }
        if (!focusDoneToday) {
            sprintNudge = ` ${sprintFocus.emoji} Sprint focus this week: ${sprintFocus.label}. You haven't logged any yet today — make it a priority!`;
        }
    }

    return (
        <div className={`${bg} border ${border} rounded-lg p-4 mb-5 flex items-start gap-3`}>
            {icon}
            <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{headline}</span>
                <p className="text-sm text-gray-700 mt-0.5 leading-snug">
                    {body}
                    {sprintNudge && <span className="block mt-1.5 text-xs font-bold text-indigo-700">{sprintNudge}</span>}
                </p>
            </div>
        </div>
    );
};

// --- Upgrade banner for Free members (AI Daily Briefing is Pro / Platinum) ---
const DailyBriefingUpgradeBanner = () => (
    <div className="relative overflow-hidden rounded-2xl mb-5 border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Diamond Coach</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Pro &amp; Platinum
                    </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Unlock your AI Daily Briefing</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Pro and Platinum members get a personalized Diamond Coach briefing every day — strengths,
                    focus areas, and a clear game plan based on your activity and pipeline.
                    Upgrade in the TNV App, then sign out and sign back in with Team NuVision so your plan refreshes.
                </p>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-2 sm:items-end">
                <a
                    href={UPGRADE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Upgrade to Pro
                    <ArrowUpRight className="h-4 w-4" />
                </a>
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Included with Pro Access &amp; Platinum Access
                </p>
            </div>
        </div>
    </div>
);

// --- Sprint Progress Bar ---
// --- AI Daily Briefing Card ---
const DailyBriefingCard = ({ userContext }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `dailyBriefing_${todayStr}_${userContext?.displayName || 'user'}`;

    const [briefing, setBriefing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(true);

    const fetchBriefing = useCallback(async (force = false) => {
        if (!force) {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // If the cached version has blank fields (from the old cut-off code), ignore it
                    if (parsed && parsed.todo && parsed.focus && parsed.strengths && parsed.weaknesses) {
                        setBriefing(parsed);
                        return;
                    }
                } catch (_) {}
            }
        }
        setLoading(true);
        setError(null);
        try {
            const result = await getDailyBriefing(userContext);
            setBriefing(result);
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (err) {
            setError('Could not load your briefing right now. Tap refresh to try again.');
        } finally {
            setLoading(false);
        }
    }, [cacheKey, userContext]);

    useEffect(() => { fetchBriefing(); }, []);

    const Section = ({ emoji, label, content, borderColor }) => (
        <div className={`border-l-4 ${borderColor} pl-3 py-1`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{emoji} {label}</p>
            <p className="text-sm text-gray-800 leading-relaxed">{content}</p>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl shadow-xl mb-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-white/10 rounded-lg p-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-200" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Diamond Coach</p>
                        <h3 className="text-sm font-black text-white">Your Daily Briefing</h3>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => fetchBriefing(true)}
                        disabled={loading}
                        title="Refresh briefing"
                        className="text-indigo-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="text-indigo-300 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                    >
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4">
                    {loading && (
                        <div className="flex items-center gap-3 py-4">
                            <div className="flex gap-1">
                                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" />
                                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                                <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                            </div>
                            <span className="text-indigo-300 text-xs font-medium">Reading your numbers...</span>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="bg-white/10 rounded-xl p-3 mt-2">
                            <p className="text-indigo-200 text-xs">{error}</p>
                        </div>
                    )}

                    {briefing && !loading && (
                        <div className="bg-white rounded-xl p-4 mt-2 space-y-3">
                            <Section emoji="🎯" label="What to do today" content={briefing.todo} borderColor="border-indigo-500" />
                            <Section emoji="🔍" label="Focus on" content={briefing.focus} borderColor="border-purple-500" />
                            <Section emoji="💪" label="Strengths" content={briefing.strengths} borderColor="border-green-500" />
                            <Section emoji="⚠️" label="Weaknesses" content={briefing.weaknesses} borderColor="border-amber-500" />
                        </div>
                    )}

                    {!briefing && !loading && !error && (
                        <div className="bg-white/10 rounded-xl p-3 mt-2">
                            <p className="text-indigo-200 text-xs">Log some activity and I'll give you a personalized briefing.</p>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-3">
                        <Zap className="h-3 w-3 text-indigo-400" />
                        <p className="text-[10px] text-indigo-400">Powered by Gemini · Refreshes once per day</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Daily Cycle Dot with tap-to-label (#3) ---
const CycleDot = ({ label, done }) => {
    const [showLabel, setShowLabel] = useState(false);
    return (
        <div className="relative flex flex-col items-center">
            <button
                type="button"
                onMouseEnter={() => setShowLabel(true)}
                onMouseLeave={() => setShowLabel(false)}
                onFocus={() => setShowLabel(true)}
                onBlur={() => setShowLabel(false)}
                onClick={() => setShowLabel(v => !v)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    done ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-400'
                }`}
                aria-label={label}
            >
                {label.charAt(0)}
            </button>
            {showLabel && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap z-20 shadow-lg">
                    {label}
                </div>
            )}
        </div>
    );
};

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, onShareMonthly, isSharing, onLogFollowUp, onLogExposure, dailyPar, onShowLegend, hotlist, onNavigateToPipeline, weeklyPoints, weeklyPar, onLogFollowUpForProspect, userProfile, enableDailyBriefing = false }) => {
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

    // Build the AI context payload for the briefing card
    const now2 = new Date();
    const startOfWeek2 = new Date(now2);
    startOfWeek2.setDate(now2.getDate() - now2.getDay());
    let thisWeekPoints = 0;
    for (let i = 0; i <= 6; i++) {
        const d = new Date(startOfWeek2);
        d.setDate(startOfWeek2.getDate() + i);
        if (d > now2) break;
        thisWeekPoints += calculatePoints(monthlyData[d.getDate()] || {});
    }
    let thisMonthPoints = 0;
    Object.values(monthlyData).forEach(day => { thisMonthPoints += calculatePoints(day); });
    const aiContext = useMemo(() => ({
        displayName: userProfile?.displayName || 'Associate',
        todaySnapshot: todayData,
        todayPoints,
        dailyPar: currentPar,
        thisWeekPoints,
        thisMonthPoints,
        monthlyGoals: userProfile?.monthlyGoals || {},
        ironmanStreak: streaks?.ironman || 0,
        sprint: userProfile?.sprint || null,
        prospects: hotlist || []
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [todayPoints, thisWeekPoints, thisMonthPoints, hotlist]);

    // Ironman Progress
    const ironmanProgress = [
        { label: 'Exposures', done: (Number(todayData.exposures) || 0) > 0 },
        { label: 'Follow Ups', done: ((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0 },
        { label: 'No\'s', done: (Number(todayData.nos) || 0) > 0 },
        { label: 'Presentations', done: ((Array.isArray(todayData.presentations) ? todayData.presentations.length : Number(todayData.presentations) || 0) + (Number(todayData.pbrs) || 0)) > 0 },
        { label: '3-Ways', done: (Number(todayData.threeWays) || 0) > 0 },
        { label: 'Exercise', done: !!todayData.exerc },
        { label: 'Personal Dev', done: !!(todayData.personalDevelopment || todayData.read || todayData.audio) },
    ];
    const ironmanCompleted = ironmanProgress.filter(i => i.done).length;
    const isIronman = ironmanCompleted === 7;

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



    return (
        <div className="space-y-8">
            <div>
                {/* AI Daily Briefing: full card for Pro/Platinum; upgrade banner for Free */}
                {enableDailyBriefing ? (
                    <DailyBriefingCard userContext={aiContext} />
                ) : (
                    <DailyBriefingUpgradeBanner />
                )}

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

                {/* Time-of-Day Coaching */}
                <TimeOfDayCoaching todayPoints={todayPoints} dailyPar={currentPar} todayData={todayData} sprintFocus={null} />

                {/* Daily Par Progress Ring */}
                <DailyParRing todayPoints={todayPoints} dailyPar={currentPar} />

                {/* Weekly Pace Chip (#5) */}
                {weeklyPoints !== undefined && weeklyPar !== undefined && (() => {
                    const pace = weeklyPar - weeklyPoints;
                    const isAhead = pace < 0;
                    const isEven = pace === 0;
                    return (
                        <div className={`flex items-center justify-center gap-2 -mt-3 mb-4 px-4 py-2 rounded-full border text-xs font-semibold w-fit mx-auto ${
                            isAhead ? 'bg-green-50 border-green-200 text-green-700' :
                            isEven  ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                      'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            📅 Week: {weeklyPoints} pts / {weeklyPar} expected — {isAhead ? `${Math.abs(pace)} ahead` : isEven ? 'on pace' : `${pace} behind pace`}
                        </div>
                    );
                })()}

                {/* Active Streak Chips */}
                <StreakRow streaks={streaks} todayData={todayData} />

                {/* Ironman / Daily Cycle Tracker — dots now have tap-to-label (#3) */}
                <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-orange-100 flex flex-col md:flex-row items-center justify-between mb-6">
                    <div className="flex items-center mb-3 md:mb-0 w-full md:w-auto">
                        <div className={`p-3 rounded-full mr-4 ${isIronman ? 'bg-orange-100' : 'bg-gray-100'}`}>
                            <Flame className={`h-8 w-8 ${isIronman ? 'text-orange-500' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg flex items-center">
                                The Daily Cycle
                                {isIronman && <span className="ml-2 bg-orange-500 text-white text-[10px] uppercase px-2 py-0.5 rounded-full font-bold animate-pulse">+5 PTS</span>}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {isIronman ? "You crushed it! Full cycle complete." : `Complete all 7 core activities for a +5 pt bonus. (${ironmanCompleted}/7)`}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Tap each circle to see its label</p>
                        </div>
                    </div>
                    <div className="flex space-x-2 w-full md:w-auto justify-center">
                        {ironmanProgress.map((item, idx) => (
                            <CycleDot key={idx} label={item.label} done={item.done} />
                        ))}
                    </div>
                </div>




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
                        else if (metric.key === 'nos') onIncrement = () => { if (window.confirm("Log a Definitive No?\n\nA 'No' is most powerful after they've evaluated the information — but log it any time a prospect has definitively declined.")) onQuickAdd(metric.key, 1); };
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

