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

    const hash = totalActivity + exposures + followUps + elapsedDays;
    const getMsg = (arr) => arr[hash % arr.length];

    if (totalActivity === 0) {
        grade = 'N/A';
        message = getMsg([
            "Coach's report: Blank across the board. You can't win if you don't suit up. Time to get active!",
            "Zero activity detected. Stop spectating and start participating. Drop some exposures!",
            "Pipeline is on empty. Faith without works is dead—let's put some numbers on the board."
        ]);
        color = "text-gray-500";
        bg = "bg-gray-100";
    } else if (exposures < paceTarget) {
        grade = 'C';
        message = getMsg([
            `You're falling behind the curve for this ${timeframe}. We need volume right now. Ramp up your exposures before the clock runs out!`,
            `Pace check: BEHIND. Stop playing it safe. We need serious at-bats to make this ${timeframe} count. Let's hustle.`,
            `The math ain't mathing right now. Your exposure volume is too low for day ${elapsedDays}. Go make some noise out there!`
        ]);
    } else if (exposures >= paceTarget && exposures < exposureTarget) {
        grade = 'B';
        message = getMsg([
            `You are locked exactly on pace for this ${timeframe}! Daily habits looking solid. Keep grinding to hit that ${exposureTarget}+ target.`,
            `Pace check: ON SCHEDULE. Love the consistency. Maintain this exact rhythm and you'll crush the ${timeframe}.`,
            `We see the work ethic! You're tracking perfectly to clear your target. Don't look back, just keep working.`
        ]);
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else if (followUps < followUpTarget) {
        grade = 'C';
        message = getMsg([
            `Exposure game is crazy, but you're dropping the ball on the follow-ups. You need double the follow-ups (${followUpTarget}) to your exposures (${exposures}). Don't leave money on the table!`,
            `Great job planting the seeds, but who's watering them? Step up your follow-up game immediately.`,
            `Stop leaving your prospects on read! Your follow-up count is way too low compared to your exposures. Circle back right now.`
        ]);
    } else if (!hasDecisions) {
        grade = 'B';
        message = getMsg([
            `Volume and follow-ups are heavy, but where are the decisions? Force the issue! Go collect a 'No'. Stop accepting 'Let me think about it'.`,
            `You've built a beautiful pipeline, now go close 'em out. Don't be afraid to ask for a definitive answer. Go hunt for No's!`,
            `Stellar activity levels! But we need verdicts. Rejection means you're doing the work. Push for an answer today.`
        ]);
        color = 'text-blue-500';
        bg = 'bg-blue-50';
    } else {
        grade = 'A';
        message = getMsg([
            `Flawless execution! You hit the exposures, nailed the follow-ups, and forced decisions. This is the blueprint for success.`,
            `Masterclass. The volume is high, the pipeline is watered, and the bag is secured. Celebrate the W and keep leading from the front!`,
            `Absolutely crushing it! This is championship-level activity across the board. You are putting the whole organization on notice.`
        ]);
        color = 'text-green-600';
        bg = 'bg-green-50';
    }

    return { grade, message, color, bg };
};
