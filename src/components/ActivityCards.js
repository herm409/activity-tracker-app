import React from 'react';
import { Minus, Plus, Flame, User, Video } from 'lucide-react';

export const ActivityCard = ({ label, value, streak, icon: Icon, color, onIncrement, onDecrement, isDeficitMode, par = 0, tooltip }) => {
    // Par Protocol Logic
    const score = isDeficitMode ? par - value : value;
    const isDebt = isDeficitMode && score > 0;
    const isEven = isDeficitMode && score === 0;
    const isSurplus = isDeficitMode && score < 0;

    // Determine colors based on state
    let valueColor = "text-gray-900";
    if (isDeficitMode) {
        if (isDebt) valueColor = "text-red-600";
        if (isEven) valueColor = "text-gray-900"; // Or blue as requested
        if (isSurplus) valueColor = "text-green-600";
    }

    const formatScore = (s) => {
        if (!isDeficitMode) return s;
        if (s > 0) return `+${s}`;
        return s;
    };

    const [isHovered, setIsHovered] = React.useState(false);

    return (
        <div
            className={`bg-white border p-4 rounded-lg shadow-sm flex flex-col justify-between relative overflow-visible transition-all hover:z-30`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Tooltip */}
            {tooltip && isHovered && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-56 bg-gray-900 text-white text-xs rounded-lg py-3 px-4 shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                    {tooltip}
                    {/* Arrow pointing up */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-b-gray-900"></div>
                </div>
            )}
            {/* Debt Meter Background for Deficit Mode */}
            {isDeficitMode && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 flex">
                    {/* This is a simple visual representation using specific widths relative to max debt of 2 for demo purposed, 
                         or we can make it dynamic. 
                         Let's use a centered approach. 
                     */}
                </div>
            )}

            <div className="flex items-start justify-between z-10">
                <h3 className={`font-semibold text-gray-700`}>{label}</h3>
                <Icon className={`h-7 w-7 text-${color}-400`} />
            </div>

            <div
                className="flex items-center justify-center space-x-4 my-2 z-10"
                onClick={(e) => {
                    // Allow tapping anywhere in the center area to toggle tooltip on mobile
                    if (tooltip) {
                        e.stopPropagation();
                        setIsHovered(!isHovered);
                    }
                }}
            >
                <button onClick={(e) => { e.stopPropagation(); onDecrement(); }} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" disabled={value <= 0}>
                    <Minus className="h-5 w-5" />
                </button>
                <div className="flex flex-col items-center w-24 cursor-pointer">
                    <span className={`text-5xl font-bold ${valueColor} transition-colors duration-300`}>
                        {formatScore(score)}
                    </span>
                    {isDeficitMode && (
                        <>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDebt ? 'text-red-500' : (isEven ? 'text-blue-500' : 'text-green-500')}`}>
                                {isDebt ? 'DEBT' : (isEven ? 'EVEN' : 'SURPLUS')}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1 font-medium hover:text-indigo-500 flex items-center">
                                <span className="mr-1">Tap for details</span>
                            </span>
                        </>
                    )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onIncrement(); }} className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            {/* Debt Meter Visualization */}
            {isDeficitMode && (
                <div className="w-full h-2 bg-gray-200 rounded-full mt-2 relative overflow-hidden">
                    {/* Center Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 z-10"></div>

                    {/* Bar */}
                    {/* Logic: Map score to width. Range: -4 (Good) to +2 (Bad). 
                        Let's assume range +/- 4 for visualization width.
                        If score > 0 (Debt), bar goes LEFT from center (Red).
                        If score < 0 (Surplus), bar goes RIGHT from center (Green).
                    */}
                    <div
                        className={`absolute top-0 bottom-0 transition-all duration-500 ${score > 0 ? 'bg-red-500 right-1/2' : 'bg-green-500 left-1/2'}`}
                        style={{ width: `${Math.min(Math.abs(score) * 20, 50)}%` }} // 20% per point, max 50% width (half container)
                    ></div>
                </div>
            )}

            <div className="flex items-center justify-center text-sm text-amber-600 bg-amber-50 rounded-full px-3 py-1 self-center mt-3 z-10">
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
