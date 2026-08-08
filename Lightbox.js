function Lightbox({ videoId, close }) {
  if (!videoId) return null;

  return (
    <div className="lightbox">
      <button className="close" onClick={close}>✕</button>

      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title="Temple Video"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      ></iframe>
    </div>
  );
}

export default Lightbox;
