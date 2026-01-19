import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer, doc, getDoc } from 'firebase/firestore';
import { appId } from '../firebaseConfig';
import { Trophy } from 'lucide-react';

const Leaderboard = ({ db, weekId, user }) => {
    const [scores, setScores] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !weekId) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                // Fetch top 20
                const leaderboardColRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');
                const q = query(leaderboardColRef, orderBy('exposures', 'desc'), limit(20));
                const snapshot = await getDocs(q);
                const leaderboardData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
                setScores(leaderboardData);

                // Find user rank
                if (user) {
                    const userEntry = leaderboardData.find(e => e.userId === user.uid);
                    if (userEntry) {
                        // If in top 20, just use the index + 1
                        const rank = leaderboardData.indexOf(userEntry) + 1;
                        setUserRank(rank);
                    } else {
                        // If not in top 20, check if we have an entry at all
                        const userDocRef = doc(db, 'artifacts', appId, 'leaderboard', weekId, 'entries', user.uid);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            // If user has a score, count how many are strictly better
                            const userExposures = userDocSnap.data().exposures || 0;
                            const qCount = query(leaderboardColRef, where('exposures', '>', userExposures));
                            const countSnap = await getCountFromServer(qCount);
                            setUserRank(countSnap.data().count + 1);
                        } else {
                            setUserRank(null);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [db, weekId, user]);

    return (
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                <Trophy className="mr-2 text-yellow-500 h-6 w-6" /> Weekly Leaderboard
            </h2>
            <p className="text-xs text-gray-500 mb-4">Week of {weekId} (Sun-Sat)</p>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading scores...</div>
            ) : (
                <div className="space-y-2">
                    {scores.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">No activity yet this week. Be the first!</div>
                    ) : (
                        scores.map((entry, index) => (
                            <div key={entry.id} className={`flex items-center justify-between p-3 rounded-lg ${entry.userId === user?.uid ? 'bg-indigo-50 border border-indigo-100 ring-1 ring-indigo-200' : 'bg-gray-50 border border-gray-100'}`}>
                                <div className="flex items-center">
                                    <span className={`font-bold w-8 text-center ${index < 3 ? 'text-yellow-600 text-lg' : 'text-gray-500'}`}>
                                        #{index + 1}
                                    </span>
                                    <div>
                                        <p className={`font-semibold ${entry.userId === user?.uid ? 'text-indigo-900' : 'text-gray-800'}`}>
                                            {entry.displayName} {entry.userId === user?.uid && '(You)'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-bold text-lg text-indigo-600">{entry.exposures}</span>
                                    <span className="text-xs text-gray-400 ml-1">exp</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {!loading && userRank && userRank > 20 && (
                <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm text-gray-600">
                    You are currently ranked <strong>#{userRank}</strong>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
