const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
   cors: {
    origin: "*",
  },
});

const port = 8000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join-room", (data) => {
    const { roomId, emailId } = data;
    console.log("User:", emailId, "joined room:", roomId);

    emailToSocketMapping.set(emailId, socket.id);
    socketToEmailMapping.set(socket.id, emailId);

    socket.join(roomId);
    socket.emit("joined-room", { roomId });

    // existing users ke notify koro je notun user eshече
    socket.broadcast.to(roomId).emit("user-joined", {
      emailId,
      socketId: socket.id,
    });
  });

  // --- WebRTC signaling relay ---
  socket.on("call-user", ({ emailId, offer }) => {
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit("incoming-call", {
        from: socketToEmailMapping.get(socket.id),
        offer,
      });
    }
  });

  socket.on("call-accepted", ({ emailId, ans }) => {
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit("call-accepted", { ans });
    }
  });

  socket.on("ice-candidate", ({ emailId, candidate }) => {
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit("ice-candidate", { candidate });
    }
  });

  socket.on("disconnect", () => {
    const emailId = socketToEmailMapping.get(socket.id);
    if (emailId) emailToSocketMapping.delete(emailId);
    socketToEmailMapping.delete(socket.id);
    console.log("User Disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});