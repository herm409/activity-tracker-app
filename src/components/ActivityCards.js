import React from 'react';
import { Minus, Plus, Flame, User, Video } from 'lucide-react';

export const ActivityCard = ({ label, value, streak, icon: Icon, color, onIncrement, onDecrement }) => {
    return (
        <div className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col justify-between`}>
            <div className="flex items-start justify-between">
                <h3 className={`font-semibold text-gray-700`}>{label}</h3>
                <Icon className={`h-7 w-7 text-${color}-400`} />
            </div>
            <div className="flex items-center justify-center space-x-4 my-4">
                <button onClick={onDecrement} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" disabled={value <= 0}>
                    <Minus className="h-5 w-5" />
                </button>
                <span className="text-5xl font-bold text-gray-900 w-16 text-center">{value}</span>
                <button onClick={onIncrement} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <Plus className="h-5 w-5" />
                </button>
            </div>
            <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 rounded-full px-3 py-1 self-center">
                <Flame className="h-4 w-4 mr-1.5 text-amber-500" />
                <span className="font-semibold">{streak} Day Streak</span>
            </div>
        </div>
    );
};

export const PresentationActivityCard = ({ label, value, streak, icon: Icon, color, onAddPresentation }) => {
    return (
        <div className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col justify-between`}>
            <div className="flex items-start justify-between">
                <h3 className={`font-semibold text-gray-700`}>{label}</h3>
                <Icon className={`h-7 w-7 text-${color}-400`} />
            </div>
            <div className="text-center my-4">
                <span className="text-5xl font-bold text-gray-900">{value}</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
                <button onClick={() => onAddPresentation('P')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <User className="h-4 w-4 mr-1.5" /> In Person
                </button>
                <button onClick={() => onAddPresentation('V')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <Video className="h-4 w-4 mr-1.5" /> Virtual
                </button>
            </div>
            <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 rounded-full px-3 py-1 self-center mt-3">
                <Flame className="h-4 w-4 mr-1.5 text-amber-500" />
                <span className="font-semibold">{streak} Day Streak</span>
            </div>
        </div>
    );
};

export const DisciplineCheckbox = ({ label, icon: Icon, isChecked, onChange }) => {
    const baseClasses = "flex items-center p-4 rounded-lg cursor-pointer transition-all border-2";
    const checkedClasses = "bg-indigo-50 border-indigo-500 text-indigo-800";
    const uncheckedClasses = "bg-white border-gray-200 hover:border-gray-300";

    return (
        <label className={`${baseClasses} ${isChecked ? checkedClasses : uncheckedClasses}`}>
            <div className={`mr-4 p-2 rounded-full ${isChecked ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <Icon className={`h-6 w-6 ${isChecked ? 'text-indigo-600' : 'text-gray-500'}`} />
            </div>
            <span className="font-semibold flex-grow">{label}</span>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={onChange}
                className="h-6 w-6 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 self-center"
            />
        </label>
    );
};
