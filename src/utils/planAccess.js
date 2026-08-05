/**
 * Plan entitlements for Activity Tracker (Mighty claims.plan).
 *
 * Currently gated:
 *   - AI Daily Briefing → PRO and PLATINUM only
 *
 * Everything else is available on FREE.
 * Add features to FEATURE_MIN_PLAN when packaging expands.
 */

export const PLANS = {
    FREE: 'FREE',
    PRO: 'PRO',
    PLATINUM: 'PLATINUM',
};

const PLAN_RANK = {
    FREE: 0,
    PRO: 1,
    PLATINUM: 2,
};

/** Minimum plan required per feature. Unlisted features = FREE. */
export const FEATURE_MIN_PLAN = {
    dailyBriefing: PLANS.PRO,
};

export function normalizePlan(plan) {
    const p = String(plan || 'FREE').toUpperCase();
    if (p === 'PLATINUM' || p === 'PRO' || p === 'FREE') return p;
    return PLANS.FREE;
}

export function planRank(plan) {
    return PLAN_RANK[normalizePlan(plan)] ?? 0;
}

export function hasMinPlan(userPlan, requiredPlan) {
    return planRank(userPlan) >= planRank(requiredPlan);
}

export function canAccess(userPlan, featureKey) {
    const required = FEATURE_MIN_PLAN[featureKey] || PLANS.FREE;
    return hasMinPlan(userPlan, required);
}

export function requiredPlanFor(featureKey) {
    return FEATURE_MIN_PLAN[featureKey] || PLANS.FREE;
}

export const PLAN_LABELS = {
    FREE: 'Free',
    PRO: 'Pro',
    PLATINUM: 'Platinum',
};

/** Where members can upgrade (TNV App / Mighty plans). */
export const UPGRADE_URL = 'https://tnvapp.com';
