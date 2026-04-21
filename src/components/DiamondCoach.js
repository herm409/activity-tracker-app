import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Zap, ShieldCheck, Heart, Wallet, Dumbbell, Star, Loader2 } from 'lucide-react';
import { getDiamondCoaching } from '../services/aiService';
import { calculatePoints } from '../utils/scoring';

const DiamondCoach = ({ userProfile, todayData, ironmanStreak, monthlyData, lastMonthData, monthlyGoals }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Finance pillar: real points vs daily par, capped at 100%
    const todayPoints = calculatePoints(todayData || {});
    const dailyPar = userProfile?.dailyPar || 2;
    const financeProgress = Math.min(100, Math.round((todayPoints / dailyPar) * 100));

    // Compile Context 
    let thisMonthPoints = 0;
    if (monthlyData) {
        Object.values(monthlyData).forEach(day => {
            thisMonthPoints += calculatePoints(day);
        });
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    let thisWeekPoints = 0;
    for (let i = 0; i <= 6; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        if (d > now) break;
        if (monthlyData && monthlyData[d.getDate()]) {
            thisWeekPoints += calculatePoints(monthlyData[d.getDate()]);
        }
    }

    // Extended User Context Payload
    const buildContext = () => ({
        displayName: userProfile?.displayName || 'Associate',
        todayPoints,
        dailyPar,
        thisWeekPoints,
        thisMonthPoints,
        monthlyGoals: monthlyGoals || {},
        sprint: userProfile?.sprint || 'None Active',
        todaySnapshot: todayData,
        ironmanStreak,
    });

    // The 5 F's pillars
    const pillars = [
        { id: 'faith',   name: 'Faith',   icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50',  barColor: 'bg-indigo-500', value: 100 },
        { id: 'family',  name: 'Family',  icon: Heart,       color: 'text-rose-500',    bg: 'bg-rose-50',   barColor: 'bg-rose-500', value: 100 },
        { id: 'finance', name: 'Finance', icon: Wallet,      color: 'text-emerald-500', bg: 'bg-emerald-50', barColor: 'bg-emerald-500', value: financeProgress },
        { id: 'fitness', name: 'Fitness', icon: Dumbbell,    color: 'text-orange-500',  bg: 'bg-orange-50', barColor: 'bg-orange-500', value: (todayData?.exerc || todayData?.personalDevelopment) ? 100 : 0 },
        { id: 'fun',     name: 'Fun',     icon: Star,        color: 'text-amber-500',   bg: 'bg-amber-50',  barColor: 'bg-amber-500', value: 100 },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Proactive Greeting
    useEffect(() => {
        if (messages.length === 0) {
            handleProactiveGreeting();
        }
    }, []);

    const handleProactiveGreeting = async () => {
        setIsLoading(true);
        try {
            const context = buildContext();
            const response = await getDiamondCoaching(context, "Give me a quick morning briefing and check my numbers.");
            setMessages([{ role: 'assistant', content: response }]);
        } catch (error) {
            setMessages([{ role: 'assistant', content: "Yo! The Diamond Coach had a little technical glitch, but we're back in the field. Let's work!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = buildContext();
            const response = await getDiamondCoaching(context, userMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Felt a little disturbance in the flow. Try that again, let's keep the momentum going." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        "Analyze my numbers",
        "Give me some SW4 energy",
        "How can I help my team?",
        "Next play?"
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] bg-gray-50 rounded-2xl overflow-hidden shadow-xl border border-white">
            {/* 5 F's Dashboard Header */}
            <div className="p-4 bg-white border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="flex items-center text-lg font-black text-gray-800 tracking-tight">
                        <Sparkles className="mr-2 text-indigo-600 h-5 w-5" /> DIAMOND COACH
                    </h2>
                    <div className="flex items-center bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-indigo-100">
                        <Zap className="h-3 w-3 mr-1" /> ACTIVE MENTORING
                    </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                    {pillars.map(p => (
                        <div key={p.id} className="flex flex-col items-center">
                            <div className={`p-2 rounded-xl ${p.bg} mb-1 transition-transform hover:scale-110`} title={p.name}>
                                <p.icon className={`h-4 w-4 ${p.color}`} />
                            </div>
                            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${p.barColor} transition-all duration-1000`} 
                                    style={{ width: `${p.value}%` }}
                                />
                            </div>
                        </div>

                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        {msg.role === 'assistant' && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mr-2 shadow-md flex-shrink-0">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none font-medium text-sm leading-relaxed'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0">
                            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-3 rounded-tl-none">
                            <div className="flex space-x-1">
                                <div className="h-2 w-2 bg-gray-200 rounded-full animate-bounce" />
                                <div className="h-2 w-2 bg-gray-200 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="h-2 w-2 bg-gray-200 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                {messages.length < 5 && !isLoading && (
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                        {quickActions.map(action => (
                            <button
                                key={action}
                                onClick={async () => {
                                    if (isLoading) return;
                                    setMessages(prev => [...prev, { role: 'user', content: action }]);
                                    setIsLoading(true);
                                    try {
                                        const context = buildContext();
                                        const response = await getDiamondCoaching(context, action);
                                        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
                                    } catch {
                                        setMessages(prev => [...prev, { role: 'assistant', content: "Felt a little disturbance in the flow. Try again!" }]);
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                className="whitespace-nowrap px-4 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="relative flex items-center">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask your coach anything..."
                        className="w-full bg-gray-50 border-0 rounded-2xl py-3.5 pl-5 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 shadow-inner"
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className={`absolute right-1.5 p-2 rounded-xl transition-all ${
                            !inputValue.trim() || isLoading 
                            ? 'bg-gray-100 text-gray-400' 
                            : 'bg-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95'
                        }`}
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </form>
                <p className="text-[10px] text-gray-400 text-center mt-3 font-medium tracking-wide uppercase">
                    Diamond Coach is in the lab. Let's get these diamonds. 💎
                </p>
            </div>
        </div>
    );
};

export default DiamondCoach;
