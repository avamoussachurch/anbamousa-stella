# Anba Mousa authentication branding

The application uses Supabase Auth for identity. Branding has three independent layers; changing one does not automatically brand the others.

## Branded email templates

The HTML files in `supabase/templates/` are ready-to-paste templates for Supabase Auth:
- Confirm signup: `confirm_signup.html`
- Password recovery: `reset_password.html`
- Magic link: `magic_link.html`
- Invite: `invite.html`

The templates use Supabase's supported `{{ .ConfirmationURL }}` variable and keep authentication copy short and security-focused.

**Important for this project:** it was created in September 2026 on the Free plan. Supabase's June 3, 2026 breaking change prevents new Free projects using Supabase's default SMTP from customizing Auth email templates. To use these templates, configure a custom SMTP provider first. Set the SMTP sender display name to **Anba Mousa** and use a From address on a domain you control after completing SPF, DKIM, and DMARC. Never commit SMTP credentials.

Supabase docs: https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/auth-email-templates

## Supabase Auth URL configuration

In Authentication → URL Configuration:
1. Set Site URL to the canonical public Anba Mousa website URL.
2. Add only the production and explicitly used staging/local callback URLs to the redirect allow list.
3. Keep the app's OAuth redirect on the app origin; do not use the project API URL as the website URL.

The app currently calls Google OAuth with `redirectTo: window.location.origin`, which sends users back to the website origin. The Google provider callback URI still belongs to Supabase until a custom Auth domain is configured.

## Google sign-in branding

In Google Cloud Console → Google Auth Platform:
1. Set the application name to **Anba Mousa**.
2. Add the official Anba Mousa logo and support/developer contact details.
3. Configure the authorized domains to match the real public website/auth domain.
4. Complete Google's brand verification if prompted.

Google owns the consent-screen branding and verification; this cannot be changed by React code or a database migration.

## Removing the Supabase project hostname from OAuth flows

A Supabase custom Auth domain can replace the project-ref hostname in Auth URLs and OAuth callback flows. Supabase documents this as a paid add-on for paid-plan projects. Do not enable or purchase it without explicit budget approval. The exact custom domain must be a domain the church controls and can configure in DNS.

## Required launch verification

After the provider and domain settings are configured:
- send confirmation, recovery, magic-link, and invite emails to external test inboxes;
- verify sender name, sender address, branding, links, SPF/DKIM/DMARC, and delivery;
- test Google sign-in from a clean browser session on the production hostname;
- verify redirect allow-list behavior for production and staging.
