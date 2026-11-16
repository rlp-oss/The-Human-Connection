# H.U.M.A.N. Initiative Firestore Security Specification (`security_spec.md`)

## Phase 0: Core Data & Security Invariants

1. **Email-Verified Master Admin Identity**:
   - Master Admin (`codygermain032@gmail.com`) privileges require `request.auth != null`, `request.auth.token.email_verified == true`, and case-insensitive email match. Unverified tokens are rejected.
2. **Default-Deny & Zero-Trust Boundaries**:
   - Root catch-all `match /{document=**} { allow read, write: if false; }` denies every unmodeled collection.
   - All 9 active collections (`testers`, `feedbacks`, `broadcasts`, `creator_claims`, `copyright_claims`, `app_badges`, `society_metrics`, `captured_splits`, `distribution_rounds`) plus `/test/connection` have explicit match blocks.
3. **PII Isolation & Query Enforcement**:
   - Collections storing PII (`testers`, `feedbacks`, `creator_claims`, `copyright_claims`, `captured_splits`) deny unauthenticated and cross-user `get` and `list`. Non-admin verified users may only read/query documents where `resource.data.ownerUid == request.auth.uid`.
4. **Anti-Privilege-Escalation & Anti-Financial-Tampering on Create**:
   - Standard verified users cannot self-assign privileged roles (`role == 'App Creator'`), cannot self-verify copyright claims (`status == 'Verified'`), cannot credit payout balances (`payout_balance_usd > 0`), and cannot forge another user's `ownerUid`.
5. **Action-Based Updates & Terminal State Locking**:
   - Every `allow update` begins with `isValid[Entity](incoming())`, validates `id` and `ownerUid` immutability, restricts changed keys via `incoming().diff(existing()).affectedKeys().hasOnly([...])`, and blocks non-admin modifications once terminal states (`Resolved`, `Verified`, `Suspended`, `Completed`) are reached.
6. **Immutability of Financial Ledgers**:
   - `captured_splits` cannot be updated or deleted once created; `society_fund_share_pct` in `society_metrics` is locked to `50` and `societyFundSplitUsd` is mathematically bounded to 50% of `grossAmountUsd`.

---

## Phase 0: The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Expected Result |
|---|---|---|---|
| 1 | `/testers/tst_spoof` | **Unverified Email Admin Spoof**: `email: "codygermain032@gmail.com"` with `email_verified: false` attempting `list` or `write`. | `PERMISSION_DENIED` (`isMasterAdmin()` requires `email_verified == true`) |
| 2 | `/testers/tst_esc` | **Self-Assigned Privileged Role & Royalty**: Authenticated user (`uid: userA`) creates `{ ownerUid: "userA", role: "App Creator", total_royalties_received: 5000 }`. | `PERMISSION_DENIED` (`role == 'Beta Tester'` & `total_royalties_received == 0` enforced) |
| 3 | `/testers/tst_id` | **Cross-User Identity Spoof**: `userA` creates `/testers/tst_x` with `{ ownerUid: "userB" }`. | `PERMISSION_DENIED` (`ownerUid == request.auth.uid` enforced) |
| 4 | `/testers/tst_ghost` | **Shadow / Ghost Field Injection**: `userA` injects `{ ..., isAdmin: true }` into update/create payload. | `PERMISSION_DENIED` (`keys().hasOnly(...)` & `affectedKeys().hasOnly(...)`) |
| 5 | `/testers/tst_pii` | **PII Blanket Read**: Authenticated `userB` calls `get` or `list` on `/testers` owned by `userA`. | `PERMISSION_DENIED` (`existing().ownerUid == request.auth.uid` on both `get` and `list`) |
| 6 | `/creator_claims/clm_mint` | **Self-Verified Payout Minting**: `userA` creates `/creator_claims/clm_mint` with `{ status: "Verified", payout_balance_usd: 424.48 }`. | `PERMISSION_DENIED` (non-admin claims must start `Pending Review` with `0` balance) |
| 7 | `/creator_claims/clm_lock` | **Terminal State Mutation**: `userA` attempts to edit `title` or `payout_balance_usd` on an already `Verified` claim. | `PERMISSION_DENIED` (`existing().status != 'Verified'` + key allowlist) |
| 8 | `/copyright_claims/clm_xss` | **Denial-of-Wallet Resource Poisoning**: `userA` sends a 500KB `evidence_description` or 200-char document ID `../../../../bad`. | `PERMISSION_DENIED` (`isValidId()` + `.size() <= 2000`) |
| 9 | `/feedbacks/fb_resolve` | **State Shortcutting**: `userA` updates own feedback with `{ status: "Resolved" }` or edits after `Resolved`. | `PERMISSION_DENIED` (`status` not in user-updatable keys; `existing().status != 'Resolved'`) |
| 10 | `/broadcasts/bc_forge` | **Unauthorized Broadcast Injection**: Non-admin user attempts `create` on `/broadcasts/bc_fake`. | `PERMISSION_DENIED` (`isMasterAdmin()` required for all writes) |
| 11 | `/society_metrics/live_summary` | **Covenant Split Tampering**: Non-admin updates `society_fund_share_pct: 10`, or admin violates `society_fund_share_pct == 50`. | `PERMISSION_DENIED` (`isMasterAdmin()` + `society_fund_share_pct == 50`) |
| 12 | `/captured_splits/txn_1` | **Ledger Tampering / Deletion**: Attempt to `update` or `delete` a recorded split in `/captured_splits`, or create with non-50% math. | `PERMISSION_DENIED` (`allow update, delete: if false;` + 50% invariant check) |
