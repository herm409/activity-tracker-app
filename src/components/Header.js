import React from 'react';
import { Edit2, LogOut, BookOpen } from 'lucide-react';

const planBadgeClass = (plan) => {
    const p = String(plan || 'FREE').toUpperCase();
    if (p === 'PLATINUM') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (p === 'PRO') return 'bg-violet-100 text-violet-800 border-violet-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
};

const Header = ({ displayName, plan = 'FREE', onSignOut, onEditName }) => (
    <header className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
        <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{displayName}</h1>
            <button onClick={onEditName} className="text-gray-400 hover:text-gray-600" type="button">
                <Edit2 className="h-4 w-4" />
            </button>
            <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${planBadgeClass(plan)}`}
                title="Membership plan from Team NuVision"
            >
                {String(plan || 'FREE').toUpperCase()}
            </span>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
            <a
                href="https://text.wearetnv.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                title="Text Wizard Scripts"
            >
                <BookOpen className="h-4 w-4 sm:mr-1.5" />{' '}
                <span className="hidden sm:inline">Text Wizard</span>
            </a>
            <button
                type="button"
                onClick={onSignOut}
                className="flex items-center text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
                <LogOut className="h-5 w-5 sm:mr-1" />{' '}
                <span className="hidden sm:inline">Sign Out</span>
            </button>
        </div>
    </header>
);

export default Header;
