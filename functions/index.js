/**
 * Mighty Networks ↔ Firebase Auth Bridge (central shared auth service)
 *
 * Firebase project: activitytracker-e2b7a
 *
 * Apps start login at:
 *   https://mightylogin-vc2epchfzq-uc.a.run.app?redirect_uri=https://that-app.com/callback
 *
 * Bridge flow:
 *   1. mightyLogin    → Mighty OAuth authorize
 *   2. mightyCallback → token exchange → member profile → plan → Firebase custom token
 *   3. mightyWebhook  → keep plan claims in sync on upgrade/downgrade
 *
 * Consuming apps only call signInWithCustomToken(token) and read the `plan` custom claim.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// ─── Secrets ───────────────────────────────────────────────────────────────
const MIGHTY_CLIENT_ID = defineSecret("MIGHTY_CLIENT_ID");
const MIGHTY_CLIENT_SECRET = defineSecret("MIGHTY_CLIENT_SECRET");
const MIGHTY_SUBDOMAIN = defineSecret("MIGHTY_SUBDOMAIN");
const MIGHTY_NETWORK_ID = defineSecret("MIGHTY_NETWORK_ID");
const MIGHTY_ADMIN_API_KEY = defineSecret("MIGHTY_ADMIN_API_KEY");
const MIGHTY_WEBHOOK_SECRET = defineSecret("MIGHTY_WEBHOOK_SECRET");

// ─── Constants ─────────────────────────────────────────────────────────────
const BRIDGE_CALLBACK_URL = "https://mightycallback-vc2epchfzq-uc.a.run.app";
const DEFAULT_APP_REDIRECT = "https://activitytracker-e2b7a.web.app";
const USER_AGENT = "MightyAuthBridge/1.0 (+https://activitytracker-e2b7a.web.app)";

/** Known plan IDs in Team NuVision (source of truth; names used as fallback). */
const PLAN_IDS = {
  PRO: 1927813, // "Pro Access"
  PLATINUM: 1927814, // "Platinum Access"
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Normalize network id from secrets.
 * Accepts bare subdomain ("team-nuvision"), full host ("team-nuvision.mn.co"),
 * or numeric id. Admin API rejects dotted hosts.
 */
function normalizeNetworkId(raw) {
  const value = String(raw || "").trim();
  if (!value) return value;
  if (/^\d+$/.test(value)) return value;
  return value.replace(/\.mn\.co$/i, "").replace(/^https?:\/\//i, "").split("/")[0];
}

function adminHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
}

function oauthHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
}

/** Official Headless GraphQL headers (Mighty docs require non-empty User-Agent). */
function graphqlHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
}

/**
 * Log GraphQL responses safely (status + body preview).
 * Detects Cloudflare / HTML challenge pages.
 */
function logGraphqlResponse(label, status, data, contentType) {
  let bodyPreview;
  if (typeof data === "string") {
    bodyPreview = data.slice(0, 300);
  } else {
    try {
      bodyPreview = JSON.stringify(data).slice(0, 300);
    } catch {
      bodyPreview = String(data).slice(0, 300);
    }
  }
  const looksLikeHtml =
    /<!DOCTYPE html|<html[\s>]/i.test(bodyPreview) ||
    String(contentType || "").includes("text/html");
  console.log(
    `[GraphQL] ${label} status=${status} contentType=${contentType || "n/a"} ` +
      `htmlChallenge=${looksLikeHtml} body[0:300]=${bodyPreview}`
  );
  return looksLikeHtml;
}

/** Decode JWT payload without verifying (token already issued by Mighty). */
function decodeJwtPayload(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Normalize GraphQL Node id → Admin API numeric member id when possible.
 * Relay global IDs may be base64 ("User-1814491") or plain digits.
 */
function toMightyMemberId(rawId) {
  const s = String(rawId || "").trim();
  if (!s) return s;
  if (/^\d+$/.test(s)) return s;
  try {
    const decoded = Buffer.from(s, "base64").toString("utf8");
    const m = decoded.match(/(\d{3,})/);
    if (m) return m[1];
  } catch {
    /* ignore */
  }
  const m2 = s.match(/(\d{3,})/);
  return m2 ? m2[1] : s;
}

/** In-memory cache: subdomain → numeric network id (warm instances). */
let cachedNumericNetworkId = null;

/**
 * Headless GraphQL on api.mn.co rejects some subdomain path forms with a
 * Cloudflare HTML 403. Numeric network id works reliably (schema + POST).
 * Resolve once via Admin API when MIGHTY_NETWORK_ID is a subdomain.
 */
async function resolveNumericNetworkId(networkId, adminApiKey) {
  const normalized = normalizeNetworkId(networkId);
  if (/^\d+$/.test(String(normalized))) {
    cachedNumericNetworkId = String(normalized);
    return cachedNumericNetworkId;
  }
  if (cachedNumericNetworkId) return cachedNumericNetworkId;

  try {
    const res = await axios.get(
      `https://api.mn.co/admin/v1/networks/${encodeURIComponent(normalized)}/`,
      {
        headers: adminHeaders(adminApiKey),
        timeout: 10000,
        validateStatus: () => true,
      }
    );
    const id = res.data?.id || res.data?.network?.id;
    if (res.status === 200 && id) {
      cachedNumericNetworkId = String(id);
      console.log(
        `[GraphQL] Resolved network "${normalized}" → numeric id ${cachedNumericNetworkId}`
      );
      return cachedNumericNetworkId;
    }
    console.log(
      `[GraphQL] Could not resolve numeric network id from Admin API: status=${res.status}`
    );
  } catch (err) {
    console.log("[GraphQL] Numeric network resolve error:", err.message);
  }
  return null;
}

/**
 * Map Mighty plan list → FREE | PRO | PLATINUM.
 * Highest tier wins if a member somehow has multiple.
 */
function mapPlansToTier(plans) {
  const list = Array.isArray(plans) ? plans : [];
  let tier = "FREE";
  let planName = "Free";

  for (const p of list) {
    const id = Number(p.id || p.plan_id || p.plan?.id || 0);
    const name = String(p.name || p.plan?.name || "").toLowerCase();

    if (id === PLAN_IDS.PLATINUM || name.includes("platinum")) {
      return { tier: "PLATINUM", planName: p.name || p.plan?.name || "Platinum Access" };
    }
    if (id === PLAN_IDS.PRO || (name.includes("pro") && !name.includes("non-tnv"))) {
      tier = "PRO";
      planName = p.name || p.plan?.name || "Pro Access";
    }
  }

  return { tier, planName };
}

/** Extract items from paginated or raw Admin API responses. */
function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.plans)) return data.plans;
  return [];
}

/**
 * Preferred profile path: Headless GraphQL `me`.
 *
 * Official endpoint:
 *   POST https://api.mn.co/networks/:network_id_or_subdomain/graphql
 *
 * Critical finding for team-nuvision:
 *   - Path with subdomain "team-nuvision" → Cloudflare HTML 403
 *   - Path with numeric id "1057380" → real GraphQL (401 without token / 200 with token)
 * Always prefer the numeric network id.
 *
 * Required headers: Authorization Bearer (OAuth access token), Content-Type, User-Agent.
 * PKCE is for OAuth authorize/token only — not required on GraphQL requests.
 */
async function fetchMemberViaGraphql({ accessToken, networkId, subdomain, adminApiKey }) {
  const ME_QUERY = `
    query BridgeMe {
      me {
        id
        email
        firstName
        lastName
        name
      }
    }
  `.trim();

  const numericId = await resolveNumericNetworkId(networkId, adminApiKey);

  // Prefer numeric id first (avoids Cloudflare HTML 403 on subdomain path).
  // Keep subdomain as secondary only for multi-network resilience.
  const pathKeys = [];
  if (numericId) pathKeys.push(String(numericId));
  const bareSub = normalizeNetworkId(subdomain || networkId);
  if (bareSub && !pathKeys.includes(bareSub)) pathKeys.push(bareSub);
  // Last resort: secret as-is if different
  const rawNet = normalizeNetworkId(networkId);
  if (rawNet && !pathKeys.includes(rawNet)) pathKeys.push(rawNet);

  for (const key of pathKeys) {
    const url = `https://api.mn.co/networks/${encodeURIComponent(key)}/graphql`;
    console.log(`[GraphQL] Trying me query url=${url}`);

    try {
      const gqlRes = await axios.post(
        url,
        { query: ME_QUERY, operationName: "BridgeMe" },
        {
          headers: graphqlHeaders(accessToken),
          timeout: 15000,
          validateStatus: () => true,
          // Don't let axios throw on non-2xx; we log full diagnostics
          responseType: "json",
          transformResponse: [
            (raw, headers) => {
              // Preserve raw string when body is HTML so we can log it
              if (typeof raw === "string" && /^\s*</.test(raw)) {
                return raw;
              }
              try {
                return JSON.parse(raw);
              } catch {
                return raw;
              }
            },
          ],
        }
      );

      const contentType = gqlRes.headers?.["content-type"] || "";
      const isHtml = logGraphqlResponse(
        `me key=${key}`,
        gqlRes.status,
        gqlRes.data,
        contentType
      );

      if (isHtml || gqlRes.status === 403) {
        console.log(
          `[GraphQL] Cloudflare/HTML or 403 for key=${key} — trying next candidate if any`
        );
        continue;
      }

      if (gqlRes.status === 401) {
        console.log("[GraphQL] UNAUTHENTICATED — access token rejected for this network key");
        continue;
      }

      // Application-level GraphQL errors still use HTTP 200
      if (gqlRes.data?.errors?.length) {
        console.log(
          "[GraphQL] errors:",
          JSON.stringify(gqlRes.data.errors).slice(0, 400)
        );
      }

      const me = gqlRes.data?.data?.me;
      if (me && (me.email || me.id)) {
        const nameParts = String(me.name || "").trim().split(/\s+/).filter(Boolean);
        const member = {
          id: toMightyMemberId(me.id),
          email: me.email || null,
          firstName: me.firstName || nameParts[0] || "",
          lastName: me.lastName || nameParts.slice(1).join(" ") || "",
          source: "graphql",
          graphqlNetworkKey: key,
        };
        if (!member.email) {
          console.log(
            "[GraphQL] me returned without email (scope/privacy?) — will use Admin fallback if possible. id=",
            member.id
          );
          // Still useful for id-based Admin lookup
          return member;
        }
        console.log(
          `[GraphQL] SUCCESS source=graphql id=${member.id} email=${member.email} key=${key}`
        );
        return member;
      }

      console.log(`[GraphQL] No me payload for key=${key}`);
    } catch (err) {
      console.log(`[GraphQL] Request error key=${key}:`, err.message);
    }
  }

  return null;
}

/**
 * Fetch member profile after OAuth.
 * 1) Headless GraphQL `me` (preferred)
 * 2) JWT claims from access token
 * 3) Admin API member lookup by email / id
 */
async function resolveMember({ accessToken, subdomain, networkId, adminApiKey }) {
  // 1) GraphQL me (preferred)
  try {
    const fromGql = await fetchMemberViaGraphql({
      accessToken,
      networkId,
      subdomain,
      adminApiKey,
    });
    if (fromGql?.email) {
      return fromGql;
    }
    // GraphQL gave id but no email — fall through to Admin with id
    if (fromGql?.id && /^\d+$/.test(String(fromGql.id))) {
      try {
        const byId = await axios.get(
          `https://api.mn.co/admin/v1/networks/${encodeURIComponent(networkId)}/members/${fromGql.id}/`,
          {
            headers: adminHeaders(adminApiKey),
            timeout: 12000,
            validateStatus: () => true,
          }
        );
        if (byId.status === 200 && byId.data?.email) {
          return {
            id: byId.data.id,
            email: byId.data.email,
            firstName: byId.data.first_name || fromGql.firstName || "",
            lastName: byId.data.last_name || fromGql.lastName || "",
            source: "graphql+admin-by-id",
          };
        }
      } catch (err) {
        console.log("Admin hydrate after GraphQL failed:", err.message);
      }
    }
  } catch (err) {
    console.log("GraphQL me error:", err.message);
  }

  // 2) JWT payload (if Mighty embeds email / sub)
  const claims = decodeJwtPayload(accessToken) || {};
  const jwtEmail = claims.email || claims.preferred_username || claims.user_email || null;
  const jwtId = claims.sub || claims.user_id || claims.uid || claims.member_id || null;
  console.log(
    "[Profile] GraphQL missed; JWT claim keys=",
    Object.keys(claims).join(",") || "(none)",
    "hasEmail=",
    Boolean(jwtEmail)
  );

  // 3) Admin API by email or id
  if (jwtEmail) {
    try {
      const byEmail = await axios.get(
        `https://api.mn.co/admin/v1/networks/${encodeURIComponent(networkId)}/members/by_email`,
        {
          params: { email: jwtEmail },
          headers: adminHeaders(adminApiKey),
          timeout: 12000,
        }
      );
      if (byEmail.data?.email) {
        return {
          id: byEmail.data.id,
          email: byEmail.data.email,
          firstName: byEmail.data.first_name || "",
          lastName: byEmail.data.last_name || "",
          source: "admin-by-email",
        };
      }
    } catch (err) {
      console.log("Admin by_email failed:", err.response?.status || err.message);
    }
  }

  if (jwtId && /^\d+$/.test(String(jwtId))) {
    try {
      const byId = await axios.get(
        `https://api.mn.co/admin/v1/networks/${encodeURIComponent(networkId)}/members/${jwtId}/`,
        {
          headers: adminHeaders(adminApiKey),
          timeout: 12000,
        }
      );
      if (byId.data?.email) {
        return {
          id: byId.data.id,
          email: byId.data.email,
          firstName: byId.data.first_name || "",
          lastName: byId.data.last_name || "",
          source: "admin-by-id",
        };
      }
    } catch (err) {
      console.log("Admin by id failed:", err.response?.status || err.message);
    }
  }

  // Last resort: if JWT only has email and Admin API failed, still create Firebase user
  if (jwtEmail) {
    return {
      id: jwtId || jwtEmail,
      email: jwtEmail,
      firstName: claims.given_name || claims.first_name || "",
      lastName: claims.family_name || claims.last_name || "",
      source: "jwt-only",
    };
  }

  throw new Error(
    "Could not resolve member profile. GraphQL blocked and access token has no email claim. " +
      "Ensure Headless API is enabled or contact Mighty support."
  );
}

/**
 * Load all plans the member has access to (paginated Admin API).
 */
async function fetchMemberPlans(networkId, memberId, adminApiKey) {
  const plans = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const res = await axios.get(
      `https://api.mn.co/admin/v1/networks/${encodeURIComponent(networkId)}/members/${memberId}/plans`,
      {
        params: { page, per_page: 100 },
        headers: adminHeaders(adminApiKey),
        timeout: 12000,
        validateStatus: () => true,
      }
    );

    if (res.status === 404) {
      console.log("Member plans 404 for", memberId);
      break;
    }
    if (res.status !== 200) {
      throw new Error(`Plan lookup HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
    }

    const items = extractItems(res.data);
    plans.push(...items);
    hasMore = Boolean(res.data?.links?.next) && items.length > 0;
    page += 1;
  }

  return plans;
}

/**
 * Resolve final plan: Admin API → planOverrides (email or mightyId).
 */
async function resolveUserPlan(networkId, member, adminApiKey) {
  let tier = "FREE";
  let planName = "Free";
  let planSource = "default";

  try {
    if (member.id && /^\d+$/.test(String(member.id))) {
      const plans = await fetchMemberPlans(networkId, member.id, adminApiKey);
      const mapped = mapPlansToTier(plans);
      tier = mapped.tier;
      planName = mapped.planName;
      planSource = "admin-api";
      console.log(
        "Plans for member",
        member.id,
        ":",
        plans.map((p) => p.name).join(", ") || "(none)",
        "→",
        tier
      );
    }
  } catch (err) {
    console.error("Plan lookup failed:", err.message);
    planSource = "default-after-error";
  }

  // Manual overrides win (by email or mighty member id)
  try {
    const keys = [
      String(member.email || "").toLowerCase(),
      String(member.id || ""),
    ].filter(Boolean);

    for (const key of keys) {
      const doc = await db.collection("planOverrides").doc(key).get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (data.active === false) continue;
        if (data.plan) {
          tier = String(data.plan).toUpperCase();
          planName = data.planName || tier;
          planSource = `override:${key}`;
          break;
        }
      }
    }
  } catch (err) {
    console.log("Override check skipped:", err.message);
  }

  return { tier, planName, planSource };
}

async function upsertFirebaseUser(member, tier, planName) {
  let firebaseUser;
  try {
    firebaseUser = await admin.auth().getUserByEmail(member.email);
  } catch {
    firebaseUser = await admin.auth().createUser({
      email: member.email,
      displayName: `${member.firstName || ""} ${member.lastName || ""}`.trim() || undefined,
      emailVerified: true,
    });
  }

  const claims = {
    plan: tier,
    planName,
    mightyId: String(member.id),
  };

  await admin.auth().setCustomUserClaims(firebaseUser.uid, claims);

  await db.collection("users").doc(firebaseUser.uid).set(
    {
      email: member.email,
      plan: tier,
      planName,
      mightyId: String(member.id),
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection("mightyMembers").doc(String(member.id)).set(
    {
      email: member.email,
      firebaseUid: firebaseUser.uid,
      plan: tier,
      planName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return firebaseUser;
}

// ─── 1. LOGIN ──────────────────────────────────────────────────────────────
exports.mightyLogin = onRequest(
  { secrets: [MIGHTY_CLIENT_ID, MIGHTY_SUBDOMAIN], cors: true },
  (req, res) => {
    const subdomain = MIGHTY_SUBDOMAIN.value();
    const clientId = MIGHTY_CLIENT_ID.value();
    const redirectUri = req.query.redirect_uri || DEFAULT_APP_REDIRECT;

    const stateString = Buffer.from(
      JSON.stringify({ redirectUri, nonce: Date.now() })
    ).toString("base64url");

    const authUrl =
      `https://${subdomain}.mn.co/oauth/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(BRIDGE_CALLBACK_URL)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("read:userinfo")}` +
      `&state=${stateString}`;

    res.redirect(authUrl);
  }
);

// ─── 2. CALLBACK ───────────────────────────────────────────────────────────
exports.mightyCallback = onRequest(
  {
    secrets: [
      MIGHTY_CLIENT_ID,
      MIGHTY_CLIENT_SECRET,
      MIGHTY_SUBDOMAIN,
      MIGHTY_NETWORK_ID,
      MIGHTY_ADMIN_API_KEY,
    ],
    cors: true,
  },
  async (req, res) => {
    try {
      const code = req.query.code;
      const state = req.query.state;
      const oauthError = req.query.error;

      if (oauthError) {
        return res.status(400).send(`OAuth error: ${oauthError}`);
      }
      if (!code) {
        return res.status(400).send("Missing authorization code");
      }

      let appRedirectUri = DEFAULT_APP_REDIRECT;
      if (state) {
        try {
          const raw = String(state).replace(/-/g, "+").replace(/_/g, "/");
          const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
          const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
          if (decoded.redirectUri) appRedirectUri = decoded.redirectUri;
        } catch (e) {
          console.log("State decode warning:", e.message);
        }
      }

      const subdomain = MIGHTY_SUBDOMAIN.value();
      const networkId = normalizeNetworkId(MIGHTY_NETWORK_ID.value()) || subdomain;
      const adminApiKey = MIGHTY_ADMIN_API_KEY.value();

      // Token exchange
      const tokenRes = await axios.post(
        `https://${subdomain}.mn.co/oauth/token`,
        new URLSearchParams({
          grant_type: "authorization_code",
          client_id: MIGHTY_CLIENT_ID.value(),
          client_secret: MIGHTY_CLIENT_SECRET.value(),
          redirect_uri: BRIDGE_CALLBACK_URL,
          code: String(code),
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
            Accept: "application/json",
          },
          validateStatus: () => true,
          timeout: 15000,
        }
      );

      if (tokenRes.status !== 200 || !tokenRes.data?.access_token) {
        console.error("Token exchange failed:", tokenRes.status, tokenRes.data);
        throw new Error("Token exchange failed");
      }

      const accessToken = tokenRes.data.access_token;

      // Real member profile (no hardcoding)
      const member = await resolveMember({
        accessToken,
        subdomain,
        networkId,
        adminApiKey,
      });

      if (!member.email) {
        throw new Error("Member profile missing email");
      }

      console.log("Resolved member:", member.email, "id:", member.id, "via", member.source);

      const { tier, planName, planSource } = await resolveUserPlan(
        networkId,
        member,
        adminApiKey
      );
      console.log("Plan:", tier, planName, "source:", planSource);

      const firebaseUser = await upsertFirebaseUser(member, tier, planName);

      const customToken = await admin.auth().createCustomToken(firebaseUser.uid, {
        plan: tier,
        planName,
        mightyId: String(member.id),
      });

      // Preserve existing query string on app redirect if present
      const sep = appRedirectUri.includes("?") ? "&" : "?";
      const finalRedirect = `${appRedirectUri}${sep}token=${encodeURIComponent(customToken)}`;
      return res.redirect(finalRedirect);
    } catch (error) {
      console.error("Callback Error:", error.message);
      res.status(500).send("Authentication failed. Please contact support.");
    }
  }
);

// ─── 3. WEBHOOK ────────────────────────────────────────────────────────────
exports.mightyWebhook = onRequest(
  {
    secrets: [MIGHTY_WEBHOOK_SECRET, MIGHTY_ADMIN_API_KEY, MIGHTY_NETWORK_ID, MIGHTY_SUBDOMAIN],
    cors: true,
  },
  async (req, res) => {
    const provided =
      req.headers.authorization ||
      req.headers["x-webhook-secret"] ||
      req.query.secret ||
      "";

    const expected = MIGHTY_WEBHOOK_SECRET.value();
    if (!expected || !String(provided).includes(expected)) {
      return res.status(403).send("Unauthorized");
    }

    try {
      const body = req.body || {};
      const payload = body.payload || body.data || body;

      // Mighty webhook shapes vary by event; try common id fields
      const mightyMemberId = String(
        payload.member_id ||
          payload.user_id ||
          payload.member?.id ||
          payload.user?.id ||
          payload.id ||
          ""
      );

      if (!mightyMemberId || mightyMemberId === "undefined") {
        console.log("Webhook missing member id:", JSON.stringify(body).slice(0, 500));
        return res.status(200).send("OK – no member id");
      }

      // Respect manual overrides (by mighty id or email if present)
      const emailHint = String(
        payload.email || payload.member?.email || payload.user?.email || ""
      ).toLowerCase();
      for (const key of [mightyMemberId, emailHint].filter(Boolean)) {
        const overrideDoc = await db.collection("planOverrides").doc(key).get();
        if (overrideDoc.exists && overrideDoc.data()?.active !== false && overrideDoc.data()?.plan) {
          console.log(`Override active for ${key} – skipping webhook update`);
          return res.status(200).send("OK – override active");
        }
      }

      const memberDoc = await db.collection("mightyMembers").doc(mightyMemberId).get();
      if (!memberDoc.exists) {
        console.log(`No Firebase record for Mighty member ${mightyMemberId}`);
        return res.status(200).send("OK – unknown member");
      }

      const { firebaseUid, email } = memberDoc.data();
      const networkId =
        normalizeNetworkId(MIGHTY_NETWORK_ID.value()) || MIGHTY_SUBDOMAIN.value();
      const adminApiKey = MIGHTY_ADMIN_API_KEY.value();

      let tier = "FREE";
      let planName = "Free";

      // Prefer plan name from webhook payload when present
      const payloadPlanName =
        payload.plan?.name ||
        payload.plan_name ||
        payload.new_plan?.name ||
        payload.subscription?.plan?.name ||
        null;

      if (payloadPlanName) {
        const mapped = mapPlansToTier([{ name: payloadPlanName, id: payload.plan?.id }]);
        tier = mapped.tier;
        planName = mapped.planName;
      } else {
        try {
          const plans = await fetchMemberPlans(networkId, mightyMemberId, adminApiKey);
          const mapped = mapPlansToTier(plans);
          tier = mapped.tier;
          planName = mapped.planName;
        } catch (e) {
          console.error("Webhook plan lookup failed:", e.message);
        }
      }

      await admin.auth().setCustomUserClaims(firebaseUid, {
        plan: tier,
        planName,
        mightyId: mightyMemberId,
      });

      await db.collection("mightyMembers").doc(mightyMemberId).set(
        {
          plan: tier,
          planName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (firebaseUid) {
        await db.collection("users").doc(firebaseUid).set(
          {
            plan: tier,
            planName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      console.log(`Webhook updated ${mightyMemberId} (${email || "?"}) → ${tier}`);
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  }
);
