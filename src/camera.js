// Get camera media stream using a canvas to buffer it
const getCamera = () => {
  return navigator.mediaDevices.getUserMedia({
    video: true,
    /*
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'environment',
    },
    */
  })
  .then((stream) => {
    const video = document.querySelector('video');
    video.srcObject = stream;
    video.play();

    /*
    const canvas = document.createElement('canvas');
    const render = () => {
      const w = video.width;
      if (canvas.width  != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0);
    }
    
    const running = false;
    const start = () => running || (running = true) && requestAnimationFrame(loop)
    const stop  = () => running = false;

    const loop = () => {
      running && requestAnimationFrame(loop);
      render();
    };
    
    //return {video, canvas, start, stop};
    */

    return new Promise((resolve) => {
      video.oncanplay = () => resolve({video});
    });
  });
}

module.exports = {getCamera};
