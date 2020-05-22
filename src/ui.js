const dat = require('dat.gui');
const {lookupColor, describeColor, rgbToNormedHue} = require('./color');

const {DAT, PLATES, MODES, PATTERNS, DIRECTIONS} = require('./options');

const mountUI = (props, onChangeImage) => {
  let gui = new dat.GUI({ load: DAT, preset: "9 RGB" });

  gui.remember(props);
  
  let f1 = gui.addFolder('Scenario');
  f1.add(props, 'plate', PLATES).name('Image').onChange(onChangeImage);
  f1.add(props, 'vision', MODES).name('Vision');
  f1.add(props, 'active').name('Apply Filter');
  f1.add(props, 'rainbow').name('Show Rainbow Map');

  let f2 = gui.addFolder('Settings');
  f2.add(props, 'moving').name('Animate');
  f2.add(props, 'pattern', PATTERNS).name('Pattern');
  f2.add(props, 'direction', DIRECTIONS).name('Direction');
  f2.add(props, 'intensity').min(0).max(1).step(1/255).name('Intensity');
  f2.add(props, 'invert').name('Invert');
  f2.add(props, 'background').min(0).max(1).step(1/255).name('Background Level');

  let f3 = gui.addFolder('Custom Filter');
  f3.add(props, 'highlight').min(0).max(1).step(1/360).name('Hue').listen();
  f3.add(props, 'range').min(0.05).max(1).step(1/100).name('Range');
  f3.add(props, 'hardness').min(1).max(5).step(1/100).name('Hardness');
  f3.add(props, 'saturation').min(1/32.0).max(1).step(1/100).name('Saturation');
  f3.add(props, 'exclude').name('Negative');

  gui.add(props, 'loadFile').name('Load Image…');
  gui.add(props, 'openHelp').name('About');

  f2.open();
}

const mountScrubber = (getUV, getBarUV, pickUV, setHover, setClick) => {

  const tooltip = document.querySelector('.tooltip');
  const canvas = document.querySelector('canvas');
  
  canvas.addEventListener('mousemove', (e) => {
    {
      // Scrub on bar
      const [u, v] = getBarUV(e);
      const h = (((u - .5) * 1.1 + .5) + 2) % 1;
      const hover = (v > 0.0 && v < 1.0) ? h : null;
      setHover(hover);
    }

    const [u, v] = getUV(e);

    // Move tooltip beside cursor
    const bump = u > .5 ? -10 : 10;
    tooltip.style.left = `${e.clientX + bump}px`;
    tooltip.style.top  = `${e.clientY}px`;
  
    // Luminosity for text contrast
    const [r, g, b, a] = pickUV(u, v);
    const lum = Math.sqrt(r*r * 0.212 + g*g * 0.715 + b*b * 0.073);

    // If opaque
    let html = '';
    if (a > 0.2) {
      const float = [r, g, b];
      const simple = describeColor(float);
      const color  = lookupColor(float);

      if (color) {
        html = "<span>" + color.name + "<br /><small><em>" + simple + "</small></em></span>";
        tooltip.style.background = `rgb(${r*255},${g*255},${b*255})`;
        tooltip.style.color = lum > .65 ? '#000' : '#fff';

        const flipX = u > .5 ? '-100%' : '0';
        const flipY = v > .5 ? '-100%' : '0';
        tooltip.style.transform = `translate(${flipX}, ${flipY})`;
      }
    }
    if (tooltip.innerHTML !== html) tooltip.innerHTML = html;
    tooltip.style.display = html != '' ? 'block' : 'none';
  });

  canvas.addEventListener('mousedown', (e) => {
    const [u, v] = getUV(e);
    const [r, g, b, a] = pickUV(u, v);

    if (a > 0.2) {
      const h = rgbToNormedHue([r, g, b]);
      setClick(h);
    }
  });

}

module.exports = {mountUI, mountScrubber};