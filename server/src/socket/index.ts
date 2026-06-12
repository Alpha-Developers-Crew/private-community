import { Server as SocketIOServer, Socket } from 'socket.io';
import pool from '../db/pool';

const onlineUsers = new Map<string, string>();

export function setupSocket(io: SocketIOServer) {
  io.on('connection', async (socket: Socket) => {
    const session = (socket.request as any).session;
    const userId = session?.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    await pool.query(
      "UPDATE users SET status = 'online' WHERE id = $1",
      [userId]
    );

    io.emit('user_online', { userId, status: 'online' });

    socket.on('join_channel', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('leave_channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('send_message', async (data: {
      channelId: string;
      content: string;
      image_url?: string;
      file_url?: string;
      file_name?: string;
    }) => {
      try {
        const result = await pool.query(
          `INSERT INTO messages (channel_id, user_id, content, image_url, file_url, file_name)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [data.channelId, userId, data.content || '', data.image_url || '', data.file_url || '', data.file_name || '']
        );

        const message = result.rows[0];

        const userResult = await pool.query(
          'SELECT name, username, avatar_url FROM users WHERE id = $1',
          [userId]
        );

        io.to(`channel:${data.channelId}`).emit('new_message', {
          ...message,
          user_name: userResult.rows[0].name,
          user_username: userResult.rows[0].username,
          user_avatar: userResult.rows[0].avatar_url,
        });
      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('error', { error: 'Failed to send message' });
      }
    });

    socket.on('send_dm', async (data: {
      receiverId: string;
      content: string;
      image_url?: string;
      file_url?: string;
      file_name?: string;
    }) => {
      try {
        const result = await pool.query(
          `INSERT INTO direct_messages (sender_id, receiver_id, content, image_url, file_url, file_name)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [userId, data.receiverId, data.content || '', data.image_url || '', data.file_url || '', data.file_name || '']
        );

        const message = result.rows[0];

        const userResult = await pool.query(
          'SELECT name, username, avatar_url FROM users WHERE id = $1',
          [userId]
        );

        const messageData = {
          ...message,
          sender_name: userResult.rows[0].name,
          sender_username: userResult.rows[0].username,
          sender_avatar: userResult.rows[0].avatar_url,
        };

        io.to(`user:${data.receiverId}`).emit('new_dm', messageData);
        io.to(`user:${userId}`).emit('new_dm', messageData);
      } catch (error) {
        console.error('Socket DM error:', error);
        socket.emit('error', { error: 'Failed to send DM' });
      }
    });

    socket.on('typing', (data: { channelId?: string; receiverId?: string; isTyping: boolean }) => {
      if (data.channelId) {
        socket.to(`channel:${data.channelId}`).emit('typing', {
          userId,
          channelId: data.channelId,
          isTyping: data.isTyping,
        });
      }
      if (data.receiverId) {
        io.to(`user:${data.receiverId}`).emit('typing', {
          userId,
          isTyping: data.isTyping,
        });
      }
    });

    socket.on('user_status', async (status: string) => {
      if (['online', 'away', 'offline'].includes(status)) {
        await pool.query(
          'UPDATE users SET status = $1 WHERE id = $2',
          [status, userId]
        );
        io.emit('user_status', { userId, status });
      }
    });

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);

      const stillConnected = Array.from(onlineUsers.values()).includes(userId);
      if (!stillConnected) {
        await pool.query(
          "UPDATE users SET status = 'offline' WHERE id = $1",
          [userId]
        );
        io.emit('user_offline', { userId });
      }
    });
  });
}

export function getOnlineUsers(): Map<string, string> {
  return onlineUsers;
}
