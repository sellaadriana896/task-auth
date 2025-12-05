import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'ws';
import { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import type { Task } from './entities/task.entity';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class TasksGateway {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(TasksGateway.name);
  constructor() {}

  emitTaskUpdated(payload: { action: 'patch' | 'put'; task: Task }) {
    if (!this.server) return;
    const message = JSON.stringify({ event: 'task.updated', data: payload });
    this.server.clients.forEach((client: WebSocket) => {
      try {
        if (client.readyState === WebSocket.OPEN) client.send(message);
      } catch (err) {
        this.logger.warn(`WS broadcast send failed: ${String(err)}`);
      }
    });
  }

  handleConnection(client: WebSocket): void {
    try {
      client.send(
        JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
      );
    } catch (err) {
      this.logger.warn(`WS welcome send failed: ${String(err)}`);
    }
  }
  afterInit(server: Server): void {
    this.server = server;
    try {
      this.server.on('connection', (client: WebSocket) => {
        try {
          client.send(
            JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
          );
        } catch (err) {
          this.logger.warn(`WS connection welcome failed: ${String(err)}`);
        }
      });
    } catch (err) {
      this.logger.warn(`WS afterInit hookup failed: ${String(err)}`);
    }
  }
}
