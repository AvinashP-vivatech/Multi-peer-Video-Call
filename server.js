const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
// Peer

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/peerjs", peerServer);

app.get("/", (req, rsp) => {
  rsp.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  let tempUser;
  let tempRoom;
  socket.on("join-room", (roomId, userId) => {
    tempUser = userId;
    tempRoom = roomId;
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("disconnect-user", (uId) => {
      socket.to(roomId).broadcast.emit("user-disconnected", uId);
    });

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });
    
  });
  socket.on("disconnect", () => {
    socket.to(tempRoom).broadcast.emit("test-disconnect", tempUser);
  });
});

server.listen(process.env.PORT || 3030);
