This frontend folder is a static copy of your templates and static assets for deployment on Vercel.

Quick steps to prepare:

1. Copy the `templates/` HTML files you want to serve into this `frontend/` folder root (or a `public/` folder).
2. Copy `static/` into `frontend/static/` and update all HTML to reference `/static/...` paths instead of `{{ url_for(...) }}`.
3. Replace any server-side template tags with static equivalents.

Deploying on Vercel:
- Push this folder to your GitHub repo and import to Vercel, or use the Vercel CLI.
- If needed, add `vercel.json` to set routes and headers.

CORS / API:
- Update JS to call the backend API deployed on Fly.io (e.g. `https://<your-app>.fly.dev/api/...`).
- Make sure the backend enables CORS (the example backend does).
