# LinkedCraft Frontend Dashboard

A React-based SaaS dashboard for LinkedCraft.

## Quick Setup (Standalone with Vite)

```bash
# 1. Create a new React project
npm create vite@latest linkedcraft-ui -- --template react
cd linkedcraft-ui

# 2. Copy the dashboard component
cp ../frontend/linkedcraft-dashboard.jsx src/App.jsx

# 3. Install and run
npm install
npm run dev
```

## Quick Setup (Add to existing React project)

1. Copy `linkedcraft-dashboard.jsx` into your components directory
2. Import and render it:

```jsx
import LinkedCraftDashboard from './linkedcraft-dashboard';

function App() {
  return <LinkedCraftDashboard />;
}
```

## Configuration

Edit the `API` constant at the top of `linkedcraft-dashboard.jsx` to point to your backend:

```js
const API = "http://localhost:8000";  // Development
const API = "https://api.linkedcraft.com";  // Production
```

## Features

- Login / Register with JWT auth
- Generate posts (8 frameworks, 8 tones, audience targeting)
- Repurpose content (blog, podcast, newsletter → LinkedIn posts)
- AI News topics (live RSS feeds → trending topic picker)
- Voice cloning (paste samples → AI trains on your style)
- Post scoring (quality analysis with improvement suggestions)
- Scheduling (queue posts with datetime picker)
- LinkedIn OAuth (publish directly to LinkedIn)
- Settings (account, LinkedIn connection, voice profile)

## Fonts Used

The dashboard loads these Google Fonts automatically:
- **Satoshi** — Primary UI font
- **JetBrains Mono** — Code/data font
