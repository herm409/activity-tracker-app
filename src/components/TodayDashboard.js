import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Dumbbell, BookOpen, Share2, HelpCircle, XCircle, Flame, Lightbulb, AlertTriangle, HeartHandshake, Sun, Moon, TrendingUp } from 'lucide-react';
import { ActivityCard, PresentationActivityCard, DisciplineCheckbox } from './ActivityCards';
import { calculatePoints } from '../utils/scoring';
import confetti from 'canvas-confetti';
import TNVCampaignBanner, { getSprintWeek, getSprintFocus } from './TNVCampaignBanner';

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

// --- Sprint Progress Bar ---
const SprintProgressBar = ({ sprint, onDeclareSprint }) => {
    if (!sprint?.endDate) {
        return (
            <button
                onClick={onDeclareSprint}
                className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50 hover:border-indigo-400 transition-all"
            >
                <span>⚡</span> Declare a Sprint — Raise Your Standard
            </button>
        );
    }

    const today = new Date();
    const endDate = sprint.endDate.toDate ? sprint.endDate.toDate() : new Date(sprint.endDate);
    const startDate = sprint.startDate ? (sprint.startDate.toDate ? sprint.startDate.toDate() : new Date(sprint.startDate)) : new Date(endDate.getTime() - sprint.days * 86400000);
    const totalDays = sprint.days || Math.round((endDate - startDate) / 86400000);
    const daysElapsed = Math.max(0, Math.min(totalDays, Math.round((today - startDate) / 86400000)));
    const daysLeft = Math.max(0, totalDays - daysElapsed);
    const pct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

    const tierColors = {
        Pro:      { bar: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', emoji: '🔵' },
        Elite:    { bar: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', emoji: '🟣' },
        Champion: { bar: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', emoji: '🔴' },
    };
    const colors = tierColors[sprint.tier] || tierColors.Pro;

    if (daysLeft === 0) return null; // Sprint expired — don't show

    return (
        <div className={`${colors.bg} border ${colors.border} rounded-xl p-3 mb-4 flex items-center gap-3`}>
            <span className="text-xl flex-shrink-0">{colors.emoji}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>{sprint.tier} Sprint</span>
                    <span className="text-xs text-gray-500 font-medium">{daysLeft}d left · {sprint.par} pts/day</span>
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden border border-gray-100">
                    <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Day {daysElapsed} of {totalDays}</p>
            </div>
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

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, onShareMonthly, isSharing, onLogFollowUp, onLogExposure, dailyPar, onShowLegend, hotlist, onNavigateToPipeline, weeklyPoints, weeklyPar, onLogFollowUpForProspect, sprint, onDeclareSprint }) => {
    // --- Sprint awareness ---
    const currentSprintWeek = getSprintWeek();
    const currentSprintFocus = getSprintFocus(currentSprintWeek);
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

    // Compute this week's total for the current sprint focus metric
    const weeklyFocusCount = useMemo(() => {
        if (!currentSprintFocus) return 0;
        const focusKey = currentSprintFocus.key;
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun
        let total = 0;
        for (let i = 0; i <= dayOfWeek; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - (dayOfWeek - i));
            const dayData = monthlyData[d.getDate()] || {};
            if (focusKey === 'presentations') {
                total += (Array.isArray(dayData.presentations) ? dayData.presentations.length : Number(dayData.presentations) || 0);
                total += Number(dayData.threeWays) || 0;
            } else {
                total += Number(dayData[focusKey]) || 0;
            }
        }
        return total;
    }, [monthlyData, currentSprintFocus]);
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
                <TNVCampaignBanner weeklyFocusCount={weeklyFocusCount} />

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

                {/* Time-of-Day Coaching (#1) */}
                <TimeOfDayCoaching todayPoints={todayPoints} dailyPar={currentPar} todayData={todayData} sprintFocus={currentSprintFocus} />

                {/* Sprint Progress Bar */}
                <SprintProgressBar sprint={sprint} onDeclareSprint={onDeclareSprint} />

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
                                {isIronman ? "You crushed it! Full cycle complete." : `Complete all 6 core activities for a +5 pt bonus. (${ironmanCompleted}/6)`}
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

