import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { appId } from '../firebaseConfig';
import { Flame, Users, Star, TrendingUp } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const REACTIONS = [
    { key: 'lets_go',       label: '🔥 Let\'s Go!' },
    { key: 'sw4',           label: '💪 SW4!' },
    { key: 'thats_ironman', label: '👏 That\'s Ironman!' },
    { key: 'keep_grinding', label: '🙌 Keep Grinding!' },
];

const POST_TYPE_META = {
    ironman_streak:   { icon: '🔥', color: 'from-orange-500 to-red-500',   bg: 'bg-orange-50',  border: 'border-orange-200' },
    streak_milestone: { icon: '📈', color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
    personal_best:    { icon: '💎', color: 'from-yellow-500 to-amber-500',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
    membership_sold:  { icon: '🎉', color: 'from-green-500 to-teal-500',    bg: 'bg-green-50',   border: 'border-green-200' },
};

const STREAK_LABELS = {
    exposures:           'Exposures',
    followUps:           'Follow-Ups',
    nos:                 "No's",
    exerc:               'Exercise',
    personalDevelopment: 'Personal Dev',
    ironman:             'Ironman',
};

// ── Helpers ────────────────────────────────────────────────────────────────
const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)   return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

// ── Reaction Button ────────────────────────────────────────────────────────
const ReactionButton = ({ reactionKey, label, reactors, userId, onToggle }) => {
    const count = reactors?.length || 0;
    const hasReacted = userId && reactors?.includes(userId);

    return (
        <button
            onClick={() => onToggle(reactionKey)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                hasReacted
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
        >
            {label}
            {count > 0 && (
                <span className={`ml-1 font-bold ${hasReacted ? 'text-indigo-100' : 'text-gray-400'}`}>
                    {count}
                </span>
            )}
        </button>
    );
};

// ── Win Post Card ──────────────────────────────────────────────────────────
const WinCard = ({ post, userId, db }) => {
    const meta = POST_TYPE_META[post.type] || POST_TYPE_META.streak_milestone;

    const handleReactionToggle = useCallback(async (reactionKey) => {
        if (!userId || !db) return;
        const postRef = doc(db, 'artifacts', appId, 'communityFeed', post.id);
        const currentReactors = post.reactions?.[reactionKey] || [];
        const alreadyReacted = currentReactors.includes(userId);
        const updated = alreadyReacted
            ? currentReactors.filter(id => id !== userId)
            : [...currentReactors, userId];
        try {
            await updateDoc(postRef, { [`reactions.${reactionKey}`]: updated });
        } catch (err) {
            console.warn('Reaction update failed:', err);
        }
    }, [userId, db, post.id, post.reactions]);

    return (
        <div className={`rounded-xl border ${meta.border} ${meta.bg} p-4 shadow-sm`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${meta.color} flex items-center justify-center text-white text-lg flex-shrink-0 shadow-sm`}>
                        {meta.icon}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                            {post.authorName}
                        </p>
                        <p className="text-xs text-gray-500">{timeAgo(post.timestamp)}</p>
                    </div>
                </div>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-800 font-medium mb-3 leading-snug">
                {post.message}
            </p>

            {/* Reactions */}
            <div className="flex flex-wrap gap-1.5">
                {REACTIONS.map(r => (
                    <ReactionButton
                        key={r.key}
                        reactionKey={r.key}
                        label={r.label}
                        reactors={post.reactions?.[r.key] || []}
                        userId={userId}
                        onToggle={handleReactionToggle}
                    />
                ))}
            </div>
        </div>
    );
};

// ── Empty State ────────────────────────────────────────────────────────────
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <Flame className="h-8 w-8 text-orange-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">No wins posted yet</h3>
        <p className="text-sm text-gray-500 max-w-xs">
            Complete your Daily Cycle or hit a streak milestone to be the first win on the board! 🔥
        </p>
    </div>
);

// ── Stats Bar ──────────────────────────────────────────────────────────────
const StatsBar = ({ posts }) => {
    const authorSet = new Set(posts.map(p => p.authorId));
    const ironmanCount = posts.filter(p => p.type === 'ironman_streak').length;
    const streakCount = posts.filter(p => p.type === 'streak_milestone').length;

    return (
        <div className="grid grid-cols-3 gap-3 mb-5">
            {[
                { icon: Users,    value: authorSet.size, label: 'Active Members', color: 'text-indigo-600' },
                { icon: Flame,    value: ironmanCount,   label: 'Ironman Wins',   color: 'text-orange-500' },
                { icon: TrendingUp, value: streakCount,  label: 'Streak Milestones', color: 'text-purple-500' },
            ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                    <p className="text-[10px] text-gray-500 font-medium leading-tight">{label}</p>
                </div>
            ))}
        </div>
    );
};

// ── Main Community Feed ────────────────────────────────────────────────────
const CommunityFeed = ({ db, user, userProfile }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mark community as visited on mount (for badge clearing)
    useEffect(() => {
        localStorage.setItem('lastCommunityVisit', new Date().toISOString());
    }, []);

    // Subscribe to last 30 days of community posts
    useEffect(() => {
        if (!db) return;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const feedRef = collection(db, 'artifacts', appId, 'communityFeed');
        const q = query(
            feedRef,
            where('timestamp', '>=', thirtyDaysAgo),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPosts(data);
            setLoading(false);
        }, (err) => {
            console.warn('Community feed subscription error:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    if (loading) {
        return (
            <div className="space-y-3 mt-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Star className="h-6 w-6 text-yellow-500" />
                        Win Feed
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Community milestones from the last 30 days
                    </p>
                </div>
            </div>

            {posts.length > 0 && <StatsBar posts={posts} />}

            {/* Feed */}
            {posts.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="space-y-3">
                    {posts.map(post => (
                        <WinCard
                            key={post.id}
                            post={post}
                            userId={user?.uid}
                            db={db}
                        />
                    ))}
                </div>
            )}

            {/* Footer */}
            {posts.length > 0 && (
                <p className="text-center text-xs text-gray-400 pb-4">
                    Showing wins from the last 30 days · Hit your Daily Cycle milestones to appear here!
                </p>
            )}
        </div>
    );
};

export default CommunityFeed;

// ── Exported helper: writeCommunityPost ───────────────────────────────────
// Called from App.js when milestones are detected.
export const writeCommunityPost = async (db, user, userProfile, postData) => {
    if (!db || !user || !userProfile?.displayName) return;
    try {
        const feedRef = collection(db, 'artifacts', appId, 'communityFeed');
        await addDoc(feedRef, {
            authorId: user.uid,
            authorName: userProfile.displayName,
            timestamp: new Date(),
            reactions: { lets_go: [], sw4: [], thats_ironman: [], keep_grinding: [] },
            ...postData,
        });
    } catch (err) {
        // Always silent — never interrupts core features
        console.warn('Community post write silently failed:', err);
    }
};

// Streak type → human label (used in App.js message building)
export const STREAK_TYPE_LABELS = STREAK_LABELS;
