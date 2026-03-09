/**
 * Calculates the total weighted points for a given set of activity data.
 */
export const WEIGHTS = {
    exposures: 1,
    followUps: 1,
    nos: 1,
    tenacityFollowUps: 2,
    presentations: 3,
    threeWays: 3,
    enrolls: 5,
    ironman: 15
};

export const isIronmanDay = (data) => {
    if (!data) return false;
    const exposures = Number(data.exposures) || 0;
    const followUps = Number(data.followUps) || 0;
    const nos = Number(data.nos) || 0;
    const threeWays = Number(data.threeWays) || 0;

    const exerc = !!data.exerc;
    const pd = !!data.personalDevelopment;

    return exposures > 0 && followUps > 0 && nos > 0 && threeWays > 0 && exerc && pd;
};

export const calculatePoints = (data) => {
    if (!data) return 0;

    // Parse values, defaulting to 0 if missing or invalid
    const exposures = Number(data.exposures) || 0;
    const followUps = Number(data.followUps) || 0;

    // Presentations can be an array (legacy/detail) or a number (aggregate)
    // If it's an array, we count length. If it's a number, use it.
    // Also include 'pbrs' if present (some parts of app use it).
    let presentations = 0;
    if (Array.isArray(data.presentations)) {
        presentations = data.presentations.length;
    } else {
        presentations = Number(data.presentations) || 0;
    }
    presentations += (Number(data.pbrs) || 0);

    const threeWays = Number(data.threeWays) || 0;

    // Enrolls logic: 'enrolls' number + 'sitdowns' array filter
    let enrolls = Number(data.enrolls) || 0;
    if (Array.isArray(data.sitdowns)) {
        enrolls += data.sitdowns.filter(s => s === 'E').length;
    }

    const nos = Number(data.nos) || 0;
    const tenacityFollowUps = Number(data.tenacityFollowUps) || 0;

    const ironmanBonus = isIronmanDay(data) ? WEIGHTS.ironman : 0;

    // Weighted Sum
    return (exposures * WEIGHTS.exposures) +
        (followUps * WEIGHTS.followUps) +
        (presentations * WEIGHTS.presentations) +
        (threeWays * WEIGHTS.threeWays) +
        (enrolls * WEIGHTS.enrolls) +
        (tenacityFollowUps * WEIGHTS.tenacityFollowUps) +
        (nos * WEIGHTS.nos) +
        ironmanBonus;
};

/**
 * Provides macro-level weekly/monthly coaching based on activity volume requirements.
 * Defines "Pace" targets to support users early in the week/month without demoralizing them.
 */
export const getPeriodicCoachingAdvice = (totals, timeframe = 'week', elapsedDays = 5, workingDays = 5) => {
    const { exposures = 0, followUps = 0, presentations = 0, threeWays = 0, nos = 0, enrolls = 0 } = totals;

    const totalActivity = exposures + followUps + presentations + threeWays + nos + enrolls;

    const exposureTarget = timeframe === 'week' ? 10 : 40;

    // Pace calculation: What should they be at *right now* based on elapsed days?
    // Math.ceil ensures they don't get 'On Pace' for passing 1.5 with only 1 exposure.
    const paceTarget = Math.ceil(exposureTarget * (elapsedDays / workingDays));

    const followUpTarget = exposures * 2;
    const hasDecisions = (nos > 0 || enrolls > 0);

    let grade = 'C';
    let message = '';
    let color = 'text-red-500';
    let bg = 'bg-red-50';

    if (totalActivity === 0) {
        grade = 'N/A';
        message = "No activity logged yet. Time to get started and fill that pipeline!";
        color = "text-gray-500";
        bg = "bg-gray-100";
    } else if (exposures < paceTarget) {
        grade = 'C';
        message = `You are currently BEHIND SCHEDULE. To build momentum, you need more at-bats. Your exposure volume is too low for day ${elapsedDays} of this ${timeframe}. Aim for at least ${exposureTarget} total exposures by the end of the ${timeframe}.`;
    } else if (exposures >= paceTarget && exposures < exposureTarget) {
        // They haven't hit the FINAL target, but they are ON PACE for where they are in the timeframe!
        grade = 'B';
        message = `You are perfectly ON PACE for this ${timeframe}! Your daily exposure habits are solid. Keep knocking out these daily wins to hit your final target of ${exposureTarget}+.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else if (followUps < followUpTarget) {
        grade = 'C';
        message = `You are hitting your exposure targets, but dropping the ball on follow-ups. Ensure you have at least double the follow-ups (${followUpTarget}) compared to your exposures (${exposures}) to close sales.`;
    } else if (!hasDecisions) {
        grade = 'B';
        message = `Great volume and follow-up habits! However, we need to see decisions being made. Don't be afraid to push for a 'No'. A 'No' means you are truly prospecting and asking.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else {
        grade = 'A';
        message = `Outstanding work! You hit your exposures (${exposureTarget}+), maintained the 2x follow-up ratio, and are successfully driving prospects to a definitive decision. Keep duplicating this system!`;
        color = 'text-green-600';
        bg = 'bg-green-50';
    }

    return { grade, message, color, bg };
};
