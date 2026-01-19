import React, { forwardRef } from 'react';

const ReportCard = forwardRef(({ profile, weekData, goals }, ref) => {
    // Check if weekData exists before destructuring
    if (!weekData) {
        return <div ref={ref}>Loading data...</div>;
    }

    const { totals, lastWeekTotals, dateRange, activeInPipeline, closingZone, newMembersThisWeek } = weekData;

    const metrics = [
        { key: 'exposures', label: 'Exposures', value: totals.exposures, lastWeek: lastWeekTotals?.exposures || 0, color: 'indigo' },
        { key: 'followUps', label: 'Follow Ups', value: totals.followUps, lastWeek: lastWeekTotals?.followUps || 0, color: 'green' },
        { key: 'presentations', label: 'Presentations', value: totals.presentations, lastWeek: lastWeekTotals?.presentations || 0, color: 'purple' },
        { key: 'threeWays', label: '3-Way Calls', value: totals.threeWays, lastWeek: lastWeekTotals?.threeWays || 0, color: 'pink' },
        { key: 'enrolls', label: 'Memberships Sold', value: totals.enrolls, lastWeek: lastWeekTotals?.enrolls || 0, color: 'teal' },
    ];

    const pipelineMetrics = [
        { label: 'Active in Pipeline', value: activeInPipeline },
        { label: 'New Members This Week', value: newMembersThisWeek }
    ];

    return (
        <div ref={ref} className="bg-white p-6 font-sans border border-gray-200 rounded-lg shadow-md" style={{ width: '450px' }}>
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Weekly Activity Report</h1>
                <p className="text-md text-gray-600">{profile.displayName || 'User'}</p>
                <p className="text-sm text-gray-500 font-medium">{dateRange}</p>
            </div>

            <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-gray-700 border-b pb-2">This Week's Activity</h3>
                {metrics.map(metric => (
                    <div key={metric.key}>
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-semibold text-gray-600">{metric.label}</h4>
                            <div className="text-right">
                                <p className="font-bold text-xl text-gray-800">{metric.value}</p>
                                <p className="text-xs text-gray-400">Last Week: {metric.lastWeek}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Prospect Pipeline</h3>
                {pipelineMetrics.map(metric => (
                    <div key={metric.label} className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-600">{metric.label}</h4>
                        <p className="font-bold text-xl text-gray-800">{metric.value}</p>
                    </div>
                ))}
            </div>

            <div>
                <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Closing Zone (Hot Prospects)</h3>
                {closingZone && closingZone.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-2">
                        {closingZone.map((item, index) => (
                            <li key={item.id} className="flex justify-between items-center border-b border-gray-100 py-1">
                                <span>{index + 1}. {item.name}</span>
                                <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                    {item.exposureCount || 0} exposures
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No prospects in the closing zone.</p>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                <p>&copy; 2025 Platinum Toolkit. All Rights Reserved.</p>
                <p>Unauthorized duplication or distribution is strictly prohibited.</p>
            </div>
        </div>
    );
});

export default ReportCard;
