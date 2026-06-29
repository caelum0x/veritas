# Deploying Veritas

Two independent things ship separately:

1. **Showcase site** (`web/`) → **Vercel** (static, public marketing/demo page).
2. **CAP provider** (`apps/cap-agent`) → a **persistent host** (Render / Railway / Fly).
   Vercel is serverless and cannot host a long-running outbound agent connection.

---

## 1. Showcase site → Vercel

The site is plain static HTML/CSS in `web/`; `vercel.json` serves it with no build.

```bash
npm i -g vercel        # if you don't have it
vercel login           # you must run this (auth is interactive)
vercel                 # preview deploy from the repo root
vercel --prod          # production deploy
```

`vercel.json` sets `outputDirectory: "web"`. If Vercel doesn't pick it up, set the
project's **Root Directory** to `web` in Project Settings → General, or run from `web/`:

```bash
cd web && vercel --prod
```

After deploy, paste the URL into:
- `README.md` (the "Live showcase" line)
- `web/index.html` (the demo `<section id="demo">` video link)
- `SUBMISSION.md` (DoraHacks + CROO listing)

---

## 2. CAP provider → Render (Docker)

`Dockerfile` runs `npm run agent` (`apps/cap-agent`). `render.yaml` defines a **worker**
service (no inbound HTTP — the agent holds an outbound CROO connection).

**Render (blueprint):**
1. Push this repo to GitHub (done: `github.com/caelum0x/veritas`).
2. Render Dashboard → **New → Blueprint** → select the repo. It reads `render.yaml`.
3. Set the secret env vars (all `sync: false`): `CROO_RPC_URL`, `CROO_USDC_ADDRESS`,
   `CROO_AGENT_PRIVATE_KEY`, `CROO_AGENT_ID`, `ANTHROPIC_API_KEY` (+ optional source keys).
4. Deploy. Watch logs for `cap-agent: starting`.

**Railway / Fly (same Docker image):**
```bash
# Railway
railway init && railway up          # set the same env vars in the dashboard

# Fly
fly launch --dockerfile Dockerfile  # then: fly secrets set CROO_AGENT_PRIVATE_KEY=… ANTHROPIC_API_KEY=…
fly deploy
```

**Local Docker smoke test (dry-run, no real transactions):**
```bash
docker build -t veritas-cap-agent .
docker run --rm \
  -e CROO_RPC_URL=https://mainnet.base.org \
  -e CROO_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  -e CROO_AGENT_PRIVATE_KEY=0x<key> \
  -e CROO_AGENT_ID=veritas \
  -e CROO_SIMULATE=true \
  -e ANTHROPIC_API_KEY=sk-ant-… \
  veritas-cap-agent
```

---

## 3. Go live on CROO

These steps are on you (wallet + accounts):

1. Register the agent + a **service** on the CROO Agent Store (deliverable type **Schema**).
2. Fund the agent wallet (`CROO_AGENT_PRIVATE_KEY`) with a little ETH (gas) on Base.
3. Set `CROO_SIMULATE=false` and redeploy the provider.
4. List the service, copy the listing URL into `README.md` / `SUBMISSION.md`.
5. File the BUIDL on DoraHacks with the repo, demo video, and showcase links.

See [SUBMISSION.md](./SUBMISSION.md) for the paste-ready listing + BUIDL copy.
