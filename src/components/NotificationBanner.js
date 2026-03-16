import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';


/* ──────────────────────────────────────────────────────────────
   NotificationBanner
   Shows a one-time soft prompt asking the user for notification
   permission. Uses localStorage to avoid re-prompting.

   Props:
     todayPoints  – number, current day's weighted points
     dailyPar     – number, the user's daily par target
   ────────────────────────────────────────────────────────────── */

const EOD_HOUR = 17; // 5 PM local — considered "end of day"

const NotificationBanner = ({ todayPoints = 0, dailyPar = 2 }) => {
    const [permission, setPermission] = useState(() => {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission; // 'default' | 'granted' | 'denied'
    });
    const [dismissed, setDismissed] = useState(() =>
        localStorage.getItem('onpar_notif_dismissed') === '1'
    );

    // ---- Schedule an end-of-day browser notification (local, no server needed) ----
    useEffect(() => {
        if (permission !== 'granted') return;

        const now = new Date();
        const eod = new Date();
        eod.setHours(EOD_HOUR, 0, 0, 0);

        // If it's already past 5 PM, schedule for tomorrow
        if (now >= eod) eod.setDate(eod.getDate() + 1);

        const msUntilEOD = eod - now;

        // Only schedule if we have a service worker controlling the page
        if (!navigator.serviceWorker?.controller) return;

        const timer = setTimeout(() => {
            if (todayPoints < dailyPar) {
                const deficit = dailyPar - todayPoints;
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title: '⏰ End-of-Day Check-In',
                    body: `You're ${deficit} pt${deficit > 1 ? 's' : ''} short of Par. Still time to get there! 🏌️`,
                });
            }
            // If they already hit par, show a congratulatory nudge
            else {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title: '🎉 Par Achieved!',
                    body: "You hit your daily goal. Keep those streaks alive! 🔥",
                });
            }
        }, msUntilEOD);

        return () => clearTimeout(timer);
    }, [permission, todayPoints, dailyPar]);

    // ---- Handle requesting permission ----
    const requestPermission = async () => {
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            localStorage.setItem('onpar_notif_dismissed', '1');
            setDismissed(true);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('onpar_notif_dismissed', '1');
        setDismissed(true);
    };

    // Don't show if: already granted, denied, unsupported, or dismissed
    if (
        permission === 'unsupported' ||
        permission === 'granted' ||
        permission === 'denied' ||
        dismissed
    ) return null;

    return (
        <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center">
                <Bell className="h-5 w-5 mr-3 flex-shrink-0 text-indigo-200" />
                <p className="text-sm font-medium">
                    Get end-of-day reminders when you're short of Par.{' '}
                    <button
                        onClick={requestPermission}
                        className="underline font-bold hover:text-indigo-200 transition"
                    >
                        Enable Notifications
                    </button>
                </p>
            </div>
            <button
                onClick={handleDismiss}
                className="ml-4 flex-shrink-0 text-indigo-200 hover:text-white transition"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
};

export default NotificationBanner;
