/**
 * Mighty iframe embed helpers (Approach A: auto-login via central bridge).
 * Reuse this pattern in other Netlify apps that share the auth bridge.
 *
 * Mobile note: OAuth (and often Cloud Run redirects) fail or 404 when run
 * *inside* a nested iframe/WebView. Always prefer top-level navigation for
 * the bridge login URL when framed.
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

/** Rough mobile / in-app WebView detection (Mighty iOS/Android app). */
export function isMobileOrInAppBrowser() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile|webOS|IEMobile|BlackBerry/i.test(ua);
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
 * Navigate to the Mighty bridge login URL.
 * When framed (especially mobile WebViews), OAuth must not run inside the
 * nested iframe — that often produces a blank page or 404. Prefer top window.
 */
export function navigateToMightyLogin(loginUrl) {
    if (!loginUrl || typeof window === 'undefined') return;

    // Prefer breaking out of the iframe so OAuth + redirects run full-window.
    try {
        if (window.top && window.top !== window.self) {
            window.top.location.assign(loginUrl);
            return;
        }
    } catch (err) {
        console.warn(
            '[MightyEmbed] Could not navigate top window (will use same frame):',
            err?.message || err
        );
    }

    window.location.assign(loginUrl);
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

    // Mobile: still auto-login, but startMightyIframeAutoLogin will break out
    // to top. If that still fails in-app, AuthPage is the fallback after flag.
    return { shouldRedirect: true, reason: 'mighty-iframe-unsigned' };
}

/**
 * Start Approach A auto-login (once per session).
 */
export function startMightyIframeAutoLogin(loginUrl) {
    markIframeAutoLoginAttempted();
    console.log(
        '[MightyEmbed] Starting bridge login',
        'framed=',
        isInIframe(),
        'mobile=',
        isMobileOrInAppBrowser()
    );
    navigateToMightyLogin(loginUrl);
}
