const regl = require('regl')();

const vec3 = require('gl-matrix/vec3');

const {CORRECTION} = require('./lms');
const {VECTORS} = require('./options');
const {mountUI, mountScrubber} = require('./ui');
const {mountLoader} = require('./file');
const {openAbout} = require('./about');
const {formatColor, testPattern} = require('./color');
const {getCamera} = require('./camera');
const {parseLocation} = require('./url');
const {getLayout, getAspect} = require('./layout');

const SHADER = require('raw-loader!./shader.glsl').default;

const props = {
  "plate": "assets/ishihara_9.png",
  "vision": "0",
  "active": true,
  "rainbow": true,
  "moving": true,
  "pattern": 1,
  "direction": 1,
  "intensity": 0.65,
  "invert": false,
  "background": 0,
  "highlight": 0.291,
  "range": 0.45,
  "hardness": 2,
  "saturation": 0.5,
  "exclude": false
};

const state = {
  picked: null,
  hover: null,
  image: {rgba: {data: [0, 0, 0, 255], width: 1, height: 1}, texture: regl.texture({shape: [1, 1]})},
};

// Convert screen coordinates to canvas UV
const getUV = (e) => {
  let {innerWidth, innerHeight} = window;
  let {clientX, clientY} = e;

  let u = clientX / innerWidth;
  let v = clientY / innerHeight;

  return [u, v];
}

// Pick color at UV coordinates
const NO_PIXEL = [0, 0, 0, 0];
const pickUV = (u, v) => {
  let {projection, bar} = getLayout(state.image);
  let {rgba, texture: {width, height}} = state.image;

  // Pick test pattern
  if (v > bar[0]) {
    const [r, g, b] = testPattern(u, 1 - (v - bar[0]) * bar[1]);
    return [r, g, b, 1];
  }

  // Transform to image UV
  let v3 = vec3.create();
  vec3.set(v3, u, v, 1);
  vec3.transformMat3(v3, v3, projection);
  u = v3[0];
  v = v3[1];

  // Transform to texel space
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  const x = Math.floor(u * width);
  const y = Math.floor(v * height);
  
  // Read data
  const bytes = rgba.data;
  const getPixel = (x, y) => {
    if (x < 0)       return NO_PIXEL;
    if (x >= width)  return NO_PIXEL;
    if (y < 0)       return NO_PIXEL;
    if (y >= height) return NO_PIXEL;

    const i = (x + y * width) * 4;
    const r = (bytes[i]     || 0) / 255;
    const g = (bytes[i + 1] || 0) / 255;
    const b = (bytes[i + 2] || 0) / 255;
    const a = (bytes[i + 3] || 0) / 255;
    return [r, g, b, a];
  }

  // Sample 3x3
  const sampleArea = (x, y) => {
    let mask = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ];
  
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let w = 1e-5;

    for (let i = 0; i < 2; ++i) {
      for (let j = 0; j < 2; ++j) {
        const [pr, pg, pb, pa] = getPixel(x + i - 1, y + i - 1);
        const v = mask[i][j];
        w += v;
        a += pa * v;
        r += pr * v;
        g += pg * v;
        b += pb * v;
      }
    }

    return [r/w, g/w, b/w, a/w];
  }
  
  return sampleArea(x, y);
}

// Initialize UI and rendering
const onLoad = () => {
  
  // Spinner
  const spinner = document.querySelector('.spinner');
  const hint    = document.querySelector('.hint');

  // URL loaders
  const {loadFileModal, loadTexture, loadVideo} = mountLoader(regl,
    (loading) => { toggleElement(spinner, loading); toggleElement(hint, false); },
    (image) => {
    if (state.image && state.image.stop) state.image.stop();
    state.image = image;
  });

  // Camera loading/unloading
  const cameraButton = document.querySelector('button.camera');
  const loadCamera = () => getCamera().then(({video}) => { loadVideo(video); updateCamera(); });
  const unloadCamera = () => { loadTexture(props.plate); }
  const isCamera = () => !!state.image.update;
  const toggleCamera = () => {
    if (isCamera()) unloadCamera();
    else loadCamera();
    updateCamera();
  }
  const updateCamera = () => {
    cameraButton.classList.toggle('no-camera', isCamera());
  };

  // Clipboard
  const copyColor = () => {
    const {picked} = state;
    if (!picked) return;

    const el = document.querySelector('input.clipboard');
    if (!el) return;

    el.value = formatColor(picked);
    el.select();
    document.execCommand("copy");
  }

  // These need to be on props for dat.gui
  props.loadFile   = loadFileModal;
  props.loadCamera = toggleCamera;
  props.openHelp   = openAbout;

  mountUI(props, () => loadTexture(props.plate));

  // Load image via URL (only works if it has CORS headers)
  const url = parseLocation(location.href);
  if (url) loadTexture(url);
  else loadTexture(props.plate);

  // Picker for spectrum
  const getBarUV = (e) => {
    let [u, v] = getUV(e);
    const {bar} = getLayout(state.image);
    return [u, (v - bar[0]) * bar[1]];
  };

  mountScrubber(
    getUV, getBarUV, pickUV,
    (hover) => state.hover = hover,
    (picked) => { state.picked = picked; copyColor() },
    (highlight) => props.highlight = highlight
  );

  regl.frame(({time}) => {
    if (state.image.update) state.image.update();

    regl.clear({color: [0, 0, 0, 0]})
    drawImage({time: props.moving ? time : 0, layout: getLayout(state.image)})
  });
};

const drawImage = regl({

  // Screen-filling triangle
  count: 3,
  attributes: {
    position: regl.buffer([
      [-1, -1],
      [3, -1],
      [-1,  3],
    ]),
    uv: regl.buffer([
      [0, 1],
      [2, 1],
      [0, -1],
    ])
  },

  uniforms: {
    time:       regl.prop('time'),
    texture:    () => state.image.texture,
    dpr:        (context) => context.pixelRatio,
    idpr:       (context) => 1 / context.pixelRatio,

    background: () => props.background,
    rainbow:    () => props.rainbow   ?  1 : 0,
    
    exclude:    () => props.exclude   ?  1 : 0,
    invert:     () => props.invert    ? -1 : 1,
    filter:     () => +props.vision   ?  1 : 0,
    pattern:    () => props.active ? +props.pattern : 0,
    intensity:  () => props.intensity,
    vision:     () => CORRECTION[+props.vision] || CORRECTION[0],
    direction:  () => VECTORS[props.direction],

    highlight:  () => (props.rainbow && state.hover != null) ? state.hover : props.highlight,
    range:      () => props.range / 2,
    irange:     () => 2 / props.range,
    hardness:   () => (props.hardness + 1) / props.range,
    saturation: () => 1.0 / props.saturation,

    projection: (_, props) => props.layout.projection,
    bar:        (_, props) => props.layout.bar,
    pixel:      (_, props) => props.layout.pixel,
    grid:       () => getAspect(),
  },
  
  depth: {
    enable: false,
  },

  vert: SHADER.replace('#defs', '#define VERTEX'),
  frag: SHADER.replace('#defs', '#define FRAGMENT'),

});

// Toggle DOM element visibility
const toggleElement = (el, vis) => el.style.display = vis ? 'block' : 'none';

window.onload = onLoad;
