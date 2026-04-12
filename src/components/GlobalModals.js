import React, { useState } from 'react';
import { X, Trophy, Plus } from 'lucide-react';
import { CheckboxInput, NumberInput, PresentationTracker } from './FormInputs';

export const DisplayNameModal = ({ onSave, onClose, currentName, currentPar }) => {
    const [name, setName] = useState(currentName || '');
    const [dailyPar, setDailyPar] = useState(currentPar || 2);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), dailyPar);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold">{currentName ? 'Edit Profile' : 'Welcome!'}</h3>
                    <p className="text-sm text-gray-600 mt-1">Set your name and goals.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Display Name</label>
                        <input type="text" id="display-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Par Goal: <span className="font-bold text-indigo-600">{dailyPar}</span> pts
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={dailyPar}
                            onChange={(e) => setDailyPar(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Standard is 2. Increase for higher difficulty.
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    {onClose && <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>}
                    <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Save Profile</button>
                </div>
            </div>
        </div>
    );
};

export const OnboardingModal = ({ onDismiss }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to Par Protocol 🏌️",
            icon: <Trophy className="h-12 w-12 mx-auto text-amber-500" />,
            content: (
                <div className="text-center space-y-3">
                    <p className="text-gray-600">The daily activity system that coaches you step-by-step toward consistent income.</p>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-800 font-medium">
                        This 5-step setup takes 2 minutes and will set you up to win your first day.
                    </div>
                </div>
            )
        },
        {
            title: "Step 1: Know Your Daily Par",
            icon: <div className="h-12 w-12 mx-auto bg-indigo-100 rounded-full flex items-center justify-center font-bold text-2xl text-indigo-700">⛳</div>,
            content: (
                <div className="space-y-3 text-left text-sm">
                    <p className="text-gray-700">Your <strong>Daily Par</strong> is how many points you need to earn each day to stay on track.</p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                        <p className="font-semibold text-gray-800 text-xs uppercase tracking-widest">How Points Work</p>
                        <div className="flex justify-between"><span>📞 Exposure / Follow-Up / No</span><span className="font-bold">1 pt</span></div>
                        <div className="flex justify-between"><span>🎤 Presentation / 3-Way</span><span className="font-bold text-indigo-600">3 pts</span></div>
                        <div className="flex justify-between"><span>🤝 Membership Sold</span><span className="font-bold text-green-600">5 pts</span></div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-800">
                        <strong>Action:</strong> Your par is already set to 2 pts/day. You can raise it in your Profile settings anytime. 2 pts is the minimum to get a green score daily.
                    </div>
                </div>
            )
        },
        {
            title: "Step 2: Add Your First Prospect",
            icon: <Plus className="h-12 w-12 mx-auto text-blue-500" />,
            content: (
                <div className="space-y-3 text-left text-sm">
                    <p className="text-gray-700">Think of one person right now who could benefit from LegalShield or IDShield. Write their name down.</p>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-blue-800">
                        <strong>Action:</strong> After setup, go to the <span className="font-bold">Pipeline tab</span> and tap "Add Prospect." Add their name, their phone number, and how you met them.
                    </div>
                    <p className="text-gray-500 text-xs">The Pipeline tracks every person you're working — and reminds you when to follow up so no one falls through the cracks.</p>
                </div>
            )
        },
        {
            title: "Step 3: Log Your First Exposure",
            icon: <div className="h-12 w-12 mx-auto bg-green-100 rounded-full flex items-center justify-center font-bold text-2xl text-green-600">📲</div>,
            content: (
                <div className="space-y-3 text-left text-sm">
                    <p className="text-gray-700">An exposure is any time you share information about LegalShield or IDShield — a text, a video link, a conversation.</p>
                    <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-green-800">
                        <strong>Action:</strong> Right after setup, log your first exposure using the big green button on the <span className="font-bold">Today tab</span>. Even if it was from earlier today — log it now.
                    </div>
                    <p className="text-gray-500 text-xs">That first log starts your streak counter and gets you 1 point toward your daily par. One action. One point. Build from there.</p>
                </div>
            )
        },
        {
            title: "You're Ready. Go Win Today. 🏆",
            icon: <div className="h-12 w-12 mx-auto bg-amber-100 rounded-full flex items-center justify-center font-bold text-xl text-amber-600">🔥</div>,
            content: (
                <div className="text-center space-y-4">
                    <p className="text-gray-700 leading-relaxed">Our mission is to help <strong>everyone affordably live a just and secure life</strong>. Every exposure you log moves that mission forward.</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-gray-50 rounded-lg p-3 text-center border">
                            <p className="text-lg">🏌️</p>
                            <p className="font-semibold text-gray-700 mt-1">Hit Par Daily</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center border">
                            <p className="text-lg">🔥</p>
                            <p className="font-semibold text-gray-700 mt-1">Build Streaks</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center border">
                            <p className="text-lg">🏆</p>
                            <p className="font-semibold text-gray-700 mt-1">Rank Up</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">Let's go build something great.</p>
                </div>
            )
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 flex-1 flex flex-col justify-center">
                    {steps[step].icon}
                    <h3 className="mt-4 text-xl font-bold text-center text-gray-900">{steps[step].title}</h3>
                    <div className="mt-4 flex-1">
                        {steps[step].content}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 flex justify-between items-center">
                    <div className="flex space-x-1">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-2 w-2 rounded-full transition-colors ${i === step ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                        ))}
                    </div>
                    <div className="flex space-x-2">
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm font-medium">
                                Back
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (step < steps.length - 1) {
                                    setStep(s => s + 1);
                                } else {
                                    onDismiss();
                                }
                            }}
                            className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 text-sm font-bold shadow-sm"
                        >
                            {step === steps.length - 1 ? "Let's Play!" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DayEntryModal = ({ day, data, onClose, onChange }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center"><h3 className="text-lg sm:text-xl font-semibold">Activities for Day {day}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Exposures</label><NumberInput value={data.exposures || ''} onChange={e => onChange('exposures', e.target.value)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Follow Ups</label><NumberInput value={data.followUps || ''} onChange={e => onChange('followUps', e.target.value)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Definitive No's</label><NumberInput value={data.nos || ''} onChange={e => onChange('nos', e.target.value)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Memberships Sold</label><NumberInput value={data.enrolls || ''} onChange={e => onChange('enrolls', e.target.value)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">3 Ways</label><NumberInput value={data.threeWays || ''} onChange={e => onChange('threeWays', e.target.value)} /></div>
                    <PresentationTracker value={data.presentations || []} onChange={val => onChange('presentations', val)} />
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Gameplans</label><NumberInput value={data.gameplans || ''} onChange={e => onChange('gameplans', e.target.value)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Exercise</label><CheckboxInput checked={!!data.exerc} onChange={e => onChange('exerc', e.target.checked)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Personal Development</label><CheckboxInput checked={!!(data.personalDevelopment || data.read || data.audio)} onChange={e => onChange('personalDevelopment', e.target.checked)} /></div>
                </div>
                <div className="p-4 bg-gray-50 text-right rounded-b-lg"><button onClick={onClose} className="bg-indigo-600 text-white px-5 py-2 rounded-md">Done</button></div>
            </div>
        </div>
    );
};
export const CutReportModal = ({ score, onClose }) => {
    const isDeficit = score > 0;
    const lastWeekIntentionKey = `weekIntention_prev`;
    const lastIntention = localStorage.getItem(lastWeekIntentionKey) || '';
    const [intention, setIntention] = React.useState('');

    const handleClose = () => {
        if (intention.trim()) {
            localStorage.setItem(lastWeekIntentionKey, intention.trim());
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className={`p-6 text-center ${isDeficit ? 'bg-red-50' : 'bg-green-50'}`}>
                    {isDeficit ? (
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4"><X className="h-8 w-8 text-red-600" /></div>
                    ) : (
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4"><Trophy className="h-8 w-8 text-green-600" /></div>
                    )}
                    <h3 className={`text-2xl font-bold ${isDeficit ? 'text-red-900' : 'text-green-900'}`}>
                        {isDeficit ? 'Missed the Cut' : 'Made the Cut!'}
                    </h3>
                    <p className={`mt-2 ${isDeficit ? 'text-red-700' : 'text-green-700'}`}>
                        {isDeficit
                            ? `You missed last week's Par by ${Math.abs(score)} points.`
                            : `You beat last week's Par by ${Math.abs(score)} points!`}
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {lastIntention && (
                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-sm">
                            <span className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Last Week You Said:</span>
                            <span className="text-indigo-800 font-medium italic">"{lastIntention}"</span>
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Weekly Review</h4>
                        <p className="text-gray-600 text-sm">
                            {isDeficit
                                ? "Consistency is key to momentum. Review your activity from last week and plan to make up the difference this week. You can do it!"
                                : "Great job maintaining momentum! Keep pushing to stay in the green zone."}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">🎯 This Week's Intention</label>
                        <input
                            type="text"
                            value={intention}
                            onChange={e => setIntention(e.target.value)}
                            placeholder="This week I will focus on..."
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            maxLength={120}
                        />
                        <p className="text-xs text-gray-400 mt-1">You'll see this next Monday as a reminder.</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className={`w-full py-3 px-4 rounded-md font-semibold text-white shadow-sm transition-colors ${isDeficit ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isDeficit ? 'Accept & Plan' : "Let's Go!"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ScoringLegendModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-xs animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                <h3 className="font-bold text-gray-900">Scoring Rules</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
                <div>
                    <p className="text-xs text-center text-gray-500 uppercase tracking-widest font-semibold mb-2">Daily Goal: 2 Points</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 rounded bg-green-50 border border-green-100">
                            <span className="font-medium text-gray-700">Enrollment</span>
                            <span className="font-bold text-green-700 badge">5 Pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-indigo-50 border border-indigo-100">
                            <span className="font-medium text-gray-700">Presentation / 3-Way</span>
                            <span className="font-bold text-indigo-700 badge">3 Pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100">
                            <span className="font-medium text-gray-700">Exposure / Follow-Up / Educated No</span>
                            <span className="font-bold text-gray-600 badge">1 Pt</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-red-50 border border-red-100 mt-1">
                            <span className="font-medium text-red-700 text-xs">Tenacity Bonus: 4+ Follow-Ups</span>
                            <span className="font-bold text-red-700 badge">2 Pts</span>
                        </div>
                    </div>
                </div>
                <div className="text-xs text-gray-500 text-center bg-yellow-50 p-2 rounded border border-yellow-100">
                    <span className="font-semibold text-yellow-800">Winning Strategy:</span><br />
                    Clear your 2-point debt daily. <br />
                    Anything extra is "Under Par" (Bonus).
                </div>
            </div>
        </div>
    </div>
);
