@AGENTS.md

## Deployment

Production URL: https://fitness-tracker-phi-weld.vercel.app

⚠️ neven-mess.de ist NICHT funktionsfähig.
⚠️ Immer die stabile Domain oben verwenden — NICHT die per-Deployment-URLs
(`fitness-tracker-xxxxx-neven-s-projects.vercel.app`). Google-Login funktioniert
nur auf der stabilen Domain: `NEXT_PUBLIC_SITE_URL` zeigt dorthin, und der
PKCE-Cookie des OAuth-Flows ist an die Domain gebunden, auf der man "Anmelden"
klickt. Login von einer anderen Domain endet in `auth_callback_failed`.
