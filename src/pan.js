const mat3 = require('gl-matrix/mat3');
const vec3 = require('gl-matrix/vec2');
const vec2 = require('gl-matrix/vec2');

const mountPan = (getProjection, getView, applyMatrix, applyTranslation) => {

  const canvas = document.querySelector('canvas');
  
  // Scratch matrix and vector
  const mat = mat3.create();
  const vec = vec2.create();

  // Movement handler
  const applyMove = (dx, dy) => {
    mat3.identity(mat);
    mat[6] = dx;
    mat[7] = dy;
    applyMatrix(mat);
  };

  // Zoom handler
  const applyZoom = (x, y, dz) => {

    // Get zoom level (logarithmic)
    let log = -dz;
    let zoom = 1/Math.pow(2, log / 100);

    // Zoom in/out
    vec2.set(vec, zoom, zoom);
    mat3.fromScaling(mat, vec);

    // Adjust so mouse position is unaltered
    mat[6] = (1 - zoom) * x;
    mat[7] = (1 - zoom) * y;

    applyMatrix(mat);
  };

  const getPanSpeed = () => {
    let projection = getProjection();
    let view = getView();
    const fx = projection[0] * view[0] / window.innerWidth;
    const fy = projection[4] * view[4] / window.innerHeight;
    return [fx, fy];
  };
  
  // Pan click and drag with middle
  canvas.addEventListener('mousemove', (e) => {
    const {movementX, movementY, buttons, metaKey, altKey} = e;
    let grabbing = false;

    if (
      (buttons & 4) ||
      ((buttons & 1) && (metaKey || altKey))
    ) {
      const [fx, fy] = getPanSpeed();
      applyTranslation(-movementX, -movementY);
      applyMove(-movementX * fx, -movementY * fy);
      grabbing = true;
    }
    
    toggleClass(document.body, 'grabbing', grabbing);
    grabbing && e.preventDefault();
  });
  
  canvas.addEventListener('mouseup', (e) => {
    toggleClass(document.body, 'grabbing', false);
  });
  
  // Mousewheel is used for scrolling and panning (shift)
  let m = mat3.create();
  canvas.addEventListener('mousewheel', (e) => {
    const {offsetX, offsetY, deltaX, deltaY, deltaMode, shiftKey} = e;

    const factor = deltaMode ? 10 : 1;
    const speed  = factor * 1.5;
    const [fx, fy] = getPanSpeed();

    const u = offsetX / window.innerWidth;
    const v = offsetY / window.innerHeight;
    const v3 = vec3.create();
    vec3.set(v3, u, v, 1);
    
    let view = getView();
    vec3.transformMat3(v3, v3, getProjection());
    vec3.transformMat3(v3, v3, view);
    
    if (shiftKey) {
      applyTranslation(deltaX * speed, deltaY * speed);
      applyMove(deltaX * speed * fx, deltaY * speed * fy);
    }
    else {
      applyZoom(v3[0], v3[1], deltaY * factor);
    }

    e.preventDefault();
  });

}

// Toggle DOM class
const toggleClass = (el, className, v) => el.classList.toggle(className, v);

module.exports = {mountPan};