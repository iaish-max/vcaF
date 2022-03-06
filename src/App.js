import React, { useState } from "react";
import { useEffect } from "react";
import { io } from "socket.io-client";
import Video from "./Video";

function App() {
  const [videoPeers, setVideoPeers] = useState([]);

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

    let rtcPeerConnection = {};
    let userStream;
    let userId, peerIdG;
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

    socket.on("created", function (id) {
      creator = true;
      userId = id;
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

    socket.on("joined", function (id) {
      creator = false;
      userId = id;
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
          socket.emit("ready", roomInput.value, userId); // once a user connect to server we trigger event ready.
        })
        .catch(function (err) {
          console.log(err.name + ": " + err.message);
        });
    });

    socket.on("full", function () {
      alert("Room is full,can't join");
    });

    socket.on("ready", async function (peerId) {
      peerIdG = peerId;
      // if (rtcPeerConnection[peerId] === undefined) {
      rtcPeerConnection[peerId] = new RTCPeerConnection(iceServers);
      rtcPeerConnection[peerId].onicecandidate = OnIceCandidateFunction; // every time execute when you get an iceCandidate from STUN Server.
      rtcPeerConnection[peerId].ontrack = OnTrackFunction; // use to get media from peer(when BOB get audio or video from john)

      console.log("ready userStream: ", userStream);

      rtcPeerConnection[peerId].addTrack(userStream.getTracks()[0], userStream); // send video tracks to peer
      rtcPeerConnection[peerId].addTrack(userStream.getTracks()[1], userStream); // send audio tracks to peer
      await rtcPeerConnection[peerId] // send all information of encoding of call etc. send by creator to joiner.
        .createOffer()
        .then(async function (offer) {
          await rtcPeerConnection[peerId].setLocalDescription(offer); // set all the information of host in local discription of host.
          socket.emit("offer", offer, roomInput.value, userId, peerId);
        })
        .catch(function (err) {
          console.log(err);
        });
      // }
    });

    socket.on("candidate", async function (candidate, peerId) {
      let icecandidate = new RTCIceCandidate(candidate);
      let pp = await rtcPeerConnection[peerId].addIceCandidate(icecandidate);
    });

    socket.on("offer", async function (offer, peerId) {
      peerIdG = peerId;
      // if (rtcPeerConnection[peerId] === undefined) {
      rtcPeerConnection[peerId] = new RTCPeerConnection(iceServers);
      rtcPeerConnection[peerId].onicecandidate = OnIceCandidateFunction; // every time execute when you get an iceCandidate from STUN Server.
      rtcPeerConnection[peerId].ontrack = OnTrackFunction; // use to get media from peer(when BOB get audio or video from john)

      console.log("ready userStream: ", userStream.getTracks());

      rtcPeerConnection[peerId].addTrack(userStream.getTracks()[0], userStream); // send video tracks to peer
      rtcPeerConnection[peerId].addTrack(userStream.getTracks()[1], userStream); // send audio tracks to peer
      let pp = await rtcPeerConnection[peerId].setRemoteDescription(offer); // set all information coming from the host to remote Discription of peer.
      await rtcPeerConnection[peerId] // send all information of encoding of call etc. send by creator to joiner.
        .createAnswer()
        .then(async function (answer) {
          let pp = await rtcPeerConnection[peerId].setLocalDescription(answer); // set all the information of peer in local discription of peer.
          socket.emit("answer", answer, roomInput.value, userId, peerId);
        })
        .catch(function (err) {
          console.log(err);
        });
      // }
    });

    socket.on("answer", async function (answer, peerId) {
      peerIdG = peerId;
      await rtcPeerConnection[peerId].setRemoteDescription(answer); // set all information coming from the peer to remote Discription of host.
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

    const addPeerVideo = (newStream) => {
      const isPresent = videoPeers.filter((item) => {
        if (item.id === newStream.id) return true;
        else return false;
      });
      console.log("isPresent==>", isPresent);
      console.log("newStream==>", newStream);

      if (isPresent.length == 0) {
        const temp = videoPeers;
        temp.push(newStream);
        console.log("temp===>", temp);
        setVideoPeers([...temp]);

        console.log("videoPeers in addPeerVideo====>", videoPeers);
      }
    };

    function OnIceCandidateFunction(event) {
      console.log("ice event==>", event);
      if (event.candidate) {
        socket.emit(
          "candidate",
          event.candidate,
          roomInput.value,
          userId,
          peerIdG
        );
      }
    }

    function OnTrackFunction(event) {
      console.log("event: ", event);
      //
      // const video = document.createElement("video");
      // video.setAttribute("class", "peervideo");
      // var body = document.querySelector("body");
      // body.appendChild(video);
      console.log("streams==>", event.streams);
      addPeerVideo(event.streams[0]);
      console.log("videoPeers==>", videoPeers);
      // video.srcObject = event.streams[0]; // initialized media information in peerVideo video tag. event.streams is an array has both video and audio streams ai 0,1 position respectively.
      // video.onloadedmetadata = function (e) {
      //   video.play(); // once tag is ready we play it
      // };
    }
  });
  // const pvid = (item, index) => {
  //   return <Video id={index} videoSrc={item} key={index} />;
  // };

  return (
    <div>
      <div id="video-chat-lobby">
        <h2 className="text">Video Chat Application</h2>
        <input id="roomName" type="text" placeholder="Room Name" />
        <button id="join">Join</button>
      </div>
      <div id="video-chat-room">
        {/* <video id="user-video" autoplay muted playsinline></video> */}
        {/* <video id="peer-video" autoplay playsinline></video> */}
        {videoPeers.map((item, index) => (
          <Video videoSrc={item} key={index} id={index} />
        ))}
      </div>
      <div className="btn-group" id="btn-group" style={{ display: "none" }}>
        <button id="muteButton">MUTE</button>
        <button id="leaveRoomButton">Leave Room</button>
        <button id="hideCameraButton">Hide Camera</button>
      </div>
    </div>
  );
}

export default App;
