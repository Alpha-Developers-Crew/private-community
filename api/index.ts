import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabaseAdmin } from './lib/supabase-admin';

dotenv.config();

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ===== ACCESS CODE =====
app.post('/api/access/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const DEFAULT_CODE = 'ALPHA2026';
    let dbCode = DEFAULT_CODE;

    const { data } = await supabaseAdmin.from('access_settings').select('access_code').eq('id', 1).single();
    if (data) dbCode = data.access_code;

    if (code !== dbCode) return res.status(403).json({ error: 'Invalid access code' });
    res.json({ message: 'Access granted' });
  } catch { res.json({ message: 'Access granted' }); }
});

app.get('/api/access/check', async (req, res) => {
  res.json({ needCode: false });
});

// ===== AUTH =====
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const { data: existing } = await supabaseAdmin.from('users').select('id').or(`email.eq.${email},username.eq.${username}`).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email or username already taken' });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError || !authData.user) return res.status(500).json({ error: authError?.message || 'Signup failed' });

    const { count } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const isFirstUser = count === 0;

    const { data: user } = await supabaseAdmin.from('users').insert({
      id: authData.user.id, name, username, email,
      is_approved: isFirstUser, is_admin: isFirstUser,
    }).select('id, name, username, email, is_approved, is_admin, created_at').single();

    if (!user) return res.status(500).json({ error: 'Failed to create profile' });

    if (isFirstUser) {
      return res.json({ message: 'Welcome! You are the first admin.', user, token: authData.user.email });
    }

    await supabaseAdmin.from('approvals').insert({ user_id: user.id, status: 'pending' });
    res.status(201).json({ message: 'Registration successful. Waiting for admin approval.', user });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const { data: user } = await supabaseAdmin.from('users').select('*').eq('email', email).single();
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_suspended) return res.status(403).json({ error: 'Account suspended' });

    res.json({
      user: {
        id: user.id, name: user.name, username: user.username, email: user.email,
        avatar_url: user.avatar_url, bio: user.bio, status: user.status,
        is_approved: user.is_approved, is_admin: user.is_admin, created_at: user.created_at,
      },
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', async (req, res) => {
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const authHeader = req.headers.authorization?.split(' ');
  const jwt = authHeader?.[1];
  if (!jwt) return res.status(401).json({ error: 'No token' });

  const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabaseAdmin.from('users').select('*').eq('id', user.id).single();
  if (!profile) return res.status(404).json({ error: 'User not found' });

  res.json({ user: profile });
});

// ===== USERS =====
app.get('/api/users', async (req, res) => {
  const { data } = await supabaseAdmin.from('users')
    .select('id, name, username, email, avatar_url, bio, status, is_approved, is_admin, created_at')
    .eq('is_approved', true).eq('is_suspended', false).order('name');
  res.json({ users: data || [] });
});

app.get('/api/users/pending', async (req, res) => {
  const { data } = await supabaseAdmin.from('users')
    .select('id, name, username, email, created_at')
    .eq('is_approved', false).eq('is_suspended', false).order('created_at', { ascending: false });
  res.json({ users: data || [] });
});

app.put('/api/users/:id/approve', async (req, res) => {
  await supabaseAdmin.from('users').update({ is_approved: true, updated_at: new Date().toISOString() }).eq('id', req.params.id);
  await supabaseAdmin.from('approvals').update({ status: 'approved', approved_by: req.headers['x-user-id'] || '' }).eq('user_id', req.params.id);
  res.json({ message: 'User approved' });
});

app.put('/api/users/:id/reject', async (req, res) => {
  await supabaseAdmin.from('approvals').update({ status: 'rejected' }).eq('user_id', req.params.id);
  await supabaseAdmin.from('users').delete().eq('id', req.params.id);
  res.json({ message: 'User rejected' });
});

app.put('/api/users/:id/suspend', async (req, res) => {
  await supabaseAdmin.from('users').update({ is_suspended: true, status: 'offline', updated_at: new Date().toISOString() }).eq('id', req.params.id);
  res.json({ message: 'User suspended' });
});

app.put('/api/users/:id/unsuspend', async (req, res) => {
  await supabaseAdmin.from('users').update({ is_suspended: false, updated_at: new Date().toISOString() }).eq('id', req.params.id);
  res.json({ message: 'User unsuspended' });
});

app.get('/api/users/:id/profile', async (req, res) => {
  const { data } = await supabaseAdmin.from('users')
    .select('id, name, username, email, avatar_url, bio, status, created_at')
    .eq('id', req.params.id).single();
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ profile: data });
});

app.put('/api/users/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { name, bio, avatar_url } = req.body;
  const updates: any = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  const { data } = await supabaseAdmin.from('users').update(updates).eq('id', user.id).select().single();
  res.json({ user: data });
});

// ===== CHANNELS =====
app.get('/api/channels', async (req, res) => {
  const { data } = await supabaseAdmin.from('channels').select('*').eq('is_deleted', false).order('created_at');
  res.json({ channels: data || [] });
});

app.post('/api/channels', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 50);
  if (!cleanName) return res.status(400).json({ error: 'Invalid name' });

  const { data: existing } = await supabaseAdmin.from('channels').select('id').eq('name', cleanName).eq('is_deleted', false).maybeSingle();
  if (existing) return res.status(409).json({ error: 'Channel exists' });

  const { data } = await supabaseAdmin.from('channels').insert({ name: cleanName }).select().single();
  res.status(201).json({ channel: data });
});

app.put('/api/channels/:id', async (req, res) => {
  const { name } = req.body;
  const cleanName = name?.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 50);
  const { data } = await supabaseAdmin.from('channels').update({ name: cleanName }).eq('id', req.params.id).eq('is_deleted', false).select().single();
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ channel: data });
});

app.delete('/api/channels/:id', async (req, res) => {
  await supabaseAdmin.from('channels').update({ is_deleted: true }).eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

// ===== MESSAGES =====
app.get('/api/messages/:channelId/search', async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const { data } = await supabaseAdmin
    .from('messages')
    .select('*, users(name, username, avatar_url)')
    .eq('channel_id', req.params.channelId)
    .ilike('content', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  const messages = (data || []).map((m: any) => ({
    ...m, user_name: m.users?.name, user_username: m.users?.username, user_avatar: m.users?.avatar_url,
  }));
  res.json({ messages });
});

app.get('/api/messages/:channelId', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data } = await supabaseAdmin
    .from('messages')
    .select('*, users(name, username, avatar_url)')
    .eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const messages = (data || []).reverse().map((m: any) => ({
    ...m, user_name: m.users?.name, user_username: m.users?.username, user_avatar: m.users?.avatar_url,
  }));
  res.json({ messages });
});

app.post('/api/messages/:channelId', async (req, res) => {
  const { content, image_url, file_url, file_name } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { data } = await supabaseAdmin.from('messages').insert({
    channel_id: req.params.channelId, user_id: user.id,
    content: content || '', image_url: image_url || '', file_url: file_url || '', file_name: file_name || '',
  }).select().single();

  res.status(201).json({ message: data });
});

// ===== DM =====
app.get('/api/dm/conversations', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { data: dms } = await supabaseAdmin
    .from('direct_messages')
    .select('sender_id, receiver_id, content, created_at, read_at')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  const seen = new Set<string>();
  const conversations: any[] = [];

  for (const dm of dms || []) {
    const otherId = dm.sender_id === user.id ? dm.receiver_id : dm.sender_id;
    if (seen.has(otherId)) continue;
    seen.add(otherId);

    const { data: otherUser } = await supabaseAdmin
      .from('users')
      .select('id, name, username, avatar_url, status')
      .eq('id', otherId)
      .single();

    if (otherUser) {
      conversations.push({
        other_user_id: otherUser.id,
        other_user_name: otherUser.name,
        other_user_username: otherUser.username,
        other_user_avatar: otherUser.avatar_url,
        other_user_status: otherUser.status,
        last_message: dm.content,
        last_message_at: dm.created_at,
        last_read_at: dm.read_at,
      });
    }
  }

  res.json({ conversations });
});

app.get('/api/dm/:userId', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data } = await supabaseAdmin
    .from('direct_messages')
    .select('*, sender:sender_id(name, username, avatar_url), receiver:receiver_id(name, username, avatar_url)')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${req.params.userId}),and(sender_id.eq.${req.params.userId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  await supabaseAdmin
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', req.params.userId)
    .eq('receiver_id', user.id)
    .is('read_at', null);

  const messages = (data || []).reverse().map((m: any) => ({
    ...m,
    sender_name: m.sender?.name, sender_username: m.sender?.username, sender_avatar: m.sender?.avatar_url,
    receiver_name: m.receiver?.name, receiver_username: m.receiver?.username, receiver_avatar: m.receiver?.avatar_url,
  }));

  res.json({ messages });
});

app.post('/api/dm/:userId', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { content, image_url, file_url, file_name } = req.body;
  const { data } = await supabaseAdmin.from('direct_messages').insert({
    sender_id: user.id, receiver_id: req.params.userId,
    content: content || '', image_url: image_url || '', file_url: file_url || '', file_name: file_name || '',
  }).select().single();

  res.status(201).json({ message: data });
});

// ===== NOTICES =====
app.get('/api/notices', async (req, res) => {
  const { data } = await supabaseAdmin
    .from('notices')
    .select('*, users(name, avatar_url)')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  const notices = (data || []).map((n: any) => ({
    ...n, created_by_name: n.users?.name, created_by_avatar: n.users?.avatar_url,
    days_remaining: Math.max(0, Math.ceil((new Date(n.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
  }));
  res.json({ notices });
});

app.post('/api/notices', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { title, message, attachment_url } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const { data } = await supabaseAdmin.from('notices').insert({
    title, message: message || '', attachment_url: attachment_url || '', created_by: user.id,
  }).select().single();

  res.status(201).json({ notice: data });
});

app.delete('/api/notices/:id', async (req, res) => {
  await supabaseAdmin.from('notices').delete().eq('id', req.params.id);
  res.json({ message: 'Notice deleted' });
});

// ===== MEMORIES =====
app.get('/api/memories', async (req, res) => {
  const search = req.query.search as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  let query = supabaseAdmin
    .from('memories')
    .select('*, users(name, username, avatar_url)')
    .eq('is_permanent', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data } = await query;
  const memories = (data || []).map((m: any) => ({
    ...m, uploader_name: m.users?.name, uploader_username: m.users?.username, uploader_avatar: m.users?.avatar_url,
  }));
  res.json({ memories });
});

app.post('/api/memories', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { title, description, file_url, file_type, file_size } = req.body;
  if (!title || !file_url) return res.status(400).json({ error: 'Title and file required' });

  const { data } = await supabaseAdmin.from('memories').insert({
    title, description: description || '', file_url, file_type: file_type || 'unknown',
    file_size: file_size || 0, uploader_id: user.id,
  }).select().single();

  res.status(201).json({ memory: data });
});

app.put('/api/memories/:id', async (req, res) => {
  const { title, description } = req.body;
  const { data } = await supabaseAdmin.from('memories').update({ title, description }).eq('id', req.params.id).select().single();
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ memory: data });
});

app.delete('/api/memories/:id', async (req, res) => {
  const { data } = await supabaseAdmin.from('memories').delete().eq('id', req.params.id).select();
  if (!data || data.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Memory deleted' });
});

// ===== UPLOAD =====
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: any, file: any) => {
    const ext = file.originalname?.split('.').pop()?.toLowerCase() || 'jpg';
    const resourceType = ['jpg', 'jpeg', 'png', 'gif'].includes(ext) ? 'image' : ext === 'mp4' ? 'video' : 'raw';
    return { folder: 'private-community', resource_type: resourceType, public_id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}` };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf', 'application/zip'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const file = req.file as any;
    res.json({
      url: file.path || file.secure_url, public_id: file.filename || file.public_id,
      file_type: file.mimetype, file_size: file.size, original_name: req.file!.originalname,
    });
  });
});

// ===== ACCESS CODE (ADMIN) =====
app.put('/api/access/code', async (req, res) => {
  const { code } = req.body;
  if (!code || code.length < 4) return res.status(400).json({ error: 'Code must be 4+ chars' });
  await supabaseAdmin.from('access_settings').update({ access_code: code, updated_at: new Date().toISOString() }).eq('id', 1);
  res.json({ message: 'Access code updated' });
});

// ===== ADMIN =====
app.get('/api/admin/stats', async (req, res) => {
  const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
  const { count: approvedUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_approved', true);
  const { count: pendingUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_approved', false).eq('is_suspended', false);
  const { count: totalMessages } = await supabaseAdmin.from('messages').select('*', { count: 'exact', head: true });
  const { count: totalFiles } = await supabaseAdmin.from('uploads').select('*', { count: 'exact', head: true });
  const { data: storageData } = await supabaseAdmin.from('uploads').select('file_size');

  const storageUsage = (storageData || []).reduce((sum: number, u: any) => sum + (u.file_size || 0), 0);

  res.json({ total_users: totalUsers || 0, approved_users: approvedUsers || 0, pending_users: pendingUsers || 0, total_messages: totalMessages || 0, total_files: totalFiles || 0, storage_usage: storageUsage });
});

app.get('/api/admin/users', async (req, res) => {
  const status = req.query.status as string;
  let query = supabaseAdmin.from('users').select('*').order('created_at', { ascending: false });

  if (status === 'pending') query = query.eq('is_approved', false).eq('is_suspended', false);
  else if (status === 'approved') query = query.eq('is_approved', true).eq('is_suspended', false);
  else if (status === 'suspended') query = query.eq('is_suspended', true);

  const { data } = await query;
  res.json({ users: data || [] });
});

app.get('/api/admin/notices', async (req, res) => {
  const { data } = await supabaseAdmin.from('notices').select('*, users(name)').order('created_at', { ascending: false }).limit(50);
  const notices = (data || []).map((n: any) => ({ ...n, created_by_name: n.users?.name }));
  res.json({ notices });
});

app.get('/api/admin/memories', async (req, res) => {
  const search = req.query.search as string;
  let query = supabaseAdmin.from('memories').select('*, users(name)').order('created_at', { ascending: false }).limit(100);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  const { data } = await query;
  const memories = (data || []).map((m: any) => ({ ...m, uploader_name: m.users?.name }));
  res.json({ memories });
});

app.delete('/api/admin/messages/:id', async (req, res) => {
  await supabaseAdmin.from('messages').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

// ===== SEARCH =====
app.get('/api/search', async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json({ users: [], memories: [] });

  const { data: users } = await supabaseAdmin.from('users')
    .select('id, name, username, email, avatar_url, status')
    .eq('is_approved', true).eq('is_suspended', false)
    .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(20);

  const { data: memories } = await supabaseAdmin.from('memories')
    .select('id, title, file_url, file_type, uploader_id, created_at')
    .eq('is_permanent', true)
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .limit(20);

  res.json({ users: users || [], memories: memories || [] });
});

// ===== HEALTH =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
