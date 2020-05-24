const regl = require('regl')(document.querySelector('.regl'));

const mat3 = require('gl-matrix/mat3');
const vec3 = require('gl-matrix/vec3');
const vec2 = require('gl-matrix/vec2');

const {CORRECTION} = require('./lms');
const {VECTORS} = require('./options');
const {mountUI, mountScrubber, mountPan} = require('./ui');
const {mountLoader} = require('./file');
const {openAbout} = require('./about');
const {formatColor, testPattern} = require('./color');
const {getCamera} = require('./camera');
const {parseLocation} = require('./url');
const {getLayout, getAspect} = require('./layout');

const SHADER = require('raw-loader!./shader.glsl').default;

const isFirstTime = () => {
  if (localStorage.getItem('firstTime')) return false;
  localStorage.setItem('firstTime', 1);
  return true;
}

// Shader props
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
  // View matrix
  matrix: mat3.create(),
  
  // 2D dither offset in screen space to keep pattern fixed when panning
  offset: vec2.create(),
  
  // Picking state
  picking: true,
  picked: null,
  hover: null,

  // Bar transition state
  transition: 1,

  // Loaded image/texture
  image: {rgba: {data: [0, 0, 0, 255], width: 1, height: 1}, texture: regl.texture({shape: [1, 1]})},
};

// Bind state to layout
const getCurrentLayout = () => getLayout(state.transition, state.image);

// Convert screen coordinates to canvas UV
const getUV = (clientX, clientY) => {
  let {innerWidth, innerHeight} = window;

  let u = clientX / innerWidth;
  let v = clientY / innerHeight;

  return [u, v];
}

// Pick color at UV coordinates
const NO_PIXEL = [0, 0, 0, 0];
const pickUV = (u, v) => {
  if (!state.picking) return [0, 0, 0, 0];
  
  let {projection, bar} = getCurrentLayout();
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
  vec3.transformMat3(v3, v3, state.matrix);
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
  
  // See, this is why you need declarative incrementalism
  // This code is terrible.
  
  // Spinner
  const spinner = document.querySelector('.spinner');
  const hint    = document.querySelector('.hint');
  const tooltip = document.querySelector('.tooltip');

  // Find action buttons
  const cameraButton = document.querySelector('button.camera');
  const pickingButton = document.querySelector('button.picking');
  const fileButton = document.querySelector('button.file');
  const rainbowButton = document.querySelector('button.rainbow');

  // URL loaders
  const {loadFileModal, loadTexture, loadVideo} = mountLoader(regl,
    (loading) => { toggleElement(spinner, loading); toggleElement(hint, false); },
    (image) => {
      if (state.image && state.image.stop) state.image.stop();
      state.image = image;

      mat3.set(state.matrix, 1, 0, 0, 0, 1, 0, 0, 0, 1);
      toggleElement(tooltip, false);
      updateCamera(); 
    }
  );

  // Camera loading/unloading
  const loadCamera = () => getCamera().then(({video}) => { loadVideo(video); updateCamera(); });
  const unloadCamera = () => { loadTexture(props.plate); }
  const isCamera = () => !!state.image.update;
  const toggleCamera = () => {
    if (isCamera()) unloadCamera();
    else loadCamera();
    updateCamera();
  }

  const updateCamera = () => {
    toggleClass(cameraButton, 'no-camera', !isCamera());
  };

  const toggleRainbow = () => {
    props.rainbow = !props.rainbow;
    toggleElement(tooltip, false);
    updateLayout();
  };

  // Picking tool toggle
  const togglePicking = () => { state.picking = !state.picking; updatePicking(); }

  const canvas = document.querySelector('canvas');
  const updatePicking = () => {
    toggleClass(pickingButton, 'no-picking', !state.picking);
    toggleClass(canvas, 'picking', state.picking);
    toggleElement(tooltip, false);
  };

  // Bind action buttons
  cameraButton.addEventListener('click', toggleCamera);
  pickingButton.addEventListener('click', togglePicking);
  fileButton.addEventListener('click', loadFileModal);
  rainbowButton.addEventListener('click', toggleRainbow);

  // Stylesheet selector
  const updateLayout = () => {
    toggleClass(rainbowButton, 'no-rainbow', !props.rainbow);
    toggleClass(document.body, 'with-bar', props.rainbow);
  };

  // Clipboard
  const copyColor = () => {
    const {picked} = state;
    if (!picked) return;

    const clipboard = document.querySelector('input.clipboard');
    if (!clipboard) return;

    clipboard.value = formatColor(picked);
    clipboard.select();
    document.execCommand("copy");
    clipboard.blur();
  }

  // These need to be on props for dat.gui buttons
  props.loadFile      = loadFileModal;
  props.loadCamera    = toggleCamera;
  props.togglePicking = togglePicking;
  props.openAbout     = openAbout;

  mountUI(props,
    () => loadTexture(props.plate),
    () => updateLayout(),
  );
  updatePicking();

  // Load image via URL (only works if it has CORS headers)
  const url = parseLocation(location.href);
  if (url) loadTexture(url);
  else loadTexture(props.plate);

  // Picker for spectrum
  const getBarUV = (clientX, clientY) => {
    let [u, v] = getUV(clientX, clientY);
    const {bar} = getCurrentLayout();
    return [u, (v - bar[0]) * bar[1]];
  };

  // Mount pan-and-zoom
  mountPan(
    () => getCurrentLayout().projection,
    () => state.matrix,
    (matrix) => mat3.multiply(state.matrix, matrix, state.matrix),
    (x, y) => vec2.add(state.offset, state.offset, [x, -y])
  );

  // Mount color picker
  mountScrubber(
    getUV, getBarUV, pickUV,
    (hover) => state.hover = hover,
    (picked) => { state.picked = picked; copyColor() },
    (highlight) => props.highlight = highlight
  );

  let last = null;
  let time = 0;
  regl.frame(({time: clock}) => {
    clock = clock % 320;

    // Resumable clock
    let delta = 0;
    if (last) {
      delta = clock - last;
      if (delta > 0 && props.moving) time += delta;
    }
    last = clock;

    // .5s transition
    const step = 2 * delta;
    if (delta > 0) {
      if (state.transition < +props.rainbow) state.transition += step;
      if (state.transition > +props.rainbow) state.transition -= step;
    }
    state.transition = Math.max(0, Math.min(1, state.transition));

    // Upload video data
    if (state.image.update) state.image.update();

    regl.clear({color: [0, 0, 0, 0]})
    drawImage({
      time,
      layout: getCurrentLayout(),
      aspect: getAspect(),
    })
  });
  
  // First time splash
  if (isFirstTime()) openAbout();
};

// Fill in #define placeholders in shader code
const prepareShader = (code, defs = []) => {
  code = code.replace('#defs', defs.map(x => `#define ${x}\n`));
  return code;
}

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
    rainbow:    () => state.transition,
    
    exclude:    () => props.exclude   ?  1 : 0,
    invert:     () => props.invert    ? -1 : 1,
    filter:     () => +props.vision   ?  1 : 0,
    pattern:    () => props.active ? +props.pattern : 0,
    intensity:  () => props.intensity,
    vision:     () => CORRECTION[+props.vision] || CORRECTION[0],
    direction:  () => VECTORS[props.direction],

    highlight:  () => (state.transition && state.hover != null) ? state.hover : props.highlight,
    range:      () => props.range / 2,
    irange:     () => 2 / props.range,
    hardness:   () => (props.hardness + 1) / props.range,
    saturation: () => 1.0 / props.saturation,

    offset:     () => state.offset,
    view:       () => state.matrix,

    projection: (_, props) => props.layout.projection,
    bar:        (_, props) => props.layout.bar,
    pixel:      (_, props) => props.layout.pixel,
    grid:       (_, props) => props.aspect,
  },
  
  depth: {
    enable: false,
  },

  vert: prepareShader(SHADER, ['VERTEX']),
  frag: prepareShader(SHADER, ['FRAGMENT']),

});

// Toggle DOM element visibility
const toggleElement = (el, vis) => el.style.display = vis ? 'block' : 'none';

// Toggle DOM class
const toggleClass   = (el, className, v) => el.classList.toggle(className, v);

window.onload = onLoad;
