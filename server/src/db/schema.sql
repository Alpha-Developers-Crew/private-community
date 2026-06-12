-- Private Community Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url VARCHAR(500) DEFAULT '',
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  is_approved BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR(255) PRIMARY KEY NOT NULL,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Access Settings
CREATE TABLE IF NOT EXISTS access_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  access_code VARCHAR(100) NOT NULL DEFAULT 'ALPHA2026',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Messages (Global + Channels)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  image_url VARCHAR(500) DEFAULT '',
  file_url VARCHAR(500) DEFAULT '',
  file_name VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Direct Messages
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  image_url VARCHAR(500) DEFAULT '',
  file_url VARCHAR(500) DEFAULT '',
  file_name VARCHAR(255) DEFAULT '',
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dm_participants ON direct_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON direct_messages(created_at);

-- Notices
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT DEFAULT '',
  attachment_url VARCHAR(500) DEFAULT '',
  created_by UUID REFERENCES users(id),
  is_announcement BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);
CREATE INDEX IF NOT EXISTS idx_notices_expires ON notices(expires_at);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER DEFAULT 0,
  uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_permanent BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at);

-- Uploads log
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  public_id VARCHAR(200) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER DEFAULT 0,
  related_table VARCHAR(50) DEFAULT '',
  related_id UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uploads_created ON uploads(created_at);

-- Approval log
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cleanup log
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  records_deleted INTEGER DEFAULT 0,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default channels
INSERT INTO channels (name) VALUES
  ('general'),
  ('gaming'),
  ('memes'),
  ('study')
ON CONFLICT DO NOTHING;

-- Seed default access code
INSERT INTO access_settings (id, access_code) VALUES (1, 'ALPHA2026')
ON CONFLICT (id) DO NOTHING;
