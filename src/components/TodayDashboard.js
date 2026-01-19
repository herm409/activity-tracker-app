import React from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Dumbbell, BookOpen, Share2 } from 'lucide-react';
import { ActivityCard, PresentationActivityCard, DisciplineCheckbox } from './ActivityCards';

const TodayDashboard = ({ monthlyData, streaks, onQuickAdd, onHabitChange, onAddPresentation, onShare, isSharing, onLogFollowUp, onLogExposure }) => {
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

    return (
        <div className="space-y-8">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-1">Today's Focus</h2>
                        <p className="text-gray-500">Log your key business activities for {today.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
                    </div>
                    <button
                        onClick={onShare}
                        disabled={isSharing}
                        className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm disabled:bg-indigo-400 disabled:cursor-wait mt-3 sm:mt-0 w-full sm:w-auto justify-center"
                    >
                        <Share2 className="h-4 w-4 mr-2" /> {isSharing ? 'Generating...' : 'Share Weekly Report'}
                    </button>
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
                        const value = Number(todayData[metric.key]) || 0;

                        let onIncrement;
                        if (metric.key === 'followUps') {
                            onIncrement = onLogFollowUp;
                        } else if (metric.key === 'exposures') {
                            onIncrement = onLogExposure;
                        } else {
                            onIncrement = () => onQuickAdd(metric.key, 1);
                        }

                        return (
                            <ActivityCard
                                key={metric.key}
                                label={metric.label}
                                value={value}
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
