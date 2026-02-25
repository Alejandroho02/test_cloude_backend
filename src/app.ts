import dotenv from 'dotenv';
import { Server } from './server/Server';



dotenv.config();

const server = new Server();

server.listen();