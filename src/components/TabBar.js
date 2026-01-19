import React from 'react';
import { Sun, Calendar, Users, Trophy, List, BarChart2 } from 'lucide-react';

const TabBar = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'today', name: 'Today', icon: Sun },
        { id: 'tracker', name: 'Calendar', icon: Calendar },
        { id: 'team', name: 'Team', icon: Users, isBeta: true },
        { id: 'leaderboard', name: 'Leaderboard', icon: Trophy },
        { id: 'hotlist', name: 'Prospect Pipeline', icon: List },
        { id: 'analytics', name: 'Analytics', icon: BarChart2 }
    ];
    return (
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 sm:py-4 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <tab.icon className="mr-2 h-5 w-5" />
                        {tab.name}
                        {tab.isBeta && <span className="ml-2 text-xs font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">BETA</span>}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default TabBar;
