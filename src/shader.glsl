precision mediump float;

#defs

#define COLOR_BLINDNESS
#define TEST_PATTERN
#define BACKGROUND_GRID

#ifdef VERTEX
uniform mat3 projection;
uniform mat3 view;

attribute vec2 position;
attribute vec2 uv;

varying vec2 vUV;
varying vec2 vUVImage;

void main() {
  vUV = uv;
  vUVImage = (view * projection * vec3(uv, 1.0)).xy;
  gl_Position = vec4(position, 0.0, 1.0);
}

#endif

#ifdef FRAGMENT

// Scale for grid
float GRID = 10.0;
float LEVEL = 0.1;

// Scale for dither patterns
float BARBER_STRIPES = 16.0;
float HYPER_NON_LINEAR = 2.0;
float HYPER_SCALE = 16.0;
float POLKA_DOTS = 16.0;

////////////////////////////////////////////////
// Context

// Source texture
uniform sampler2D texture;

// Time in seconds
uniform float time;

// Device pixel ratio and inverse
uniform float dpr;
uniform float idpr;

////////////////////////////////////////////////
// Dithering

// Dithering pattern to apply (0...n)
uniform float pattern;

// Dithering direction
uniform vec2 direction;

// Dither intensity (0...1)
uniform float intensity;

// Invert dither (0/1)
uniform float invert;

// Hue to center highlight on (0...1)
uniform float highlight;

// Invert hue mask (0/1)
uniform float exclude;

// Highlight hue range (0...0.5) and inverse
uniform float range;
uniform float irange;

// Highlight ramp hardness (1..n)
uniform float hardness;

// Minimum saturation (0...1)
uniform float saturation;

// 2D pattern offset in pixels, use to anchor pattern to screen when panning
uniform vec2 offset;

#ifdef BACKGROUND_GRID
// Background level (grayscale)
uniform float background;

// Grid size in UV
uniform vec2 grid;
#endif

#ifdef TEST_PATTERN
// Show rainbow test pattern (0/1)
uniform float rainbow;
uniform vec2 pixel;

// Y-layout for bottom bar, [y, bar height]
uniform vec2 bar;
#endif

#ifdef COLOR_BLINDNESS
// Apply color filter (0/1)
uniform float filter;

// 3x3 RGB matrix
uniform mat3 vision;
#endif

varying vec2 vUV;
varying vec2 vUVImage;

////////////////////////////////////////////////////////////
// Linear to SRGB conversion

//vec3 toLinear(vec3 rgb) { rgb = max(vec3(0.0), rgb); return pow(rgb, vec3(2.2)); }
//vec3 toSRGB(vec3 rgb)   { rgb = max(vec3(0.0), rgb); return pow(rgb, vec3(1.0/2.2)); }

vec3 toLinear(vec3 rgb) {
	return mix(
    pow(rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)),
    rgb * 0.0773993808,
    vec3(lessThanEqual(rgb, vec3(0.04045))));
}

vec3 toSRGB(vec3 rgb) {
	return mix(
    pow(rgb, vec3(0.41666)) * 1.055 - vec3(0.055),
    rgb * 12.92,
    vec3(lessThanEqual(rgb, vec3(0.0031308))));
}

////////////////////////////////////////////////////////////
// HSV <-> RGB

float hueToRGB(float f1, float f2, float hue) {
  if (hue < 0.0) hue += 1.0;
  else if (hue > 1.0) hue -= 1.0;

  if ((6.0 * hue) < 1.0) return f1 + (f2 - f1) * 6.0 * hue;
  else if ((2.0 * hue) < 1.0) return f2;
  else if ((3.0 * hue) < 2.0) return f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
  else return f1;
}

vec3 rgb2HSV(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

////////////////////////////////////////////////////////////
// Noise, Distributions & Shaping

// Shitty random
float nrand(vec2 n) { return fract(sin(dot(n.xy, vec2(12.9893, 11.2331))) * 43758.5453); }

// Saturate
float sat(float x) { return clamp(x, 0.0, 1.0); }

// Hard band
float band(float x) { return x < 0.5 ? 1.0 : -1.0; }

// Anti-aliased bands
float smoothband(float x, float s, float is, float t) {
  float bands = 1.0 - 2.0 * abs(fract(x * is) - 0.5);
  float edges = sat((bands - 0.5) * s * t * 0.5 + 0.5);
  return edges;
}

// Anti-aliased polka dots
float smoothpolka(vec2 xy, float s, float is, float t) {
  vec2 bands = 1.0 - 2.0 * abs(fract(xy * is) - 0.5);
  float edges = 1.0 - sat((length(bands) - 0.75) * s * t * 0.5 + 0.5);
  return edges;
}

// Triangular noise
float triangular(vec2 xy) {
	float t = fract(time * 0.1);
	float rnd = nrand(xy * 0.0171 + 0.07*t);

  // Convert uniform distribution into triangle-shaped distribution.
  rnd = fract(rnd + 0.5);
  float orig = rnd * 2.0 - 1.0;
  rnd = (orig == 0.0) ? -1.0 : (orig * inversesqrt(abs(orig)));
  rnd = rnd - sign(orig);

  return rnd;
}

vec2 rot45(vec2 xy) { return vec2(xy.x + xy.y, xy.x - xy.y) * .707; }

////////////////////////////////////////////////////////////
// Color Dithering

float sqr(float x) { return x*x; }

vec2 pixelGrid() {
  #ifdef TEST_PATTERN
  if (vUV.y <= bar.x) 
  #endif
  return gl_FragCoord.xy + offset;
  return gl_FragCoord.xy;
} 

float ditherTriangularNoise() {
  return triangular(pixelGrid()) * 4.0;
}

float ditherBarberPole() {
  return smoothband(
    idpr * (dot(pixelGrid(), direction) - time * BARBER_STRIPES),
    BARBER_STRIPES,
    1.0/BARBER_STRIPES,
    dpr
  ) * 2.0 - 1.0;
}

float ditherHyperBarberPole(vec3 hsv) {
  // Find distance to beginning of range
  float modulate = sqr(sat(hsv.y));
  float diff = hsv.x - highlight + range;
  if (diff < 0.0) diff += 1.0;
  if (diff > 1.0) diff -= 1.0;

  // Make chirplet on hue axis, modulated by saturation
  float s = sqr(1.0 + diff * modulate * HYPER_NON_LINEAR * irange) / HYPER_SCALE;

  return smoothband(
    idpr * (dot(pixelGrid(), direction) * s - time * BARBER_STRIPES),
    BARBER_STRIPES,
    1.0/BARBER_STRIPES,
    dpr/s
  ) * 2.0 - 1.0;
}

float ditherPolkaDots() {
  return smoothpolka(idpr * rot45(pixelGrid() - direction * time * POLKA_DOTS), POLKA_DOTS, 1.0/POLKA_DOTS, dpr) * 2.0 - 1.0;
}

vec3 applyDither(vec3 rgb, vec3 hsv, float dither) {
  
  // Modulate by HSV Value
  float luminance = hsv.z * sqr(sat(hsv.y * saturation));

  // Modulate by hue
  float h = abs(hsv.x - highlight);
  if (h > 0.5) h = 1.0 - h;
  float select = sat((range - h) * hardness);

  // Invert selection mask
  if (exclude > 0.5) select = 1.0 - select;

  // Apply dithered pattern with muted color tint
  vec3 tint = (1.0 + rgb) * 0.5;
  vec3 dithered = rgb + tint * (invert * dither * (select * select) * luminance * intensity);

  return dithered;
}

#ifdef BACKGROUND_GRID
// Background grayscale pattern
float gridPattern(vec2 uv) {
  vec2 uvGrid = fract(uv * grid * GRID);
  return mix(background, band(uvGrid.x) * band(uvGrid.y) * 0.5 + 0.5, LEVEL);
}
#endif

#ifdef TEST_PATTERN
// Rainbow test pattern / UI scale
vec4 testPattern(vec4 sample, vec2 uv) {
  float y1 = uv.y * 2.5;
  float y3 = (y1 - 2.0) * 2.0;
  if (y1 > 2.0) y1 = (2.5 - y1) * 4.0;
  float y2 = y1 - 1.0;
  
  float hue = (uv.x - .5) * 1.1 + .5;

  float fill = 0.0;

  if (y1 >= 0.0 && y1 < 1.0) {
    y1 = y1*mix(y1, y1*y1, 0.1);
    sample.r = hueToRGB(0.0, y1, hue + 0.333);
    sample.g = hueToRGB(0.0, y1, hue);
    sample.b = hueToRGB(0.0, y1, hue - 0.333);
    sample.a = 1.0;
    fill = 1.0;
  }
  else if (y2 >= 0.0 && y2 < 1.0) {
    y2 = y2*mix(y2, y2*y2, 0.1);
    sample.r = hueToRGB(y2, 1.0, hue + 0.333);
    sample.g = hueToRGB(y2, 1.0, hue);
    sample.b = hueToRGB(y2, 1.0, hue - 0.333);
    sample.a = 1.0;
    fill = 1.0;
  }
  if (y3 >= 0.0 && y3 < 1.0) {
    sample.rgb = toLinear(sample.rgb);
    sample.rgb = mix(sample.rgb, vec3(1.0 - y3), sat(cos(hue * 3.14159 * 24.0) * -.2 + .85));
  }
  
  if (fill > 0.5) {
    // Mark primary and secondary colors
    float hueNotch = abs(fract(hue * 6.0 - 0.5) - 0.5);
    float y4 = uv.y;
    if (y4 > 0.0 && y4 < 0.8 && hueNotch < pixel.x * 6.0) {
      sample.rgb = mix(sample.rgb, vec3(1.0), 0.1); 
    }
    else if (y4 > 0.0 && y4 < 0.8 && hueNotch < pixel.x * 12.0) {
      sample.rgb = mix(sample.rgb, vec3(0.0), 0.1); 
    }
    sample.rgb = toSRGB(sample.rgb);
  }

  return sample;
}
#endif

////////////////////////////////////////////////////////////

bool notInBounds(vec2 uv) { return uv.y < 0.0 || uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0; }
vec4 sampleWithBorder(sampler2D texture, vec2 uv, vec4 border) {
  if (notInBounds(uv)) return border;
  return texture2D(texture, uv);
}

void main() {

  // Sample texture
  vec4 sample = sampleWithBorder(texture, vUVImage, vec4(0, 0, 0, 0));

  #ifdef TEST_PATTERN
  // Draw rainbow test pattern on top
  if (rainbow > 0.0) sample = testPattern(sample, vec2(vUV.x, 1.0 - (vUV.y - bar.x) * bar.y));
  #endif

  // Input color
  vec3 rgb = toLinear(sample.rgb);
  vec3 hsv = rgb2HSV(rgb);

  // Dither color with pattern
  if      (pattern > 3.5) rgb = applyDither(rgb, hsv, ditherTriangularNoise());
  else if (pattern > 2.5) rgb = applyDither(rgb, hsv, ditherPolkaDots());
  else if (pattern > 1.5) rgb = applyDither(rgb, hsv, ditherHyperBarberPole(hsv));
  else if (pattern > 0.5) rgb = applyDither(rgb, hsv, ditherBarberPole());

  // Color-blindness simulator
  #ifdef COLOR_BLINDNESS
  if (filter > 0.5) rgb = vision * rgb;
  #endif

  // Prepare background
  vec3 dest = vec3(0.0);
  #ifdef BACKGROUND_GRID
  float grid = gridPattern(vUV);
  dest = toLinear(vec3(grid));
  #endif

  // Pre-multiplied alpha blend in linear RGB
  gl_FragColor = vec4(toSRGB(
    vec3(dest * (1.0 - sample.a)) +
    rgb
  ), 1.0);
}
#endif
