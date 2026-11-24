# How Empty Chair is built and deployed

A learning guide for rebuilding and deploying this app yourself.

## 1. What kind of app this is

Empty Chair is a **static single-page app**. All of its logic runs in the
visitor's browser. There is no backend, no database, and no server code running
anywhere. That's why:

- Nothing you type can be stored or sent anywhere (state lives only in memory).
- Hosting is free and simple: GitHub Pages just serves files.

## 2. The stack

| Piece | What it does |
| --- | --- |
| **Node.js / npm** | Runs the build tools and installs dependencies. |
| **React** | Builds the UI out of components and keeps track of state. |
| **TypeScript** | JavaScript with types; catches mistakes before they run. |
| **Vite** | Dev server (hot reload) and production bundler. |
| **GitHub Actions** | Builds the app automatically when you push. |
| **GitHub Pages** | Serves the built files at your github.io URL. |

## 3. Project layout

```
empty-chair/
├── index.html              # Page shell; loads src/main.tsx
├── package.json            # Dependencies and npm scripts
├── package-lock.json       # Exact dependency versions (commit this)
├── tsconfig.json           # TypeScript settings
├── vite.config.ts          # Vite settings, incl. the GitHub Pages base path
├── .gitignore              # Keeps node_modules/ and dist/ out of git
├── .github/workflows/
│   └── deploy.yml          # The build-and-deploy automation
└── src/
    ├── main.tsx            # Mounts the React app into index.html
    ├── App.tsx             # All the app logic and markup
    ├── styles.css          # All the styling (iMessage look, animations)
    └── vite-env.d.ts       # Lets TypeScript accept CSS imports
```

## 4. How the app works (src/App.tsx)

All state is `useState` inside one component, and nothing is persisted:

- `message`, `name`: the incoming message and who it's from.
- `started`: false shows the setup form, true shows the chat.
- `typing`: shows the three-dot bubble before the message appears.
- `replies`: your responses, rendered as blue bubbles.
- `burning`: true while the dissolve animation plays.

The flow:

1. **Setup form** collects the message and sender name.
2. **"Receive message"** calls `begin()`, which shows the typing dots for
   `TYPING_MS` (2.2s) and then reveals the message.
3. **Sending a reply** appends to `replies`.
4. **Burn** dissolves each reply bubble in its own 0.5s slot (newest first),
   using an SVG noise filter (`feTurbulence` + `feDisplacementMap`) whose
   `scale` is animated with `requestAnimationFrame`. When the last bubble is
   gone, `replies` is cleared and the typing animation replays.
5. **End** resets everything, including the incoming message.

Privacy comes from the design: there is no `localStorage`, no cookie, and no
`fetch` call anywhere in the code.

## 5. Building it from scratch

```bash
mkdir empty-chair && cd empty-chair
npm init -y
npm i react react-dom
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
```

Then create the files from section 3. Add scripts to `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```

## 6. Day-to-day commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs dependencies (first time, or after cloning). |
| `npm run dev` | Starts the **development** server with hot reload. |
| `npm run build` | Type-checks and compiles to static files in `dist/`. |
| `npm run preview` | Serves `dist/` locally to test the production build. |

### Development vs. production

- `npm run dev` starts a local server that compiles your code on the fly. It is
  a development tool only and is **never deployed**.
- `npm run build` produces `dist/`: plain `index.html`, one JS file, one CSS
  file. That folder is the entire website. Any static host can serve it.

## 7. Deployment, step by step

### The base path

A GitHub Pages project site lives at a subpath
(`https://<user>.github.io/empty-chair/`), so asset links must start with
`/empty-chair/`. `vite.config.ts` handles this:

```ts
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/empty-chair/" : "/",
  plugins: [react()],
}));
```

It applies only to builds, so `npm run dev` still works at `/`. If you rename
the repo, change this value to match.

### The workflow (.github/workflows/deploy.yml)

On every push to `main`, GitHub starts a temporary Linux machine and:

1. **Checks out** your repo.
2. **Installs Node 22** and caches npm downloads.
3. Runs **`npm ci`**, a clean install from `package-lock.json`.
4. Runs **`npm run build`** to create `dist/`.
5. **Uploads `dist/`** as a Pages artifact.
6. A second job **deploys the artifact** to GitHub Pages.

The `permissions:` block gives the workflow just enough access to publish to
Pages and nothing more.

### One-time setup

```bash
# 1. Make the folder a git repo and commit
git init -b main
git add .
git commit -m "Empty Chair app"

# 2. Create the GitHub repo and push (uses the gh CLI)
gh repo create empty-chair --public --source=. --push

# 3. Tell Pages to deploy from GitHub Actions
gh api -X POST repos/<your-username>/empty-chair/pages -f build_type=workflow
```

(Step 3 can also be done in the repo under **Settings → Pages → Source →
GitHub Actions**.)

### Every update after that

```bash
git add -A
git commit -m "Describe your change"
git push
```

Watch it deploy under the repo's **Actions** tab, or with `gh run watch`. It
usually takes about a minute. If the old version still shows, hard-refresh
with Cmd+Shift+R.

## 8. Troubleshooting

- **Blank page on the live site:** Usually a wrong `base` in `vite.config.ts`.
  Open the browser console and look for 404s on `/assets/...`.
- **Looks different from `localhost`:** Browsers remember zoom **per site**.
  Press Cmd+0 on each tab. Also make sure you've pushed your latest changes.
- **Workflow fails on `npm ci`:** `package-lock.json` is out of sync. Run
  `npm install` locally and commit the updated lockfile.
- **Build fails with TypeScript errors:** Run `npm run build` locally; it shows
  the same errors the workflow would.

## 9. Where to go next

- Rename the repo or use a custom domain: update `base` (or set it to `/` for
  a custom domain) and add the domain in Settings → Pages.
- If you ever need a real backend (accounts, storage), that is when you'd add a
  server. Hosts like Vercel, Netlify or Cloudflare handle that. This app doesn't
  need it.
