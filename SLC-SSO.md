# SLC staff sign-in for Pasunestam

Editors and admins sign in with their **SLC Account**, the one login with MFA
shared by every SLC app. Who is an editor or admin is set in SLC Central Admin →
Admin access (client `pasunestam-admin`, roles `editor` / `manager`). Vets keep
their own email + password accounts; nothing changes for them.

## Flow (all server-side, like the rest of this app's auth)

1. `/login` shows "Sign in with SLC Account" when `SLC_ISSUER_URL` is set.
2. `GET /auth/slc/login` → SLC (Authorization Code + PKCE, public client, no
   secret). State, nonce and verifier sit in a 10-minute httpOnly cookie.
3. `GET /auth/slc/callback` exchanges the code, verifies the ID token
   (signature, issuer, audience, expiry, nonce), and maps the SLC role:
   `manager` → profile role `admin`, `editor` → `editor`, anything else → refused.
   (The SLC role is `manager` because Keycloak will not let Central Admin grant
   a role named `admin`.)
4. The profile `profiles/slc:<SLC id>` is created or its role updated, then a
   Firebase custom token (claims `slc_admin`, `slc_roles`, `slc_email`) is
   exchanged through the Identity Toolkit REST API for an ID token and the
   usual `session` cookie.

SLC staff sessions are verified with revocation checking
(`verifySessionCookie(cookie, true)`), so disabling or signing someone out in
SLC Central Admin ends their Pasunestam session at their next request. Signing
out here also ends the SLC session.

## Configuration

```
SLC_ISSUER_URL=https://id.slcvet.com/realms/slc
SLC_CLIENT_ID=pasunestam-admin
SLC_PROVIDER_NAME="SLC Account"
```

In SLC (Keycloak), client `pasunestam-admin` needs
`https://pasunestam.com/auth/slc/callback` as a redirect URI and
`https://pasunestam.com/` as a post-logout redirect URI.

For central sign-out to revoke Pasunestam sessions, add Pasunestam to SLC
Central Admin's `FIREBASE_BRIDGE_APPS` (no `origins` needed):
`{"clientId":"pasunestam-admin","serviceAccountEnv":"FIREBASE_SA_PASUNESTAM"}`.

The service account here needs permission to sign custom tokens
(**Service Account Token Creator** on itself), which it already has when it is
the project's default Firebase Admin SDK account.

Tests: `lib/auth/slc.test.ts`.
