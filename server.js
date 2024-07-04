const express = require("express");
const app = express();
const https = require("https");
const fs = require('fs');
const options = {
  key: fs.readFileSync('./ssl/privkey.pem'),
  cert: fs.readFileSync('./ssl/fullchain.pem')
  };
const { v4: uuidv4 } = require("uuid");
const server = https.createServer(options, app);
const io = require("socket.io")(server);
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
// Peer

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('X-Frame-Options', 'ALLOW-FROM http://139.84.164.4');
  next();
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

    socket.on('fileUpload', (fileInfo) => {
      const fileBuffer = Buffer.from(fileInfo.fileData.split(',')[1], 'base64');
      const uploadDir = path.join(__dirname, 'uploads');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }

      const filePath = path.join(uploadDir, fileInfo.fileName);

      fs.writeFile(filePath, fileBuffer, (err) => {
        if (err) {
          console.error('Error saving file:', err);
          return;
        }
        io.to(roomId).emit('fileUploaded', fileInfo);
      });
    });
  });

  socket.on("disconnect", () => {
    socket.to(tempRoom).broadcast.emit("test-disconnect", tempUser);
  });
});

server.listen(process.env.PORT || 3030);
