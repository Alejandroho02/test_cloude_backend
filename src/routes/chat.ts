import { Router } from "express";
import { ClaudeConexionController, ClaudeGetStreamController } from "../Controllers/PostChat.ts/PostChat";


const router = Router();

router.post("/", ClaudeConexionController);
router.get("/", ClaudeGetStreamController);


export default router;