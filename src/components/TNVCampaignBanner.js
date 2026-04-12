import React, { useState, useEffect } from 'react';
import { ExternalLink, Target } from 'lucide-react';

const TNVCampaignBanner = () => {
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

    if (isPast) return null;

    // Calculate sprint week (April 17 start = Week 1)
    const START_DATE = new Date('2026-04-17T00:00:00');
    const now = new Date();
    let currentWeek = 0;
    if (now >= START_DATE) {
        const daysSinceStart = Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
        currentWeek = Math.floor(daysSinceStart / 7) + 1;
    }

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

                {/* Optional Sprint Tracking (only shows if past April 17) */}
                {currentWeek > 0 && currentWeek <= 13 && (
                     <div className="mt-3 flex items-center">
                        <div 
                            className="px-2 py-0.5 rounded text-xs font-bold border uppercase bg-opacity-20 border-opacity-30"
                            style={{ 
                                color: '#4cbce4', 
                                backgroundColor: 'rgba(76, 188, 228, 0.2)',
                                borderColor: 'rgba(76, 188, 228, 0.3)'
                            }}
                        >
                            Sprint Week {currentWeek} of 13
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
