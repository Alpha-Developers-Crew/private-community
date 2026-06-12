# Private Community Web App

A private, invite-only community platform with chat, channels, direct messages, memories, notices, and admin controls.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL (Supabase)
- **File Storage**: Cloudinary
- **Auth**: Session-based with bcrypt

## Features

- **Gatekeeper**: Access code protection before login
- **Authentication**: Email/password signup with admin approval
- **Chat**: Real-time Discord-style group chat with channels
- **Direct Messages**: Private one-on-one conversations
- **Memories**: Permanent photo/video/document gallery
- **Notices**: Temporary announcements with auto-expiry
- **Admin Dashboard**: User management, content moderation, analytics
- **Auto Cleanup**: Automated deletion of old messages and expired notices
- **Responsive**: Works on desktop and mobile
- **Dark Mode**: Default dark theme with toggle

## Deployment

### 1. Database (Supabase)
- Create a free Supabase project
- Get your PostgreSQL connection string from Settings > Database
- Run migrations: `npm run db:migrate`

### 2. File Storage (Cloudinary)
- Create a free Cloudinary account
- Get API credentials from Dashboard

### 3. Backend (Fly.io)
```bash
cd server
fly launch
fly secrets set DATABASE_URL=postgresql://...
fly secrets set SESSION_SECRET=your-secret
fly secrets set CLOUDINARY_CLOUD_NAME=...
fly secrets set CLOUDINARY_API_KEY=...
fly secrets set CLOUDINARY_API_SECRET=...
fly secrets set FRONTEND_URL=https://your-app.vercel.app
fly deploy
```

### 4. Frontend (Vercel)
- Import the `client` folder to Vercel
- Set environment variable: `VITE_API_URL=https://your-backend.fly.dev`

## Local Development

```bash
# Install dependencies
cd server && npm install
cd client && npm install

# Set up environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env

# Run database migration
npm run db:migrate

# Start both servers
npm run dev
```

## Environment Variables

### Server (`server/.env`)
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### Client (`client/.env`)
```
VITE_API_URL=http://localhost:3000
```
