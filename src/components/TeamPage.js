import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch, updateDoc, deleteField } from 'firebase/firestore';
import { appId } from '../firebaseConfig';
import { Users, Share2, LogOut, ClipboardCopy, CheckCircle, Settings, Trash2 } from 'lucide-react';
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

const TeamDashboard = ({ teamData, teamMembers, onLeaveTeam, onShareInvite, user, onUpdateTeam, onRemoveMember }) => {
    const [showConfirmLeave, setShowConfirmLeave] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [copied, setCopied] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);

    const teamTotals = useMemo(() => {
        return teamMembers.reduce((acc, member) => {
            acc.exposures += member.weeklyExposures || member.exposures || 0;
            acc.presentations += member.weeklyPresentations || member.presentations || 0;
            acc.score += member.rankingScore || 0;
            acc.totalPar += (member.dailyPar || 2); // Sum of daily pars for one day
            return acc;
        }, { exposures: 0, presentations: 0, score: 0, totalPar: 0 });
    }, [teamMembers]);

    // Calculate Par To Date
    const getDaysElapsed = () => {
        const d = new Date();
        const currentDay = d.getDay(); // 0-6
        return currentDay + 1;
    };

    const daysElapsed = getDaysElapsed();
    const teamParToDate = teamTotals.totalPar * daysElapsed;
    const handicap = teamData.handicap || 0;
    const teamGrossScore = teamTotals.score + handicap;

    // Net Score: Par - Points (Golf Style. Positive = Behind/Over Par. Negative = Ahead/Under Par)
    const totalTeamScore = teamParToDate - teamGrossScore;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(teamData.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isCreator = user.uid === teamData.creatorId;

    const confirmRemoveMember = async () => {
        if (memberToRemove) {
            await onRemoveMember(memberToRemove.id || memberToRemove.uid);
            setMemberToRemove(null);
        }
    };

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
            {memberToRemove && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-red-600">Remove Member?</h3>
                            <p className="mt-2 text-gray-600">Are you sure you want to remove <span className="font-bold">{memberToRemove.displayName || "this member"}</span> from the team?</p>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end space-x-2">
                            <button onClick={() => setMemberToRemove(null)} className="bg-gray-200 px-4 py-2 rounded-md">Cancel</button>
                            <button onClick={confirmRemoveMember} className="bg-red-600 text-white px-4 py-2 rounded-md">Remove</button>
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
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Team Roster (Weekly Stats)</h3>
                <div className="space-y-3">
                    {teamMembers.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0)).map((member, index) => (
                        <div key={member.uid || member.userId || member.id} className={`p-3 rounded-lg flex items-center justify-between ${member.uid === user.uid || member.userId === user.uid ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}>
                            <div className="flex items-center">
                                <span className="font-bold text-lg w-8">{index + 1}</span>
                                <span className="font-medium flex flex-col">
                                    {member.displayName || "Unknown User"}
                                    <span className="text-xs text-gray-500 font-normal">Exposures: {member.weeklyExposures || member.exposures || 0}</span>
                                </span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="font-bold text-lg text-indigo-600">{member.rankingScore || 0} pts</span>
                                {isCreator && (member.uid !== user.uid && member.userId !== user.uid && member.id !== user.uid) && (
                                    <button onClick={() => setMemberToRemove(member)} className="text-gray-400 hover:text-red-600 p-1" title="Remove Member">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {teamMembers.length === 0 && <p className="text-center text-gray-500 py-4">No team members found.</p>}
                </div>
            </div>
        </div>
    );
};

const TeamPage = ({ user, db, userProfile, setUserProfile, weekId }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [teamData, setTeamData] = useState(null);
    const [stats, setStats] = useState({});
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
            const teamPayload = {
                name: teamName,
                inviteCode: newCode,
                creatorId: user.uid,
                createdAt: new Date(),
                roster: {
                    [user.uid]: { displayName: userProfile.displayName, joinedAt: new Date() }
                }
            };

            batch.set(newTeamRef, teamPayload);
            const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'inviteCodes', newCode);
            batch.set(codeRef, { teamId: newTeamRef.id });
            const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
            batch.update(userProfileRef, { teamId: newTeamRef.id });

            // Initialize stats
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

            const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', teamId);
            batch.update(teamRef, {
                [`roster.${user.uid}`]: { displayName: userProfile.displayName, joinedAt: new Date() }
            });

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
        const CurrentTeamId = userProfile.teamId; // Capture current ID

        const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid);
        await updateDoc(userProfileRef, { teamId: null });

        if (CurrentTeamId) {
            try {
                const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', CurrentTeamId);
                // Remove self from roster
                await updateDoc(teamRef, { [`roster.${user.uid}`]: deleteField() });
            } catch (e) {
                console.error("Error removing from roster", e);
            }
        }

        if (weekId) {
            const statsRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);
            try {
                await updateDoc(statsRef, { teamId: null });
            } catch (e) { }
        }

        setUserProfile(prev => ({ ...prev, teamId: null }));
        setTeamData(null);
        setStats({});
    }, [user, db, setUserProfile, weekId, userProfile.teamId, user.uid]);

    const handleShareInvite = () => {
        if (teamData) {
            const shareText = `Join my accountability team "${teamData.name}" on the Activity Tracker! Use this code: ${teamData.inviteCode}`;
            navigator.share({ title: 'Join My Team!', text: shareText });
        }
    };

    // 1. Fetch Team Data
    useEffect(() => {
        let unsubscribe = () => { };

        const fetchTeamData = async () => {
            if (!db || !userProfile.teamId) {
                setIsLoading(false);
                setTeamData(null);
                return;
            }
            setIsLoading(true);

            const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', userProfile.teamId);
            unsubscribe = onSnapshot(teamRef, async (docSnap) => {
                if (!docSnap.exists()) {
                    handleLeaveTeam();
                    return;
                }
                const data = docSnap.data();
                setTeamData({ id: docSnap.id, ...data });
                setIsLoading(false);

                // Self-Healing
                try {
                    const myId = userProfile.uid;
                    if (data.roster && !data.roster[myId]) {
                        console.log("Self-healing roster: Adding myself...");
                        await updateDoc(teamRef, {
                            [`roster.${myId}`]: { displayName: userProfile.displayName, joinedAt: new Date() }
                        });
                    } else if (!data.roster) {
                        console.log("Creating missing roster...");
                        await updateDoc(teamRef, {
                            roster: { [myId]: { displayName: userProfile.displayName, joinedAt: new Date() } }
                        });
                    }
                } catch (err) {
                    console.error("Self-healing failed:", err);
                }
            }, (error) => {
                console.error("Error fetching Team Data:", error);
                setIsLoading(false);
                // If it's a permission error, maybe we should just clear data?
                // setTeamData(null); 
            });
        };

        if (db && userProfile.uid && userProfile.teamId) {
            fetchTeamData();
        } else if (!userProfile.teamId) {
            setIsLoading(false);
        }

        return () => unsubscribe();
    }, [db, userProfile.uid, userProfile.teamId, userProfile.displayName, handleLeaveTeam]);

    // 2. Fetch Weekly Stats
    useEffect(() => {
        if (!db || !weekId || !userProfile.teamId) {
            setStats({});
            return;
        }

        const statsCollectionRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');
        const qStats = query(statsCollectionRef, where("teamId", "==", userProfile.teamId));

        const unsubscribeStats = onSnapshot(qStats, (snapshot) => {
            const statMap = {};
            snapshot.docs.forEach(d => {
                const data = d.data();
                const uid = data.userId || d.id;
                statMap[uid] = data;
            });
            setStats(statMap);
        }, (error) => {
            console.error("Error fetching team stats:", error);
        });

        return () => unsubscribeStats();
    }, [db, weekId, userProfile.teamId]);

    // 3. Merge Roster and Stats
    const teamMembers = useMemo(() => {
        const roster = teamData?.roster || {};

        const rosterIds = Object.keys(roster);
        const statsIds = Object.keys(stats);
        const allIds = new Set([...rosterIds, ...statsIds]);

        return Array.from(allIds).map(uid => {
            const rosterUser = roster[uid] || {};
            const userStats = stats[uid] || {};

            const displayName = rosterUser.displayName || userStats.displayName || "Unknown Member";

            return {
                ...rosterUser,
                ...userStats,
                displayName,
                uid,
                userId: uid,
                id: uid,
                weeklyExposures: userStats.weeklyExposures || userStats.exposures || 0,
                exposures: userStats.weeklyExposures || userStats.exposures || 0,
                weeklyPresentations: userStats.weeklyPresentations || userStats.presentations || 0,
                presentations: userStats.weeklyPresentations || userStats.presentations || 0,
                rankingScore: userStats.rankingScore || 0,
                dailyPar: userStats.dailyPar || 2
            };
        });
    }, [teamData, stats]);


    const handleUpdateTeam = async (updates) => {
        if (!user || !db || !teamData) return;
        const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', teamData.id);
        await updateDoc(teamRef, updates);
        setTeamData(prev => ({ ...prev, ...updates }));
    };

    const handleRemoveMember = async (memberId) => {
        if (!user || !db || !teamData) return;
        if (user.uid !== teamData.creatorId) return;

        try {
            const batch = writeBatch(db);
            const userRef = doc(db, 'artifacts', appId, 'users', memberId);
            batch.update(userRef, { teamId: null });

            if (weekId) {
                const statsRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', memberId);
                batch.update(statsRef, { teamId: null });
            }

            // Remove from Team Roster on Team Doc
            const teamRef = doc(db, 'artifacts', appId, 'public', 'data', 'teams', teamData.id);
            // batch.update does not support deleteField inside dot notation easily in this SDK version context sometimes,
            // but updateDoc does. We will do a separate await for roster removal to be safe.
            // Actually batch can do it too, but let's prioritize the batch commit first.
            await batch.commit();

            await updateDoc(teamRef, {
                [`roster.${memberId}`]: deleteField()
            });

        } catch (error) {
            console.error("Error removing member:", error);
        }
    };

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

    if (!teamData) {
        return <div className="text-center p-10 text-gray-500">Loading Team Data...</div>;
    }

    return <TeamDashboard teamData={teamData} teamMembers={teamMembers} onLeaveTeam={handleLeaveTeam} onShareInvite={handleShareInvite} user={user} onUpdateTeam={handleUpdateTeam} onRemoveMember={handleRemoveMember} />;
};

export default TeamPage;
