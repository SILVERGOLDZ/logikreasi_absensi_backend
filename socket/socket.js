import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket:", socket.id);
    
    socket.on("disconnect", (reason) => {
      console.log("Disconnected:", socket.id, reason);
    });

  });

  return io;
}

export function getIO() {
  return io;
}