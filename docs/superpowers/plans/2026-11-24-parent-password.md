# Parent Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A parent links an e-mail/password to their existing Google account (same uid, same family) and can sign in with it; the app asks iOS to keep a parent's data.

**Architecture:** Pure rules and error mapping in `src/lib/account/password.ts` (Vitest); Firebase Auth calls in `session` (`auth.svelte.ts`); two components (`PasswordForm` on `/me`, `PasswordSignIn` in `SessionGate`).

**Tech Stack:** SvelteKit 3 + Svelte 5, Firebase Auth 13, Vitest, daisyUI 5.

**Spec:** [docs/superpowers/specs/2026-11-24-parent-password-design.md](../specs/2026-11-24-parent-password-design.md)

## Global Constraints

- Code in English, UI text in `fr.ts` (section `account`); `#lib/<path>.ts` imports.
- No account creation in the UI; children never see the password form.
- No Firestore rules change; no new dependency.
- Commits: Conventional Commits, one line, no attribution.

## Review Focus

1. **Stale Google sign-in** when linking: `auth/requires-recent-login` → Google popup re-auth, one retry (Task 2).
2. **Wrong credentials / too many attempts / offline** at sign-in: a French message, never a raw code (Task 1 test `maps Firebase codes to messages`).
3. **E-mail already used by another account** (`auth/credential-already-in-use`, `auth/email-already-in-use`): clear message, nothing linked (Task 1 test).
4. **Password already set**: the form changes it instead of linking again (Task 2, `hasPassword`).
5. **Forgotten password with an empty e-mail**: button disabled until an e-mail is typed (Task 3).

---

### Task 1: `account/password.ts` (pure)

**Files:** Create `src/lib/account/password.ts`, `src/lib/account/password.test.ts`.

**Interfaces — Produces:**
```ts
export const PASSWORD_MIN = 8;
export type PasswordProblem = 'tooShort' | 'mismatch';
export function passwordProblem(password: string, confirm: string): PasswordProblem | null;
export type AuthErrorKey = 'wrongCredentials' | 'tooManyRequests' | 'offline' | 'weakPassword'
	| 'alreadyUsed' | 'invalidEmail' | 'popupClosed' | 'generic';
export function authErrorKey(code: string | undefined): AuthErrorKey;
```

- [ ] **Step 1: Failing tests**: `passwordProblem('abc', 'abc')` → `'tooShort'`; `('abcdefgh', 'abcdefgx')` → `'mismatch'`; `('abcdefgh', 'abcdefgh')` → `null`; `maps Firebase codes to messages`: `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` → `wrongCredentials`; `auth/too-many-requests` → `tooManyRequests`; `auth/network-request-failed` → `offline`; `auth/weak-password` → `weakPassword`; `auth/credential-already-in-use`, `auth/email-already-in-use` → `alreadyUsed`; `auth/invalid-email`, `auth/missing-email` → `invalidEmail`; `auth/popup-closed-by-user`, `auth/cancelled-popup-request` → `popupClosed`; `undefined`, `auth/whatever` → `generic`.
- [ ] **Step 2: Run** `npx vitest run --project server src/lib/account/password.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(account): password rules and auth error messages`

### Task 2: Session and « Mon profil »

**Files:** Modify `src/lib/auth.svelte.ts`, `src/routes/me/+page.svelte`, `src/lib/i18n/fr.ts`; Create `src/lib/components/PasswordForm.svelte`.

**Interfaces — Produces (on `session`):** `hasPassword: boolean` (`$state`, from `user.providerData` at load and after a change); `setPassword(password: string): Promise<void>` (link or update; re-auth with Google once on `auth/requires-recent-login`); `signInWithPassword(email: string, password: string): Promise<void>`; `sendPasswordReset(email: string): Promise<void>`. After a parent's session loads: `navigator.storage?.persist?.()` (errors ignored).

- [ ] **Step 1: French strings** `fr.account`: `title: 'Mot de passe'`, `help: 'Pour te connecter sans Google (pratique sur iPhone).'`, `email: 'E-mail'`, `password: 'Mot de passe'`, `confirm: 'Confirmer le mot de passe'`, `set: 'Définir le mot de passe'`, `change: 'Changer le mot de passe'`, `saving: 'Enregistrement…'`, `saved: 'Mot de passe enregistré.'`, `tooShort: (min) => \`Au moins ${min} caractères.\``, `mismatch: 'Les deux mots de passe sont différents.'`, `or: 'ou'`, `signIn: 'Se connecter'`, `signingIn: 'Connexion…'`, `forgot: 'Mot de passe oublié ?'`, `resetSent: "Si un compte existe pour cet e-mail, un message pour choisir un nouveau mot de passe vient d'être envoyé."`, `errors: { wrongCredentials: 'E-mail ou mot de passe incorrect.', tooManyRequests: 'Trop d\'essais. Réessaie dans quelques minutes.', offline: 'Pas de connexion internet.', weakPassword: 'Mot de passe trop faible.', alreadyUsed: 'Cet e-mail est déjà utilisé par un autre compte.', invalidEmail: 'E-mail invalide.', popupClosed: 'Fenêtre Google fermée : réessaie.', generic: "Ça n'a pas fonctionné. Réessaie." }`.
- [ ] **Step 2: Session methods** as above (imports from `firebase/auth`: `EmailAuthProvider`, `linkWithCredential`, `reauthenticateWithPopup`, `updatePassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`).
- [ ] **Step 3: `PasswordForm`** (`card card-border`, `fieldset` fields, `autocomplete="new-password"`, `passwordProblem` shown under the fields, error via `authErrorKey`, success `alert-success alert-soft`, disabled offline), shown on `/me` when `session.isAdmin && session.user?.email && !session.user.isAnonymous`.
- [ ] **Step 4: Verify** `npm run check && npm run lint && npm run test` — Expected: all green.
- [ ] **Step 5: Commit** `feat(account): set or change a password on the parent's Google account`

### Task 3: Sign in with a password

**Files:** Create `src/lib/components/PasswordSignIn.svelte`; Modify `src/lib/components/SessionGate.svelte`.

- [ ] **Step 1: `PasswordSignIn`**: `divider` « ou », e-mail (`type="email"`, `autocomplete="username"`) + mot de passe (`autocomplete="current-password"`), `btn btn-primary` « Se connecter » (submit; disabled while running or when a field is empty), `btn btn-link btn-sm` « Mot de passe oublié ? » (disabled without an e-mail; shows `resetSent` whatever the result, except `invalidEmail`/`offline`), errors through `authErrorKey`.
- [ ] **Step 2:** In `SessionGate`, under the Google button in the parent card.
- [ ] **Step 3: Verify** `npm run check && npm run lint && npm run test`.
- [ ] **Step 4: Commit** `feat(auth): parent sign-in with e-mail and password`

### Task 4: End-to-end on the emulators + docs

- [ ] Google sign-in (emulator), `/me` → set password → sign out → sign in with e-mail + password → same family (« Espace parent », same binder). Wrong password → French message. Change password works. Forgot → message.
- [ ] `CLAUDE.md`: decisions-log entry (password linked to the Google account, no sign-up, `storage.persist()` for parents); `README.md` auth line; `docs/operations.md` if it lists auth providers.
- [ ] `npm run verify` green; commit `docs: parent password sign-in`.
