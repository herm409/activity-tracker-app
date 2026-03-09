import React from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Dumbbell, BookOpen, Share2, HelpCircle, XCircle, Flame } from 'lucide-react';
import { ActivityCard, PresentationActivityCard, DisciplineCheckbox } from './ActivityCards';
import { calculatePoints } from '../utils/scoring';

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, onShareMonthly, isSharing, onLogFollowUp, onLogExposure, dailyPar, onShowLegend }) => {
    const today = new Date();
    const todayData = monthlyData[today.getDate()] || {};

    const metrics = [
        { key: 'exposures', label: 'Exposures', icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', icon: Users, color: 'green' },
        { key: 'nos', label: 'Definitive No\'s', icon: XCircle, color: 'red' },
        { key: 'presentations', label: 'Presentations', icon: BarChart2, color: 'purple', isPresentation: true },
        { key: 'threeWays', label: '3-Way Calls', icon: PhoneCall, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', icon: UserCheck, color: 'teal' }
    ];

    const disciplines = [
        { key: 'exerc', label: 'Exercise', icon: Dumbbell },
        { key: 'personalDevelopment', label: 'Personal Development', icon: BookOpen },
    ];

    const currentPar = dailyPar || 2;

    // Calculate Ironman Progress
    const ironmanProgress = [
        { label: 'Exposures', done: (Number(todayData.exposures) || 0) > 0 },
        { label: 'Follow Ups', done: ((Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0)) > 0 },
        { label: 'No\'s', done: (Number(todayData.nos) || 0) > 0 },
        { label: 'Presentations', done: ((todayData.presentations?.length || 0) + (Number(todayData.pbrs) || 0)) > 0 },
        { label: '3-Ways', done: (Number(todayData.threeWays) || 0) > 0 },
        { label: 'Exercise', done: !!todayData.exerc },
        { label: 'Personal Dev', done: !!(todayData.personalDevelopment || todayData.read || todayData.audio) },
    ];
    const ironmanCompleted = ironmanProgress.filter(i => i.done).length;
    const isIronman = ironmanCompleted === 7;

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
                        <button
                            onClick={onShareMonthly}
                            disabled={isSharing}
                            className="flex items-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm disabled:bg-green-400 disabled:cursor-wait justify-center"
                        >
                            <Share2 className="h-4 w-4 mr-2" /> Share Monthly
                        </button>
                        <button
                            onClick={onShare}
                            disabled={isSharing}
                            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm disabled:bg-indigo-400 disabled:cursor-wait justify-center"
                        >
                            <Share2 className="h-4 w-4 mr-2" /> {isSharing ? 'Generating...' : 'Share Weekly'}
                        </button>
                    </div>
                </div>

                {/* Ironman Tracker */}
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
                                {isIronman ? "You crushed it! Full cycle complete." : `Complete all 7 core activities for a +15 pt bonus. (${ironmanCompleted}/7)`}
                            </p>
                        </div>
                    </div>
                    <div className="flex space-x-2 w-full md:w-auto justify-center">
                        {ironmanProgress.map((item, idx) => (
                            <div
                                key={idx}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all cursor-help ${item.done ? 'bg-green-500 border-green-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-400'}`}
                                title={item.label}
                            >
                                {item.label.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.map(metric => {
                        if (metric.isPresentation) {
                            const value = (todayData.presentations?.length || 0) + (Number(todayData.pbrs) || 0);
                            return (
                                <PresentationActivityCard
                                    key={metric.key}
                                    label={metric.label}
                                    value={value}
                                    streak={streaks.presentations || 0}
                                    icon={metric.icon}
                                    color={metric.color}
                                    onAddPresentation={onAddPresentation}
                                />
                            );
                        }

                        let rawValue = Number(todayData[metric.key]) || 0;
                        if (metric.key === 'followUps') {
                            rawValue = (Number(todayData.followUps) || 0) + (Number(todayData.tenacityFollowUps) || 0);
                        }
                        let displayValue = rawValue;

                        let onIncrement;
                        if (metric.key === 'followUps') {
                            onIncrement = onLogFollowUp;
                        } else if (metric.key === 'exposures') {
                            onIncrement = onLogExposure;
                        } else if (metric.key === 'nos') {
                            onIncrement = () => {
                                const confirm = window.confirm("A true 'No' only counts after they've seen the information. Did this prospect evaluate a presentation or video?");
                                if (confirm) onQuickAdd(metric.key, 1);
                            };
                        } else {
                            onIncrement = () => onQuickAdd(metric.key, 1);
                        }

                        // Par Protocol: Exposures Card becomes "Daily Par Status"
                        const isDeficitMode = metric.key === 'exposures';
                        let tooltipContent = null;

                        if (isDeficitMode) {
                            // Use Weighted Points for the "Score" display
                            displayValue = calculatePoints(todayData);

                            // Calculate breakdown for tooltip
                            const ptsEnrolls = ((Number(todayData.enrolls) || 0) + (Array.isArray(todayData.sitdowns) ? todayData.sitdowns.filter(s => s === 'E').length : 0)) * 5;
                            const ptsPres = ((todayData.presentations?.length || 0) + (Number(todayData.pbrs) || 0)) * 3 + (Number(todayData.threeWays) || 0) * 3;
                            const ptsActivity = (Number(todayData.exposures) || 0) * 1 + (Number(todayData.followUps) || 0) * 1 + (Number(todayData.nos) || 0) * 1 + (Number(todayData.tenacityFollowUps) || 0) * 2;

                            tooltipContent = (
                                <div className="space-y-1">
                                    <div className="flex justify-between border-b border-gray-700 pb-1 mb-1">
                                        <span>Total Base Par:</span>
                                        <span className="font-bold">{calculatePoints(todayData)} pts</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Exposures / Follow-Ups / No's:</span>
                                        <span>{ptsActivity} pts</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Presentations / 3-Ways:</span>
                                        <span>{ptsPres} pts</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Enrolls:</span>
                                        <span>{ptsEnrolls} pts</span>
                                    </div>
                                    <div className="border-t border-gray-700 pt-1 mt-1 font-bold flex justify-between">
                                        <span>Current Par:</span>
                                        <span>{currentPar - displayValue > 0 ? `+${currentPar - displayValue}` : (currentPar - displayValue)}</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <ActivityCard
                                key={metric.key}
                                label={isDeficitMode ? "Exposures (Par Status)" : metric.label} // Rename card
                                value={displayValue}
                                streak={streaks[metric.key] || 0}
                                icon={metric.icon}
                                color={metric.color}
                                onIncrement={onIncrement}
                                onDecrement={() => onQuickAdd(metric.key, -1)}
                                isDeficitMode={isDeficitMode}
                                par={currentPar}
                                tooltip={tooltipContent}
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
                        if (discipline.key === 'personalDevelopment') {
                            isChecked = !!(todayData.personalDevelopment || todayData.read || todayData.audio);
                        }
                        return (
                            <DisciplineCheckbox
                                key={discipline.key}
                                label={discipline.label}
                                icon={discipline.icon}
                                isChecked={isChecked}
                                onChange={(e) => onHabitChange(today, discipline.key, e.target.checked)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TodayDashboard;
