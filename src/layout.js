const mat3 = require('gl-matrix/mat3');

// scratch matrix
const m = mat3.create();

const CUTOFF_HEIGHT_MEDIUM = 768;
const CUTOFF_HEIGHT_SMALL = 425;
const BOTTOM_BAR_LARGE = 200;
const BOTTOM_BAR_MEDIUM = 100;
const BOTTOM_BAR_SMALL = 60;

// Rectangle to WxH
const rectToSize = ([left, top, right, bottom]) => [right - left, bottom - top];

// Fit image into sized viewport (UV space)
const fitImage = (texture, size, matrix) => {
  const {width, height} = texture;
  const [innerWidth, innerHeight] = size;

  // Fit inside
  const aspect = (innerWidth / innerHeight) / (width / height);
  const sx = Math.max(aspect, 1);
  const sy = Math.max(1/aspect, 1);

  // Translate to retain center as a fixed point
  const tx = (1 - sx) / 2;
  const ty = (1 - sy) / 2;

  // 3x3 homogenous matrix
  mat3.set(m,
    sx,  0, 0,
    0,  sy, 0,
    tx, ty, 1
  );
  mat3.multiply(matrix, m, matrix);
}

// Fit UV square into viewport
const fitView = (viewport, matrix) => {

  const [left, top, right, bottom] = viewport;

  // Shift between old and new center
  const dx = (left + right) / 2 - 0.5;
  const dy = (top + bottom) / 2 - 0.5;
  
  // Scale from 1x1 to box
  const sx = 1/(right - left);
  const sy = 1/(bottom - top);

  // Translate to retain center as a fixed point
  const tx = (1 - sx) / 2 - dx * sx;
  const ty = (1 - sy) / 2 - dy * sy;

  // 3x3 homogenous matrix
  mat3.set(m,
    sx,  0, 0,
    0,  sy, 0,
    tx, ty, 1
  );
  mat3.multiply(matrix, m, matrix);
}

// Shared projection matrix
const projection = mat3.create();

// Get grid aspect ratio in UV space
const getAspect = (image) => {
  const {innerWidth, innerHeight} = window;
  const aspect = innerWidth / innerHeight;
  const sx = Math.max(aspect, 1);
  const sy = Math.max(1/aspect, 1);
  return [sx, sy];
}

// Compute layout for main screen
const getLayout = (rainbow, image) => {
  const {innerWidth, innerHeight} = window;
  const {texture} = image;

  mat3.identity(projection);

  // Bottom bar
  const height = rainbow ? 
    (innerHeight <= CUTOFF_HEIGHT_SMALL  ? BOTTOM_BAR_SMALL :
    (innerHeight <= CUTOFF_HEIGHT_MEDIUM ? BOTTOM_BAR_MEDIUM :
    BOTTOM_BAR_LARGE)) : 0;

  // Lerp bar height for transition
  const h = height / innerHeight;
  const f = .5 - Math.cos(rainbow * Math.PI) * .5;
  const bar  = [1 - h*f, 1 / h];

  // Fit in pixel view
  {
    const viewport = [0, 0, innerWidth, innerHeight - height*f];
    const size = rectToSize(viewport);
    fitImage(texture, size, projection);
  }

  // Fit in UV space
  if (rainbow) {
    const viewport = [0, 0, 1, 1 - h*f];
    fitView(viewport, projection);
  }

  // Pixel scale without devicePixelRatio
  const pixel = [1 / innerWidth, 1 / innerHeight];

  return {
    projection,
    bar,
    pixel,
  };
}

module.exports = {getLayout, getAspect};