/**
 * Host-only admin allow-list for Activity Tracker.
 * Keep in sync with firestore.rules isAdmin() emails.
 */
export const ADMIN_EMAILS = [
    'htjakd@gmail.com',
    'herman@freedombychoice.com',
].map((e) => e.toLowerCase());

export function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}

/** Hidden admin path (not linked in main nav). */
export const PLAN_OVERRIDES_ADMIN_PATH = '/admin/overrides';

export function isPlanOverridesAdminPath(pathname = '') {
    const p = String(pathname || '').replace(/\/+$/, '') || '/';
    return p === PLAN_OVERRIDES_ADMIN_PATH;
}
