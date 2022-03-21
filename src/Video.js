import React, { useEffect, useRef } from "react";

function Video(props) {
  const videoT = useRef();

  useEffect(() => {
    if (videoT.current) {
      videoT.current.srcObject = props.videoSrc;
      console.log("srcObject===>", videoT.current.srcObject);
    }

    // const vid = document.querySelector(".peerVideo" + props.id.toString());
    // vid.srcObject = props.videoSrc;
    // console.log("props.videoSrc==>", props.videoSrc);
    // vid.onloadedmetadata = () => {
    //   vid.play();
    // };
  }, []);
  return (
    <video
      ref={videoT}
      className={"peerVideo" + props.id.toString()}
      autoPlay={true}
      playsInline={true}
      onLoadedMetadata={(e) => e.target.play()}
    ></video>
  );
}

export default Video;
