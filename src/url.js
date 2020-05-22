const parseLocation = (href) => {
  const direct  = href.match(/\/u\/([^#]+)(#|$)/);
  const encoded = href.match(/[?&]u=([^&#]+)([&#]|$)/);

  if (direct) return direct[1];
  if (encoded) return decodeURIComponent(encoded[1]);
  return null;
}

module.exports = {parseLocation}