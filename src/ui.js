const dat = require('dat.gui');
const {lookupColor, describeColor, formatColor, rgbToNormedHue, toLinear, toSRGB} = require('./color');

const {DAT, PLATES, MODES, PATTERNS, DIRECTIONS} = require('./options');
const {mountPan} = require('./pan');

const lerp = (a, b, t) => a * (1 - t) + b * t;

const mountUI = (props, onChangeImage, onChangeRainbow) => {
  
  // Initialize dat.GUI
  let gui = new dat.GUI({ load: DAT, preset: "9 RGB", autoPlace: false });
  document.querySelector('.dat-gui').appendChild(gui.domElement);

  gui.remember(props);
  
  let f1 = gui.addFolder('Scenario');
  f1.add(props, 'plate', PLATES).name('Image').onChange(onChangeImage);
  f1.add(props, 'vision', MODES).name('Vision');
  f1.add(props, 'active').name('Apply Filter');

  let f2 = gui.addFolder('Pattern');
  f2.add(props, 'moving').name('Animate');
  f2.add(props, 'pattern', PATTERNS).name('Pattern');
  f2.add(props, 'direction', DIRECTIONS).name('Direction');
  f2.add(props, 'intensity').min(0).max(1).step(1/100).name('Intensity');
  f2.add(props, 'invert').name('Invert');
  f2.add(props, 'background').min(0).max(1).step(1/100).name('Background Level');

  let f3 = gui.addFolder('Custom Filter');
  f3.add(props, 'highlight').min(0).max(1).step(1/360).name('Hue').listen();
  f3.add(props, 'range').min(0.05).max(1).step(1/100).name('Range');
  f3.add(props, 'hardness').min(1).max(5).step(1/100).name('Hardness');
  f3.add(props, 'saturation').min(1/32.0).max(1).step(1/100).name('Saturation');
  f3.add(props, 'exclude').name('Negative');
  
  gui.add(props, 'openAbout').name('ℹ️ Info');

  onChangeImage();
  onChangeRainbow();

  if (Math.min(window.innerWidth, window.innerHeight) < 768) gui.close();

  // Fix dat-gui sizing
  document.querySelector('.dat-gui').style.display = 'block';
  document.querySelector('.dat-gui .dg.main').style.minWidth = '100%';
  document.querySelector('.dat-gui .close-button').style.minWidth = '100%';
}

const mountScrubber = (getUV, getBarUV, pickUV, setHover, setColor, setHue) => {

  const tooltip = document.querySelector('.tooltip');
  const canvas = document.querySelector('canvas');

  const onTouch = (e) => {
    const {changedTouches} = e;
    const {clientX, clientY} = changedTouches[0];
    onDown(clientX, clientY);
    e.preventDefault();
  }
  
  const onTouchStart = (e) => onTouch(e);
  const onTouchMove = (e) => onTouch(e);
  
  const onMouseMove = (e) => {
    let {clientX, clientY} = e;
    return onHover(clientX, clientY);
  }
  
  const onMouseDown = (e) => {
    let {clientX, clientY} = e;
    return onDown(clientX, clientY);
  }
  
  const onHover = (clientX, clientY) => {
    {
      // Scrub on bar
      const [u, v] = getBarUV(clientX, clientY);
      const h = (((u - .5) * 1.1 + .5) + 2) % 1;
      const hover = (v > 0.0 && v < 1.0) ? h : null;
      setHover(hover);
    }

    const [u, v] = getUV(clientX, clientY);

    // Move tooltip beside cursor
    const bump = u > .5 ? -10 : 10;
    tooltip.style.left = `${clientX + bump}px`;
    tooltip.style.top  = `${clientY}px`;
  
    // Luminosity for text contrast
    const [r, g, b, a] = pickUV(u, v);
    const lum = Math.sqrt(toLinear(r) * 0.212 + toLinear(g) * 0.615 + toLinear(b) * 0.173);

    // If opaque
    let html = '';
    if (a > 0.2) {
      const float = [r, g, b, a];
      const simple = describeColor(float);
      const color  = lookupColor(float);
      const css    = formatColor(float);

      if (color) {
        const light = lum > .6;
        const blend = x => toSRGB(lerp(toLinear(x), light, .75));
        const tint = formatColor([blend(r), blend(g), blend(b), 1]);

        html = `
        ${color.name}<br />
        <small><em>${simple}</small></em><br />
        <code>${css}</code>`;
        tooltip.style.background = `rgb(${r*255},${g*255},${b*255})`;
        tooltip.style.color = light ? '#000' : '#fff';
        tooltip.style.textShadow = light ? null : `0 1px 2px ${tint}, 0 2px 5px ${tint}`;
                
        const flipX = u > .5 ? '-100%' : '0';
        const flipY = v > .5 ? '-100%' : '0';
        tooltip.style.transform = `translate(${flipX}, ${flipY})`;
      }
    }
    if (tooltip.innerHTML !== html) tooltip.innerHTML = html;
    tooltip.style.display = html != '' ? 'block' : 'none';
  };
  
  const onDown = (clientX, clientY) => {
    const [u, v] = getUV(clientX, clientY);
    const float = pickUV(u, v);
    const [r, g, b, a] = float;

    if (a > 0.2) {
      const h = rgbToNormedHue(float);
      setColor(float);
      setHue(h);
    }
  };

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  canvas.addEventListener('touchstart', onTouchStart);
  canvas.addEventListener('touchmove', onTouchMove);

}

module.exports = {mountUI, mountScrubber, mountPan};