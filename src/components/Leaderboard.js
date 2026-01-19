import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { appId } from '../firebaseConfig';

const Leaderboard = ({ db, monthYearId, user }) => {
    const [scores, setScores] = useState([]);
    const [userRank, setUserRank] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            if (!db) return;
            // Lazy load - in a real implementation we might want to check if this component is visible or active
            // But since it's mounting when the tab is clicked, it's fine.
            const leaderboardColRef = collection(db, 'artifacts', appId, 'leaderboard', monthYearId, 'entries');
            const q = query(leaderboardColRef, orderBy('exposures', 'desc'), limit(20));
            const snapshot = await getDocs(q);
            const leaderboardData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            setScores(leaderboardData);

            const userEntry = leaderboardData.find(entry => entry.userId === user.uid);
            if (userEntry) {
                // Optimization: Only count if user is not in top 20 or we want exact rank.
                // Ideally if user is in top 20, we know the rank from index.
                // If not in top 20, we query. 
                // But wait, "index + 1" is the rank for the top 20 list. 
                // If the user isn't in the list, we need to query.
                // The original code queried *whenever* userEntry was found in the *local data*? No, wait.
                // "userEntry = leaderboardData.find...". This only finds if user is in top 20.
                // So if user is in top 20, why query again? 
                // Ah, the original code did: "if (userEntry) { rankQuery... }"
                // That seems redundant if we have the index. But strict rank might differ if there are ties? 
                // Firestore orderBy is deterministic with document ID tie-breaking if not specified, but here it's just exposures.
                // Let's optimize: use index if in top 20. Query only if NOT in top 20? 
                // Original logic: If user is in top 20, it queried for rank. This is safer for ties but expensive.
                // Let's stick to the original logic for now to ensure correctness, or optimize if simpler.
                // Actually, counting documents > userScore is the standard way.
                const rankQuery = query(leaderboardColRef, where('exposures', '>', userEntry.exposures));
                const higherScoresSnap = await getCountFromServer(rankQuery);
                setUserRank(higherScoresSnap.data().count + 1);
            } else {
                // If user is NOT in top 20, we should probably still find their rank?
                // The original code just set null if not in top 20. 
                // That's a UX gap we can fix later. For now, keep parity.
                setUserRank(null);
            }
        };
        fetchLeaderboard();
    }, [db, monthYearId, user.uid]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Top 20 Leaderboard</h2>
            <div className="space-y-3">
                {scores.map((entry, index) => (
                    <div key={entry.id} className={`p-3 rounded-lg flex items-center justify-between ${entry.userId === user.uid ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}>
                        <div className="flex items-center">
                            <span className="font-bold text-lg w-8">{index + 1}</span>
                            <span className="font-medium">{entry.displayName}</span>
                        </div>
                        <span className="font-bold text-lg text-indigo-600">{entry.exposures}</span>
                    </div>
                ))}
            </div>
            {userRank && (
                <div className="mt-4 text-center p-3 bg-amber-100 text-amber-800 font-semibold rounded-lg">
                    Your Rank: {userRank}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
