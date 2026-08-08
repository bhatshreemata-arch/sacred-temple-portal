import temples from "./data";

function Gallery({ openVideo }) {
  return (
    <div className="gallery">
      {temples.map((temple, index) => (
        <img
          key={index}
          src={temple.image}
          alt={temple.name}
          onClick={() => openVideo(temple.videoId)}
        />
      ))}
    </div>
  );
}

export default Gallery;
