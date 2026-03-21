import React, { useState } from 'react';
import { Plus, X, Target, Users, XCircle, BarChart2, PhoneCall, UserCheck, HeartHandshake } from 'lucide-react';

const ACTIONS = [
    { key: 'exposures',     label: 'Exposure',    icon: Target,    color: '#e0e7ff', textColor: '#4338ca', type: 'modal' },
    { key: 'followUps',     label: 'Follow Up',   icon: Users,     color: '#dcfce7', textColor: '#15803d', type: 'modal' },
    { key: 'nos',           label: 'No',          icon: XCircle,   color: '#fee2e2', textColor: '#dc2626', type: 'confirm' },
    { key: 'presentations', label: 'Presentation',icon: BarChart2, color: '#f3e8ff', textColor: '#7e22ce', type: 'presentation' },
    { key: 'threeWays',     label: '3-Way Call',  icon: PhoneCall, color: '#fce7f3', textColor: '#be185d', type: 'direct' },
    { key: 'teamSupport',   label: 'Team Support',icon: HeartHandshake, color: '#e0f2fe', textColor: '#0284c7', type: 'direct' },
    { key: 'enrolls',       label: 'Enrollment',  icon: UserCheck, color: '#ccfbf1', textColor: '#0f766e', type: 'direct' },
];

const QuickLogFAB = ({ onLogExposure, onLogFollowUp, onAddPresentation, onQuickAdd }) => {
    const [open, setOpen] = useState(false);

    const close = () => setOpen(false);
    const toggle = () => setOpen(prev => !prev);

    const handleAction = (action) => {
        close();
        // Small delay so the sheet animates closed before dialog/modal appears
        setTimeout(() => {
            if (action.type === 'modal') {
                if (action.key === 'exposures') onLogExposure();
                else if (action.key === 'followUps') onLogFollowUp();
            } else if (action.type === 'confirm') {
                const confirmed = window.confirm("A true 'No' only counts after they've seen the information. Did this prospect evaluate a presentation or video?");
                if (confirmed) onQuickAdd(action.key, 1);
            } else if (action.type === 'presentation') {
                onAddPresentation('P');
            } else {
                onQuickAdd(action.key, 1);
            }
        }, 150);
    };

    return (
        <>
            {/* ── Backdrop (click outside to close) ── */}
            {open && (
                <div
                    onClick={close}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 49,
                        background: 'rgba(0,0,0,0.25)',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                />
            )}

            {/* ── Bottom Sheet ── */}
            <div
                style={{
                    position: 'fixed',
                    bottom: open ? 0 : '-100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'bottom 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s',
                    maxWidth: '512px',
                    margin: '0 auto',
                }}
            >
                <div style={{
                    background: '#fff',
                    borderRadius: '20px 20px 0 0',
                    boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
                    padding: '20px 20px 36px',
                }}>
                    {/* Sheet header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#1e1b4b' }}>⚡ Quick Log</span>
                        <button
                            onClick={close}
                            aria-label="Close Quick Log"
                            style={{
                                background: '#f3f4f6',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            <X size={16} color="#374151" />
                        </button>
                    </div>

                    {/* 3×2 action grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {ACTIONS.map(action => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.key}
                                    onClick={() => handleAction(action)}
                                    style={{
                                        background: action.color,
                                        border: 'none',
                                        borderRadius: 14,
                                        padding: '14px 8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        color: action.textColor,
                                        gap: 6,
                                        WebkitTapHighlightColor: 'transparent',
                                        transition: 'opacity 0.1s',
                                    }}
                                    onTouchStart={e => e.currentTarget.style.opacity = '0.75'}
                                    onTouchEnd={e => e.currentTarget.style.opacity = '1'}
                                >
                                    <Icon size={22} color={action.textColor} />
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>

                    <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 14 }}>
                        Exposure &amp; Follow Up open the pipeline flow
                    </p>
                </div>
            </div>

            {/* ── FAB button ── */}
            <button
                onClick={toggle}
                aria-label={open ? 'Close Quick Log' : 'Quick Log'}
                style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 20,
                    zIndex: 51,
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: open ? '#374151' : '#4f46e5',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(79,70,229,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s, transform 0.2s',
                    transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                    WebkitTapHighlightColor: 'transparent',
                }}
            >
                <Plus size={26} color="#fff" strokeWidth={2.5} />
            </button>
        </>
    );
};

export default QuickLogFAB;
