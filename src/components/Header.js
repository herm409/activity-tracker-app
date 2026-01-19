import React from 'react';
import { Edit2, LogOut } from 'lucide-react';

const Header = ({ displayName, onSignOut, onEditName }) => (
    <header className="flex justify-between items-center pb-4">
        <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{displayName}</h1>
            <button onClick={onEditName} className="ml-3 text-gray-400 hover:text-gray-600"><Edit2 className="h-4 w-4" /></button>
        </div>
        <button onClick={onSignOut} className="flex items-center text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">
            <LogOut className="h-5 w-5 mr-1" /> Sign Out
        </button>
    </header>
);

export default Header;
