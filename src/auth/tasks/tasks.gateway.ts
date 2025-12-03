import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'ws';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class TasksGateway {
  @WebSocketServer()
  server!: Server;

  emitTaskUpdated(payload: any) {
    // шлем всем подключённым клиентам событие task.updated c джейсоном
    if (!this.server) return;
    this.server.clients.forEach((client: any) => {
      try {
        client.send(JSON.stringify({ event: 'task.updated', data: payload }));
      } catch {}
    });
  }
  handleConnection(client: any): void {
    try {
      client.send(
        JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
      );
    } catch {
      // игнор
    }
  }
  afterInit(server: Server): void {
    this.server = server;
    try {
      this.server.on('connection', (client: any) => {
        try {
          if (client && typeof client.send === 'function') {
            client.send(
              JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
            );
          }
        } catch {
          // игнор
        }
      });
    } catch {
      // игнор
    }
  }
}
