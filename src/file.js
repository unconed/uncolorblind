const resl = require('resl');
const selectFile = require('file-select');
const dragDrop = require('drag-drop');

const safariFix = (() => {
  const {userAgent} = navigator;
  if (userAgent.match(/Safari/) && !userAgent.match(/Chrome/)) {
    return (info) => {
      const {data: src, width, height} = info;
      let dest = getUint8Array(src.length);
      for (let i = 0; i < src.length; ++i) dest[i] = src[i];
      return {data: dest, width, height};
    }
  }
  return _ => _;
})();

let buffer = null;
const getUint8Array = (length) => {
  if (buffer && buffer.length == length) return buffer;
  return buffer = new Uint8Array(length);
}

let canvas = null;
const getCanvas = (width, height) => {
  const c = canvas || document.createElement('canvas');
  if (!canvas) canvas = c;

  if (c.width  != width)  c.width = width;
  if (c.height != height) c.height = height;
  return c;
}

const toRGBA = (image) => {
  let {width, height, videoWidth, videoHeight} = image;
  width  = width  || videoWidth;
  height = height || videoHeight;

  const c = getCanvas(width, height);
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);

  try {
    const data = ctx.getImageData(0, 0, c.width, c.height);
    return data;
  } catch (e) {
    console.error(e);
    return {data: [], width, height};
  }
  return data;
}

const mountLoader = (regl, setLoading, setTexture) => {
  
  const CACHE = {};
  let loaded = null;

  const makeVideoTexture = (video) => {
    let texture;
    const update = () => {
      const data = toRGBA(video);
      if (texture.width !== data.width || texture.height !== data.height) {
        texture({width: data.width, height: data.height});
      }
      if (data.width && data.height) {
        debugger;
        texture.subimage(safariFix(data));
      }
      self.rgba = data;
    };
    
    const stop = () => {
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
    };

    return self = {
      update,
      stop,
      rgba: toRGBA(video),
      texture: texture = regl.texture({
        data: video,
        mag: 'linear',
        min: 'linear',
      }),
    };
  };

  const fitImage = (image) => {
    const {maxTextureSize} = regl.limits;
    let {width, height} = image;

    let resize = false;
    if (width  > maxTextureSize) { width  = maxTextureSize; resize = true; }
    if (height > maxTextureSize) { height = maxTextureSize; resize = true; }

    if (resize) {
      const c = getCanvas(width, height);
      const ctx = c.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      return c;
    }

    return image;
  }

  const makeImageTexture = (image) => {
    image = fitImage(image);
    return {
      rgba: toRGBA(image),
      texture: regl.texture({
        data: image,
        mag: 'linear',
        min: 'linear',
        premultiplyAlpha: true
      }),
    };
  };

  const loadTexture = (src) => {
    if (src == '') return;
    if (loaded == src) return;
    loaded = src;

    if (CACHE[src]) return setTexture(CACHE[src]);

    setLoading(true);
    return loadImageURL(src, (t) => {
      setLoading(false);
      if (t) CACHE[src] = t;
    });
  }

  const loadVideo = video => {
    if (!video) return;
    if (loaded == video) return;
    loaded = video;

    setTexture(makeVideoTexture(video));
  }

  const loadImageURL = (url, f) => {
    resl({
      manifest: {
        texture: {
          type: 'image',
          src: url,
          parser: (data) => makeImageTexture(data),
        }
      },
      onDone: ({texture: t}) => {
        f && f(t);
        setTexture(t);
      },
      onError: (e) => {
        console.error(e);
        f && f();
        loadTexture('./assets/errorfile.svg');
      },
    });
  };

  const loadFileModal = () => selectFile({
    multiple: false,
    accept: 'image/*',
  }).then(loadFile);

  const loadFile = (file) => {
    if (!file) return;

    const res = new Response(file);
    res.blob().then((blob) => {
      const url = URL.createObjectURL(blob);
      loadTexture(url);
    });
  }

  const showHint = (b) => document.querySelector('.hint').style.display = b ? 'block' : 'none';
  dragDrop('body', {
    onDrop: (files) => files[0] && loadFile(files[0]),
    onDragEnter: () => showHint(true),
    onDragOver:  () => showHint(true),
    onDragLeave: () => showHint(false),
  });

  return {loadFile, loadFileModal, loadTexture, loadVideo};
}

module.exports = {mountLoader};
