import express, { Application } from "express";
import { serverPaths } from "../interfaces/ServerPath";
import cors from "cors";


export class Server {
  private app: Application;
  private port: string;
  private paths: serverPaths;
  private isReady: Promise<void>;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || "8000";
    this.paths = {
      chat: "/api/chat",
    };

    this.isReady = this.initialize();
  }

  private async initialize() {
    try {
      this.middlewares();
      this.routes();
      
      console.log("--- Server fully initialized ---");
    } catch (error) {
      console.error("Initialization failed", error);
    }
  }

  public async listen() {
    await this.isReady;

    this.app.get("/", (req, res) => {
      res.send("Service in line");
    });

    const httpServer: any = this.app.listen(this.port, () => {
      console.log(`Server up on ${this.port}`);
    });
    try {
      httpServer.timeout = 0;
    } catch (err) {
      console.warn('Could not set server timeout:', err);
    }
  }


  private routes() {
    this.routesBuilder(this.app, this.paths);
  }
private middlewares() {
  this.app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Cache-Control', 'Accept'],
  }));
  this.app.use(express.json({ limit: "20mb" }));
}
private routesBuilder(app: any, paths: serverPaths) {
  for (const [key, path] of Object.entries(paths)) {
    try {
      const module = require(`../routes/${key}`);

      const route = module.default || module; 
      
      app.use(path, route);
      console.log(`Route registered: ${key} at ${path}`);
    } catch (error) {
      console.error(`Error registering route: ${key}`, error);
    }
  }
}
}