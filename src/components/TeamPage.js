import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch, updateDoc } from 'firebase/firestore';
import { appId } from '../firebaseConfig';
import { Users, Share2, LogOut, ClipboardCopy, CheckCircle, Settings } from 'lucide-react';
import { generateInviteCode as genCode } from '../utils/helpers';

const CreateTeamModal = ({ onClose, onCreateTeam }) => {
    const [teamName, setTeamName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async () => {
        if (!teamName.trim()) return;
        setIsLoading(true);
        await onCreateTeam(teamName.trim());
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Create a New Team</h3></div>
                <div className="p-6">
                    <label htmlFor="team-name" className="block text-sm font-medium text-gray-700">Team Name</label>
                    <input type="text" id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" autoFocus />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={handleCreate} disabled={isLoading || !teamName.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:bg-indigo-400">
                        {isLoading ? 'Creating...' : 'Create Team'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const JoinTeamModal = ({ onClose, onJoinTeam }) => {
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async () => {
        if (!inviteCode.trim()) return;
        setIsLoading(true);
        setError('');
        const success = await onJoinTeam(inviteCode.trim().toUpperCase());
        if (!success) {
            setError('Invalid invite code. Please try again.');
        } else {
            onClose();
        }
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Join an Existing Team</h3></div>
                <div className="p-6">
                    <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700">6-Digit Invite Code</label>
                    <input type="text" id="invite-code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" autoFocus />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={handleJoin} disabled={isLoading || !inviteCode.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:bg-indigo-400">
                        {isLoading ? 'Joining...' : 'Join Team'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TeamSettingsModal = ({ teamData, onClose, onUpdateTeam }) => {
    const [name, setName] = useState(teamData.name);
    const [handicap, setHandicap] = useState(teamData.handicap || 0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        setIsLoading(true);
        await onUpdateTeam({ name, handicap: Number(handicap) });
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold">Team Settings</h3></div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Team Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Weekly Handicap (Points)</label>
                        <p className="text-xs text-gray-500 mb-1">Founding members or small teams can get a point boost.</p>
                        <input type="number" value={handicap} onChange={(e) => setHandicap(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:bg-indigo-400">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... (JoinTeamModal, CreateTeamModal remain same) ...

const TeamDashboard = ({ teamData, teamMembers, onLeaveTeam, onShareInvite, user, onUpdateTeam }) => {
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [copied, setCopied] = useState(false);

    const teamTotals = useMemo(() => {
        return teamMembers.reduce((acc, member) => {
            acc.exposures += member.weeklyExposures || member.exposures || 0;
            acc.presentations += member.weeklyPresentations || member.presentations || 0;
            acc.score += member.rankingScore || 0;
            return acc;
        }, { exposures: 0, presentations: 0, score: 0 });
    }, [teamMembers]);

    const handicap = teamData.handicap || 0;
    const totalTeamScore = teamTotals.score + handicap;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(teamData.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isCreator = user.uid === teamData.creatorId;

    return (
        <div className="space-y-6">
            {showSettings && <TeamSettingsModal teamData={teamData} onClose={() => setShowSettings(false)} onUpdateTeam={onUpdateTeam} />}
            {showConfirmLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6"><h3 className="text-xl font-semibold">Leave Team?</h3><p className="mt-2 text-gray-600">Are you sure you want to leave "{teamData.name}"?</p></div>
                        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                            <button onClick={() => setShowConfirmLeave(false)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                            <button onClick={onLeaveTeam} className="bg-red-600 text-white px-4 py-2 rounded-md">Leave</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{teamData.name}</h2>
                            {isCreator && <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-indigo-600"><Settings className="h-5 w-5" /></button>}
                        </div>
                        <div className="mt-2 flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
                            <span className="text-sm font-medium text-gray-500">INVITE CODE:</span>
                            <span className="text-lg font-bold text-indigo-600 tracking-widest">{teamData.inviteCode}</span>
                            <button onClick={copyToClipboard} className="text-gray-500 hover:text-indigo-600 p-1">
                                {copied ? <CheckCircle className="h-5 w-5 text-green-500" /> : <ClipboardCopy className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                        <button onClick={onShareInvite} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm text-sm"><Share2 className="h-4 w-4 mr-2" /> Share Invite</button>
                        <button onClick={() => setShowConfirmLeave(true)} className="flex items-center bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 text-sm"><LogOut className="h-4 w-4 mr-2" /> Leave</button>
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-indigo-50 p-4 rounded-lg"><p className="text-sm font-medium text-indigo-700">Team Exposures</p><p className="text-4xl font-bold text-indigo-900">{teamTotals.exposures}</p></div>
                    <div className="bg-purple-50 p-4 rounded-lg"><p className="text-sm font-medium text-purple-700">Team Presentations</p><p className="text-4xl font-bold text-purple-900">{teamTotals.presentations}</p></div>
                    <div className={`p-4 rounded-lg ${totalTeamScore > 0 ? 'bg-red-50' : (totalTeamScore < 0 ? 'bg-green-50' : 'bg-gray-100')}`}>
                        <p className={`text-sm font-medium ${totalTeamScore > 0 ? 'text-red-700' : (totalTeamScore < 0 ? 'text-green-700' : 'text-gray-700')}`}>
                            Team Score {handicap !== 0 && <span className="text-xs">(HCP: {handicap})</span>}
                        </p>
                        <p className={`text-4xl font-bold ${totalTeamScore > 0 ? 'text-red-900' : (totalTeamScore < 0 ? 'text-green-900' : 'text-gray-900')}`}>
                            {totalTeamScore > 0 ? `+${totalTeamScore}` : totalTeamScore}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Weekly Team Leaderboard (by Weighted Score)</h3>
                <div className="space-y-3">
                    {teamMembers.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0)).map((member, index) => (
                        <div key={member.uid} className={`p-3 rounded-lg flex items-center justify-between ${member.uid === user.uid ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}>
                            <div className="flex items-center">
                                <span className="font-bold text-lg w-8">{index + 1}</span>
                                <span className="font-medium flex flex-col">
                                    {member.displayName}
                                    <span className="text-xs text-gray-500 font-normal">Exposures: {member.weeklyExposures || member.exposures || 0}</span>
                                </span>
                            </div>
                            <span className="font-bold text-lg text-indigo-600">{member.rankingScore || 0} pts</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TeamPage = ({ user, db, userProfile, setUserProfile, weekId }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [teamData, setTeamData] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleCreateTeam = async (teamName) => {
        if (!user || !db || !userProfile.displayName) return;
        setIsLoading(true);
        try {
            let newCode = '';
            let codeExists = true;

            while (codeExists) {
                newCode = genCode();
                const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', newCode);
                const codeSnap = await getDoc(codeRef);
                codeExists = codeSnap.exists();
            }

            const teamColRef = collection(db, 'artifacts', appId, 'public', 'data', 'teams');
            const newTeamRef = doc(teamColRef);

            const batch = writeBatch(db);
            batch.set(newTeamRef, { name: teamName, inviteCode: newCode, creatorId: user.uid, createdAt: new Date() });
            const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', newCode);
            batch.set(codeRef, { teamId: newTeamRef.id });
            const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
            batch.update(userProfileRef, { teamId: newTeamRef.id });

            // Initialize stats for current week
            const currentWeekId = weekId; // Or getWeekId(new Date()) if imported
            // Since we receive weekId from App which is based on currentDate state, 
            // and usually people create teams on "Today", using weekId prop is safe enough 
            // OR ideally import getWeekId. I'll stick to weekId prop for simplicity if it matches current.
            // But to be robust, let's assume weekId passed is valid for initialization or just use the prop.

            const statsRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);
            batch.set(statsRef, {
                displayName: userProfile.displayName,
                teamId: newTeamRef.id,
                exposures: 0,
                presentations: 0,
                weeklyExposures: 0,
                weeklyPresentations: 0,
                userId: user.uid,
                weekId: weekId,
                lastUpdated: new Date()
            }, { merge: true });

            await batch.commit();
            setUserProfile(prev => ({ ...prev, teamId: newTeamRef.id }));
        } catch (error) {
            console.error("Error creating team:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinTeam = async (inviteCode) => {
        if (!user || !db || !userProfile.displayName) return false;
        const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', inviteCode);
        const codeSnap = await getDoc(codeRef);
        if (codeSnap.exists()) {
            const { teamId } = codeSnap.data();

            const batch = writeBatch(db);
            const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
            batch.update(userProfileRef, { teamId });

            const statsRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);
            batch.set(statsRef, {
                displayName: userProfile.displayName,
                teamId: teamId,
                exposures: 0,
                presentations: 0,
                weeklyExposures: 0,
                weeklyPresentations: 0,
                userId: user.uid,
                weekId: weekId,
                lastUpdated: new Date()
            }, { merge: true });

            await batch.commit();
            setUserProfile(prev => ({ ...prev, teamId }));
            return true;
        }
        return false;
    };

    const handleLeaveTeam = useCallback(async () => {
        if (!user || !db) return;
        const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await updateDoc(userProfileRef, { teamId: null });

        // Optionally remove teamId from current week's entry so they disappear from leaderboard immediately
        if (weekId) {
            const statsRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);
            try {
                // We update teamId to null or delete the field?
                // If we set null, they won't appear in the query `where('teamId', '==', ...)`
                await updateDoc(statsRef, { teamId: null });
            } catch (e) {
                // Ignore if doc doesn't exist
            }
        }

        setUserProfile(prev => ({ ...prev, teamId: null }));
        setTeamData(null);
        setTeamMembers([]);
    }, [user, db, setUserProfile, weekId]);

    const handleShareInvite = () => {
        if (teamData) {
            const shareText = `Join my accountability team "${teamData.name}" on the Activity Tracker! Use this code: ${teamData.inviteCode}`;
            navigator.share({ title: 'Join My Team!', text: shareText });
        }
    };

    useEffect(() => {
        let unsubscribe = () => { };

        const fetchTeamData = async () => {
            if (!db) return;
            if (!userProfile.teamId) {
                setIsLoading(false);
                setTeamData(null);
                setTeamMembers([]);
                return;
            }
            setIsLoading(true);

            // Fetch Team Info
            const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', userProfile.teamId);
            const teamSnap = await getDoc(teamRef);
            if (!teamSnap.exists()) {
                handleLeaveTeam();
                return;
            }
            setTeamData({ id: teamSnap.id, ...teamSnap.data() });

            // Fetch Team Stats from Weekly Leaderboard Collection
            // Use the prop `weekId` to toggle weeks!
            const statsCollectionRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');
            const q = query(statsCollectionRef, where("teamId", "==", userProfile.teamId));

            unsubscribe = onSnapshot(q, (snapshot) => {
                const members = snapshot.docs.map(d => d.data());
                setTeamMembers(members);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching team members in real-time:", error);
                setIsLoading(false);
            });
        };

        if (db && user && userProfile.uid && weekId) {
            fetchTeamData();
        } else if (!userProfile.teamId) {
            setIsLoading(false);
        }

        return () => unsubscribe();

    }, [user, db, userProfile.uid, userProfile.teamId, handleLeaveTeam, weekId]);

    if (isLoading) {
        return <div className="text-center p-10">Loading Team...</div>;
    }

    if (!userProfile.teamId) {
        return (
            <div className="text-center bg-white p-8 rounded-lg shadow-sm">
                {showCreateModal && <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreateTeam={handleCreateTeam} />}
                {showJoinModal && <JoinTeamModal onClose={() => setShowJoinModal(false)} onJoinTeam={handleJoinTeam} />}
                <Users className="mx-auto h-12 w-12 text-indigo-400" />
                <h2 className="mt-4 text-2xl font-bold text-gray-900">Team Accountability</h2>
                <p className="mt-2 text-gray-600">Create a team to track progress with your peers, or join an existing one.</p>
                <div className="mt-6 flex justify-center space-x-4">
                    <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold">Create a Team</button>
                    <button onClick={() => setShowJoinModal(true)} className="bg-white text-indigo-700 px-6 py-3 rounded-md font-semibold border border-indigo-200 hover:bg-indigo-50">Join a Team</button>
                </div>
            </div>
        );
    }

    const handleUpdateTeam = async (updates) => {
        if (!user || !db || !teamData) return;
        const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', teamData.id);
        await updateDoc(teamRef, updates);
        setTeamData(prev => ({ ...prev, ...updates }));
    };

    if (!teamData) {
        return <div className="text-center p-10 text-gray-500">Loading Team Data...</div>;
    }

    return <TeamDashboard teamData={teamData} teamMembers={teamMembers} onLeaveTeam={handleLeaveTeam} onShareInvite={handleShareInvite} user={user} onUpdateTeam={handleUpdateTeam} />;
};

export default TeamPage;
