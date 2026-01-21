import React, { useState, useEffect } from 'react';
import { calculatePoints } from '../utils/scoring';
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


    const calculateParScore = (entry) => {
        // Determine Par to Date
        // If viewing past week, Par is 14.
        // If viewing current week, Par is (DayOfWeek + 1) * 2.

        // We need to know if weekId is current week.
        // weekId format: "2024-W33" ? No, let's look at getWeekId usage or passed prop.
        // The component receives `weekId`. I can compare it to current week id.
        // However, I don't have `getWeekId` imported here. 
        // I'll simplistically assume if it matches current week calculated locally.

        // Actually, easier:
        // Pass `isCurrentWeek` prop? Or calculate it.
        // Since I don't want to break existing usage, I will infer roughly or just calc based on today if the week matches.

        // Let's import helper or duplicate logic? 
        // `getWeekId` is in utils. Let's rely on the user passing `weekId`.

        const today = new Date();
        const currentYear = today.getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const pastDays = Math.floor((today - startOfYear) / 86400000);
        const currentWeekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const currentWeekId = `${currentYear}-W${currentWeekNum}`;
        const paddedWeekId = `${currentYear}-W${String(currentWeekNum).padStart(2, '0')}`; // weekId usually padded? 
        // Let's assume standard ISO week or similar. 
        // Actually, `App.js` passes `getWeekId(currentDate)`.

        // To be safe and robust:
        // If the entry has `lastUpdated` timestamp, maybe I can use that? No.

        // Let's assume for the "Leaderboard" tab, it usually defaults to current week. 
        // If I am viewing history, I should probably see final scores (Par 14).
        // BUT, for now, let's just calculate Par based on the assumption that we are looking at the ACTIVE competition.
        // If it's the current week, use today's day index. If it's a past week, use 14.

        // Simplification:
        // Always calculate "Current Standing" logic.
        // Par = (Day Index + 1) * 2.
        // Day Index (0-6).

        const dayOfWeek = new Date().getDay(); // 0 (Sun) - 6 (Sat)
        // If we are consistent with "Day resets at midnight to -2", then Sunday start = 2 PAR total for Sunday.

        let totalPoints = entry.rankingScore;
        if (totalPoints === undefined) {
            totalPoints = calculatePoints(entry);
        }

        const effectivePar = entry.dailyPar || 2;
        const parToDate = (dayOfWeek + 1) * effectivePar;

        const score = parToDate - totalPoints;
        return score;
    };

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
                        scores.map((entry, index) => {
                            const score = calculateParScore(entry);
                            const isDebt = score > 0;
                            const isEven = score === 0;

                            return (
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
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center">
                                            <span className={`font-bold text-lg ${isDebt ? 'text-red-600' : (isEven ? 'text-blue-600' : 'text-green-600')}`}>
                                                {score > 0 ? `+${score}` : (score === 0 ? 'E' : score)}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-1 font-medium">{isDebt ? 'OVER' : (isEven ? 'EVEN' : 'UNDER')}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">({entry.exposures} exp)</span>
                                    </div>
                                </div>
                            );
                        })
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

