import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { calculatePoints, WEIGHTS } from '../utils/scoring';
import { ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import { DayEntryModal } from './GlobalModals';
import TotalsFooter from './TotalsFooter';

const ActivityTracker = ({ date, setDate, goals, onGoalChange, data, onDataChange, onShare, isSharing, user, userProfile, onQuickAdd, showGoalInstruction, onDismissGoalInstruction, streaks, dailyPar, onShowLegend }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const [viewMode, setViewMode] = useState('week');
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthYearId = `${year}-${String(month + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(date);
    lastMonthDate.setMonth(date.getMonth() - 1);
    const lastMonthYearId = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const changeMonth = (offset) => { const newDate = new Date(date); newDate.setMonth(date.getMonth() + offset); setDate(newDate); };
    const changeWeek = (offset) => { const newDate = new Date(date); newDate.setDate(date.getDate() + (7 * offset)); setDate(newDate); };

    const weekDisplayDays = useMemo(() => {
        const today = new Date();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startOfWeek);
            currentDay.setDate(startOfWeek.getDate() + i);
            const dataSet = currentDay.getMonth() === date.getMonth() ? data.current : data.last;
            const dayData = dataSet ? (dataSet[currentDay.getDate()] || {}) : {};

            const isPast = currentDay < today && today.toDateString() !== currentDay.toDateString();
            const noActivity = !dayData || ((Number(dayData.exposures || 0) === 0) && (Number(dayData.followUps || 0) === 0) && ((dayData.presentations?.length || 0) + (Number(dayData.pbrs) || 0) === 0));
            const isToday = today.toDateString() === currentDay.toDateString();
            const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;

            days.push({ date: currentDay, day: currentDay.getDate(), data: dayData, hasNoActivity: isPast && noActivity, isBlank: false, isToday, isWeekend });
        }
        return days;
    }, [date, data]);

    const calendarDays = useMemo(() => {
        const today = new Date();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) { days.push({ isBlank: true, day: `blank-${i}` }); }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDateObj = new Date(year, month, day);
            const dayData = data.current[day] || {};
            const isTodayFlag = today.toDateString() === currentDateObj.toDateString();
            const isPast = currentDateObj < today && !isTodayFlag;
            const noActivity = Object.keys(dayData).filter(k => k !== 'exerc' && k !== 'read' && k !== 'pbrs').length === 0 || (Number(dayData.exposures || 0) === 0 && Number(dayData.followUps || 0) === 0 && (dayData.presentations || []).length === 0 && (Number(dayData.pbrs) || 0) === 0);
            const dayOfWeek = currentDateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            days.push({ day, date: currentDateObj, isBlank: false, data: dayData, hasNoActivity: isPast && noActivity, isToday: isTodayFlag, isWeekend });
        }
        return days;
    }, [year, month, data]);

    const monthlyTotals = useMemo(() => {
        return Object.values(data.current).reduce((acc, dayData) => {
            acc.exposures += Number(dayData.exposures) || 0;
            acc.followUps += Number(dayData.followUps) || 0;
            acc.presentations += (dayData.presentations?.length || 0) + (Number(dayData.pbrs) || 0);
            acc.threeWays += Number(dayData.threeWays) || 0;
            acc.enrolls += (Number(dayData.enrolls) || 0) + (Array.isArray(dayData.sitdowns) ? dayData.sitdowns.filter(s => s === 'E').length : 0);
            return acc;
        }, { exposures: 0, followUps: 0, presentations: 0, threeWays: 0, enrolls: 0 });
    }, [data]);

    const handleDayClick = (dayObj) => {
        if (dayObj.isBlank) return;
        setSelectedDay(dayObj.date);
    };
    const closeModal = () => setSelectedDay(null);
    const handleModalDataChange = (field, value) => onDataChange(selectedDay, field, value);

    const activityColors = { exposures: 'bg-blue-500', followUps: 'bg-green-500', presentations: 'bg-purple-500', threeWays: 'bg-pink-500', enrolls: 'bg-teal-500' };

    // Par Protocol: Weekly Score Calculation
    const weeklyStats = useMemo(() => {
        if (viewMode !== 'week') return { score: 0, points: 0 };
        let score = 0;
        let points = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        weekDisplayDays.forEach(dayObj => {
            // Only count days up to today
            if (dayObj.date <= today) {
                const totalPoints = calculatePoints(dayObj.data);
                points += totalPoints;
                const parVal = dailyPar || 2;
                const dailyScore = parVal - totalPoints;
                score += dailyScore;
            }
        });
        return { score, points };
    }, [weekDisplayDays, viewMode, dailyPar]);

    const weeklyScore = weeklyStats.score; // Backward compatibility with render logic below if needed, or update render

    let modalData = {};
    if (selectedDay) {
        const targetMonthId = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}`;
        const dataSet = targetMonthId === monthYearId ? data.current : (targetMonthId === lastMonthYearId ? data.last : {});
        modalData = dataSet[selectedDay.getDate()] || {};
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm relative">
            {/* Par Protocol: Weekly Scorecard Sticky Header */}
            {viewMode === 'week' && (
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b mb-4 pb-2 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide block sm:inline">Weekly Par Status</span>
                            <span className="text-xs text-gray-400 font-medium sm:ml-2">({weeklyStats.points} Pts)</span>
                            {onShowLegend && <button onClick={onShowLegend} className="ml-2 text-gray-400 hover:text-indigo-600"><HelpCircle className="h-4 w-4" /></button>}
                        </div>
                        <div className={`flex items-center font-bold text-lg ${weeklyScore > 0 ? 'text-red-600' : (weeklyScore < 0 ? 'text-green-600' : 'text-blue-600')}`}>
                            {weeklyScore > 0 ? `+${weeklyScore} (Deficit)` : (weeklyScore < 0 ? `${weeklyScore} (Surplus)` : `E (Even)`)}
                        </div>
                    </div>
                    {weeklyScore > 0 && (
                        <div className="mt-2 text-xs bg-red-50 border border-red-100 text-red-700 p-2 rounded-md flex items-start animate-pulse">
                            <span className="font-semibold mr-1">To get back on Par:</span>
                            <span>
                                {Math.ceil(weeklyScore / WEIGHTS.enrolls)} Member{Math.ceil(weeklyScore / WEIGHTS.enrolls) > 1 ? 's' : ''} OR {Math.ceil(weeklyScore / WEIGHTS.presentations)} Presentation{Math.ceil(weeklyScore / WEIGHTS.presentations) > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div className="flex items-center mb-4 sm:mb-0">
                    <button onClick={() => viewMode === 'week' ? changeWeek(-1) : changeMonth(-1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronDown className="h-5 w-5 rotate-90" /></button>
                    <h2 className="text-xl sm:text-2xl font-semibold w-40 sm:w-56 text-center">
                        {viewMode === 'week'
                            ? `${weekDisplayDays[0].date.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekDisplayDays[6].date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
                            : date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => viewMode === 'week' ? changeWeek(1) : changeMonth(1)} className="p-2 rounded-md hover:bg-gray-100"><ChevronUp className="h-5 w-5 rotate-90" /></button>
                </div>
                <button onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')} className="text-sm bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition">
                    {viewMode === 'week' ? 'View Month' : 'View Week'}
                </button>
            </div>
            {
                viewMode === 'week' ? (
                    <div className="mb-6">
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={weekDisplayDays.map(d => {
                                        const dayData = d.isFuture ? null : (data.current[d.date.getDate()] || {});
                                        const totalPoints = calculatePoints(dayData);
                                        const parVal = dailyPar || 2;
                                        // Logic: Score = Par - Points.
                                        // +2 means we needed 2 more (Deficit -> Bad -> Red)
                                        // -2 means we had 2 extra (Surplus -> Good -> Green)
                                        // 0 means Even (Neutral)
                                        const score = d.isFuture ? 0 : (parVal - totalPoints);
                                        return {
                                            name: d.date.toLocaleDateString('default', { weekday: 'short' }),
                                            score: score,
                                            isFuture: d.isFuture
                                        };
                                    })}
                                    margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
                                >
                                    <ReferenceLine y={0} stroke="#374151" strokeWidth={2} label={{ value: "PAR", position: 'right', fill: '#374151', fontSize: 10 }} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                if (data.isFuture) return null;
                                                return (
                                                    <div className="bg-white p-2 border rounded shadow-sm text-xs">
                                                        <p className="font-semibold">{data.name}</p>
                                                        <p className={data.score > 0 ? 'text-red-600' : (data.score < 0 ? 'text-green-600' : 'text-blue-600')}>
                                                            {data.score > 0 ? `+${data.score} (Deficit)` : (data.score < 0 ? `${data.score} (Surplus)` : 'Even')}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="score" radius={[4, 4, 4, 4]}>
                                        {weekDisplayDays.map((d, index) => {
                                            const dayData = d.isFuture ? null : (data.current[d.date.getDate()] || {});
                                            const totalPoints = calculatePoints(dayData);
                                            const parVal = dailyPar || 2;
                                            const score = d.isFuture ? 0 : (parVal - totalPoints);
                                            let fillColor = '#e5e7eb'; // gray-200 for even/future (neutral)

                                            if (!d.isFuture) {
                                                if (score > 0) fillColor = '#ef4444'; // red-500
                                                else if (score < 0) fillColor = '#22c55e'; // green-500
                                                else if (totalPoints > 0) fillColor = '#3b82f6'; // blue-500 for Even with activity? Or just gray? Let's use blue if they hit par exactly.
                                                else fillColor = '#e5e7eb'; // 0 activity chart representation? 
                                                // If score is 0 (Par - Points = 0 -> Points = Par), that's good.
                                                // Ideally "Even Par" is good.
                                                // Wait, if score is 0, the bar has 0 height, so it won't show.
                                                // This is an issue with "Zero Line" charts for exact matches.
                                            }
                                            return <Cell key={`cell-${index}`} fill={fillColor} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : null
            }

            {
                viewMode === 'week' ? (
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {weekDisplayDays.map(d => {
                            const dayClasses = `cursor-pointer hover:bg-indigo-50 p-2 rounded-lg border flex flex-col items-center justify-between aspect-square ${d.isToday ? 'border-2 border-indigo-500' : ''} ${d.isWeekend ? 'bg-gray-50' : ''}`;
                            return (
                                <div key={d.date.toISOString()} onClick={() => handleDayClick(d)} className={dayClasses}>
                                    <div className="text-xs text-gray-500">{d.date.toLocaleDateString('default', { weekday: 'short' })}</div>
                                    <div className={`font-semibold text-lg ${d.hasNoActivity ? 'text-red-500' : ''}`}>{d.day}</div>
                                    <div className="flex justify-center items-center space-x-1 h-2">
                                        {d.data.exposures > 0 && <div className={`h-2 w-2 ${activityColors.exposures} rounded-full`}></div>}
                                        {d.data.followUps > 0 && <div className={`h-2 w-2 ${activityColors.followUps} rounded-full`}></div>}
                                        {((d.data.presentations?.length || 0) + (Number(d.data.pbrs) || 0)) > 0 && <div className={`h-2 w-2 ${activityColors.presentations} rounded-full`}></div>}
                                        {(d.data.enrolls > 0 || d.data.sitdowns?.some(s => s === 'E')) && <div className={`h-2 w-2 ${activityColors.enrolls} rounded-full`}></div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`${day}-${index}`} className="text-center font-semibold text-xs text-gray-500 py-2">{day}</div>)}
                        {calendarDays.map((d, index) => {
                            const dayClasses = `border rounded-md aspect-square p-1 sm:p-2 flex flex-col ${d.isBlank ? 'bg-transparent border-transparent' : 'cursor-pointer hover:bg-indigo-50'
                                } ${d.isToday ? 'border-2 border-indigo-500' : ''} ${d.isWeekend && !d.isBlank ? 'bg-gray-50' : ''}`;

                            return (
                                <div key={d.day || `blank-${index}`} onClick={() => handleDayClick(d)} className={dayClasses}>
                                    {!d.isBlank && (
                                        <>
                                            <span className={`font-medium text-xs sm:text-sm ${d.hasNoActivity ? 'text-red-500' : ''}`}>{d.day}</span>
                                            <div className="flex justify-center items-end space-x-1 mt-auto h-2">
                                                {d.data.exposures > 0 && <div className={`h-2 w-2 ${activityColors.exposures} rounded-full`}></div>}
                                                {d.data.followUps > 0 && <div className={`h-2 w-2 ${activityColors.followUps} rounded-full`}></div>}
                                                {((d.data.presentations?.length || 0) + (Number(d.data.pbrs) || 0)) > 0 && <div className={`h-2 w-2 ${activityColors.presentations} rounded-full`}></div>}
                                                {(d.data.enrolls > 0 || d.data.sitdowns?.some(s => s === 'E')) && <div className={`h-2 w-2 ${activityColors.enrolls} rounded-full`}></div>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )
            }
            <TotalsFooter totals={monthlyTotals} onShare={onShare} isSharing={isSharing} streaks={streaks} goals={goals} onGoalChange={onGoalChange} userProfile={userProfile} onQuickAdd={onQuickAdd} showGoalInstruction={showGoalInstruction} onDismissGoalInstruction={onDismissGoalInstruction} />
            {selectedDay && <DayEntryModal day={selectedDay.getDate()} data={modalData} onClose={closeModal} onChange={handleModalDataChange} />}
        </div >
    );
};

export default ActivityTracker;
