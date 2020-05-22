// Get camera media stream using a canvas to buffer it
const getCamera = () => {
  
  navigator.mediaDevices.ondevicechange = () => {
    navigator.mediaDevices.enumerateDevices().then((devices) => console.log('device change', devices));
  }
  
  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'environment',
    },
  })
  .then((stream) => {
    const video = document.querySelector('video');
    video.srcObject = stream;
    video.play();

    return new Promise((resolve) => {
      video.oncanplay = () => resolve({video});
    });
  });
}

module.exports = {getCamera};
