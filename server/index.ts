import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

io.use((socket, next) => {
  const userId = socket.handshake.auth?.userId;

  if (!userId || typeof userId !== "string") {
    return next(new Error("Unauthorized"));
  }

  socket.data.userId = userId;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;

  socket.join(userId);

  socket.on("join-chat", ({ chatId }: { chatId?: string }) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  socket.on(
    "send-message",
    ({ chatId, message }: { chatId?: string; message?: unknown }) => {
      if (!chatId || !message) return;

      io.to(chatId).emit("receive-message", message);
    }
  );

  socket.on(
    "typing",
    ({
      chatId,
      isTyping = true,
    }: {
      chatId?: string;
      isTyping?: boolean;
    }) => {
      if (!chatId) return;

      io.to(chatId).emit("typing", {
        chatId,
        userId,
        isTyping,
      });
    }
  );

  socket.on("disconnect", () => {
    socket.leave(userId);
  });
});

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`Socket server listening on http://localhost:${PORT}`);
});
