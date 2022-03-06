import React, { useEffect } from "react";

function Video(props) {
  useEffect(() => {
    const vid = document.querySelector(".peerVideo"+props.id.toString());
    vid.srcObject = props.videoSrc;
    console.log("props.videoSrc==>", props.videoSrc);
    vid.onloadedmetadata = () => {
      vid.play();
    };
  }, []);

  return (
    <video className={"peerVideo"+props.id.toString()} autoPlay={true} playsInline={true}></video>
  );
}

export default Video;
