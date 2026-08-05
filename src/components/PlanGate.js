import React from 'react';
import { Lock } from 'lucide-react';
import { PLAN_LABELS, UPGRADE_URL, requiredPlanFor } from '../utils/planAccess';

/**
 * Generic locked-feature panel (kept for future gates).
 * Daily Briefing Free users use DailyBriefingUpgradeBanner on Today instead.
 */
const PlanGate = ({ featureKey, featureName }) => {
    const required = requiredPlanFor(featureKey);
    const label = PLAN_LABELS[required] || required;
    const title = featureName || 'This feature';

    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <Lock className="h-7 w-7 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
                {title} is a {label} feature
            </h2>
            <p className="text-sm text-gray-600 max-w-md mb-6 leading-relaxed">
                Upgrade to <span className="font-semibold text-gray-800">{label}</span> (or higher) in
                the TNV App, then sign out and sign back in with Team NuVision so your access
                refreshes.
            </p>
            <a
                href={UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
                View plans / upgrade
            </a>
        </div>
    );
};

export default PlanGate;
