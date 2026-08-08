import { useState } from "react";
import Gallery from "./Gallery";
import Lightbox from "./Lightbox";
import "./App.css";

function App() {
  const [videoId, setVideoId] = useState(null);

  return (
    <>
      <h1 style={{ textAlign: "center" }}>Sacred Temple Gallery</h1>

      <Gallery openVideo={setVideoId} />

      <Lightbox
        videoId={videoId}
        close={() => setVideoId(null)}
      />
    </>
  );
}

export default App;
