import React from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Dumbbell, BookOpen, Share2, HelpCircle } from 'lucide-react';
import { ActivityCard, PresentationActivityCard, DisciplineCheckbox } from './ActivityCards';
import { calculatePoints } from '../utils/scoring';

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, onShareMonthly, isSharing, onLogFollowUp, onLogExposure, dailyPar, onShowLegend }) => {
    const today = new Date();
    const todayData = monthlyData[today.getDate()] || {};

    const metrics = [
        { key: 'exposures', label: 'Exposures', icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', icon: Users, color: 'green' },
        { key: 'presentations', label: 'Presentations', icon: BarChart2, color: 'purple', isPresentation: true },
        { key: 'threeWays', label: '3-Way Calls', icon: PhoneCall, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', icon: UserCheck, color: 'teal' }
    ];

    const disciplines = [
        { key: 'exerc', label: 'Exercise', icon: Dumbbell },
        { key: 'personalDevelopment', label: 'Personal Development', icon: BookOpen },
    ];

    const currentPar = dailyPar || 2;

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

                        const rawValue = Number(todayData[metric.key]) || 0;
                        let displayValue = rawValue;

                        let onIncrement;
                        if (metric.key === 'followUps') {
                            onIncrement = onLogFollowUp;
                        } else if (metric.key === 'exposures') {
                            onIncrement = onLogExposure;
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
                            const ptsActivity = (Number(todayData.exposures) || 0) * 1 + (Number(todayData.followUps) || 0) * 1;

                            tooltipContent = (
                                <div className="space-y-1">
                                    <div className="font-bold border-b border-gray-700 pb-1 mb-1">Score Breakdown</div>
                                    <div className="flex justify-between"><span>Start Debt:</span> <span>{currentPar}</span></div>
                                    <div className="flex justify-between text-green-400"><span>- Enrolls:</span> <span>{ptsEnrolls}</span></div>
                                    <div className="flex justify-between text-purple-400"><span>- Pres/3Way:</span> <span>{ptsPres}</span></div>
                                    <div className="flex justify-between text-blue-400"><span>- Exp/Follow:</span> <span>{ptsActivity}</span></div>
                                    <div className="border-t border-gray-700 pt-1 mt-1 font-bold flex justify-between">
                                        <span>Current:</span>
                                        <span>{currentPar - displayValue > 0 ? `+${currentPar - displayValue}` : (currentPar - displayValue)}</span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <ActivityCard
                                key={metric.key}
                                label={isDeficitMode ? "Daily Par Status" : metric.label} // Rename card
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
