import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { prisma } from './lib/prisma.js';
import { sha256 } from './lib/crypto.js';

let io: Server | null = null;

export function initSocket(server: HttpServer, corsOrigins: string[]) {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    },
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (token) {
        const session = await prisma.session.findUnique({
          where: { tokenHash: sha256(token) },
          include: {
            user: {
              include: {
                staffProfile: { include: { role: true } },
                vendorProfile: true,
              },
            },
          },
        });

        if (session && session.expiresAt > new Date() && session.user.status === 'ACTIVE' && !session.user.deletedAt) {
          socket.data.user = session.user;
          socket.data.userId = session.user.id;
          socket.data.role = session.user.role;
        }
      }
      next();
    } catch {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join general catalog room
    void socket.join('catalog');

    if (user) {
      void socket.join(`user:${user.id}`);

      if (user.role === 'ADMIN' || user.role === 'STAFF') {
        void socket.join('admin');
      }

      if (user.role === 'VENDOR' && user.vendorProfile) {
        void socket.join(`vendor:${user.vendorProfile.id}`);
      }
    }

    socket.on('subscribe:order', (orderId: string) => {
      if (typeof orderId === 'string') {
        void socket.join(`order:${orderId}`);
      }
    });

    socket.on('disconnect', () => {
      // Disconnected
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized yet');
  }
  return io;
}

export function emitToAdmin(event: string, data: unknown) {
  if (io) {
    io.to('admin').emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToVendor(vendorId: string, event: string, data: unknown) {
  if (io) {
    io.to(`vendor:${vendorId}`).emit(event, data);
  }
}

export function emitToOrder(orderId: string, event: string, data: unknown) {
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
}

export function emitBroadcast(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}
