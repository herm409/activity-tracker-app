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
 * Provides macro-level weekly/monthly coaching based on activity ratios and volume.
 */
export const getPeriodicCoachingAdvice = (totals, timeframe = 'week') => {
    const { exposures = 0, followUps = 0, presentations = 0, threeWays = 0, nos = 0, enrolls = 0 } = totals;

    const totalActivity = exposures + followUps + presentations + threeWays + nos + enrolls;

    if (totalActivity === 0) {
        return { grade: 'N/A', message: "No activity logged yet. Time to get started and fill that pipeline!", color: "text-gray-500", bg: "bg-gray-100" };
    }

    const exposureRatio = exposures > 0 ? followUps / exposures : followUps;
    const closingActivity = presentations + threeWays + nos + enrolls;
    const closingRatio = followUps > 0 ? closingActivity / followUps : closingActivity;

    let grade = 'C';
    let message = '';
    let color = 'text-red-500';
    let bg = 'bg-red-50';

    if (totalActivity < (timeframe === 'week' ? 5 : 20)) {
        grade = 'C';
        message = `Volume is a bit low for this ${timeframe}. Focus on increasing your total exposures to get the momentum going.`;
    } else if (exposures > 0 && followUps === 0) {
        grade = 'C';
        message = `You are exposing but not following up! The fortune is in the follow-up. Make sure you reconnect with your prospects.`;
    } else if (exposures === 0 && followUps > 0) {
        grade = 'C';
        message = `You are doing a great job following up, but your pipeline needs new blood. Aim to add new exposures this ${timeframe}.`;
    } else if (exposureRatio < 0.3) {
        grade = 'B';
        message = `Good exposure volume, but your follow-up ratio is a bit low. Don't let those initial contacts slip away.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else if (closingActivity === 0 && followUps >= 3) {
        grade = 'B';
        message = `You are following up, but it's not leading to presentations, 3-ways, or decisions (No/Enroll). Focus on pushing for a decision or validation.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else if (exposureRatio >= 0.5 && closingRatio >= 0.3) {
        grade = 'A';
        message = `Excellent balance! You are consistently exposing, following up, and driving prospects to a decision. Keep duplicating this system.`;
        color = 'text-green-600';
        bg = 'bg-green-50';
    } else {
        grade = 'B';
        message = `Solid effort this ${timeframe}. To hit an 'A', ensure your follow-ups are directly leading to 3-way calls or definitive answers.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    }

    return { grade, message, color, bg };
};
