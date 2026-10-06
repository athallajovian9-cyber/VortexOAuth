# 🔐 Vortex OAuth

> **Discord OAuth for Vortex Protector** — Cloudflare Pages deployment for Discord authorization and server selection.

---

## 🌟 Features

- **Discord OAuth2** with proper scopes (`identify`, `guilds`, `guilds.members.read`, `bot`)
- **Server Selection UI** — Shows all servers where user has `MANAGE_GUILD` permission
- **Bot Presence Indicator** — Shows which servers already have the bot
- **One-Click Bot Add** — Adds bot to selected server via Discord API
- **Clean UI** — Dark theme matching Vortex branding

---

## 🚀 Deploy to Cloudflare Pages

### 1. Create Cloudflare Pages Project

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
cd VortexOAuth
npm run deploy
```

### 2. Configure Environment Variables

In Cloudflare Pages dashboard → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `DISCORD_CLIENT_ID` | Your Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | Your Discord Application Client Secret |
| `DISCORD_REDIRECT_URI` | `https://your-project.pages.dev/callback` |
| `DISCORD_BOT_TOKEN` | Your Discord Bot Token |

### 3. Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application → OAuth2 → Redirects
3. Add redirect: `https://your-project.pages.dev/callback`
4. Add scopes: `identify guilds guilds.members.read bot`

---

## 🔗 Flow

```
User visits / → Clicks "Add to Discord"
    ↓
Redirected to /auth/discord → Discord OAuth consent
    ↓
Discord redirects to /callback with code
    ↓
Exchange code for tokens → Fetch user guilds
    ↓
Show server selection page (manageable guilds only)
    ↓
User clicks "Add Bot" → Bot added via Discord API
```

---

## 📁 Project Structure

```
VortexOAuth/
├── package.json
├── wrangler.toml
├── .gitignore
├── public/
│   └── index.html           # Landing page
└── functions/
    └── auth/
        ├── discord.js       # OAuth initiation
        └── callback.js      # Callback + server selection
```

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

---

## 📋 Required Discord Scopes

| Scope | Purpose |
|-------|---------|
| `identify` | User profile info |
| `guilds` | List user's servers |
| `guilds.members.read` | Read member info |
| `bot` | Add bot to servers |

---

## 🔗 Live Demo

After deployment: `https://your-project.pages.dev`

---

## 📝 License

MIT — Athalla Jovian Maharsa