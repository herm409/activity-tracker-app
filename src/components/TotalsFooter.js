import React, { useState } from 'react';
import { Target, Users, BarChart2, PhoneCall, UserCheck, Info, Edit2, X, Share2, Minus, Plus, Flame, Trophy } from 'lucide-react';
import { WEEKS_IN_MONTH } from '../utils/helpers';

const TotalsFooter = ({ totals, onShare, isSharing, streaks, goals, onGoalChange, userProfile, onQuickAdd, showGoalInstruction, onDismissGoalInstruction }) => {
    const [editingGoal, setEditingGoal] = useState(null);
    const longestStreaks = userProfile.longestStreaks || {};
    const metrics = [
        { key: 'exposures', label: 'Total Exposures', value: totals.exposures, icon: Target, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', value: totals.followUps, icon: Users, color: 'green' },
        { key: 'presentations', label: 'Presentations', value: totals.presentations, icon: BarChart2, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: totals.threeWays, icon: PhoneCall, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', value: totals.enrolls, icon: UserCheck, color: 'teal' }
    ];
    const handleGoalEdit = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            onGoalChange(editingGoal, e.target.value);
            setEditingGoal(null);
        }
    };

    const streakStyles = {
        active: {
            text: 'text-gray-700',
            flame: 'text-amber-500'
        },
        inactive: {
            text: 'text-gray-500',
            flame: 'text-gray-400'
        }
    };

    return (
        <div className="mt-6 pt-5 border-t border-gray-200">
            {showGoalInstruction && (
                <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start space-x-3">
                    <Info className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-800">Set your monthly goals!</p>
                        <p className="text-sm text-indigo-700 mt-1">Click the <Edit2 className="h-3 w-3 inline-block mx-1" /> icon next to "Goal" on any card below to set your targets for the month.</p>
                    </div>
                    <button onClick={onDismissGoalInstruction} className="text-indigo-500 hover:text-indigo-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            )}
            <div className="flex justify-end mb-4">
                <button onClick={onShare} disabled={isSharing} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition text-sm disabled:bg-indigo-400 disabled:cursor-wait">
                    <Share2 className="h-4 w-4 mr-2" /> {isSharing ? 'Generating...' : 'Share Weekly Report'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map(metric => {
                    const goal = goals[metric.key] || 0;
                    const progress = goal > 0 ? (metric.value / goal) * 100 : 0;
                    const weeklyPace = Math.ceil(goal / WEEKS_IN_MONTH);
                    const currentStreak = streaks[metric.key] || 0;
                    const longestStreak = longestStreaks[metric.key] || 0;
                    const streakStyle = currentStreak > 0 ? streakStyles.active : streakStyles.inactive;

                    return (
                        <div key={metric.key} className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className={`text-sm sm:text-md font-semibold text-gray-600`}>{metric.label}</h4>
                                    <div className="flex items-center mt-1">
                                        {metric.key !== 'presentations' ? (
                                            <div className="flex items-center space-x-3">
                                                <button onClick={() => onQuickAdd(metric.key, -1)} className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <p className={`text-4xl sm:text-5xl font-bold text-gray-900 text-center w-14`}>{metric.value}</p>
                                                <button onClick={() => onQuickAdd(metric.key, 1)} className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className={`text-4xl sm:text-5xl font-bold text-gray-900`}>{metric.value}</p>
                                        )}
                                    </div>
                                </div>
                                <metric.icon className={`h-8 w-8 text-${metric.color}-400`} />
                            </div>
                            <div className="mt-4 flex space-x-4">
                                <div className={`flex items-center text-xs ${streakStyle.text}`}>
                                    <Flame className={`h-4 w-4 mr-1 ${streakStyle.flame}`} />
                                    <span>Current: <strong>{currentStreak}</strong></span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                    <Trophy className="h-4 w-4 mr-1 text-gray-400" />
                                    <span>Longest: <strong>{longestStreak}</strong></span>
                                </div>
                            </div>
                            <div className="mt-auto pt-4">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span onClick={() => setEditingGoal(metric.key)} className="cursor-pointer hover:text-indigo-600">
                                        Goal: {editingGoal === metric.key ?
                                            <input type="number" defaultValue={goal} onKeyDown={handleGoalEdit} onBlur={handleGoalEdit} autoFocus className="w-12 text-center bg-gray-100 rounded" /> : <span>{goal} <Edit2 className="h-3 w-3 inline-block ml-1" /></span>
                                        }
                                    </span>
                                    {goal > 0 && <span className="font-semibold">(~{weeklyPace}/wk)</span>}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2"><div className={`bg-${metric.color}-500 h-2.5 rounded-full`} style={{ width: `${Math.min(progress, 100)}%` }}></div></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default TotalsFooter;
