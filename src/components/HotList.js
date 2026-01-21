import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { debounce } from '../utils/helpers';
import { appId } from '../firebaseConfig';
import { List, Archive, Plus, Flame, TrendingUp, Users, ChevronDown, ChevronUp, MessageSquare, ArrowRight, ArrowDown, ArrowUp, CheckCircle, XCircle, ArchiveRestore, Trash2, X, Zap, Clock, AlertTriangle, Send, PlayCircle, Search, Filter, SortAsc } from 'lucide-react';

// --- Modals for Hotlist ---
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

// --- Visual Components ---
const VisualExposureMeter = ({ count }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="flex space-x-1 mb-1">
                {[...Array(12)].map((_, i) => {
                    const isFilled = i < count;
                    const isClosingZone = i >= 4;
                    let bgClass = "bg-gray-200";
                    let effectClass = "";
                    if (isFilled) {
                        if (isClosingZone) {
                            bgClass = "bg-green-500";
                            effectClass = "ring-2 ring-green-200";
                        } else {
                            bgClass = "bg-blue-400";
                        }
                    }
                    return (
                        <div key={i} className={`h-2 w-2 rounded-full transition-all duration-300 ${bgClass} ${effectClass}`} title={`Exposure ${i + 1}`} />
                    );
                })}
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                {count >= 5 ? "CLOSING ZONE" : "BUILDING TRUST"} ({count})
            </span>
        </div>
    );
};

const ProspectCard = ({ item, onUpdate, onInstantUpdate, onDecide, onDataChange, monthlyData, onDelete }) => {
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextAction = item.nextActionDate ? new Date(item.nextActionDate) : null;
    const isOverdue = nextAction && nextAction < today;
    const lastContact = item.lastContacted ? new Date(item.lastContacted) : null;
    const daysSinceContact = lastContact ? (new Date() - lastContact) / (1000 * 60 * 60 * 24) : 999;
    const isStagnant = daysSinceContact > 7 && item.status !== 'Cold';
    const exposureCount = item.exposureCount || 0;

    const handleSentTool = () => {
        onInstantUpdate(item.id, { status: 'Warm', exposureCount: exposureCount + 1, lastContacted: new Date().toISOString() });
        updateDailyStats('exposures');
    };
    const handleDidPresentation = () => {
        onInstantUpdate(item.id, { status: 'Hot', exposureCount: exposureCount + 1, lastContacted: new Date().toISOString() });
        updateDailyStats('presentations');
    };
    const handleGenericLogExposure = () => {
        onInstantUpdate(item.id, { exposureCount: exposureCount + 1, lastContacted: new Date().toISOString() });
        updateDailyStats('exposures');
    };
    const updateDailyStats = (metric) => {
        const day = new Date().getDate();
        const currentCount = Number(monthlyData?.[day]?.[metric] || 0);
        onDataChange(new Date(), metric, currentCount + 1);
    };
    const handleSnooze = () => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 3);
        onInstantUpdate(item.id, { nextActionDate: newDate.toISOString().split('T')[0] });
    };

    return (
        <div className={`p-4 border rounded-lg bg-white shadow-sm transition-all hover:shadow-md relative overflow-hidden ${isOverdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'} ${isStagnant ? 'bg-gray-50' : ''}`}>
            <div className="absolute top-2 right-2 flex items-center space-x-2">
                {isOverdue && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Overdue</span>}
                {isStagnant && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center">Stagnant</span>}
                <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Quick Kill / Not Interested"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="flex justify-between items-start mt-2 pr-8">
                <input type="text" defaultValue={item.name} onChange={(e) => onUpdate(item.id, 'name', e.target.value)} className="text-lg font-bold text-gray-800 border-none p-0 w-full focus:ring-0 bg-transparent" placeholder="Enter name..." />
            </div>
            <div className="mt-2 mb-3"><VisualExposureMeter count={exposureCount} /></div>
            <div className="flex space-x-2 my-3">
                {item.status === 'Cold' && (
                    <button onClick={handleSentTool} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-md flex items-center justify-center text-xs font-semibold transition-colors border border-indigo-200">
                        <Send className="h-4 w-4 mr-1 text-indigo-600" /> Sent Tool (Move Warm)
                    </button>
                )}
                {item.status === 'Warm' && (
                    <button onClick={handleDidPresentation} className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 rounded-md flex items-center justify-center text-xs font-semibold transition-colors border border-purple-200">
                        <PlayCircle className="h-4 w-4 mr-1 text-purple-600" /> Did Pres (Move Hot)
                    </button>
                )}
                {item.status === 'Hot' && (
                    <button onClick={handleGenericLogExposure} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center text-xs font-semibold transition-colors border border-green-200">
                        <Zap className="h-4 w-4 mr-1 text-green-600" /> Log Exposure
                    </button>
                )}
                <button onClick={handleSnooze} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-md flex items-center justify-center text-xs font-semibold transition-colors">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" /> Snooze
                </button>
            </div>
            <div className="space-y-3">
                <div className="relative">
                    <textarea defaultValue={item.notes} onChange={(e) => onUpdate(item.id, 'notes', e.target.value)} placeholder="Add notes..." className="w-full text-sm text-gray-600 border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white" rows={isNotesExpanded ? 6 : 2}></textarea>
                    <button onClick={() => setIsNotesExpanded(!isNotesExpanded)} className="absolute bottom-2 right-2 text-xs flex items-center font-semibold text-indigo-600 hover:text-indigo-800 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-100 shadow-sm">
                        <MessageSquare className="h-3 w-3 mr-1" /> {isNotesExpanded ? 'Hide' : 'View'} Notes
                    </button>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md">
                    <label htmlFor={`next-action-${item.id}`} className="text-xs font-medium text-gray-500 whitespace-nowrap">Next Action:</label>
                    <input id={`next-action-${item.id}`} type="date" defaultValue={item.nextActionDate} onChange={(e) => onInstantUpdate(item.id, { nextActionDate: e.target.value })} className={`p-1 border rounded-md text-xs w-full bg-white ${isOverdue ? 'text-red-600 font-semibold' : ''}`} />
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2 opacity-60 hover:opacity-100 transition-opacity">
                {item.status === 'Cold' && <button onClick={() => onInstantUpdate(item.id, { status: 'Warm' })} className="text-[10px] text-gray-400 hover:text-indigo-600">Manual &gt; Warm</button>}
                {item.status === 'Warm' && <button onClick={() => onInstantUpdate(item.id, { status: 'Hot' })} className="text-[10px] text-gray-400 hover:text-red-600">Manual &gt; Hot</button>}
                {item.status === 'Hot' && <button onClick={() => onDecide(item)} className="flex items-center text-xs font-bold text-green-600 hover:text-green-800 bg-green-50 px-3 py-1 rounded-full"><CheckCircle className="h-3 w-3 mr-1" /> CLOSE DEAL</button>}
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
                <p className="mt-1 text-sm text-gray-500">When you mark a prospect's decision as final, they will appear here.</p>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {list.map(item => (
                <div key={item.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className={`text-sm font-medium ${item.outcome === 'Member' ? 'text-green-600' : 'text-red-600'}`}>Outcome: {item.outcome || 'Archived'}</p>
                        <p className="text-xs text-gray-500">Decision Date: {item.decisionDate ? new Date(item.decisionDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                        <button onClick={() => onUnarchive(item.id, { isArchived: false, outcome: null })} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                            <ArchiveRestore className="h-3 w-3" /> <span>Unarchive</span>
                        </button>
                        <button onClick={() => onDelete(item.id)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition">
                            <Trash2 className="h-3 w-3" /> <span>Delete</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main HotList Component ---
export const HotList = ({ user, db, onDataChange, monthlyData, hotlist: allProspects }) => {
    const [isArchiveView, setIsArchiveView] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [itemToDecide, setItemToDecide] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [collapsedCategories, setCollapsedCategories] = useState({ Warm: false, Cold: true });

    // --- Command Center State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('priority'); // 'priority', 'exposures', 'name'
    const [filterBy, setFilterBy] = useState('all'); // 'all', 'overdue', 'stale'

    const toggleCategory = (category) => {
        setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const hotlistColRef = useMemo(() => {
        if (!db || !user?.uid) return null;
        return collection(db, 'artifacts', appId, 'users', user.uid, 'hotlist');
    }, [db, user]);

    const handleAdd = async (name) => {
        setShowAddModal(false);
        if (!name || !hotlistColRef) return;
        const newItem = {
            name, notes: "", status: 'Cold', lastContacted: null, isArchived: false, exposureCount: 0, nextActionDate: null, outcome: null, decisionDate: null
        };
        await addDoc(hotlistColRef, newItem);
    };

    const debouncedUpdate = useMemo(() => debounce(async (id, field, value) => {
        if (!hotlistColRef) return;
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, { [field]: value });
    }, 1000), [hotlistColRef]);

    const handleUpdate = (id, field, value) => { debouncedUpdate(id, field, value); };

    const handleInstantUpdate = async (id, update) => {
        if (!hotlistColRef) return;
        const docRef = doc(hotlistColRef, id);
        await updateDoc(docRef, update);
    };

    const handleSetOutcome = async (outcome) => {
        if (!itemToDecide) return;
        await handleInstantUpdate(itemToDecide.id, { isArchived: true, outcome: outcome, decisionDate: new Date().toISOString() });
        setItemToDecide(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete || !hotlistColRef) return;
        const docRef = doc(hotlistColRef, itemToDelete);
        await deleteDoc(docRef);
        setItemToDelete(null);
    };

    const statusConfig = {
        Hot: { title: 'HOT - Closing Zone', icon: Flame, color: 'red', description: 'Prospects who have seen a presentation.' },
        Warm: { title: 'WARM - Building Interest', icon: TrendingUp, color: 'amber', description: "Prospects who have been sent a tool/video." },
        Cold: { title: 'COLD - Prospect List', icon: Users, color: 'blue', description: 'New prospects to start conversations with.' },
    };

    const getPriorityScore = (p) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let score = 0;
        const nextAction = p.nextActionDate ? new Date(p.nextActionDate) : null;
        const lastContact = p.lastContacted ? new Date(p.lastContacted) : null;
        // 1. Critical: Overdue
        if (nextAction && nextAction < today) score += 1000;
        else if (nextAction && nextAction.getTime() === today.getTime()) score += 500;
        // 2. Warning: Stagnant
        const daysSinceContact = lastContact ? (today - lastContact) / (1000 * 60 * 60 * 24) : 999;
        if (daysSinceContact > 7 && p.status !== 'Cold') score += 200;
        // 3. Active: Recent
        if (daysSinceContact < 3) score += 10;
        return score;
    };

    // --- Search & Filter Logic ---
    const filteredHotlist = useMemo(() => {
        return allProspects.filter(item => {
            // 1. Archive View Check
            if (isArchiveView ? !item.isArchived : item.isArchived) return false;
            // 2. Search Query
            if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // 3. Quick Filters
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const nextAction = item.nextActionDate ? new Date(item.nextActionDate) : null;
            const lastContact = item.lastContacted ? new Date(item.lastContacted) : null;

            if (filterBy === 'overdue') {
                if (!nextAction || nextAction >= today) return false;
            }
            if (filterBy === 'stale') {
                const daysSinceContact = lastContact ? (today - lastContact) / (1000 * 60 * 60 * 24) : 999;
                if (daysSinceContact <= 7) return false;
            }
            return true;
        });
    }, [allProspects, isArchiveView, searchQuery, filterBy]);

    const groupedProspects = useMemo(() => {
        const groups = { Hot: [], Warm: [], Cold: [] };
        filteredHotlist.forEach(p => {
            if (p.status === 'Hot' || p.status === 'Warm' || p.status === 'Cold') {
                groups[p.status].push(p);
            }
        });
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                if (sortBy === 'priority') return getPriorityScore(b) - getPriorityScore(a);
                if (sortBy === 'exposures') return (b.exposureCount || 0) - (a.exposureCount || 0);
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return 0;
            });
        });
        return groups;
    }, [filteredHotlist, sortBy]);

    return (
        <div className="space-y-6">
            {showAddModal && <AddHotlistItemModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
            {itemToDecide && <OutcomeModal onClose={() => setItemToDecide(null)} onDecide={handleSetOutcome} />}
            {itemToDelete && <ConfirmDeleteModal onConfirm={handleDelete} onClose={() => setItemToDelete(null)} />}

            <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Prospect Pipeline</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage your prospects from initial contact to decision.</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                        <button onClick={() => setIsArchiveView(!isArchiveView)} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                            {isArchiveView ? <><List className="h-4 w-4 mr-1" /> View Active Pipeline</> : <><Archive className="h-4 w-4 mr-1" /> View Archive</>}
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm">
                            <Plus className="h-5 w-5 mr-2" /> Add Prospect
                        </button>
                    </div>
                </div>

                {/* Command Center Bar */}
                {!isArchiveView && (
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search prospects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full border-gray-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        {/* Filters and Sort */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">

                            <div className="flex items-center bg-gray-50 rounded-md p-1 border">
                                <button
                                    onClick={() => setFilterBy('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterBy === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterBy('overdue')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${filterBy === 'overdue' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Needs Action
                                </button>
                                <button
                                    onClick={() => setFilterBy('stale')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${filterBy === 'stale' ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Clock className="h-3 w-3 mr-1" /> Stale
                                </button>
                            </div>

                            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                            <div className="relative group">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium py-2 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-white transition-colors"
                                >
                                    <option value="priority">Sort: Priority (Smart)</option>
                                    <option value="exposures">Sort: Most Exposures</option>
                                    <option value="name">Sort: Name (A-Z)</option>
                                </select>
                                <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isArchiveView ? (
                <ArchivedProspectsList list={filteredHotlist} onUnarchive={handleInstantUpdate} onDelete={setItemToDelete} />
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
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {prospects.map(item => (
                                                <ProspectCard
                                                    key={item.id}
                                                    item={item}
                                                    onUpdate={handleUpdate}
                                                    onInstantUpdate={handleInstantUpdate}
                                                    onDecide={setItemToDecide}
                                                    onDataChange={onDataChange}
                                                    monthlyData={monthlyData}
                                                    onDelete={() => setItemToDelete(item.id)}
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
