const socket = io("/");
const chatInputBox = document.getElementById("chat_message");
const all_messages = document.getElementById("all_messages");
const main__chat__window = document.getElementById("main__chat__window");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const fileInput = document.getElementById('fileInput');
myVideo.muted = true;
let tempClientId;
const baseURL = "https://mhealth.vivatechrnd.com"; //for server
// const baseURL = "http://localhost";//for local
const port = 3030;
const allpeers = {};

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3030",
});

let myVideoStream;

var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, tempClientId);
    tempClientId = null;

    peer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");

      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, call.peer);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });

    document.addEventListener("keydown", (e) => {
      if (e.which === 13 && chatInputBox.value != "") {
        socket.emit("message", { text: chatInputBox.value, username: USER_NAME });
        chatInputBox.value = "";
      }
    });

    socket.on("createMessage", (messageData) => {
      let li = document.createElement("li");
      li.innerHTML = `${messageData.username}: ${messageData.text}`;
      all_messages.append(li);
      main__chat__window.scrollTop = main__chat__window.scrollHeight;
    });
  });

peer.on("call", function (call) {
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream); // Answer the call with an A/V stream.
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, call.peer);
      });
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

socket.on("test-disconnect", (userId) => {
  console.log("Test disconnect user id: ", userId);
  console.log("All peers: ", allpeers);
  // if (allpeers[userId]) {
  //   allpeers[userId].close();
  //   delete allpeers[userId];
  // }
  const allVideoTag = document.querySelectorAll('video');

  allVideoTag.forEach(video => {
    if (video.getAttribute('data-peer-id') === userId) {
      video.style.display = 'none';
      console.log("setting the video to none of user: ", userId);
    }
  });
  console.log("remaining peers: ", allpeers);
});

peer.on("open", (id) => {
  console.log("Peer ID: ", id, " joined Room ID: ", ROOM_ID);
  console.log("ID name : ", USER_NAME)
  console.log("END_TIME: ", END_TIME); 
  const currentTime = new Date();
  console.log(currentTime, "current-time")
  tempClientId = id;
  socket.emit("join-room", ROOM_ID, id, IS_SHOW_CHAT, USER_ID, USER_NAME, START_TIME, END_TIME);
});

// CHAT

const connectToNewUser = (userId, streams) => {
  var call = peer.call(userId, streams);
  var video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });
  call.on('close', () => {
    video.remove()
  })
  allpeers[userId] = call;
};

const addVideoStream = (videoEl, stream, userId) => {
  videoEl.srcObject = stream;
  videoEl.setAttribute("data-peer-id", userId);
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });

  videoGrid.append(videoEl);
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        100 / totalUsers + "%";
    }
  }
};

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const setPlayVideo = () => {
  const html = `<i class="unmute fa fa-pause-circle"></i>
  <span class="unmute">Resume Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setStopVideo = () => {
  const html = `<i class=" fa fa-video-camera"></i>
  <span class="">Pause Video</span>`;
  document.getElementById("playPauseVideo").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `<i class="unmute fa fa-microphone-slash"></i>
  <span class="unmute">Unmute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};

const setMuteButton = () => {
  const html = `<i class="fa fa-microphone"></i>
  <span>Mute</span>`;
  document.getElementById("muteButton").innerHTML = html;
};

$("#leave-meeting").on("click", () => {
  const uId = document.querySelectorAll('video')[0].getAttribute('data-peer-id');
  console.log("Video thumbnail to remove: ", uId);
  let url = `${baseURL}:${port}/thankyoupage.html`;
  window.location.href = url;
});

fileInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function() {
      const fileInfo = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: reader.result,
        username: USER_NAME  // Include the sender's username
      };

      socket.emit('fileUpload', fileInfo);
    };
    reader.onerror = function(error) {
      console.error('Error reading file:', error);
    };
  }
});

const fileDownloadLink = document.getElementById('fileDownloadLink');
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

function toggleChat() {
  IS_SHOW_CHAT = !IS_SHOW_CHAT; 
  updateUI();
}

function updateUI() {
  const mainRight = document.querySelector('.main__right');
  mainRight.classList.toggle('show_main__right', IS_SHOW_CHAT);

  const mainLeft = document.querySelector('.main__left');
  mainLeft.classList.toggle('flex_full', !IS_SHOW_CHAT);
  // console.log("isShowChat", isShowChat, uId, userName, startTime, endTime,);
}

// const toggleButton = document.getElementById('toggleButton');
// toggleButton.addEventListener('click', toggleChat);

// Reload the page when meeting ends
socket.on('meetingEnded', () => {
  console.log('Meeting has ended. Reloading the page...');
  let url = `${baseURL}:${port}/thankyoupage.html`;
  window.location.href = url;
});

