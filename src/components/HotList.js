import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { debounce } from '../utils/helpers';
import { appId } from '../firebaseConfig';
import confetti from 'canvas-confetti';
import { AlertTriangle, PlayCircle, Send, CheckCircle, TrendingUp, XCircle, Trash2, Clock, MessageSquare, Archive, ArchiveRestore, Flame, Users, List, Plus, Search, SortAsc, ChevronDown, ChevronUp, Phone, Mail, Tag, Smartphone, Coffee, LayoutGrid, LayoutList } from 'lucide-react';

// --- Modals for Hotlist ---
const AddHotlistItemModal = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [source, setSource] = useState('');

    const handleAdd = () => {
        if (name.trim()) {
            onAdd({ name: name.trim(), phone: phone.trim(), source });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold">Add New Prospect</h3>
                    <p className="text-xs text-gray-500 mt-1">Quick capture — you can add more info later.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="hotlist-name" className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                        <input type="text" id="hotlist-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" autoFocus placeholder="Full name" />
                    </div>
                    <div>
                        <label htmlFor="hotlist-phone" className="block text-sm font-medium text-gray-700">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input type="tel" id="hotlist-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="(555) 000-0000" />
                    </div>
                    <div>
                        <label htmlFor="hotlist-source" className="block text-sm font-medium text-gray-700">How'd you meet? <span className="text-gray-400 font-normal">(optional)</span></label>
                        <select id="hotlist-source" value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500 text-sm">
                            <option value="">Select a source…</option>
                            <option value="In Person">In Person</option>
                            <option value="Text / Social">Text / Social</option>
                            <option value="Referral">Referral</option>
                            <option value="Online">Online</option>
                            <option value="Event">Event</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md text-sm font-medium">Cancel</button>
                    <button onClick={handleAdd} disabled={!name.trim()} className="bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-semibold">Add Prospect</button>
                </div>
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

// Stage breadcrumb strip shown at top of every card
const StageBreadcrumb = ({ status }) => {
    const stages = [
        { key: 'Cold',   label: 'Cold',   emoji: '🧊' },
        { key: 'Warm',   label: 'Warm',   emoji: '🌡️' },
        { key: 'Hot',    label: 'Hot',    emoji: '🔥' },
        { key: 'Closed', label: 'Closed', emoji: '✅' },
    ];
    const activeIdx = stages.findIndex(s => s.key === status);
    return (
        <div className="flex items-center space-x-1 mb-3">
            {stages.map((s, i) => (
                <React.Fragment key={s.key}>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        i === activeIdx
                            ? 'bg-indigo-600 text-white'
                            : i < activeIdx
                            ? 'bg-indigo-100 text-indigo-500'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                        {s.emoji} {s.label}
                    </span>
                    {i < stages.length - 1 && (
                        <span className="text-gray-300 text-xs">›</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const ProspectCard = ({ item, onUpdate, onInstantUpdate, onDecide, onDataChange, monthlyData, onDelete }) => {
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextAction = item.nextActionDate ? new Date(item.nextActionDate) : null;
    const isOverdue = nextAction && nextAction < today;
    const isSnoozed = nextAction && nextAction > today;  // future date = snoozed
    const lastContact = item.lastContacted ? new Date(item.lastContacted) : null;
    const daysSinceContact = lastContact ? (new Date() - lastContact) / (1000 * 60 * 60 * 24) : 999;
    const isStagnant = daysSinceContact > 7 && item.status !== 'Cold';
    const exposureCount = item.exposureCount || 0;

    const logActivity = (description, typeStr = 'system') => {
        const newActivity = { id: Date.now().toString() + Math.random().toString(), date: new Date().toISOString(), description, type: typeStr };
        return [...(item.activities || []), newActivity];
    };

    const handleSentInfo = (typeStr = 'sent') => {
        const title = typeStr === 'email' ? 'Emailed Info' : typeStr === 'text' ? 'Texted Info' : 'Sent Info';
        onInstantUpdate(item.id, { status: 'Warm', exposureCount: exposureCount + 1, lastContacted: new Date().toISOString(), activities: logActivity(`Moved to Warm (${title})`, typeStr) });
        updateDailyStats('exposures');
    };
    const handleDidPresentation = () => {
        onInstantUpdate(item.id, { status: 'Hot', exposureCount: exposureCount + 1, lastContacted: new Date().toISOString(), activities: logActivity('Did Presentation', 'meeting') });
        updateDailyStats('presentations');
    };
    const handleLogFollowUp = (typeStr = 'touch') => {
        const isTenacity = exposureCount >= 4;
        const noun = typeStr === 'call' ? 'Called' : typeStr === 'text' ? 'Texted' : typeStr === 'email' ? 'Emailed' : typeStr === 'meeting' ? 'Met' : 'Followed up';
        onInstantUpdate(item.id, { exposureCount: exposureCount + 1, lastContacted: new Date().toISOString(), activities: logActivity(`${noun} (Touch #${exposureCount + 1})`, typeStr) });
        if (isTenacity) updateDailyStats('tenacityFollowUps');
        else if (exposureCount > 0) updateDailyStats('followUps');
        else updateDailyStats('exposures');
    };
    const handleNotInterested = () => {
        if (exposureCount === 0) {
            alert("A true 'No' only counts after they've seen the information. Send them info first!");
            return;
        }
        const ok = window.confirm(`Mark ${item.name || 'this prospect'} as Not Interested? This will archive them and log a No.`);
        if (!ok) return;
        confetti({ particleCount: 80, spread: 60, origin: { x: 0.8, y: 0.2 }, colors: ['#EF4444', '#F87171', '#FCA5A5'] });
        onInstantUpdate(item.id, { isArchived: true, outcome: 'Not Interested', decisionDate: new Date().toISOString() });
        updateDailyStats('nos');
    };
    const updateDailyStats = (metric) => {
        const day = new Date().getDate();
        const currentCount = Number(monthlyData?.[day]?.[metric] || 0);
        onDataChange(new Date(), metric, currentCount + 1);
    };
    const handleSnooze = () => {
        const snoozeDate = new Date();
        snoozeDate.setDate(snoozeDate.getDate() + 3);
        const label = snoozeDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const ok = window.confirm(`Remind me about ${item.name || 'this prospect'} on ${label}? They won't appear in Today's Prospects until then.`);
        if (!ok) return;
        onInstantUpdate(item.id, { nextActionDate: snoozeDate.toISOString().split('T')[0] });
    };
    const handleUnSnooze = () => {
        onInstantUpdate(item.id, { nextActionDate: new Date().toISOString().split('T')[0] });
    };

    // Last-contact human-readable label
    const lastContactLabel = lastContact
        ? daysSinceContact < 1 ? 'Today'
        : daysSinceContact < 2 ? 'Yesterday'
        : `${Math.floor(daysSinceContact)}d ago`
        : 'Never';

    const borderClass = isOverdue ? 'border-l-4 border-l-red-500' : isSnoozed ? 'border-l-4 border-l-blue-300' : 'border-l-4 border-l-transparent';

    return (
        <div className={`p-4 border rounded-lg bg-white shadow-sm transition-all hover:shadow-md ${borderClass} ${isStagnant ? 'bg-amber-50/30' : ''}`}>

            {/* Stage Breadcrumb */}
            <StageBreadcrumb status={item.status} />

            {/* Name + Last contact row */}
            <div className="flex justify-between items-start mb-1">
                <input
                    type="text"
                    defaultValue={item.name}
                    onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
                    className="text-base font-bold text-gray-900 border-none p-0 w-full focus:ring-0 bg-transparent"
                    placeholder="Enter name..."
                />
            </div>
            <div className="flex items-center space-x-2 mb-3">
                <span className="text-xs text-gray-400">Last contact: <span className={`font-semibold ${daysSinceContact > 7 && item.status !== 'Cold' ? 'text-amber-600' : 'text-gray-600'}`}>{lastContactLabel}</span></span>
                {isOverdue && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />Action Overdue</span>}
                {isSnoozed && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-semibold">💤 Snoozed until {new Date(item.nextActionDate).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>}
            </div>

            {/* Exposure Meter */}
            <div className="mb-4"><VisualExposureMeter count={exposureCount} /></div>

            {/* Un-snooze button when snoozed */}
            {isSnoozed && (
                <button
                    onClick={handleUnSnooze}
                    className="w-full mb-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-2 rounded-md flex items-center justify-center text-xs font-bold transition-colors"
                >
                    🔔 Remind Me Today — move back to Today's Prospects
                </button>
            )}

            {/* Primary contextual action button */}
            <div className="mb-3">
                {item.status === 'Cold' && (
                    <div className="flex flex-col space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">1. Log Sent Info to move to Warm:</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleSentInfo('text')} title="Texted Info" className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-md flex items-center justify-center transition-colors border border-indigo-200 shadow-sm">
                                <Smartphone className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleSentInfo('email')} title="Emailed Info" className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-md flex items-center justify-center transition-colors border border-indigo-200 shadow-sm">
                                <Mail className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleSentInfo('other')} title="Other (Social/In-person)" className="flex-[2] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-md flex items-center justify-center text-xs font-bold transition-colors border border-indigo-200 shadow-sm">
                                <Send className="h-3.5 w-3.5 mr-1" /> Other
                            </button>
                        </div>
                    </div>
                )}
                {item.status === 'Warm' && (
                    <div className="flex flex-col space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">2. Present info to move to Hot:</span>
                        <button onClick={handleDidPresentation} className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-2.5 rounded-md flex items-center justify-center text-sm font-bold transition-colors border border-purple-200 shadow-sm">
                            <PlayCircle className="h-4 w-4 mr-2 text-purple-600" /> 🎬 Did Presentation
                        </button>
                    </div>
                )}
                {item.status === 'Hot' && (
                    <div className="flex flex-col space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">3. Quick follow up ({exposureCount} touches):</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleLogFollowUp('call')} title="Called" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center transition-colors border border-green-200 shadow-sm">
                                <Phone className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleLogFollowUp('text')} title="Texted" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center transition-colors border border-green-200 shadow-sm">
                                <Smartphone className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleLogFollowUp('email')} title="Emailed" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center transition-colors border border-green-200 shadow-sm">
                                <Mail className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleLogFollowUp('meeting')} title="Coffee/Meeting" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center transition-colors border border-green-200 shadow-sm">
                                <Coffee className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Close Deal (Hot only) */}
            {item.status === 'Hot' && (
                <button onClick={() => onDecide(item)} className="w-full flex items-center justify-center text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-2.5 rounded-md shadow-sm transition mb-3">
                    <CheckCircle className="h-4 w-4 mr-2" /> ✅ Close the Deal
                </button>
            )}

            {/* Details Toggle */}
            <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-400 hover:text-indigo-600 flex items-center transition-colors mt-1"
            >
                {showDetails ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                {showDetails ? 'Hide Details' : 'Details & Actions'}
            </button>

            {/* Collapsible Details */}
            {showDetails && (
                <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    {/* Contact Info & Tags */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Phone className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="tel" placeholder="Phone" defaultValue={item.phone} onChange={(e) => onUpdate(item.id, 'phone', e.target.value)} className="pl-7 w-full text-xs border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white p-1.5" />
                                {item.phone && <a href={`tel:${item.phone}`} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-500 hover:text-indigo-700"><Phone className="h-3 w-3" /></a>}
                            </div>
                            <div className="relative flex-1">
                                <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input type="email" placeholder="Email" defaultValue={item.email} onChange={(e) => onUpdate(item.id, 'email', e.target.value)} className="pl-7 w-full text-xs border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white p-1.5" />
                                {item.email && <a href={`mailto:${item.email}`} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-500 hover:text-indigo-700"><Mail className="h-3 w-3" /></a>}
                            </div>
                        </div>
                        <div className="relative">
                            <Tag className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input type="text" placeholder="Tags (comma separated)..." defaultValue={item.tags?.join(', ')} onChange={(e) => onUpdate(item.id, 'tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} className="pl-7 w-full text-xs border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white p-1.5" />
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Activity History</span>
                        <div className="space-y-1.5 max-h-24 overflow-y-auto mb-2 text-xs bg-gray-50 rounded p-2 border border-gray-100">
                            {item.activities && item.activities.length > 0 ? [...item.activities].sort((a,b) => new Date(b.date) - new Date(a.date)).map(act => (
                                <div key={act.id} className="flex justify-between items-start border-b border-gray-200 last:border-0 pb-1 last:pb-0">
                                    <span className="text-gray-700"><span className="font-semibold text-gray-500 mr-1">{act.type === 'meeting' ? '☕' : act.type === 'call' ? '📞' : act.type === 'text' ? '💬' : act.type === 'email' ? '✉️' : '⚡'}</span>{act.description}</span>
                                    <span className="text-gray-400 text-[9px] whitespace-nowrap ml-2">{new Date(act.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                </div>
                            )) : <div className="text-gray-400 italic text-center text-[10px]">No activities logged yet.</div>}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="relative">
                        <textarea
                            defaultValue={item.notes}
                            onChange={(e) => onUpdate(item.id, 'notes', e.target.value)}
                            placeholder="Add general notes..."
                            className="w-full text-sm text-gray-600 border-gray-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            rows={isNotesExpanded ? 4 : 2}
                        />
                        <button onClick={() => setIsNotesExpanded(!isNotesExpanded)} className="absolute bottom-2 right-2 text-xs flex items-center font-semibold text-indigo-600 hover:text-indigo-800 bg-white/80 px-2 py-1 rounded-full border border-gray-100 shadow-sm">
                            <MessageSquare className="h-3 w-3 mr-1" /> {isNotesExpanded ? 'Collapse' : 'Expand'}
                        </button>
                    </div>

                    {/* Next Action Date */}
                    <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md">
                        <label htmlFor={`next-action-${item.id}`} className="text-xs font-medium text-gray-500 whitespace-nowrap">Follow-up date:</label>
                        <input
                            id={`next-action-${item.id}`}
                            type="date"
                            defaultValue={item.nextActionDate}
                            onChange={(e) => onInstantUpdate(item.id, { nextActionDate: e.target.value })}
                            className={`p-1 border rounded-md text-xs w-full bg-white ${isOverdue ? 'text-red-600 font-semibold' : ''}`}
                        />
                    </div>

                    {/* Snooze — tucked away so it can't be tapped accidentally */}
                    <button
                        onClick={handleSnooze}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 py-2 rounded-md flex items-center justify-center text-xs font-medium transition-colors"
                    >
                        <Clock className="h-3.5 w-3.5 mr-2" /> 📅 Remind Me in 3 Days — Remove from Today
                    </button>

                    {/* Danger zone */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Danger Zone</span>
                        <div className="flex gap-3">
                            <button
                                onClick={handleNotInterested}
                                className="flex items-center text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Not Interested
                            </button>
                            <button
                                onClick={() => onDelete(item.id)}
                                className="flex items-center text-xs text-gray-400 hover:text-red-600 font-medium"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// #8 — Win Wall + Archive with tabs
const ArchivedProspectsList = ({ list, onUnarchive, onDelete }) => {
    const [archiveTab, setArchiveTab] = useState('wins'); // 'wins' | 'all'
    const wins = list.filter(item => item.outcome === 'Member');
    const all  = list;

    const displayList = archiveTab === 'wins' ? wins : all;

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
        <div className="space-y-4">
            {/* Tab Bar */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setArchiveTab('wins')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                        archiveTab === 'wins' ? 'border-yellow-500 text-yellow-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    🏆 Win Wall ({wins.length})
                </button>
                <button
                    onClick={() => setArchiveTab('all')}
                    className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                        archiveTab === 'all' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    All Archive ({all.length})
                </button>
            </div>

            {/* Win Wall */}
            {archiveTab === 'wins' && (
                wins.length === 0 ? (
                    <div className="text-center py-10 px-6 bg-yellow-50 rounded-lg border border-yellow-100">
                        <span className="text-4xl">🏆</span>
                        <h3 className="mt-2 text-lg font-semibold text-yellow-900">No Wins Yet — Go Get One!</h3>
                        <p className="mt-1 text-sm text-yellow-700">Every member you close will be celebrated here permanently.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {wins
                            .sort((a, b) => new Date(b.decisionDate) - new Date(a.decisionDate))
                            .map((item, idx) => (
                                <div key={item.id} className="relative bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between shadow-sm overflow-hidden">
                                    {/* Rank Badge */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-black text-white text-lg shadow">
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{item.name}</p>
                                            <p className="text-xs text-yellow-700 font-medium">
                                                ✅ Became a Member &nbsp;·&nbsp; {item.decisionDate ? new Date(item.decisionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date N/A'}
                                            </p>
                                            {item.source && <p className="text-[10px] text-gray-500 mt-0.5">Source: {item.source}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => onUnarchive(item.id, { isArchived: false, outcome: null })} className="p-1.5 text-xs rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-100" title="Move back to pipeline">
                                            <ArchiveRestore className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        }
                        <p className="text-center text-xs text-gray-400 pt-2">🎉 {wins.length} total member{wins.length !== 1 ? 's' : ''} closed — keep adding to your legacy!</p>
                    </div>
                )
            )}

            {/* All Archive */}
            {archiveTab === 'all' && (
                <div className="space-y-3">
                    {displayList.map(item => (
                        <div key={item.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className={`text-sm font-medium ${item.outcome === 'Member' ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.outcome === 'Member' ? '✅ Became a Member' : '❌ Not Interested'}
                                </p>
                                <p className="text-xs text-gray-500">Decision: {item.decisionDate ? new Date(item.decisionDate).toLocaleDateString() : 'N/A'}</p>
                                {item.source && <p className="text-xs text-gray-400">Source: {item.source}</p>}
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
            )}
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
    const [viewMode, setViewMode] = useState('board');

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

    const handleAdd = async ({ name, phone = '', source = '' }) => {
        setShowAddModal(false);
        if (!name || !hotlistColRef) return;
        const newItem = {
            name, phone, source, email: '', tags: [], activities: [], notes: '', status: 'Cold',
            lastContacted: null, isArchived: false, exposureCount: 0, nextActionDate: null, outcome: null, decisionDate: null
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
        if (outcome === 'Not Interested') {
            const day = new Date().getDate();
            const currentCount = Number(monthlyData?.[day]?.nos || 0);
            onDataChange(new Date(), 'nos', currentCount + 1);
        }
        setItemToDecide(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete || !hotlistColRef) return;
        const docRef = doc(hotlistColRef, itemToDelete);
        await deleteDoc(docRef);
        setItemToDelete(null);
    };

    const statusConfig = {
        Hot: { title: '🔥 Hot — Follow Up & Close', icon: Flame, color: 'red', description: 'They saw a presentation. Keep following up until they decide. 5+ touches = Closing Zone.' },
        Warm: { title: '🌡️ Warm — Book a Presentation', icon: TrendingUp, color: 'amber', description: 'They received the info. Next step: sit them down for a full presentation.' },
        Cold: { title: '🧊 Cold — Prospect List', icon: Users, color: 'blue', description: 'New contacts. First step: share the info or a video to start the conversation.' },
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

                            <div className="flex items-center bg-gray-50 rounded-md p-1 border">
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><LayoutList className="h-4 w-4" /></button>
                                <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Board View"><LayoutGrid className="h-4 w-4" /></button>
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
            ) : viewMode === 'list' ? (
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
            ) : (
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {Object.keys(statusConfig).map(statusKey => {
                        const { title, icon: Icon, color, description } = statusConfig[statusKey];
                        const prospects = groupedProspects[statusKey];
                        return (
                            <div key={statusKey} className="flex-none w-[85vw] sm:w-[350px] lg:w-[calc(33.333%-16px)] snap-center shrink-0 flex flex-col max-h-[75vh]">
                                <div className={`bg-gray-50 rounded-xl p-3 border-t-4 border-${color}-500 shadow-sm flex flex-col h-full`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center">
                                            <Icon className={`h-5 w-5 text-${color}-500 mr-2`} />
                                            <h3 className="font-bold text-gray-800 text-sm">{title.split('—')[0]}</h3>
                                        </div>
                                        <span className={`bg-${color}-100 text-${color}-800 text-xs font-bold px-2 py-0.5 rounded-full`}>{prospects.length}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mb-3 leading-tight">{description}</p>
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-1">
                                        {prospects.length > 0 ? (
                                            prospects.map(item => (
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
                                            ))
                                        ) : (
                                            <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                                <p className="text-xs text-gray-400 font-medium">No prospects in {statusKey}.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default HotList;
