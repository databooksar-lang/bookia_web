# AGENTS.md

Repo guidance for AI agents working in `bookia-frontend`. Use this file for fast orientation, frontend checks, and documentation guardrails. Use `README.md` for full setup, deployment, and human-facing operational detail.

## Repo Map

- React/Vite SPA entrypoint: `src/main.jsx`
- App routing and top-level layout: `src/App.jsx`
- Shared navigation links: `src/navigation.jsx`
- Header/footer chrome: `src/components/SiteChrome.jsx`
- Public pages: `src/pages/PublicPages.jsx`
- Legal pages:
  - Terms and Conditions: `/terms` in `src/pages/TermsPage.jsx`
  - Privacy Policy: `/privacy` in `src/pages/PrivacyPage.jsx`
  - Cookie Policy: `/cookies` in `src/pages/CookiePolicyPage.jsx`
- Dashboard and bookstore management UI: `src/pages/DashboardPage.jsx` and components under `src/components/`
- Frontend tests: `tests/run-tests.js` plus focused state tests under `tests/`

## Common Commands

- Start local dev server: `npm run dev`
- Run frontend tests: `npm test`
- Build production bundle: `npm run build`

If Vite or esbuild fails with a sandbox-related `spawn EPERM`, rerun the same command with the appropriate sandbox escalation rather than changing project code.

## Legal And Documentation Review Rule

For every future change, explicitly consider whether any of these files also need an update:

- `src/pages/TermsPage.jsx`
- `src/pages/PrivacyPage.jsx`
- `src/pages/CookiePolicyPage.jsx`
- `README.md`

This is a review requirement, not an automatic edit requirement: update only the documents affected by the change, but do not skip the check.

## When To Recheck Legal Pages

Review Terms, Privacy, Cookies, and README when a change affects:

- Accounts, registration, login, sessions, cookies, CSRF, password reset, or authentication UX
- Newsletter, personal data, reader profiles, favorites, public bookstore data, contact details, or data retention
- Bookstore plans, prices, catalog limits, AI features, Telegram flows, external providers, storage, or infrastructure
- Book purchases, direct bookstore contact, reservations, payments, deliveries, returns, refunds, complaints, or availability promises
- Deployment, environment variables, `/api` proxy behavior, cache headers, runtime config, hosting, or operational setup

## Safe Change Guidelines

- Keep Bookia's current product position consistent: Bookia is a discovery/contact platform and does not process reader payments or store card data unless the implementation explicitly changes that.
- Preserve links among `/terms`, `/privacy`, and `/cookies` when editing legal pages or registration copy.
- Keep README focused on setup, deployment, environment variables, and operations.
- Keep AGENTS.md focused on agent orientation and guardrails.
- Add or update targeted tests for user-visible routing, registration copy, API route detection, legal links, or documentation-sensitive behavior.
