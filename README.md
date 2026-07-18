# ChatApp

A real-time chat application with a Node.js/Express microservice backend and a Next.js frontend. Authentication supports both email/password and email OTP, messages support text and images (via Cloudinary), and live messaging (typing indicators, online status, instant delivery) runs over Socket.IO.

## Architecture

```
backend/
  user/   - auth, profile, user lookup            -> port 5000
  chat/   - chats, messages, Socket.IO server      -> port 5002
  mail/   - background worker (no HTTP API)        -> listens on RabbitMQ, sends OTP emails
frontend/ - Next.js app                            -> port 3000
```

The three backend services are independent processes that talk to each other over HTTP (`chat` calls `user` to fetch profile info) and RabbitMQ (`user` publishes OTP emails, `mail` consumes and sends them).

## Prerequisites

- Node.js 20+ and npm
- A MongoDB connection (e.g. MongoDB Atlas free tier)
- A Redis connection (e.g. Upstash free tier) — used for OTP storage and rate limiting
- RabbitMQ — either a hosted instance, or run one locally:
  ```bash
  docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
  ```
- A Cloudinary account — used for image message uploads
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) — used to send OTP emails

## Environment variables

Each backend service reads its own `.env` file (never committed — see `.gitignore`). Create one in each of `backend/user/`, `backend/chat/`, `backend/mail/` with these keys:

| Service | Variables |
|---|---|
| `backend/user` | `MONGO_URI`, `PORT`, `REDIS_URL`, `Rabbitmq_Host`, `Rabbitmq_Username`, `Rabbitmq_Password`, `JWT_SECRET` |
| `backend/chat` | `MONGO_URI`, `PORT`, `JWT_SECRET`, `USER_SERVICE` (e.g. `http://localhost:5000`), `Cloud_Name`, `Cloud_API_Key`, `Cloud_API_Secret` |
| `backend/mail` | `PORT`, `Rabbitmq_Host`, `Rabbitmq_Username`, `Rabbitmq_Password`, `EMAIL_USER`, `EMAIL_PASSWORD` |

`JWT_SECRET` must be the same value in both `user` and `chat` (both need to verify the same tokens).

The frontend currently has the two backend URLs hardcoded in `frontend/src/context/AppContext.tsx` (`user_service`, `chat_service`) rather than using env vars — fine for local dev, worth moving to `NEXT_PUBLIC_*` env vars before deploying.

## Install

Run this once per service (each has its own dependencies):

```bash
cd backend/user && npm install
cd ../chat && npm install
cd ../mail && npm install
cd ../../frontend && npm install
```

## Running the app

You need **4 processes running at the same time** (5 if RabbitMQ is local), each in its own terminal tab:

```bash
# 1. RabbitMQ (skip if using a hosted instance already in your .env)
docker start rabbitmq   # or the docker run command above, first time

# 2. user service
cd backend/user && npm run dev

# 3. chat service
cd backend/chat && npm run dev

# 4. mail service (consumes OTP emails from the queue)
cd backend/mail && npm run dev

# 5. frontend
cd frontend && npm run dev
```

Then open **http://localhost:3000**.

## Features

- Register (email + name + password) with OTP email verification
- Login with password, or with a passwordless email OTP
- 1:1 chats with text and image messages
- Real-time delivery, typing indicators, online/offline presence, and read receipts via Socket.IO
- Profile name editing

## Notes for later

- Deployment isn't set up yet.
- Free-tier services (Redis, RabbitMQ if hosted) can be deleted/reset after periods of inactivity — if a backend service fails to connect on startup, check your provider's dashboard first.
