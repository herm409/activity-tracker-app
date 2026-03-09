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
        message = `To build momentum, you need more at-bats. This ${timeframe}'s volume was low. Try to initiate more conversations (exposures) to see real progress.`;
    } else if (exposures > 0 && followUps === 0) {
        grade = 'C';
        message = `You are exposing but dropping the ball on follow-ups. The fortune is in the follow-up! Reaching back out is how you progress an exposure to a decision.`;
    } else if (exposures === 0 && followUps > 0) {
        grade = 'C';
        message = `You are doing a great job following up, but your pipeline needs new blood. Aim to add new "Day 1" exposures this ${timeframe} to spark fresh interest.`;
    } else if (exposureRatio < 0.3) {
        grade = 'B';
        message = `You have strong exposure volume, but your follow-up ratio is too low. Make sure you aren't letting those initial contacts slip away. Retarget them!`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else if (closingActivity === 0 && followUps >= 3) {
        grade = 'B';
        message = `You are consistently following up, but it's not progressing to presentations or 3-ways. Push for a definitive next step or a decision (Yes/No) to clear your pipeline.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else if (exposureRatio >= 0.5 && closingRatio >= 0.3) {
        grade = 'A';
        message = `Outstanding work! You have a highly balanced pipeline. Your follow-up ratio tells me you are tracking people effectively, and pushing them to decisions. Keep this habit.`;
        color = 'text-green-600';
        bg = 'bg-green-50';
    } else {
        grade = 'B';
        message = `Solid effort this ${timeframe}. To hit an 'A', focus on progression. Ensure every follow-up has a definitive next step assigned, like a 3-way call or a final decision.`;
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    }

    return { grade, message, color, bg };
};
