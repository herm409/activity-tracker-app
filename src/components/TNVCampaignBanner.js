import React, { useState, useEffect } from 'react';
import { ExternalLink, Target, Users } from 'lucide-react';
import { appId } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext';
import { collection, query, getDocs } from 'firebase/firestore';
import { getWeekId } from '../utils/helpers';

const SPRINT_SCHEDULE = [
    { label: "Exposures", key: "exposures", baseline: 12 },
    { label: "Follow Ups", key: "followUps", baseline: 15 },
    { label: "Presentations / 3-Ways", key: "presentations", baseline: 3 },
    { label: "Definitive No's", key: "nos", baseline: 10 }
];

const getSprintFocus = (weekNum) => {
    if (weekNum <= 0) return null;
    const index = (weekNum - 1) % SPRINT_SCHEDULE.length;
    return SPRINT_SCHEDULE[index];
};

const TNVCampaignBanner = () => {
    const { db } = useAppContext();
    const EVENT_DATE = new Date('2026-07-16T00:00:00');
    
    // Auto-hide if past event completion (July 19 end date)
    const END_DATE = new Date('2026-07-19T23:59:59');
    
    const calculateTimeLeft = () => {
        const difference = EVENT_DATE - new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hrs: Math.floor((difference / (1000 * 60 * 60)) % 24),
                min: Math.floor((difference / 1000 / 60) % 60),
                sec: Math.floor((difference / 1000) % 60)
            };
        } else {
            timeLeft = { days: 0, hrs: 0, min: 0, sec: 0 };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const [isPast, setIsPast] = useState(new Date() > END_DATE);

    useEffect(() => {
        if (isPast) return;
        
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
            if (new Date() > END_DATE) {
                setIsPast(true);
            }
        }, 1000); // update every second

        return () => clearTimeout(timer);
    });

    // Calculate sprint week (April 17 start = Week 1)
    const START_DATE = new Date('2026-04-17T00:00:00');
    const now = new Date();
    let currentWeek = 0;
    if (now >= START_DATE) {
        const daysSinceStart = Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
        currentWeek = Math.floor(daysSinceStart / 7) + 1;
    } else {
        // PRE-LAUNCH PREVIEW: Show Week 1 goal so team can visualize the sprint before April 17
        currentWeek = 1;
    }

    const [teamProgress, setTeamProgress] = useState({ current: 0, target: 0, activeUsers: 0, focusLabel: '' });

    useEffect(() => {
        if (currentWeek <= 0 || currentWeek > 13) return;

        const fetchTeamProgress = async () => {
            try {
                if (!db) return; // ensure db is loaded
                const weekId = getWeekId(now);
                const leaderboardColRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');
                const snapshot = await getDocs(query(leaderboardColRef));
                
                let activeCount = 0;
                let currentScore = 0;
                const focus = getSprintFocus(currentWeek);
                const metricKey = focus.key;

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    activeCount++;
                    
                    if (metricKey === 'presentations') {
                        currentScore += (Number(data.presentations) || 0) + (Number(data.threeWays) || 0);
                    } else {
                        currentScore += (Number(data[metricKey]) || 0);
                    }
                });

                // Floor of 5 active users to keep scale realistic before team fully adopts
                const effectiveUsers = Math.max(activeCount, 5);
                const targetScore = Math.max(effectiveUsers * focus.baseline, 1);

                setTeamProgress({
                    current: currentScore,
                    target: targetScore,
                    activeUsers: activeCount,
                    focusLabel: focus.label
                });
            } catch (err) {
                console.error("Error fetching sprint progress:", err);
            }
        };

        fetchTeamProgress();
    }, [currentWeek]);

    if (isPast) return null;

    return (
        <div 
            className="relative overflow-hidden rounded-xl mb-6 shadow-lg flex flex-col md:flex-row border-2"
            style={{ 
                backgroundImage: 'linear-gradient(to bottom right, #4a0a0a, #2a0505, #120000)',
                borderColor: '#8b1c1c'
            }}
        >
            {/* Background Texture/Circles overlay */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-red-500 blur-3xl"></div>
                <div 
                    className="absolute top-1/2 right-10 w-32 h-32 rounded-full blur-3xl"
                    style={{ backgroundColor: '#4cbce4' }}
                ></div>
            </div>

            <div className="relative z-10 p-5 md:p-6 flex-1 flex flex-col justify-center">
                <div 
                    className="inline-flex items-center space-x-2 border rounded-full px-3 py-1 bg-opacity-50 w-max mb-3"
                    style={{ backgroundColor: 'rgba(50, 0, 0, 0.5)', borderColor: 'rgba(150, 0, 0, 0.5)' }}
                >
                    <Target className="h-4 w-4" style={{ color: '#4cbce4' }} />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                        90 Day All Out Sprint to Houston
                    </span>
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
                {currentWeek > 0 && currentWeek <= 13 && teamProgress.target > 0 && (
                     <div className="mt-5 bg-black bg-opacity-30 p-4 rounded-xl border border-white border-opacity-10 w-full max-w-sm shadow-inner overflow-hidden relative">
                        {/* Glow effect */}
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none" style={{ backgroundColor: '#4cbce4' }}></div>
                        
                        <div className="flex justify-between items-end mb-2 relative z-10">
                            <div>
                                <span className="text-[9px] font-bold text-white uppercase tracking-wider opacity-60 flex items-center mb-0.5">
                                    Sprint Week {currentWeek} of 13
                                </span>
                                <div className="text-sm font-black text-white leading-tight uppercase tracking-wide" style={{ color: '#4cbce4' }}>
                                    Team Target: {teamProgress.focusLabel}
                                </div>
                            </div>
                            <div className="text-right pl-3">
                                <div className="text-2xl font-black text-white leading-none">
                                    {teamProgress.current} <span className="text-xs font-bold opacity-40 uppercase">/ {teamProgress.target}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-2.5 w-full bg-black bg-opacity-50 rounded-full overflow-hidden shadow-inner border border-white border-opacity-10 relative z-10">
                            <div 
                                className="h-full transition-all duration-1000 ease-in-out rounded-full"
                                style={{ 
                                    width: `${Math.min((teamProgress.current / teamProgress.target) * 100, 100)}%`,
                                    backgroundImage: 'linear-gradient(to right, #2a7a9c, #4cbce4)',
                                    boxShadow: '0 0 10px rgba(76, 188, 228, 0.5)'
                                }}
                            ></div>
                        </div>
                        
                        <div className="mt-1.5 flex justify-between items-center text-[8px] text-white opacity-40 uppercase tracking-widest font-bold relative z-10">
                            <span>0%</span>
                            <span className="flex items-center">
                                <Users className="w-2.5 h-2.5 mr-1" />
                                Goal scaled for {teamProgress.activeUsers < 5 ? '5' : teamProgress.activeUsers} runners
                            </span>
                            <span>100%</span>
                        </div>
                     </div>
                )}
            </div>

            <div className="relative z-10 p-5 md:p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l md:min-w-[280px]"
                 style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}>
                {/* Countdown Rings */}
                <div className="flex gap-3 mb-4">
                    <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center shadow-inner" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <span className="text-2xl font-bold text-white">{timeLeft.days}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Days</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center shadow-inner" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <span className="text-2xl font-bold text-white">{timeLeft.hrs}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Hrs</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center shadow-inner" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <span className="text-2xl font-bold text-white">{timeLeft.min}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Min</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center shadow-inner" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            <span className="text-2xl font-bold text-white">{timeLeft.sec}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Sec</span>
                    </div>
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
