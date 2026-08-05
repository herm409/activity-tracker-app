# Mighty Networks ↔ Firebase Auth Bridge

**Central authentication service** for all Herman / Team NuVision apps.

| Item | Value |
|------|--------|
| Firebase project | `activitytracker-e2b7a` |
| Region | `us-central1` |
| Login URL | `https://mightylogin-vc2epchfzq-uc.a.run.app` |
| Callback URL | `https://mightycallback-vc2epchfzq-uc.a.run.app` |
| Webhook URL | `https://mightywebhook-vc2epchfzq-uc.a.run.app` |

Mighty is the **source of truth** for identity and plan (`FREE` / `PRO` / `PLATINUM`).  
No other app should create its own Mighty OAuth application or Admin API plan logic.

---

## Adding a new app (checklist)

1. **Login redirect** — send the user to:
   ```
   https://mightylogin-vc2epchfzq-uc.a.run.app?redirect_uri=https://YOUR-APP.com/callback
   ```
2. **Callback route** — on `YOUR-APP.com/callback`, read `token` from the query string and:
   ```js
   import { getAuth, signInWithCustomToken } from "firebase/auth";

   const params = new URLSearchParams(window.location.search);
   const token = params.get("token");
   if (token) {
     await signInWithCustomToken(getAuth(), token);
     // optional: strip token from URL
     window.history.replaceState({}, "", "/");
   }
   ```
3. **Use the same Firebase project** (`activitytracker-e2b7a`) Auth config in the app,  
   **or** enable multi-project token acceptance only if you know what you’re doing.  
   Prefer **one shared Firebase Auth project** for all suite apps.
4. **Read the plan claim**:
   ```js
   const user = getAuth().currentUser;
   const result = await user.getIdTokenResult(true); // force refresh after login
   const plan = result.claims.plan; // "FREE" | "PRO" | "PLATINUM"
   ```
5. **Do not** add Mighty OAuth, Admin API keys, or plan webhooks to the new app.

---

## Plan mapping (Team NuVision)

| Mighty plan | Firebase claim `plan` |
|-------------|------------------------|
| **Platinum Access** (id `1927814`) | `PLATINUM` |
| **Pro Access** (id `1927813`) | `PRO` |
| All other / no paid plan | `FREE` |

Manual overrides: Firestore collection `planOverrides`  
- Doc id = member email (lowercase) **or** Mighty member id  
- Fields: `{ plan: "PLATINUM", planName: "Override", active: true }`

---

## Webhook

Point Mighty webhooks (MemberPlanChanged, MemberPurchased, MemberRemovedFromPlan, MemberSubscriptionCanceled, etc.) at:

```
https://mightywebhook-vc2epchfzq-uc.a.run.app
```

Authenticate with header:
```
Authorization: Bearer <MIGHTY_WEBHOOK_SECRET>
```
(or `x-webhook-secret` / `?secret=`)

The webhook re-fetches the member’s plans from the Admin API and updates Auth custom claims + Firestore.

---

## Secrets (Firebase Secret Manager)

| Secret | Notes |
|--------|--------|
| `MIGHTY_CLIENT_ID` | OAuth confidential client |
| `MIGHTY_CLIENT_SECRET` | OAuth confidential client |
| `MIGHTY_SUBDOMAIN` | e.g. `team-nuvision` (no `.mn.co`) |
| `MIGHTY_NETWORK_ID` | Bare subdomain **or** numeric id (e.g. `team-nuvision` or `1057380`). **Never** `team-nuvision.mn.co` |
| `MIGHTY_ADMIN_API_KEY` | Admin API bearer token |
| `MIGHTY_WEBHOOK_SECRET` | Shared webhook secret |

Mighty OAuth redirect URI (exact):
```
https://mightycallback-vc2epchfzq-uc.a.run.app
```
Scope: `read:userinfo`

---

## Architecture notes

1. **Profile** — GraphQL Headless `me` (preferred); falls back to JWT claims + Admin API `members/by_email`.
2. **Plans** — Admin API  
   `GET /admin/v1/networks/{network_id}/members/{member_id}/plans`  
   Response is paginated: `{ items: [...], links: { next } }`.
3. **GraphQL / Cloudflare (critical)**  
   - Official endpoint: `POST https://api.mn.co/networks/:id_or_subdomain/graphql`  
   - Required: `Authorization: Bearer <oauth_access_token>`, `Content-Type: application/json`, non-empty `User-Agent`  
   - For **team-nuvision**, the **subdomain path** (`…/networks/team-nuvision/graphql`) returns Cloudflare HTML **403**.  
   - The **numeric network id** path (`…/networks/1057380/graphql`) works.  
   - The bridge resolves numeric id via Admin API and prefers it for GraphQL.  
   - PKCE applies to OAuth authorize/token only, not to GraphQL.  
   - Success log line: `[GraphQL] SUCCESS source=graphql id=… email=…`
4. **Firestore** — `users/{uid}`, `mightyMembers/{mightyId}`, optional `planOverrides/{key}`.

---

## Deploy

```bash
cd functions
firebase deploy --only functions:mightyLogin,functions:mightyCallback,functions:mightyWebhook
```

After changing secrets:
```bash
firebase deploy --only functions
```
