import React, { useState, useEffect } from 'react';
import { calculatePoints } from '../utils/scoring';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { appId } from '../firebaseConfig';
import { Trophy, Users, Flame, Award, Medal, ThumbsDown } from 'lucide-react';

const Leaderboard = ({ db, weekId, user }) => {
    const [scores, setScores] = useState([]);
    const [hustleScores, setHustleScores] = useState([]);
    const [teamScores, setTeamScores] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !weekId) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                // 1. Fetch ALL Individual Entries for the week (needed for Team Aggregation)
                // Note: Removing limit(20) to ensure we calculate full team scores.
                // If scaling becomes an issue, we should aggregate teams server-side (Cloud Functions).
                const leaderboardColRef = collection(db, 'artifacts', appId, 'leaderboard', weekId, 'entries');
                const q = query(leaderboardColRef, orderBy('exposures', 'desc'));
                const snapshot = await getDocs(q);
                const allEntries = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

                // 2. Fetch Teams (Name & Handicap)
                const teamsColRef = collection(db, 'artifacts', appId, 'public', 'data', 'teams');
                const teamSnap = await getDocs(teamsColRef);
                const teamsMap = {};
                teamSnap.forEach(doc => {
                    teamsMap[doc.id] = doc.data();
                });

                // 3. Process Individual Leaderboard (Top 20 display)
                // BUG FIX: Previously sorted by raw rankingScore, but each user has their own dailyPar.
                // The displayed score is `parToDate - rankingScore` where parToDate varies per user.
                // We MUST sort by the actual computed par score (ascending), not raw rankingScore.
                const d = new Date();
                const dayOfWeek = d.getDay(); // 0 = Sunday
                const daysElapsed = dayOfWeek + 1; // 1 = Sunday, 2 = Monday, etc.

                const withParScore = allEntries.map(entry => {
                    const effectivePar = entry.dailyPar || 2;
                    const parToDate = daysElapsed * effectivePar;
                    const pts = (entry.rankingScore !== undefined) ? entry.rankingScore : 0;
                    return { ...entry, _parScore: parToDate - pts };
                });

                // Golf logic: lowest par score is best (most negative = most under par = #1)
                const sortedIndividuals = withParScore.sort((a, b) => a._parScore - b._parScore);
                setScores(sortedIndividuals.slice(0, 20));

                // Compute a "Most Hustle" sub-board: top 10 by nos count
                const hustleBoard = [...allEntries]
                    .filter(e => (e.nos || 0) > 0)
                    .sort((a, b) => (b.nos || 0) - (a.nos || 0))
                    .slice(0, 10);
                setHustleScores(hustleBoard);

                // 4. Calculate User Rank
                if (user) {
                    const index = sortedIndividuals.findIndex(e => e.userId === user.uid);
                    if (index !== -1) {
                        setUserRank(index + 1);
                    } else {
                        // Not in list (unlikely since we fetched all, unless new user)
                        setUserRank(null);
                    }
                }

                // 5. Aggregate Team Scores (Golf Logic)
                const teamAgg = {};
                allEntries.forEach(entry => {
                    if (entry.teamId && teamsMap[entry.teamId]) {
                        if (!teamAgg[entry.teamId]) {
                            teamAgg[entry.teamId] = {
                                id: entry.teamId,
                                name: teamsMap[entry.teamId].name,
                                handicap: teamsMap[entry.teamId].handicap || 0,
                                totalPoints: 0,
                                totalDailyPar: 0
                            };
                        }
                        teamAgg[entry.teamId].totalPoints += (entry.rankingScore || 0);
                        teamAgg[entry.teamId].totalDailyPar += (entry.dailyPar || 2);
                    }
                });

                // Calculate Net Score for Teams
                const calculatedTeams = Object.values(teamAgg).map(team => {
                    const teamParToDate = team.totalDailyPar * daysElapsed;
                    const teamGrossScore = team.totalPoints + team.handicap;
                    const netScore = teamParToDate - teamGrossScore; // Positive = Behind (Red), Negative = Ahead (Green)
                    return { ...team, netScore };
                });

                // Sort Teams: Lowest Net Score is Best (Net Score matches Golf Logic logic: small/negative is better)
                calculatedTeams.sort((a, b) => a.netScore - b.netScore);

                setTeamScores(calculatedTeams.slice(0, 10)); // Top 10 Teams

            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [db, weekId, user]);


    const calculateParScore = (entry) => {
        // Individual Par Logic (Existing)
        const dayOfWeek = new Date().getDay();
        const effectivePar = entry.dailyPar || 2;
        const parToDate = (dayOfWeek + 1) * effectivePar;
        let totalPoints = entry.rankingScore;
        if (totalPoints === undefined) {
            totalPoints = calculatePoints(entry);
        }
        return parToDate - totalPoints;
    };

    const renderIronmanBadge = (streak) => {
        if (!streak || streak < 3) return null;
        let Icon = Medal;
        let color = "text-amber-600";
        let bg = "bg-amber-100";
        let title = `${streak} Day Ironman Streak (Bronze)`;

        if (streak >= 30) {
            Icon = Flame;
            color = "text-orange-500";
            bg = "bg-orange-100";
            title = `${streak} Day Ironman Streak (Diamond/Fire)`;
        } else if (streak >= 14) {
            Icon = Award;
            color = "text-yellow-500";
            bg = "bg-yellow-100";
            title = `${streak} Day Ironman Streak (Gold)`;
        } else if (streak >= 7) {
            color = "text-gray-400";
            bg = "bg-gray-100";
            title = `${streak} Day Ironman Streak (Silver)`;
        }

        return (
            <div className={`p-1 rounded-full ${bg} ml-2`} title={title}>
                <Icon className={`h-4 w-4 ${color}`} />
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Individual Leaderboard */}
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                    <Trophy className="mr-2 text-yellow-500 h-6 w-6" /> Individual Leaderboard
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
                                // Use the pre-computed par score (same value used for sorting) to guarantee display matches rank
                                const score = entry._parScore !== undefined ? entry._parScore : calculateParScore(entry);
                                const isDebt = score > 0;
                                const isEven = score === 0;

                                return (
                                    <div key={entry.id} className={`flex items-center justify-between p-3 rounded-lg ${entry.userId === user?.uid ? 'bg-indigo-50 border border-indigo-100 ring-1 ring-indigo-200' : 'bg-gray-50 border border-gray-100'}`}>
                                        <div className="flex items-center">
                                            <span className={`font-bold w-8 text-center ${index < 3 ? 'text-yellow-600 text-lg' : 'text-gray-500'}`}>
                                                #{index + 1}
                                            </span>
                                            <div>
                                                <p className={`font-semibold flex items-center ${entry.userId === user?.uid ? 'text-indigo-900' : 'text-gray-800'}`}>
                                                    {entry.displayName} {entry.userId === user?.uid && '(You)'}
                                                    {renderIronmanBadge(entry.ironmanStreak)}
                                                </p>
                                                {/* Optional: Show individual team name? */}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center">
                                                <span className={`font-bold text-lg ${isDebt ? 'text-red-600' : (isEven ? 'text-blue-600' : 'text-green-600')}`}>
                                                    {score > 0 ? `+${score}` : (score === 0 ? 'E' : score)}
                                                </span>
                                                <span className="text-xs text-gray-400 ml-1 font-medium">{isDebt ? 'OVER' : (isEven ? 'EVEN' : 'UNDER')}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-400">{entry.exposures} exp</span>
                                                {(entry.nos || 0) > 0 && (
                                                    <span className="flex items-center text-xs font-semibold text-orange-500">
                                                        <ThumbsDown className="h-3 w-3 mr-0.5" />{entry.nos} No's
                                                    </span>
                                                )}
                                            </div>
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

            {/* Team Leaderboard */}
            {!loading && teamScores.length > 0 && (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                        <Users className="mr-2 text-indigo-500 h-6 w-6" /> Top Teams
                    </h2>
                    <div className="space-y-2">
                        {teamScores.map((team, index) => {
                            const isDebt = team.netScore > 0;
                            const isEven = team.netScore === 0;
                            return (
                                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center">
                                        <span className={`font-bold w-8 text-center ${index < 3 ? 'text-yellow-600 text-lg' : 'text-gray-500'}`}>
                                            #{index + 1}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-gray-800">{team.name}</p>
                                            <p className="text-xs text-gray-500">Handicap: {team.handicap}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`font-bold text-lg ${isDebt ? 'text-red-600' : (isEven ? 'text-blue-600' : 'text-green-600')}`}>
                                            {team.netScore > 0 ? `+${team.netScore}` : (team.netScore === 0 ? 'E' : team.netScore)}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-1 font-medium">{isDebt ? 'OVER' : (isEven ? 'EVEN' : 'UNDER')}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Most Hustle Sub-Leaderboard */}
            {!loading && hustleScores.length > 0 && (
                <div className="p-4 bg-white rounded-xl shadow-sm border border-orange-100">
                    <h2 className="text-xl font-bold mb-1 flex items-center text-gray-800">
                        <ThumbsDown className="mr-2 text-orange-500 h-5 w-5" /> Most Hustle
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">Ranked by No's collected — the bravest prospectors this week</p>
                    <div className="space-y-2">
                        {hustleScores.map((entry, index) => (
                            <div key={entry.id} className={`flex items-center justify-between p-3 rounded-lg ${entry.userId === user?.uid ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-100'}`}>
                                <div className="flex items-center">
                                    <span className={`font-bold w-8 text-center ${index < 3 ? 'text-orange-500 text-lg' : 'text-gray-400'}`}>
                                        #{index + 1}
                                    </span>
                                    <p className={`font-semibold ${entry.userId === user?.uid ? 'text-orange-900' : 'text-gray-800'}`}>
                                        {entry.displayName} {entry.userId === user?.uid && '(You)'}
                                    </p>
                                </div>
                                <div className="flex items-center bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full">
                                    <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                                    <span>{entry.nos}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* --- Most Consistent / Discipline Board --- */}
            <div className="mt-8 p-5 bg-white rounded-xl shadow-sm border">
                <h3 className="text-base font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center">
                    <span className="mr-2">💪</span> Most Consistent — Daily Cycle Streak
                </h3>
                {scores
                    .filter(e => (e.ironmanStreak || 0) > 0)
                    .sort((a, b) => (b.ironmanStreak || 0) - (a.ironmanStreak || 0))
                    .slice(0, 5)
                    .map((entry, idx) => (
                        <div key={entry.userId} className={`flex items-center justify-between p-3 rounded-lg mb-2 ${
                            entry.userId === user?.uid ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                        }`}>
                            <div className="flex items-center">
                                <span className="text-lg font-black text-gray-400 w-7 text-center">{idx + 1}</span>
                                <span className="ml-3 font-semibold text-gray-800 text-sm">{entry.displayName || 'Player'}</span>
                            </div>
                            <div className="flex items-center text-sm font-bold text-orange-600">
                                <span className="mr-1">🔥</span> {entry.ironmanStreak || 0}d streak
                            </div>
                        </div>
                    ))
                }
                {scores.filter(e => (e.ironmanStreak || 0) > 0).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No streaks yet — complete your Daily Cycle to get on the board!</p>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
