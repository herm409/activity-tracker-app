import React, { useEffect, useState, useCallback } from 'react';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { PLANS, PLAN_LABELS } from '../utils/planAccess';
import { isAdminEmail } from '../utils/adminConfig';

const EMPTY_FORM = {
    email: '',
    plan: PLANS.PRO,
    active: true,
    planName: '',
    notes: '',
};

/**
 * Host-only CRUD UI for Firestore planOverrides.
 * Doc id = lowercased email (matches bridge lookup).
 */
const PlanOverridesAdmin = ({ db, user, onSignOut }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);

    const load = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        setError('');
        try {
            const snap = await getDocs(collection(db, 'planOverrides'));
            const list = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            setRows(list);
        } catch (err) {
            console.error(err);
            setError(
                err?.message ||
                    'Could not load overrides. Check Firestore rules and that you are an admin.'
            );
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        load();
    }, [load]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setEditingId(null);
    };

    const startEdit = (row) => {
        setEditingId(row.id);
        setForm({
            email: row.email || row.id || '',
            plan: row.plan || PLANS.PRO,
            active: row.active !== false,
            planName: row.planName || '',
            notes: row.notes || '',
        });
        setMessage('');
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        const email = String(form.email || '')
            .trim()
            .toLowerCase();
        if (!email || !email.includes('@')) {
            setError('Enter a valid email address.');
            return;
        }

        const plan = String(form.plan || PLANS.FREE).toUpperCase();
        if (!['FREE', 'PRO', 'PLATINUM'].includes(plan)) {
            setError('Plan must be FREE, PRO, or PLATINUM.');
            return;
        }

        setSaving(true);
        try {
            const id = email; // bridge looks up by lowercased email
            await setDoc(
                doc(db, 'planOverrides', id),
                {
                    email,
                    plan,
                    active: Boolean(form.active),
                    planName: form.planName?.trim() || PLAN_LABELS[plan] || plan,
                    notes: form.notes?.trim() || '',
                    updatedAt: serverTimestamp(),
                    updatedBy: user?.email || user?.uid || 'admin',
                    ...(editingId ? {} : { createdAt: serverTimestamp() }),
                },
                { merge: true }
            );
            setMessage(
                editingId
                    ? `Updated override for ${email}. Member must re-login via Team NuVision for claims to refresh.`
                    : `Added override for ${email}. Member must re-login via Team NuVision for claims to refresh.`
            );
            resetForm();
            await load();
        } catch (err) {
            console.error(err);
            setError(err?.message || 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Delete plan override for "${id}"?`)) return;
        setError('');
        setMessage('');
        try {
            await deleteDoc(doc(db, 'planOverrides', id));
            setMessage(`Deleted override for ${id}.`);
            if (editingId === id) resetForm();
            await load();
        } catch (err) {
            console.error(err);
            setError(err?.message || 'Delete failed.');
        }
    };

    if (!isAdminEmail(user?.email)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white border border-red-100 rounded-xl p-8 max-w-md text-center shadow-sm">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Access denied</h1>
                    <p className="text-sm text-gray-600 mb-4">
                        This page is only available to authorized hosts.
                    </p>
                    <a href="/" className="text-indigo-600 font-semibold text-sm hover:underline">
                        Back to app
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                            Host admin
                        </p>
                        <h1 className="text-2xl font-bold text-gray-900">Plan overrides</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Spouse / household access. Signed in as{' '}
                            <span className="font-medium text-gray-700">{user.email}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <a href="/" className="text-gray-600 hover:text-indigo-600 font-medium">
                            ← App
                        </a>
                        {onSignOut && (
                            <button
                                type="button"
                                onClick={onSignOut}
                                className="text-gray-500 hover:text-red-600 font-medium"
                            >
                                Sign out
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-900 mb-6">
                    Overrides apply on the member&apos;s <strong>next Team NuVision (Mighty)
                    login</strong>, when custom claims are refreshed. Doc id = email (lowercase).
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-8 space-y-4"
                >
                    <h2 className="text-sm font-bold text-gray-800">
                        {editingId ? `Edit: ${editingId}` : 'Add override'}
                    </h2>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Member email
                        </label>
                        <input
                            type="email"
                            required
                            disabled={Boolean(editingId)}
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50"
                            placeholder="spouse@example.com"
                        />
                        {editingId && (
                            <p className="text-[11px] text-gray-400 mt-1">
                                Email (doc id) cannot change — delete and re-add to rename.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Plan
                            </label>
                            <select
                                value={form.plan}
                                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={PLANS.FREE}>FREE</option>
                                <option value={PLANS.PRO}>PRO</option>
                                <option value={PLANS.PLATINUM}>PLATINUM</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-2">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, active: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Active
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Label (optional)
                        </label>
                        <input
                            type="text"
                            value={form.planName}
                            onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. Spouse PRO"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Notes (optional)
                        </label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Household / reason"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
                    )}
                    {message && (
                        <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
                            {message}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add override'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Cancel edit
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={load}
                            className="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 ml-auto"
                        >
                            Refresh list
                        </button>
                    </div>
                </form>

                {/* List */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-800">
                            Current overrides ({rows.length})
                        </h2>
                    </div>

                    {loading ? (
                        <p className="p-6 text-sm text-gray-500">Loading…</p>
                    ) : rows.length === 0 ? (
                        <p className="p-6 text-sm text-gray-500">No overrides yet.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {rows.map((row) => (
                                <li
                                    key={row.id}
                                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {row.email || row.id}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Plan:{' '}
                                            <span className="font-bold text-gray-700">
                                                {row.plan || '—'}
                                            </span>
                                            {' · '}
                                            {row.active === false ? (
                                                <span className="text-amber-700 font-medium">
                                                    inactive
                                                </span>
                                            ) : (
                                                <span className="text-green-700 font-medium">
                                                    active
                                                </span>
                                            )}
                                            {row.planName ? ` · ${row.planName}` : ''}
                                        </p>
                                        {row.notes && (
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {row.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(row)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(row.id)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-100 text-red-600 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <p className="mt-6 text-[11px] text-center text-gray-400">
                    Direct URL (bookmark):{' '}
                    <code className="bg-gray-100 px-1 rounded">/admin/overrides</code>
                </p>
            </div>
        </div>
    );
};

export default PlanOverridesAdmin;
