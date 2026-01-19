import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { debounce } from '../utils/helpers';
import { appId } from '../firebaseConfig';
import { List, Archive, Plus, Flame, TrendingUp, Users, ChevronDown, ChevronUp, MessageSquare, ArrowRight, ArrowDown, ArrowUp, CheckCircle, XCircle, ArchiveRestore, Trash2, X } from 'lucide-react';

// --- Modals for Hotlist (defined locally or imported if reused) ---
const AddHotlistItemModal = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const handleAdd = () => { if (name.trim()) { onAdd(name.trim()); } };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Add New Prospect</h3></div>
                <div className="p-6">
                    <label htmlFor="hotlist-name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" id="hotlist-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2"><button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={handleAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Add</button></div>
            </div>
        </div>
    );
};

const ConfirmDeleteModal = ({ onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6"><h3 className="text-xl font-semibold">Confirm Deletion</h3><p className="mt-2 text-gray-600">Are you sure? This action is permanent and cannot be undone.</p></div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2"><button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button><button onClick={onConfirm} className="bg-red-600 text-white px-4 py-2 rounded-md">Delete</button></div>
            </div>
        </div>
    );
};

const OutcomeModal = ({ onClose, onDecide }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6">
                    <h3 className="text-xl font-semibold">Record Final Decision</h3>
                    <p className="mt-2 text-gray-600">What was the outcome for this prospect?</p>
                </div>
                <div className="p-4 flex flex-col space-y-3">
                    <button onClick={() => onDecide('Member')} className="w-full flex items-center justify-center p-3 text-white bg-green-500 hover:bg-green-600 rounded-md">
                        <CheckCircle className="h-5 w-5 mr-2" /> Became a Member
                    </button>
                    <button onClick={() => onDecide('Not Interested')} className="w-full flex items-center justify-center p-3 text-white bg-red-500 hover:bg-red-600 rounded-md">
                        <XCircle className="h-5 w-5 mr-2" /> Not Interested
                    </button>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                </div>
            </div>
        </div>
    );
};


const ProspectCard = ({ item, onUpdate, onInstantUpdate, onDecide, onDataChange, monthlyData }) => {
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);
    const isOverdue = item.nextActionDate && new Date(item.nextActionDate) < new Date();
    const exposureCount = item.exposureCount || 0;

    // WARNING: This depends on onDataChange being passed down from parent which modifies App state.
    // In future refactor, better to use Context or specific hooks.
    const handleLogFollowUp = () => {
        onInstantUpdate(item.id, { exposureCount: exposureCount + 1 });
        const today = new Date();
        const day = today.getDate();
        // This relies on monthlyData being for current month.
        const currentFollowUps = Number(monthlyData?.[day]?.followUps || 0);
        const newFollowUps = currentFollowUps + 1;
        onDataChange(today, 'followUps', newFollowUps);
    };

    const getExposureColor = () => {
        if (exposureCount >= 5 && exposureCount <= 12) return 'bg-green-100 text-green-800';
        if (exposureCount > 12) return 'bg-amber-100 text-amber-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className={`p-4 border rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md ${isOverdue ? 'border-red-500 border-2' : ''}`}>
            <div className="flex justify-between items-start">
                <input
                    type="text"
                    defaultValue={item.name}
                    onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
                    className="text-lg font-semibold border-none p-0 w-full focus:ring-0"
                    placeholder="Enter name..."
                />
                <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getExposureColor()}`}>
                    <span>{exposureCount}</span>
                    <span className="ml-1.5 hidden sm:inline">Exposures</span>
                </div>
            </div>

            <div className="mt-3 space-y-3">
                <div className="relative">
                    <textarea
                        defaultValue={item.notes}
                        onChange={(e) => onUpdate(item.id, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full text-sm text-gray-600 border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={isNotesExpanded ? 6 : 2}
                    ></textarea>
                    <button onClick={() => setIsNotesExpanded(!isNotesExpanded)} className="absolute bottom-2 right-2 text-xs flex items-center font-semibold text-indigo-600 hover:text-indigo-800 bg-white/70 backdrop-blur-sm px-2 py-1 rounded-full">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {isNotesExpanded ? 'Hide' : 'View'} Notes
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <label htmlFor={`next-action-${item.id}`} className="text-xs font-medium text-gray-500">Next Action:</label>
                        <input
                            id={`next-action-${item.id}`}
                            type="date"
                            defaultValue={item.nextActionDate}
                            onChange={(e) => onInstantUpdate(item.id, { nextActionDate: e.target.value })}
                            className={`p-1 border rounded-md text-xs ${isOverdue ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        />
                    </div>
                    <button onClick={handleLogFollowUp} className="mt-2 sm:mt-0 flex items-center justify-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition w-full sm:w-auto">
                        <Plus className="h-3 w-3" />
                        <span>Log Follow Up</span>
                    </button>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
                {item.status === 'Cold' && <button onClick={() => onInstantUpdate(item.id, { status: 'Warm' })} className="flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"><ArrowRight className="h-4 w-4 mr-1" /> Move to Warm</button>}
                {item.status === 'Warm' && <>
                    <button onClick={() => onInstantUpdate(item.id, { status: 'Cold' })} className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"><ArrowDown className="h-4 w-4 mr-1" /> Move to Cold</button>
                    <button onClick={() => onInstantUpdate(item.id, { status: 'Hot' })} className="flex items-center text-xs font-medium text-red-600 hover:text-red-800"><ArrowUp className="h-4 w-4 mr-1" /> Move to Hot</button>
                </>}
                {item.status === 'Hot' && <>
                    <button onClick={() => onInstantUpdate(item.id, { status: 'Warm' })} className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"><ArrowDown className="h-4 w-4 mr-1" /> Move to Warm</button>
                    <button onClick={() => onDecide(item)} className="flex items-center text-xs font-bold text-green-600 hover:text-green-800"><CheckCircle className="h-4 w-4 mr-1" /> Decision Made</button>
                </>}
            </div>
        </div>
    );
};

const ArchivedProspectsList = ({ list, onUnarchive, onDelete }) => {
    if (list.length === 0) {
        return (
            <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Archive is Empty</h3>
                <p className="mt-1 text-sm text-gray-500">
                    When you mark a prospect's decision as final, they will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {list.map(item => (
                <div key={item.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className={`text-sm font-medium ${item.outcome === 'Member' ? 'text-green-600' : 'text-red-600'}`}>
                            Outcome: {item.outcome || 'Archived'}
                        </p>
                        <p className="text-xs text-gray-500">
                            Decision Date: {item.decisionDate ? new Date(item.decisionDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                        <button onClick={() => onUnarchive(item.id, { isArchived: false, outcome: null })} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                            <ArchiveRestore className="h-3 w-3" />
                            <span>Unarchive</span>
                        </button>
                        <button onClick={() => onDelete(item.id)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition">
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const HotList = ({ user, db, onDataChange, monthlyData, hotlist: allProspects }) => {
    const [isArchiveView, setIsArchiveView] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [itemToDecide, setItemToDecide] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [collapsedCategories, setCollapsedCategories] = useState({ Warm: true, Cold: true });

    const toggleCategory = (category) => {
        setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const hotlistColRef = useMemo(() => {
        if (!db || !user?.uid) return null;
        return collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
    }, [db, user]);

    const hotlist = useMemo(() => {
        return allProspects.filter(item => (isArchiveView ? item.isArchived === true : item.isArchived !== true));
    }, [allProspects, isArchiveView]);

    const handleAdd = async (name) => {
        setShowAddModal(false);
        if (!name || !hotlistColRef) return;
        const newItem = {
            name,
            notes: "",
            status: 'Cold', // Start as Cold
            lastContacted: null,
            isArchived: false,
            exposureCount: 0,
            nextActionDate: null,
            outcome: null,
            decisionDate: null
        };
        await addDoc(hotlistColRef, newItem);
    };

    const debouncedUpdate = useMemo(() => debounce(async (id, field, value) => {
        if (!hotlistColRef) return;
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, { [field]: value });
    }, 1000), [hotlistColRef]);

    const handleUpdate = (id, field, value) => {
        debouncedUpdate(id, field, value);
    };

    const handleInstantUpdate = async (id, update) => {
        if (!hotlistColRef) return;
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, update);
    };

    const handleSetOutcome = async (outcome) => {
        if (!itemToDecide) return;
        const update = {
            isArchived: true,
            outcome: outcome,
            decisionDate: new Date().toISOString()
        };
        await handleInstantUpdate(itemToDecide.id, update);
        setItemToDecide(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete || !hotlistColRef) return;
        const docRef = doc(hotlistColRef, itemToDelete);
        await deleteDoc(docRef);
        setItemToDelete(null);
    };

    const statusConfig = {
        Hot: { title: 'HOT - Closing Zone', icon: Flame, color: 'red', description: 'Prospects who have seen a presentation. Follow up to close!' },
        Warm: { title: 'WARM - Building Interest', icon: TrendingUp, color: 'amber', description: "Actively sending tools and having conversations. These prospects haven't seen a full presentation yet." },
        Cold: { title: 'COLD - Prospect List', icon: Users, color: 'blue', description: 'New prospects to start conversations with.' },
    };

    const groupedProspects = useMemo(() => {
        const groups = { Hot: [], Warm: [], Cold: [] };
        hotlist.forEach(p => {
            if (p.status === 'Hot' || p.status === 'Warm' || p.status === 'Cold') {
                groups[p.status].push(p);
            }
        });
        return groups;
    }, [hotlist]);

    return (
        <div className="space-y-6">
            {showAddModal && <AddHotlistItemModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
            {itemToDecide && <OutcomeModal onClose={() => setItemToDecide(null)} onDecide={handleSetOutcome} />}
            {itemToDelete && <ConfirmDeleteModal onConfirm={handleDelete} onClose={() => setItemToDelete(null)} />}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Prospect Pipeline</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your prospects from initial contact to decision.</p>
                </div>
                <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                    <button onClick={() => setIsArchiveView(!isArchiveView)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        {isArchiveView ? <><List className="h-4 w-4 mr-1" /> View Active Pipeline</> : <><Archive className="h-4 w-4 mr-1" /> View Archive</>}
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm">
                        <Plus className="h-5 w-5 mr-2" /> Add Prospect
                    </button>
                </div>
            </div>

            {isArchiveView ? (
                <ArchivedProspectsList list={hotlist} onUnarchive={handleInstantUpdate} onDelete={setItemToDelete} />
            ) : (
                <div className="space-y-8">
                    {Object.keys(statusConfig).map(statusKey => {
                        const { title, icon: Icon, color, description } = statusConfig[statusKey];
                        const prospects = groupedProspects[statusKey];
                        const isCollapsed = collapsedCategories[statusKey];
                        return (
                            <div key={statusKey}>
                                <button onClick={() => toggleCategory(statusKey)} className={`w-full flex items-center justify-between pb-2 border-b-2 border-${color}-500`}>
                                    <div className="flex items-center">
                                        <Icon className={`h-6 w-6 text-${color}-500 mr-3`} />
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 text-left">{title} ({prospects.length})</h3>
                                            <p className="text-xs text-gray-500 text-left">{description}</p>
                                        </div>
                                    </div>
                                    {isCollapsed ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronUp className="h-5 w-5 text-gray-400" />}
                                </button>
                                {!isCollapsed && (
                                    prospects.length > 0 ? (
                                        <div className="mt-4 space-y-4">
                                            {prospects.map(item => (
                                                <ProspectCard
                                                    key={item.id}
                                                    item={item}
                                                    onUpdate={handleUpdate}
                                                    onInstantUpdate={handleInstantUpdate}
                                                    onDecide={setItemToDecide}
                                                    onDataChange={onDataChange}
                                                    monthlyData={monthlyData}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 px-4 mt-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-500">No prospects in this stage.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    );
};

export default HotList;
