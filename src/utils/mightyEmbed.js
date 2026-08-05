/**
 * Mighty iframe embed helpers (Approach A: auto-login via central bridge).
 * Reuse this pattern in other Netlify apps that share the auth bridge.
 */

const AUTO_LOGIN_FLAG = 'mighty_iframe_auto_login';

/**
 * True when this window is nested in an iframe.
 * Cross-origin parents still allow window.self !== window.top.
 */
export function isInIframe() {
    if (typeof window === 'undefined') return false;
    try {
        return window.self !== window.top;
    } catch {
        // Access denied comparing windows → almost certainly framed
        return true;
    }
}

/**
 * Best-effort parent host. Cross-origin parents throw; returns null then.
 */
export function getParentHost() {
    if (typeof window === 'undefined' || !isInIframe()) return null;
    try {
        return window.location.ancestorOrigins?.[0]
            ? new URL(window.location.ancestorOrigins[0]).hostname
            : window.parent?.location?.hostname || null;
    } catch {
        return null;
    }
}

/**
 * True if host looks like Mighty Networks (community or product host).
 */
export function isMightyHost(hostname) {
    if (!hostname) return false;
    const h = String(hostname).toLowerCase();
    return (
        h === 'mn.co' ||
        h.endsWith('.mn.co') ||
        h === 'mightynetworks.com' ||
        h.endsWith('.mightynetworks.com')
    );
}

/**
 * Should we treat this embed as a Mighty iframe for auto-login?
 *
 * - Must be in an iframe
 * - If parent host is readable, require Mighty domain
 * - If parent host is opaque (cross-origin, typical), still allow auto-login
 *   when framed — embed is almost always from Mighty for this product
 */
export function isMightyIframeContext() {
    if (!isInIframe()) return false;

    const parentHost = getParentHost();
    if (parentHost) {
        return isMightyHost(parentHost);
    }

    // Cross-origin parent: ancestorOrigins may still help on Chromium
    try {
        const origins = window.location.ancestorOrigins;
        if (origins && origins.length > 0) {
            for (let i = 0; i < origins.length; i++) {
                try {
                    const host = new URL(origins[i]).hostname;
                    if (isMightyHost(host)) return true;
                } catch {
                    /* skip */
                }
            }
            // Framed by a known non-Mighty ancestor list with no Mighty host
            return false;
        }
    } catch {
        /* ignore */
    }

    // Opaque cross-origin frame (common): allow auto-login
    return true;
}

/** Bridge callback in progress — never auto-redirect. */
export function hasBridgeTokenInUrl() {
    if (typeof window === 'undefined') return false;
    try {
        return Boolean(new URL(window.location.href).searchParams.get('token'));
    } catch {
        return false;
    }
}

/**
 * Session flag prevents infinite redirect loops if OAuth is cancelled
 * or the user returns without a token.
 */
export function hasAttemptedIframeAutoLogin() {
    try {
        return sessionStorage.getItem(AUTO_LOGIN_FLAG) === '1';
    } catch {
        return false;
    }
}

export function markIframeAutoLoginAttempted() {
    try {
        sessionStorage.setItem(AUTO_LOGIN_FLAG, '1');
    } catch {
        /* private mode */
    }
}

export function clearIframeAutoLoginAttempt() {
    try {
        sessionStorage.removeItem(AUTO_LOGIN_FLAG);
    } catch {
        /* ignore */
    }
}

/**
 * Decide whether to auto-redirect to the Mighty bridge right now.
 *
 * @param {{ isSignedIn: boolean, loginUrl: string }} opts
 * @returns {{ shouldRedirect: boolean, reason: string }}
 */
export function shouldAutoLoginViaBridge({ isSignedIn, loginUrl }) {
    if (isSignedIn) {
        return { shouldRedirect: false, reason: 'already-signed-in' };
    }
    if (hasBridgeTokenInUrl()) {
        return { shouldRedirect: false, reason: 'bridge-token-present' };
    }
    if (!isMightyIframeContext()) {
        return { shouldRedirect: false, reason: 'not-mighty-iframe' };
    }
    if (hasAttemptedIframeAutoLogin()) {
        return { shouldRedirect: false, reason: 'already-attempted' };
    }
    if (!loginUrl) {
        return { shouldRedirect: false, reason: 'missing-login-url' };
    }
    return { shouldRedirect: true, reason: 'mighty-iframe-unsigned' };
}

/**
 * Start Approach A auto-login. Navigates the iframe (or top if preferred).
 * Uses same-window navigation so the embed returns to redirect_uri after OAuth.
 */
export function startMightyIframeAutoLogin(loginUrl) {
    markIframeAutoLoginAttempted();
    // Navigate this frame to the bridge. OAuth runs in this browsing context;
    // after bridge callback, member returns to the app URL (often re-embedded).
    window.location.assign(loginUrl);
}
