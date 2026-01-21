export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const WEEKS_IN_MONTH = 4.33;

export const getWeekId = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to Sunday
    const sunday = new Date(d.setDate(diff));

    // Format YYYY-MM-DD
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(sunday.getDate()).padStart(2, '0');

    return `${year}-${month}-${dayOfMonth}`;
};

export const getWeekRange = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day; // Sunday

    const startOfWeek = new Date(d);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
};

export const calculateCurrentStreaks = (monthlyData, lastMonthData, today = new Date()) => {
    const metrics = ['exposures', 'followUps', 'presentations', 'threeWays', 'enrolls'];
    const streaks = {};

    metrics.forEach(metric => {
        let streak = 0;
        let d = new Date(today);

        // Normalize today
        d.setHours(0, 0, 0, 0);

        // Check Today
        const isTodayDone = checkActivity(d, metric, monthlyData, lastMonthData, today);
        if (isTodayDone) streak++;

        // Check Yesterday backwards
        d.setDate(d.getDate() - 1);
        while (true) {
            const hasActivity = checkActivity(d, metric, monthlyData, lastMonthData, today);
            if (hasActivity) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }
        streaks[metric] = streak;
    });
    return streaks;
};

const checkActivity = (dateObj, metric, monthlyData, lastMonthData, referenceDate) => {
    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();

    // Compare with referenceDate (today) to determine which data object to use
    // monthlyData is for the Current Month (of referenceDate)
    // lastMonthData is for the Previous Month

    const currentMonth = referenceDate.getMonth();
    const currentYear = referenceDate.getFullYear();

    let dataSource = null;

    if (month === currentMonth && year === currentYear) {
        dataSource = monthlyData;
    } else {
        // Check if it's the previous month
        const prevDate = new Date(referenceDate);
        prevDate.setMonth(prevDate.getMonth() - 1);

        if (month === prevDate.getMonth() && year === prevDate.getFullYear()) {
            dataSource = lastMonthData;
        }
    }

    if (!dataSource) return false; // Out of range (older than 2 months)

    const dayData = dataSource[day];
    if (!dayData) return false;

    // Check metric value
    const val = dayData[metric];
    if (Array.isArray(val)) return val.length > 0;
    return Number(val) > 0;
};
