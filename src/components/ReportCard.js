import React, { forwardRef } from 'react';
import { Trophy, Calendar, User, TrendingUp, Users, Video, Award } from 'lucide-react';

const ReportCard = forwardRef(({ profile, weekData, goals }, ref) => {
    // Check if weekData exists before destructuring
    if (!weekData) {
        return <div ref={ref}>Loading data...</div>;
    }

    const { totals, lastWeekTotals, dateRange, activeInPipeline, newMembersThisWeek } = weekData;

    // Scoreboard Metrics Configuration
    const scoreboard = [
        { label: 'Exposures', value: totals.exposures, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Presentations', value: totals.presentations, icon: Video, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Follow Ups', value: totals.followUps, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'New Members', value: totals.enrolls, icon: Award, color: 'text-green-600', bg: 'bg-green-50' }
    ];

    return (
        <div ref={ref} className="bg-white p-8 font-sans border border-gray-200 rounded-xl shadow-lg" style={{ width: '400px', height: '750px' }}>
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full shadow-lg mb-4">
                    <Trophy className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Weekly Scoreboard</h1>
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

            {/* Pipeline Summary */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-center">Pipeline Health</h3>
                <div className="flex justify-center items-center px-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">{activeInPipeline}</p>
                        <p className="text-[10px] text-gray-500">Active Pipeline</p>
                    </div>
                </div>
            </div>

            {/* Footer / Branding */}
            <div className="mt-auto text-center border-t border-gray-100 pt-6">
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">POWERED BY PLATINUM TOOLKIT</p>
            </div>
        </div>
    );
});

export default ReportCard;
