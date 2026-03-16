import React, { forwardRef } from 'react';
import { Trophy, Calendar, TrendingUp, Users, Video, Award, XCircle, PhoneCall } from 'lucide-react';
import { getPeriodicCoachingAdvice } from '../utils/scoring';

const ReportCard = forwardRef(({ profile, weekData, goals }, ref) => {
    // Check if weekData exists before destructuring
    if (!weekData) {
        return <div ref={ref}>Loading data...</div>;
    }

    const { totals, dateRange, reportTitle, elapsedDays = 5 } = weekData;

    // Scoreboard Metrics Configuration
    const scoreboard = [
        { label: 'Exposures', value: totals.exposures, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Presentations', value: totals.presentations, icon: Video, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Follow Ups', value: totals.followUps, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: '3-Way Calls', value: totals.threeWays, icon: PhoneCall, color: 'text-pink-600', bg: 'bg-pink-50' },
        { label: 'Definitive No\'s', value: totals.nos, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'New Members', value: totals.enrolls, icon: Award, color: 'text-green-600', bg: 'bg-green-50' }
    ];

    const timeframe = reportTitle?.includes('Monthly') ? 'month' : 'week';
    const insight = getPeriodicCoachingAdvice(totals, timeframe, elapsedDays, 5);


    // Reverted back to 800px standard height since Pipeline summary is removed to make space for Coaching
    const cardHeight = '800px';

    return (
        <div ref={ref} className="bg-white p-8 font-sans border border-gray-200 rounded-xl shadow-lg flex flex-col" style={{ width: '400px', height: cardHeight }}>
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full shadow-lg mb-4">
                    <Trophy className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{reportTitle || 'Weekly Scoreboard'}</h1>
                <p className="text-indigo-600 font-semibold mt-1">{profile.displayName || 'Top Performer'}</p>
                <div className="flex items-center text-xs text-gray-400 mt-2 bg-gray-100 px-3 py-1 rounded-full">
                    <Calendar className="h-3 w-3 mr-1" />
                    {dateRange}
                </div>
            </div>

            {/* Main Scoreboard Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {scoreboard.map((stat, idx) => (
                    <div key={idx} className={`${stat.bg} p-4 rounded-xl flex flex-col items-center justify-center border border-gray-100 text-center`}>
                        <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
                        <span className="text-3xl font-black text-gray-800">{stat.value}</span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                    </div>
                ))}
            </div>


            {/* Coach's Note */}
            <div className={`${insight.bg} rounded-xl p-4 mb-4 border border-opacity-50 flex items-start`} style={{ borderColor: insight.color.replace('text-', 'border-') }}>
                <span className={`text-3xl font-black mr-3 ${insight.color}`}>{insight.grade}</span>
                <div>
                    <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${insight.color}`}>Coach's Note</h3>
                    <p className={`text-xs ${insight.color} leading-tight`}>{insight.message}</p>
                </div>
            </div>

            {/* Footer / Branding */}
            <div className="mt-auto text-center border-t border-gray-100 pt-4">
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">POWERED BY PLATINUM TOOLKIT</p>
            </div>
        </div>
    );
});

export default ReportCard;
