const regl = require('regl')();

const vec3 = require('gl-matrix/vec3');

const {CORRECTION} = require('./lms');
const {VECTORS} = require('./options');
const {mountUI, mountScrubber} = require('./ui');
const {mountLoader} = require('./file');
const {openAbout} = require('./about');
const {testPattern} = require('./color');

const {parseLocation} = require('./url');
const {getLayout} = require('./layout');

const SHADER = require('raw-loader!./shader.glsl').default;

const props = {
  "plate": "assets/ishihara_9.png",
  "vision": 0,
  "rainbow": true,
  "active": true,
  "pattern": 1,
  "direction": 1,
  "intensity": 0.65,
  "moving": true,
  "exclude": false,
  "invert": false,
  "background": 0,
  "highlight": 0.2916,
  "range": 0.59,
  "saturation": 0.5,
  "hardness": 2,
  "loadFile": null,
};

const state = {
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
  const x = clamp(Math.floor(u * width), 0, width - 1);
  const y = clamp(Math.floor(v * height), 0, height - 1);
  
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
    let w = 0;

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

  const {loadFileModal, loadTexture} = mountLoader(regl, (image) => state.image = image);
  props.loadFile = loadFileModal;
  props.openHelp = openAbout;

  mountUI(props, () => loadTexture(props.plate));

  const url = parseLocation(location.href);
  if (url) loadTexture(url);
  else loadTexture(props.plate);

  const getBarUV = (e) => {
    let [u, v] = getUV(e);
    const {bar} = getLayout(state.image);
    return [u, (v - bar[0]) * bar[1]];
  };

  mountScrubber(
    getUV, getBarUV, pickUV,
    (hover) => state.hover = hover,
    (highlight) => props.highlight = highlight
  );

  regl.frame(({time}) => {
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
    pixelScale: (_, props) => props.layout.pixelScale,
  },
  
  depth: {
    enable: false,
  },

  vert: SHADER.replace('#defs', '#define VERTEX'),
  frag: SHADER.replace('#defs', '#define FRAGMENT'),

})

window.onload = onLoad;
