const mat3 = require('gl-matrix/mat3');
const vec3 = require('gl-matrix/vec2');
const vec2 = require('gl-matrix/vec2');

const sqr = x => x * x;

const mountPan = (getProjection, getView, getPicking, applyMatrix, applyTranslation) => {

  const canvas = document.querySelector('canvas');
  
  // Scratch matrix and vector
  const mat = mat3.create();
  const vec = vec2.create();
  
  // Reverse projection into texture space
  const getUV = (x, y) => {
    const u = x / window.innerWidth;
    const v = y / window.innerHeight;
    const v3 = vec3.create();
    vec3.set(v3, u, v, 1);
    
    vec3.transformMat3(v3, v3, getProjection());
    vec3.transformMat3(v3, v3, getView());
    
    return v3;
  }

  // Movement handler
  const applyMove = (dx, dy) => {
    mat3.identity(mat);
    mat[6] = dx;
    mat[7] = dy;
    applyMatrix(mat);
  };

  // Zoom handler
  const applyZoom = (x, y, zoom) => {

    // Zoom in/out
    vec2.set(vec, zoom, zoom);
    mat3.fromScaling(mat, vec);

    // Adjust so mouse position is unaltered
    mat[6] = (1 - zoom) * x;
    mat[7] = (1 - zoom) * y;

    applyMatrix(mat);
  };

  // Projection-dependent pan speed
  const getPanSpeed = () => {
    let projection = getProjection();
    let view = getView();
    const fx = projection[0] * view[0] / window.innerWidth;
    const fy = projection[4] * view[4] / window.innerHeight;
    return [fx, fy];
  };
  
  // Pan click and drag with middle
  const onMouse = (e) => {
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
  };
  
  // Mousewheel is used for scrolling and panning (shift)
  let m = mat3.create();
  const onWheel = (e) => {
    const {offsetX, offsetY, deltaX, deltaY, deltaMode, shiftKey} = e;

    const factor = deltaMode ? 10 : 1;
    const speed  = factor * 1.2;
    const [fx, fy] = getPanSpeed();
    
    if (shiftKey) {
      applyTranslation(deltaX * speed, deltaY * speed);
      applyMove(deltaX * speed * fx, deltaY * speed * fy);
    }
    else {
      const [u, v] = getUV(offsetX, offsetY);

      // Get zoom level (logarithmic)
      let log = -deltaY * factor;
      let zoom = 1/Math.pow(2, log / 100);

      applyZoom(u, v, zoom);
    }

    e.preventDefault();
  };

  // Touch controls
  let center = null;
  let radius = null;

  // Track gesture center
  const getCenter = (touches) => {
    let n = touches.length;
    if (!n) return null;

    let x = touches.reduce((x, t) => x + t.clientX, 0) / n;
    let y = touches.reduce((y, t) => y + t.clientY, 0) / n;
    return {x, y};
  };

  // Track gesture radius
  const getRadius = (touches, center) => {
    let n = touches.length;
    if (!n) return null;

    let x2 = touches.reduce((x, t) => x + sqr(t.clientX - center.x), 0);
    let y2 = touches.reduce((y, t) => y + sqr(t.clientY - center.y), 0);
    return Math.sqrt(x2 + y2);
  }

  // On touch add/remove
  const onTouchChange = (e) => {
    if (getPicking()) return;
    if (e.stopPan) return;

    const touches = Array.from(e.targetTouches);

    center = getCenter(touches);
    radius = getRadius(touches, center);
    
    e.preventDefault();
    e.stopPropagation();
  };

  // On touch move
  const onTouchMove = (e) => {
    if (getPicking()) return;
    if (e.stopPan) return;

    const touches = Array.from(e.targetTouches);
    let n = touches.length;

    let c = getCenter(touches);
    let r = getRadius(touches, c);
    
    if (center != null) {
      // Center of mass changed: pan
      if (n >= 1) {
        const [fx, fy] = getPanSpeed();

        const dx = c.x - center.x;
        const dy = c.y - center.y;

        if (dx || dy) {
          applyMove(-dx * fx, -dy * fy);      
          applyTranslation(-dx, -dy);
        }
      }
      // Radius changed: zoom
      if (n >= 2 && radius && r) {
        const dr = radius / r;

        const [u, v] = getUV(center.x, center.y);
        applyZoom(u, v, dr);
      }
    }

    center = c;
    radius = r;
  };

  canvas.addEventListener('mousedown',  onMouse);
  canvas.addEventListener('mousemove',  onMouse);
  canvas.addEventListener('mouseup',    onMouse);
  canvas.addEventListener('mousewheel', onWheel);

  canvas.addEventListener('touchstart', onTouchChange);
  canvas.addEventListener('touchend',   onTouchChange);
  canvas.addEventListener('touchmove',  onTouchMove);
  
}

// Toggle DOM class
const toggleClass = (el, className, v) => el.classList.toggle(className, v);

module.exports = {mountPan};