import React, { useEffect } from 'react';
import { Sparkles, Trophy, Rocket, Target, Zap, TrendingUp, ShieldCheck } from 'lucide-react';

const CoachingToast = ({ message, priority, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4500);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    // Icon logic based on message priority/content
    let Icon = Sparkles;
    let bgColor = 'bg-white';
    let borderColor = 'border-indigo-100';
    let iconColor = 'text-indigo-600';
    let iconBg = 'bg-indigo-50';

    if (priority === 1 || message.includes('DIAMOND')) {
        Icon = Trophy;
        borderColor = 'border-yellow-200';
        iconColor = 'text-yellow-600';
        iconBg = 'bg-yellow-50';
    } else if (priority === 2 || message.includes('drought')) {
        Icon = Target;
        borderColor = 'border-green-200';
        iconColor = 'text-green-600';
        iconBg = 'bg-green-50';
    } else if (priority === 3 || message.includes('Momentum')) {
        Icon = Rocket;
        borderColor = 'border-orange-200';
        iconColor = 'text-orange-600';
        iconBg = 'bg-orange-50';
    } else if (priority === 4 || message.includes('SW4')) {
        Icon = Zap;
        borderColor = 'border-blue-200';
        iconColor = 'text-blue-600';
        iconBg = 'bg-blue-50';
    } else if (priority === 5 || message.includes('Massive')) {
        Icon = TrendingUp;
        borderColor = 'border-purple-200';
        iconColor = 'text-purple-600';
        iconBg = 'bg-purple-50';
    } else if (message.includes('disrupt') || message.includes('LegalShield')) {
        Icon = ShieldCheck;
    }

    return (
        <div className={`fixed bottom-24 right-6 z-50 transform transition-all duration-500 ease-out translate-x-0 opacity-100 flex items-start p-4 ${bgColor} border-2 ${borderColor} shadow-2xl rounded-xl max-w-sm ml-4 animate-slide-in-right`}>
            <div className={`flex-shrink-0 p-2 rounded-full ${iconBg} mr-3`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div className="flex-1pt-1">
                <p className="text-sm font-semibold text-gray-800 leading-snug">
                    {message}
                </p>
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <span className="sr-only">Close</span>
                    &times;
                </button>
            </div>
        </div>
    );
};

export default CoachingToast;
