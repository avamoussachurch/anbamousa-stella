# Anba Mousa notification and browser push setup

The notification database, role-scoped triggers, preferences, scheduled reminders, push service worker handler, and Supabase `push` Edge Function are implemented. **Browser push delivery is not live until the VAPID keys and database webhook below are configured.** In-app notifications work independently.

## 1. Generate VAPID keys

On a trusted developer machine, run:

```bash
npx web-push generate-vapid-keys
```

Keep the private key secret. Do not commit either key to GitHub. Generate a separate webhook authentication secret with `openssl rand -hex 32`; do not reuse the VAPID private key or Supabase API key.

## 2. Configure the frontend

Set the public key in the production frontend build environment:

```env
VITE_VAPID_PUBLIC_KEY=<VAPID_PUBLIC_KEY>
```

Also add it to the local `.env` file for development. The public key is expected to be visible to the browser; it is not an authentication secret.

## 3. Configure Supabase Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (a valid contact URI such as `mailto:<your-church-support-email>`)
- `PUSH_WEBHOOK_SECRET` (a long, randomly generated secret used only between the database webhook and the Edge Function)

The Edge Function uses the platform-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never put the service-role key or VAPID private key in a Vite variable or browser bundle.

The `push` Edge Function is deployed with gateway JWT verification disabled because it is called by a database webhook. It performs its own constant-time bearer-secret check against `PUSH_WEBHOOK_SECRET` before reading the notification. Generate a unique value for this secret and use the same value in the Edge Function secret and the webhook's Authorization header. Do not expose it to the browser.

## 4. Create the database webhook

In Supabase Dashboard → Database → Webhooks, create a webhook with:

- Table: `public.notifications`
- Event: `INSERT`
- Type: Supabase Edge Function
- Function: `push`
- Method: `POST`
- Header: `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`
- Header: `Content-Type: application/json`

Use the service-role key only in the webhook configuration. Do not commit it.

## 5. Allow the password-recovery redirect

In Supabase Dashboard → Authentication → URL Configuration, add the deployed origin with the `/reset-password` path to the allowed Redirect URLs (and the matching localhost URL for development). The sign-in screen sends password-recovery links to this route.

## 6. Verify from a real device

1. Deploy the frontend over HTTPS.
2. Sign in with a real student, parent, teacher or admin account.
3. Open Notification settings and enable Browser push. The user must explicitly grant browser permission.
4. Confirm that a row appears in `push_subscriptions` for that signed-in user and `push_enabled` is true in `notification_preferences`.
5. Create a real event/post or complete a test lesson in a controlled test account. Confirm an in-app notification row, then confirm browser delivery and `push_status = 'sent'`.
6. Test Arabic and English preference, quiet hours, unsubscribe, and a revoked/expired endpoint.

## Delivery behaviour

The database-side notification triggers also cover teacher replies to student posts, verified parent alerts for newly published lessons, and class/admin daily activity summaries. Three hourly scheduled jobs run using Cairo-local time for streak reminders, event reminders, and daily summaries. Weekly leaderboard overtakes are calculated from the same verified lesson-completion points used by the weekly ranking.

- In-app notifications are persisted in `public.notifications` and are scoped by recipient RLS.
- Push is opt-in per user and device. No browser permission is requested until the user enables it.
- Category preferences are honoured. Pushes created during quiet hours are skipped; the in-app notification remains available.
- Repeated source events are deduplicated by recipient and dedupe key.
- Expired (404/410) subscriptions are removed. Other endpoint failures are recorded for review.
- The hourly Cairo-time jobs generate gentle streak reminders only for students who were active yesterday and have not been active today, plus parent reminders for verified links. They do not shame students or announce a lost streak.
- Church-event reminders are generated in the 23–24 hour window before an event.

## Important

A deployed Edge Function alone does not send push messages. Both VAPID keys, `VAPID_SUBJECT`, `PUSH_WEBHOOK_SECRET`, the frontend public key and the database webhook are required. Until the webhook and credentials are configured, the app correctly keeps browser push disabled rather than showing a false “Active” state.
