const mat3 = require('gl-matrix/mat3');

// scratch matrix
const m = mat3.create();

const BOTTOM_BAR = 200;

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
const getLayout = (image) => {
  const {innerWidth, innerHeight} = window;
  const {texture} = image;

  mat3.identity(projection);

  // Bottom bar
  const h = BOTTOM_BAR / innerHeight;
  const bar  = [1 - h, 1/h];

  //if (texture.width > 1) debugger;

  // Fit in pixel view
  {
    const viewport = [0, 0, innerWidth, innerHeight - BOTTOM_BAR];
    const size = rectToSize(viewport);
    fitImage(texture, size, projection);
  }

  //console.log(mat3.copy(mat3.create(), projection))

  // Fit in UV space
  {
    const viewport = [0, 0, 1, 1 - h];
    fitView(viewport, projection);
  }

  const pixel = [1/innerWidth, 1/innerHeight];
  //console.log(mat3.copy(mat3.create(), projection))

  return {
    projection,
    bar,
    pixel,
  };
}

module.exports = {getLayout, getAspect};