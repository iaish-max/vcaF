import React from "react";
import { useEffect } from "react";
import { io } from "socket.io-client";

function App() {
  useEffect(() => {
    let socket = io("http://localhost:4000", {
      withCredentials: true,
    });

    let divVideochatLobby = document.getElementById("video-chat-lobby");
    let divVideoChat = document.getElementById("video-chat-room");
    let joinButton = document.getElementById("join");
    let userVideo = document.getElementById("user-video");
    // let peerVideo = document.getElementById("peer-video");
    let roomInput = document.getElementById("roomName");

    let rtcPeerConnection;
    let userStream;

    let divButtonGroup = document.getElementById("btn-group");
    let muteButton = document.getElementById("muteButton");
    let leaveRoomButton = document.getElementById("leaveRoomButton");
    let hideCameraButton = document.getElementById("hideCameraButton");

    let muteFlag = false;
    let hideCameraFlag = false;

    let creator = false;
    let iceServers = {
      iceServers: [
        { urls: "stun:stun.services.mozilla.com" }, // stun server (to get an IP address of internet connection)
        { urls: "stun:stun1.l.google.com:19302" }, // stun server (to get an IP address of internet connection)
        //also use TURN Server here.
      ],
    };

    joinButton.addEventListener("click", function () {
      let roomName = roomInput.value;
      if (roomName === "") alert("Please enter a room name");
      else {
        console.log("roomName is: ", roomName);
        socket.emit("join", roomName);
      }
    });

    muteButton.addEventListener("click", function () {
      muteFlag = !muteFlag;

      if (muteFlag) {
        userStream.getTracks()[0].enabled = false;
        muteButton.textContent = "Unmute";
      } else {
        userStream.getTracks()[0].enabled = true;
        muteButton.textContent = "Mute";
      }
    });

    hideCameraButton.addEventListener("click", function () {
      hideCameraFlag = !hideCameraFlag;

      if (hideCameraFlag) {
        userStream.getTracks()[1].enabled = false;
        hideCameraButton.textContent = "Show Camera";
      } else {
        userStream.getTracks()[1].enabled = true;
        hideCameraButton.textContent = "Hide Camera";
      }
    });

    socket.on("created", function () {
      creator = true;
      let constraints = { audio: true, video: { width: 500, height: 500 } };

      navigator.mediaDevices // enable media services.
        .getUserMedia(constraints)
        .then(function (mediaStream) {
          userStream = mediaStream;
          divVideochatLobby.style = "display:none";
          divButtonGroup.style = "display:flex";

          const myVideo = document.createElement("video");
          myVideo.setAttribute("id", "user-video");
          var body = document.querySelector("body");
          body.appendChild(myVideo);

          myVideo.srcObject = mediaStream; // initialized media information in userVideo video tag.
          myVideo.onloadedmetadata = function (e) {
            myVideo.play(); // once tag is ready we play it
          };
        })
        .catch(function (err) {
          console.log(err.name + ": " + err.message);
        });
    });

    socket.on("joined", function () {
      creator = false;
      let constraints = { audio: true, video: { width: 500, height: 500 } };

      navigator.mediaDevices // enable media services.
        .getUserMedia(constraints)
        .then(function (mediaStream) {
          userStream = mediaStream;

          console.log("joined userStream: ", userStream);
          divVideochatLobby.style = "display:none";
          divButtonGroup.style = "display:flex";

          const myVideo = document.createElement("video");
          myVideo.setAttribute("id", "user-video");
          var body = document.querySelector("body");
          body.appendChild(myVideo);

          myVideo.srcObject = mediaStream; // initialized media information in userVideo video tag.
          myVideo.onloadedmetadata = function (e) {
            myVideo.play(); // once tag is ready we play it
          };
          socket.emit("ready", roomInput.value); // once a user connect to server we trigger event ready.
        })
        .catch(function (err) {
          console.log(err.name + ": " + err.message);
        });
    });

    socket.on("full", function () {
      alert("Room is full,can't join");
    });

    socket.on("ready", function () {
      if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction; // every time execute when you get an iceCandidate from STUN Server.
        rtcPeerConnection.ontrack = OnTrackFunction; // use to get media from peer(when BOB get audio or video from john)

        console.log("ready userStream: ", userStream.getTracks());

        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // send video tracks to peer
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // send audio tracks to peer
        rtcPeerConnection // send all information of encoding of call etc. send by creator to joiner.
          .createOffer()
          .then(function (offer) {
            rtcPeerConnection.setLocalDescription(offer); // set all the information of host in local discription of host.
            socket.emit("offer", offer, roomInput.value);
          })
          .catch(function (err) {
            console.log(err);
          });
      }
    });

    socket.on("candidate", function (candidate) {
      let icecandidate = new RTCIceCandidate(candidate);
      rtcPeerConnection.addIceCandidate(icecandidate);
    });

    socket.on("offer", function (offer) {
      if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction; // every time execute when you get an iceCandidate from STUN Server.
        rtcPeerConnection.ontrack = OnTrackFunction; // use to get media from peer(when BOB get audio or video from john)

        console.log("ready userStream: ", userStream.getTracks());

        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // send video tracks to peer
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // send audio tracks to peer
        rtcPeerConnection.setRemoteDescription(offer); // set all information coming from the host to remote Discription of peer.
        rtcPeerConnection // send all information of encoding of call etc. send by creator to joiner.
          .createAnswer()
          .then(function (answer) {
            rtcPeerConnection.setLocalDescription(answer); // set all the information of peer in local discription of peer.
            socket.emit("answer", answer, roomInput.value);
          })
          .catch(function (err) {
            console.log(err);
          });
      }
    });

    socket.on("answer", function (answer) {
      rtcPeerConnection.setRemoteDescription(answer); // set all information coming from the peer to remote Discription of host.
    });

    // leaveRoomButton.addEventListener("click", function () {
    //   // peer that leave the room
    //   socket.emit("leave", roomInput.value);

    //   divVideochatLobby.style = "display:block";
    //   divButtonGroup.style = "display:none";

    //   if (userVideo.srcObject) {
    //     userVideo.srcObject.getTracks()[0].stop(); // stop audio and video tracks of user.
    //     userVideo.srcObject.getTracks()[1].stop();
    //   }

    //   if (peerVideo.srcObject) {
    //     peerVideo.srcObject.getTracks()[0].stop(); // stop audio and video tracks of peer.
    //     peerVideo.srcObject.getTracks()[1].stop();
    //   }

    //   if (rtcPeerConnection) {
    //     // disconnect the connection.
    //     rtcPeerConnection.ontrack = null;
    //     rtcPeerConnection.onicecandidate = null;
    //     rtcPeerConnection.close();
    //     rtcPeerConnection = null;
    //   }
    // });

    // socket.on("leave", function () {
    //   // others connecting peer
    //   creator = true; // remianing peer now become creator.

    //   if (peerVideo.srcObject) {
    //     peerVideo.srcObject.getTracks()[0].stop(); // stop audio and video tracks of peer.
    //     peerVideo.srcObject.getTracks()[1].stop();
    //   }

    //   if (rtcPeerConnection) {
    //     // disconnect the connection.
    //     rtcPeerConnection.ontrack = null;
    //     rtcPeerConnection.onicecandidate = null;
    //     rtcPeerConnection.close();
    //     rtcPeerConnection = null;
    //   }
    // });

    function OnIceCandidateFunction(event) {
      if (event.candidate) {
        socket.emit("candidate", event.candidate, roomInput.value);
      }
    }

    function OnTrackFunction(event) {
      console.log("event: ", event);

      const video = document.createElement("video");
      video.setAttribute("class", "peervideo");
      var body = document.querySelector("body");
      body.appendChild(video);

      video.srcObject = event.streams[0]; // initialized media information in peerVideo video tag. event.streams is an array has both video and audio streams ai 0,1 position respectively.
      video.onloadedmetadata = function (e) {
        video.play(); // once tag is ready we play it
      };
    }
  }, []);

  return (
    <div>
      <div id="video-chat-lobby">
        <h2 class="text">Video Chat Application</h2>
        <input id="roomName" type="text" placeholder="Room Name" />
        <button id="join">Join</button>
      </div>
      <div id="video-chat-room">
        {/* <video id="user-video" autoplay muted playsinline></video> */}
        {/* <video id="peer-video" autoplay playsinline></video> */}
      </div>
      <div class="btn-group" id="btn-group" style={{ display: "none" }}>
        <button id="muteButton">MUTE</button>
        <button id="leaveRoomButton">Leave Room</button>
        <button id="hideCameraButton">Hide Camera</button>
      </div>
    </div>
  );
}

export default App;
