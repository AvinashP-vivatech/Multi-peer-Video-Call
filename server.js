const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
// Peer

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/peerjs", peerServer);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

// app.get("/", (req, rsp) => {
//   rsp.redirect(`/${uuidv4()}`);
// });

// app.get("/:room", (req, res) => {
//   res.render("room", { roomId: req.params.room });
// });
app.get("/:room", (req, res) => {
  res.render("room", {
    roomId: req.params.room,
    uId : req.query.ud,
    userName : req.query.un,
    startTime : req.query.st,
    endTime : req.query.en,
    isShowChat: false,
  });
});

io.on("connection", (socket) => {
  let tempUser, tempRoom, tempChat, tempUID, tempUName, tempSTime, tempETime;

  socket.on("join-room", (roomId, userId, IS_SHOW_CHAT, USER_ID, USER_NAME, START_TIME, END_TIME) => {
    tempUser = userId;
    tempRoom = roomId;
    tempChat = IS_SHOW_CHAT;
    tempUID = USER_ID;
    tempUName = USER_NAME;
    tempSTime = START_TIME;
    tempETime = END_TIME;

    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("disconnect-user", (uId) => {
      socket.to(roomId).broadcast.emit("user-disconnected", uId);
    });

    socket.on("message", (messageData) => {
      io.to(roomId).emit("createMessage", messageData);
    });

    socket.on("fileUploaded", (fileInfo) => {
      let li = document.createElement("li");
      const downloadLink = document.createElement('a');
      downloadLink.href = fileInfo.fileData;
      downloadLink.setAttribute('download', fileInfo.fileName);
      downloadLink.innerHTML = `${fileInfo.username}: ${fileInfo.fileName}`;  // Display the sender's username
    
      li.appendChild(downloadLink);
      all_messages.append(li);
      main__chat__window.scrollTop = main__chat__window.scrollHeight;
    });
  });

  socket.on("disconnect", () => {
    socket.to(tempRoom).broadcast.emit("test-disconnect", tempUser);
  });
});


server.listen(process.env.PORT || 3030);
