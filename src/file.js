const resl = require('resl');
const selectFile = require('file-select');
const dragDrop = require('drag-drop');

const hideFileHint = () => document.querySelector('.hint').style.display = 'none';

const toRGBA = (image) => {
  const {width, height} = image;

  const c = document.createElement('canvas');
  c.width  = width;
  c.height = height;

  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(0, 0, width, height);
  return data;
}

const mountLoader = (regl, setTexture) => {
  
  const CACHE = {};
  let loaded = null;

  let loadTexture = (url) => {

    if (loaded == url) return;
    loaded = url;

    const makeTexture = (image) => ({
      rgba: toRGBA(image),
      texture: regl.texture({
        data: image,
        mag: 'linear',
        min: 'linear',
        premultiplyAlpha: true
      }),
    });

    if (CACHE[url]) return setTexture(CACHE[url]);

    resl({
      manifest: {
        texture: {
          type: 'image',
          src: url,
          parser: (data) => makeTexture(data),
        }
      },
      onDone: ({texture: t}) => {
        hideFileHint();
        setTexture(CACHE[url] = t);
      },
      onError: () => {
        loadTexture('./assets/errorfile.svg');
      },
    });
  }

  let loadFileModal = () => selectFile().then(loadFile);
  let loadFile = (file) => {
    if (!file) return;

    const res = new Response(file);
    res.blob().then((blob) => {
      const url = URL.createObjectURL(blob);
      loadTexture(url);
    });
  }

  dragDrop('body', (files) => {
    if (files[0]) loadFile(files[0]);
  });

  return {loadFile, loadFileModal, loadTexture};
}

module.exports = {mountLoader};
