const fs = require('fs');
const path = require('path');

function createSVG(emoji, bg1, bg2, size = 400) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="r" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.3)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <rect width="${size}" height="${size}" fill="url(#r)"/>
  <circle cx="${size/2}" cy="${size*0.38}" r="${size*0.22}" fill="rgba(255,255,255,0.15)"/>
  <circle cx="${size/2}" cy="${size*0.38}" r="${size*0.15}" fill="rgba(255,255,255,0.2)"/>
  <text x="50%" y="40%" text-anchor="middle" dy=".35em" font-family="Arial,sans-serif" font-size="${Math.floor(size / 4)}">${emoji}</text>
  <rect x="${size*0.15}" y="${size*0.7}" width="${size*0.7}" height="${size*0.06}" rx="${size*0.03}" fill="rgba(255,255,255,0.2)"/>
  <rect x="${size*0.25}" y="${size*0.8}" width="${size*0.5}" height="${size*0.04}" rx="${size*0.02}" fill="rgba(255,255,255,0.12)"/>
</svg>`;
}

const dir = path.join(__dirname, 'public', 'images');

const images = {
  'amor-mascot.jpg': ['💖', '#ff2e6c', '#c41e5a'],
  'char-luna.jpg': ['🌙', '#ffc830', '#e8a010'],
  'char-blaze.jpg': ['🔥', '#9061f9', '#6b3fd9'],
  'char-nova.jpg': ['⭐', '#3e8bff', '#1a6bdd'],
  'char-aura.jpg': ['🌿', '#1df0b8', '#10c898'],
};

for (const [name, [emoji, c1, c2]] of Object.entries(images)) {
  fs.writeFileSync(path.join(dir, name), createSVG(emoji, c1, c2));
  console.log('Created:', name);
}

const noiseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch"/></filter>
  <rect width="100%" height="100%" filter="url(#n)" opacity="0.4"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, 'public', 'noise.png'), noiseSvg);
console.log('Created: noise.png');
console.log('All placeholders created.');
