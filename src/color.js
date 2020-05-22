const {COLORS} = require('./dataset');

const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const lerp = (a, b, t) => a * (1 - t) + b * t;
const sat = (x) => clamp(x, 0, 1);

const toSRGB = (x) => Math.pow(x, 1/2.2);
const toLinear = (x) => Math.pow(x, 2.2);

const GRAYS = [
  ['Black', 0],
  ['Dark Gray',  .1],
  ['Light Gray', .9],
  ['White', 1],
];

const HUES = [
  ['Red', 0],
  ['Orange', 0.02],
  ['Yellow', 0.12],
  ['Green', 0.23],
  ['Blue', 0.441],
  ['Indigo', 0.629],
  ['Violet', 0.68],
  ['Pink', 0.805],
  ['Red', 0.95],
];

const SATS = [
  ['Muted', 0],
  ['', 0.7],
  ['Vibrant', 1],
];

const LUMS = [
  ['Dark', 0],
  ['', 0.35],
  ['Pastel', 1],
];

// Color Map acceleration structure (3D brick map with 3x3x3 coverage)
let ColorMap = () => {
  let buckets = new Map();
  const indexOf = ([r, g, b], f) => f(r >> 6, g >> 6, b >> 6);
  const keyOf   = (i, j, k) => [i, j, k].join('/');

  const sqr = (x) => x * x;
  const distance2 = (a, b) => sqr(a[0] - b[0]) + sqr(a[1] - b[1]) + sqr(a[2] - b[2]);

  const add = (color) => {
    const {uint8} = color;
    indexOf(uint8, (i, j, k) => {
      for (let ii = Math.max(0, i - 1); ii < Math.min(15, i + 1); ii++) {
        for (let jj = Math.max(0, j - 1); jj < Math.min(15, j + 1); jj++) {
          for (let kk = Math.max(0, k - 1); kk < Math.min(15, k + 1); kk++) {
            const key = keyOf(ii, jj, kk);
            let bucket = buckets.get(key);
            if (!bucket) buckets.set(key, bucket = []);
            bucket.push(color);
          }
        }
      }
    });
  };
  
  const find = (float) => {
    const [r, g, b] = float;
    const uint8 = [r * 255, g * 255, b * 255];

    let best = null;
    indexOf(uint8, (i, j, k) => {
      const key = keyOf(i, j, k);
      const bucket = buckets.get(key);
      if (bucket) {
        best = findMin(bucket, (color) => distance2(float, color.float));
      }
    });
    
    return best;
  }

  const clear = () => buckets = new Map();
  const debug = () => buckets.entries();
  
  return {add, find, clear, debug};
}

// Find minimum in list using scoring function
const findMin = (list, f) => {
  let best = null;
  let min = Infinity;
  for (let x of list) {
    const d = f(x);
    if (d < min) {
      min = d;
      best = x;
    }
  }
  return best;
};

// Lookup nearest color in map
const lookupColor = (() => {
  let map = ColorMap();
  COLORS.forEach(map.add);
  return map.find;
})();

// Describe a color in natural terms (e.g. light vibrant indigo)
const describeColor = ((float) => {
  const [r, g, b] = float;
  const [h, s, l] = rgbToHSL([toLinear(r), toLinear(g), toLinear(b)]);

  let [ng] = findMin(GRAYS, ([n, gry]) => Math.abs(gry - l));
  let [nh] = findMin(HUES,  ([n, hue]) => hue > h ? Infinity : h - hue);
  let [ns] = findMin(SATS,  ([n, sat]) => Math.abs(sat - s));
  let [nl] = findMin(LUMS,  ([n, lum]) => Math.abs(lum - l));

  if (ns == 'Vibrant' && l > 0.8) ns = '';
  if (nl == 'Dark' && nh == 'Orange') { nl = ''; nh = 'Brown'; }
  if (nl == 'Pastel' && ns == '') { [nl, ns] = ['Light', nl]; }
  if (nl == 'Pastel' && ns == 'Vibrant') { [nl, ns] = ['', nl]; }
  if (nl == 'Pastel' && ns == 'Muted') { [nl, ns] = [ns, nl]; }

  if (s < 0.1) return ng;
  return [nl, ns, nh].filter(x => x != '').join(' ');
});

// Match GLSL 1-to-1 to do virtual picking
const testPattern = (u, v) => {
  let y1 = v * 2.5;
  let y3 = (y1 - 2.0) * 2.0;
  if (y1 > 2.0) y1 = (2.5 - y1) * 4.0;
  let y2 = y1 - 1.0;

  let hue = (u - .5) * 1.1 + .5;

  let r = 0;
  let g = 0;
  let b = 0;

  if (y1 >= 0.0 && y1 < 1.0) {
    y1 = y1*y1*lerp(1, y2, 0.1);
    r = hueToRGB(0.0, y1, hue + 0.333);
    g = hueToRGB(0.0, y1, hue);
    b = hueToRGB(0.0, y1, hue - 0.333);
  }
  else if (y2 >= 0.0 && y2 < 1.0) {
    y2 = y2*y2*lerp(1, y2, 0.1);
    r = hueToRGB(y2, 1.0, hue + 0.333);
    g = hueToRGB(y2, 1.0, hue);
    b = hueToRGB(y2, 1.0, hue - 0.333);
  }

  if (y3 >= 0.0 && y3 < 1.0) {
    let f = sat(Math.cos(hue * 3.14159 * 24.0) * -.2 + .9);
    r = lerp(r, 1.0 - y3, f);
    g = lerp(g, 1.0 - y3, f);
    b = lerp(b, 1.0 - y3, f);
  }

  return [toSRGB(r), toSRGB(g), toSRGB(b)];
}

// Convert Hue to RGB tint
const hueToRGB = (f1, f2, hue) => {
  if (hue < 0.0) hue += 1.0;
  else if (hue > 1.0) hue -= 1.0;

  if ((6.0 * hue) < 1.0) return f1 + (f2 - f1) * 6.0 * hue;
  else if ((2.0 * hue) < 1.0) return f2;
  else if ((3.0 * hue) < 2.0) return f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
  else return f1;
}

// Convert RGB to HSL
const rgbToHSL = ([r, g, b]) => {
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min){
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h, s, l];
}

const rgbToNormedHue = ([r, g, b]) => rgbToHSL([toLinear(r), toLinear(g), toLinear(b)])[0];

module.exports = {lookupColor, describeColor, testPattern, rgbToNormedHue};