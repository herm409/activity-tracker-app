import React, { useState } from 'react';
import { Minus, Plus, Trophy, X } from 'lucide-react';
import { CheckboxInput, NumberInput, PresentationTracker } from './FormInputs';

export const DisplayNameModal = ({ onSave, onClose, currentName }) => {
    const [name, setName] = useState(currentName || '');
    const handleSave = () => { if (name.trim()) { onSave(name.trim()); } };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">{currentName ? 'Edit Your Name' : 'Welcome!'}</h3><p className="text-sm text-gray-600 mt-1">Please set your display name for the leaderboard.</p></div>
                <div className="p-6">
                    <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input type="text" id="display-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    {onClose && <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>}
                    <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Save Name</button>
                </div>
            </div>
        </div>
    );
};

export const OnboardingModal = ({ onDismiss }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
                <Trophy className="h-12 w-12 mx-auto text-amber-500" />
                <h3 className="mt-4 text-xl font-semibold">Welcome to Your Activity Tracker!</h3>
                <p className="mt-2 text-gray-600">Here's how to get started:</p>
            </div>
            <div className="px-6 pb-6 space-y-4 text-left">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                        <h4 className="font-semibold">For Quick Entries</h4>
                        <p className="text-sm text-gray-600">Use the <Plus className="h-3 w-3 inline-block mx-1" />/<Minus className="h-3 w-3 inline-block mx-1" /> buttons on the summary cards to quickly add or remove today's activity.</p>
                    </div>
                </div>
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                        <h4 className="font-semibold">For More Detail</h4>
                        <p className="text-sm text-gray-600">Tap any day on the calendar to open the full activity log for that date.</p>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center">
                <button onClick={onDismiss} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Got it!</button>
            </div>
        </div>
    </div>
);

export const DayEntryModal = ({ day, data, onClose, onChange }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center"><h3 className="text-lg sm:text-xl font-semibold">Activities for Day {day}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div>
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Exposures</label><NumberInput value={data.exposures || ''} onChange={e => onChange('exposures', e.target.value)} /></div>
                    <div className="flex items-center justify-between"><label className="font-medium text-gray-700">Follow Ups</label><NumberInput value={data.followUps || ''} onChange={e => onChange('followUps', e.target.value)} /></div>
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
