import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, Lightbulb, Users, ChevronsRight, Target } from 'lucide-react';
import { appId } from '../firebaseConfig';

const AnalyticsDashboard = ({ db, user }) => {
    const [stats, setStats] = useState({
        funnelExposures: 0,
        funnelPresentations: 0,
        funnelEnrolls: 0,
        expToPresentationRatio: 0,
        presentationToEnrollRatio: 0,
    });
    const [loading, setLoading] = useState(true);
    const [historicalData, setHistoricalData] = useState([]);
    const [monthName, setMonthName] = useState('');

    useEffect(() => {
        const fetchAllAnalyticsData = async () => {
            if (!user || !db) return;
            setLoading(true);

            const today = new Date();
            setMonthName(today.toLocaleString('default', { month: 'long' }));
            const currentMonthYearId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

            let lifetimeExposures = 0, lifetimePresentations = 0, lifetimeEnrolls = 0;
            let currentMonthExposures = 0, currentMonthPresentations = 0, currentMonthEnrolls = 0;

            // OPTIMIZATION NOTE: Fetching ALL docs is expensive as data grows. 
            // Future Plan: Use an aggregated 'stats' document that updates on daily writes.
            const activitiesCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'activities');
            const allDocsSnap = await getDocs(activitiesCollectionRef);

            allDocsSnap.forEach(doc => {
                const data = doc.data().dailyData || {};
                const isCurrentMonth = doc.id === currentMonthYearId;

                Object.values(data).forEach(day => {
                    const exposures = Number(day.exposures) || 0;
                    const presentations = (day.presentations?.length || 0) + (Number(day.pbrs) || 0);
                    const enrolls = (Number(day.enrolls) || 0) + (Array.isArray(day.sitdowns) ? day.sitdowns.filter(s => s === 'E').length : 0);

                    lifetimeExposures += exposures;
                    lifetimePresentations += presentations;
                    lifetimeEnrolls += enrolls;

                    if (isCurrentMonth) {
                        currentMonthExposures += exposures;
                        currentMonthPresentations += presentations;
                        currentMonthEnrolls += enrolls;
                    }
                });
            });

            const expToPresentationRatio = lifetimePresentations > 0 ? (lifetimeExposures / lifetimePresentations) : 0;
            const presentationToEnrollRatio = lifetimeEnrolls > 0 ? (lifetimePresentations / lifetimeEnrolls) : 0;

            setStats({
                funnelExposures: currentMonthExposures,
                funnelPresentations: currentMonthPresentations,
                funnelEnrolls: currentMonthEnrolls,
                expToPresentationRatio,
                presentationToEnrollRatio,
            });

            const monthLabels = [];
            let tempDate = new Date();
            const monthlyTotals = {};

            for (let i = 0; i < 6; i++) {
                const y = tempDate.getFullYear();
                const m = tempDate.getMonth();
                const myId = `${y}-${String(m + 1).padStart(2, '0')}`;
                monthLabels.unshift(tempDate.toLocaleString('default', { month: 'short' }));
                monthlyTotals[myId] = { name: monthLabels[0], Exposures: 0, Presentations: 0 };
                tempDate.setMonth(tempDate.getMonth() - 1);
            }

            allDocsSnap.forEach(doc => {
                if (monthlyTotals[doc.id]) {
                    const data = doc.data().dailyData || {};
                    Object.values(data).forEach(day => {
                        monthlyTotals[doc.id].Exposures += Number(day.exposures) || 0;
                        monthlyTotals[doc.id].Presentations += (day.presentations?.length || 0) + (Number(day.pbrs) || 0);
                    });
                }
            });

            setHistoricalData(Object.values(monthlyTotals).reverse());
            setLoading(false);
        };
        fetchAllAnalyticsData();
    }, [user, db]);

    const getInsight = () => {
        const { expToPresentationRatio, presentationToEnrollRatio } = stats;
        if (stats.expToPresentationRatio === 0 && stats.presentationToEnrollRatio === 0) {
            return {
                title: "Let's Get Some Data!",
                text: "Start logging your activities—exposures, presentations, and memberships sold—to unlock powerful insights about your business.",
                icon: Lightbulb
            };
        }
        if (expToPresentationRatio > 20 && expToPresentationRatio >= presentationToEnrollRatio) {
            return {
                title: "Opportunity: Improve Exposure Quality",
                text: "Your lifetime data suggests it takes a high number of exposures to get a presentation. Focus on refining your initial approach to convert more contacts into meetings.",
                icon: Target
            };
        }
        if (presentationToEnrollRatio > 12 && presentationToEnrollRatio > expToPresentationRatio) {
            return {
                title: "Opportunity: Refine Your Presentation",
                text: "You're great at getting meetings! Your lifetime data shows an opportunity to improve your closing rate. Consider practicing your presentation or follow-up process.",
                icon: Award
            };
        }
        return {
            title: "Keep Up the Consistent Work!",
            text: "Your business ratios are looking solid. Consistency is key, so continue to focus on your daily activities and filling your funnel.",
            icon: TrendingUp
        };
    };

    if (loading) return <div className="text-center p-10">Loading Analytics...</div>;

    const insight = getInsight();

    const FunnelStep = ({ value, label, color, isTop = false, isBottom = false }) => {
        let borderRadius = '';
        if (isTop) borderRadius = 'rounded-t-lg';
        if (isBottom) borderRadius = 'rounded-b-lg';

        return (
            <div className={`p-4 flex justify-between items-center text-white ${color} ${borderRadius}`}>
                <span className="font-medium">{label}</span>
                <span className="text-2xl font-bold">{value}</span>
            </div>
        );
    };

    const RatioCard = ({ title, value, detail, icon: Icon }) => (
        <div className="bg-gray-50 p-4 rounded-lg flex items-start space-x-4">
            <div className="bg-white p-3 rounded-full shadow">
                <Icon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500">{detail}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Business Analytics</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold mb-3 text-center text-gray-700">{monthName} Funnel</h3>
                    <div className="space-y-1">
                        <FunnelStep value={stats.funnelExposures} label="Exposures" color="bg-indigo-500" isTop />
                        <div className="flex justify-center items-center text-gray-400 my-1"><ChevronsRight className="h-5 w-5" /></div>
                        <FunnelStep value={stats.funnelPresentations} label="Presentations" color="bg-purple-500" />
                        <div className="flex justify-center items-center text-gray-400 my-1"><ChevronsRight className="h-5 w-5" /></div>
                        <FunnelStep value={stats.funnelEnrolls} label="Memberships Sold" color="bg-green-500" isBottom />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <RatioCard
                        title="Lifetime Exposure-to-Presentation"
                        value={stats.expToPresentationRatio > 0 ? `${stats.expToPresentationRatio.toFixed(1)} : 1` : 'N/A'}
                        detail="Exposures needed for one presentation"
                        icon={Users}
                    />
                    <RatioCard
                        title="Lifetime Presentation-to-Membership"
                        value={stats.presentationToEnrollRatio > 0 ? `${stats.presentationToEnrollRatio.toFixed(1)} : 1` : 'N/A'}
                        detail="Presentations needed for one membership"
                        icon={Award}
                    />
                </div>
            </div>

            <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <insight.icon className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="ml-3">
                        <p className="text-md font-semibold text-indigo-800">{insight.title}</p>
                        <p className="mt-1 text-sm text-indigo-700">{insight.text}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-2 sm:p-6 rounded-lg shadow-sm">
                <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-center sm:text-left">6-Month Activity Trends</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: "14px" }} />
                            <Bar dataKey="Exposures" fill="#6366f1" /><Bar dataKey="Presentations" fill="#a855f7" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
