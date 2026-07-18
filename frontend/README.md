# ChatApp — Frontend

Next.js (App Router) frontend for ChatApp. See the [root README](../README.md) for the full system overview, environment setup, and how to run the backend services this depends on.

## Run locally

Requires the `user` (port 5000) and `chat` (port 5002) backend services to already be running — see the root README.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `src/app/` — pages: `/login`, `/register`, `/verify`, `/chat`, `/profile`
- `src/components/` — chat UI (sidebar, messages, message input, header) and the OTP verification form
- `src/context/AppContext.tsx` — auth state, user/chat data fetching, backend base URLs
- `src/context/SocketContext.tsx` — Socket.IO connection and online-user tracking
