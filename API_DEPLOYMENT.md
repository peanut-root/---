# Backend Text Generation Setup

The participant experiment is still a static HTML/JS app. AI text generation is available only in the researcher panel and is routed through a backend API endpoint:

```text
POST /api/generate-text
```

Do not put an OpenAI API key in `index.html`, `admin.html`, or any browser-side file. Configure it as a server-side environment variable:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Keys that begin with `sk-` are typically OpenAI-compatible keys. Do not paste the key into HTML.

The included `api/generate-text.js` function is written for Node-style serverless hosting such as Vercel. GitHub Pages can host the HTML files, but GitHub Pages alone cannot run this backend API. For GitHub Pages, deploy the API function separately and update the frontend endpoint if needed.

The generation request uses:

- Structured role/task/config prompt
- Narrative-only genre control
- Human reference passage matching
- Low default temperature: `0.2`
- Three candidate passages by default
- JSON object output for predictable parsing

The researcher should review candidates and select one before running participants. Participant pages do not call the API.

## Data Collection Backend

The full participant page submits completed trial rows to:

```text
POST /api/submit-results
```

The included `server.js` app appends each completed participant submission to:

```text
data/master-results.csv
```

The file starts empty except for the header row. Every completed participant receives a server-side `participant_number`, so later analysis can identify the 1st, 2nd, 3rd participant, etc. Duplicate submissions are guarded by a `submission_id`.

Run locally:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:8765/admin.html
http://127.0.0.1:8765/index.full-experiment.html
```

Admin endpoints:

```text
GET /api/results
GET /api/results.csv
```

## Important Deployment Note

GitHub Pages alone cannot receive participant data or append to a master CSV because it is static hosting only. For real online collection, deploy the backend too. Options:

- A small Node server on Render, Railway, Fly.io, or a VPS using `npm start`
- Vercel/Netlify serverless functions plus persistent storage
- Supabase / Firebase / Cloudflare D1 for database-backed storage

For collecting around 100 participants, a persistent database-backed option is safer than serverless local-file writes, because some serverless platforms use ephemeral file systems. The current `server.js` file-write backend is best for local testing or a persistent Node server.
