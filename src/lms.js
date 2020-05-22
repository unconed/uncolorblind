const mat3 = require('gl-matrix/mat3');

// LMS-space Color Correction Matrices

const RGB_TO_LMS = mat3.create()
mat3.set(RGB_TO_LMS,
  0.31399022, 0.15537241, 0.01775239,
  0.63951294, 0.75789446, 0.10944209,
  0.04649755, 0.08670142, 0.87256922
);

const LMS_TO_RGB = mat3.create();
mat3.set(LMS_TO_RGB,
  5.47221206, -1.1252419, 0.02980165,
  -4.6419601, 2.29317094, -0.19318073,
  0.16963708, -0.1678952, 1.16364789
);

const PROTANOPE = mat3.create();
mat3.set(PROTANOPE,
  0, 0, 0,
  1.05118294, 1, 0,
  -0.05116099, 0, 1
);

const DEUTERANOPE = mat3.create();
mat3.set(DEUTERANOPE,
  1, 0.9513092, 0,
  0, 0, 0,
  0, 0.04866992, 1
);

const TRITANOPE = mat3.create();
mat3.set(TRITANOPE,
  1, 0, -0.86744736,
  0, 1, 1.86727089,
  0, 0, 0
);

const MONOCHROME = mat3.create();
mat3.set(MONOCHROME,
  0.01775, 0.01775, 0.01775,
  0.10945, 0.10945, 0.10945,
  0.87262, 0.87262, 0.87262
);

let IDENTITY = mat3.create();

let xf = (src) => {
  const m = mat3.create();
  mat3.copy(m, src);
  mat3.multiply(m, m, RGB_TO_LMS);
  mat3.multiply(m, LMS_TO_RGB, m);
  return m;
}

let CORRECTION = [
  xf(IDENTITY),
  xf(PROTANOPE),
  xf(DEUTERANOPE),
  xf(TRITANOPE),
  xf(MONOCHROME),
];

module.exports = {CORRECTION};
