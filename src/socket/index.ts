import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

let io: Server;

const onlineRiders = new Map<string, string>(); // riderId → socketId

export function initSocket(server: HTTPServer): Server {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL ?? '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket: Socket) => {
    const raw = socket.handshake.auth?.token as string | undefined;

    if (!raw) {
      socket.disconnect();
      return;
    }

    try {
      const payload = verifyToken(raw);

      if (payload.role !== 'rider') {
        socket.disconnect();
        return;
      }

      onlineRiders.set(payload.id, socket.id);
      socket.join('riders');

      socket.on('disconnect', () => {
        onlineRiders.delete(payload.id);
      });
    } catch {
      socket.disconnect();
    }
  });

  return io;
}

export function broadcastNewOrder(orderPayload: object): void {
  if (!io) return;
  io.to('riders').emit('order.assigned', { event: 'order.assigned', order: orderPayload });
}

export function broadcastOrderTaken(orderId: string): void {
  if (!io) return;
  io.to('riders').emit('order.taken', { event: 'order.taken', orderId });
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
