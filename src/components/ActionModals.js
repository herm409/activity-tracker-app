import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export const FollowUpModal = ({ prospects, onClose, onQuickLog, onLogForProspect, onAddNewProspect }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProspectName, setNewProspectName] = useState('');

    const handleAdd = () => {
        if (newProspectName.trim()) {
            onAddNewProspect(newProspectName.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Log a Follow-Up</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-4 space-y-3">
                    {showAddForm ? (
                        <div className="space-y-3 p-2 bg-gray-50 rounded-md">
                            <label htmlFor="new-prospect-name" className="block text-sm font-medium text-gray-700">New Prospect's Name</label>
                            <input
                                id="new-prospect-name"
                                type="text"
                                value={newProspectName}
                                onChange={(e) => setNewProspectName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                autoFocus
                                placeholder="Enter name..."
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setShowAddForm(false)} className="bg-gray-200 px-4 py-2 text-sm rounded-md">Cancel</button>
                                <button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-md">Save & Log</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold"
                        >
                            <Plus className="h-5 w-5 mr-2" /> Add New Prospect & Log
                        </button>
                    )}
                    <div className="text-center text-xs text-gray-400">or select an existing prospect</div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {prospects.length > 0 ? prospects.map(prospect => (
                            <button
                                key={prospect.id}
                                onClick={() => onLogForProspect(prospect.id)}
                                className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-md flex justify-between items-center"
                            >
                                <span>{prospect.name}</span>
                                <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full">{prospect.exposureCount || 0}</span>
                            </button>
                        )) : (
                            <p className="text-center text-sm text-gray-500 py-4">No "Hot" or "Warm" prospects to select.</p>
                        )}
                    </div>
                    <div className="text-center pt-2">
                        <button onClick={onQuickLog} className="text-xs text-gray-500 hover:text-indigo-600">
                            Just do a quick log (no prospect)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const LogExposureModal = ({ prospects, onClose, onLogForProspect, onAddNewProspect }) => {
    const [view, setView] = useState('new'); // 'new' or 'existing'
    const [newProspectName, setNewProspectName] = useState('');

    const handleAdd = () => {
        if (newProspectName.trim()) {
            onAddNewProspect(newProspectName.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Log an Exposure</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
                </div>
                <div className="p-4">
                    <div className="flex justify-center border border-gray-200 rounded-md p-1 bg-gray-100 mb-4">
                        <button onClick={() => setView('new')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${view === 'new' ? 'bg-white shadow' : ''}`}>New Prospect</button>
                        <button onClick={() => setView('existing')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${view === 'existing' ? 'bg-white shadow' : ''}`}>Existing Prospect</button>
                    </div>

                    {view === 'new' && (
                        <div className="space-y-3">
                            <label htmlFor="new-exposure-name" className="block text-sm font-medium text-gray-700">Prospect's Name</label>
                            <input
                                id="new-exposure-name"
                                type="text"
                                value={newProspectName}
                                onChange={(e) => setNewProspectName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                autoFocus
                                placeholder="Enter name..."
                            />
                            <button onClick={handleAdd} className="w-full bg-indigo-600 text-white p-3 rounded-md font-semibold">
                                Add & Log Exposure
                            </button>
                        </div>
                    )}

                    {view === 'existing' && (
                        <div>
                            <p className="text-center text-xs text-gray-500 mb-2">Select a prospect to log the exposure for:</p>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {prospects.length > 0 ? prospects.map(prospect => (
                                    <button
                                        key={prospect.id}
                                        onClick={() => onLogForProspect(prospect.id)}
                                        className="w-full text-left p-3 bg-gray-100 hover:bg-gray-200 rounded-md flex justify-between items-center"
                                    >
                                        <span>{prospect.name}</span>
                                        <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full">{prospect.exposureCount || 0}</span>
                                    </button>
                                )) : (
                                    <p className="text-center text-sm text-gray-500 py-4">No prospects found.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
