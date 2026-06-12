export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  status: 'online' | 'away' | 'offline';
  is_approved: boolean;
  is_admin: boolean;
  is_suspended?: boolean;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  is_deleted: boolean;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  image_url: string;
  file_url: string;
  file_name: string;
  created_at: string;
  user_name?: string;
  user_username?: string;
  user_avatar?: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url: string;
  file_url: string;
  file_name: string;
  read_at: string | null;
  created_at: string;
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
  receiver_name?: string;
  receiver_username?: string;
  receiver_avatar?: string;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  attachment_url: string;
  created_by: string;
  created_by_name?: string;
  created_by_avatar?: string;
  is_announcement: boolean;
  created_at: string;
  expires_at: string;
  days_remaining?: number;
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploader_id: string;
  uploader_name?: string;
  uploader_username?: string;
  uploader_avatar?: string;
  is_permanent: boolean;
  created_at: string;
}

export interface UploadResponse {
  url: string;
  public_id: string;
  file_type: string;
  file_size: number;
  original_name: string;
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_username: string;
  other_user_avatar: string;
  other_user_status: string;
  last_message: string;
  last_message_at: string;
  last_read_at: string | null;
}

export interface AdminStats {
  total_users: number;
  approved_users: number;
  pending_users: number;
  total_messages: number;
  total_files: number;
  storage_usage: number;
}
