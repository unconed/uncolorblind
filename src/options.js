const DAT = {
  "closed": false,
  "remembered": {
    "I9 RGB": {
      "0": {
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
      }
    },
    "I9 Protanope": {
      "0": {
        "plate": "assets/ishihara_9.png",
        "vision": "1",
        "rainbow": true,
        "pattern": 1,
        "direction": 1,
        "intensity": 0.6509803921568628,
        "invert": false,
        "background": 0,
        "highlight": 0.2916666666666667,
        "range": 0.45,
        "hardness": 2,
        "exclude": false
      }
    },
    "I11 Monochrome": {
      "0": {
        "plate": "assets/ishihara_11.png",
        "vision": "4",
        "rainbow": true,
        "pattern": 3,
        "direction": 3,
        "intensity": 1,
        "invert": false,
        "background": 0,
        "highlight": 0.2916666666666667,
        "range": 0.59,
        "hardness": 2,
        "exclude": true
      }
    },
    "PAL Tritanope": {
      "0": {
        "plate": "assets/pal.png",
        "vision": "3",
        "rainbow": true,
        "pattern": 1,
        "direction": 1,
        "intensity": 0.5333333333333333,
        "invert": false,
        "background": 0,
        "highlight": 0.6555555555555556,
        "range": 0.47000000000000003,
        "hardness": 2,
        "exclude": false
      }
    },
    "PAL Monochrome": {
      "0": {
        "plate": "assets/pal.png",
        "vision": "4",
        "moving": true,
        "rainbow": true,
        "pattern": 2,
        "direction": 2,
        "intensity": 0.34509803921568627,
        "invert": false,
        "background": 0,
        "highlight": 0.5646722164412061,
        "range": 0.92,
        "hardness": 2,
        "saturation": 0.5,
        "exclude": false
      }
    },
    "COVID-19 FT Monochrome": {
      "0": {
        "plate": "assets/covid19.jpg",
        "vision": "4",
        "active": true,
        "rainbow": true,
        "moving": true,
        "pattern": 1,
        "direction": 3,
        "intensity": 0.6509803921568628,
        "invert": false,
        "background": 0,
        "highlight": 0.2138888888888889,
        "range": 0.21,
        "hardness": 2,
        "saturation": 0.5,
        "exclude": false
      }
    },
    "Monet Deuteranope": {
      "0": {
        "plate": "assets/monet1.jpg",
        "vision": "2",
        "moving": true,
        "rainbow": true,
        "pattern": 1,
        "direction": 1,
        "intensity": 0.6509803921568628,
        "invert": false,
        "background": 0,
        "highlight": 0.33611111111111114,
        "range": 0.59,
        "hardness": 2,
        "saturation": 0.5,
        "exclude": false
      }
    },
    "I23 Protanope": {
      "0": {
        "plate": "assets/ishihara_23.png",
        "vision": "2",
        "moving": true,
        "rainbow": true,
        "pattern": 1,
        "direction": 2,
        "intensity": 1,
        "invert": false,
        "background": 0,
        "highlight": 0.3472222222222222,
        "range": 0.67,
        "hardness": 4.46,
        "saturation": 0.1,
        "exclude": false
      }
    },
    "9 RGB": {
      "0": {
        "plate": "assets/ishihara_9.png",
        "vision": 0,
        "active": true,
        "rainbow": true,
        "moving": true,
        "pattern": 1,
        "direction": 1,
        "intensity": 0.65,
        "invert": false,
        "background": 0,
        "highlight": 0.05291744273915686,
        "range": 0.45,
        "hardness": 2,
        "saturation": 0.5,
        "exclude": false
      }
    }
  },
  "folders": {
    "Scenario": {
      "preset": "Default",
      "closed": true,
      "folders": {}
    },
    "Settings": {
      "preset": "Default",
      "closed": false,
      "folders": {}
    },
    "Custom Filter": {
      "preset": "Default",
      "closed": true,
      "folders": {}
    }
  },
  "preset": "9 RGB"
};

const PLATES = {
  'Ishihara 9':  'assets/ishihara_9.png',
  'Ishihara 11': 'assets/ishihara_11.png',
  'Ishihara 23': 'assets/ishihara_23.png',
  'PAL Test Card': 'assets/pal.png',
  'COVID-19 FT': 'assets/covid19.jpg',
  'Monet': 'assets/monet1.jpg',
};

const MODES = {
  'RGB': 0,
  'Protanopia': 1,
  'Deuteranopia': 2,
  'Tritanopia': 3,
  'Monochrome': 4,
};
  
const PATTERNS = {
  'Barber Pole': 1,
  'Hyper Barber Pole': 2,
  'Polka Dots': 3,
  'Triangular Noise': 4,
};

const DIRECTIONS = {
  '⬆️': 7,
  '↗️': 3,
  '➡️': 4,
  '↘️': 0,
  '⬇️': 6,
  '↙️': 1,
  '⬅️': 5,
  '↖️': 2,
};

const VECTORS = [
  [0.707, -0.707],
  [-0.707, -0.707],
  [-0.707, 0.707],
  [0.707, 0.707],
  [1, 0],
  [-1, 0],
  [0, -1],
  [0, 1],
];

module.exports = {DAT, PLATES, MODES, PATTERNS, DIRECTIONS, VECTORS};
