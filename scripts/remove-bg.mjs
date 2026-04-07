import Jimp from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.resolve(__dirname, '../app/assets/tab-icons');
const TOLERANCE = 60; // color distance threshold (0-255); raise if background bleeds through

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

async function removeBackground(filePath) {
  const img = await Jimp.read(filePath);
  const { width, height } = img.bitmap;

  // Sample background color from the four corners (average)
  const corners = [
    img.getPixelColor(0, 0),
    img.getPixelColor(width - 1, 0),
    img.getPixelColor(0, height - 1),
    img.getPixelColor(width - 1, height - 1),
  ].map(c => Jimp.intToRGBA(c));

  const bgR = Math.round(corners.reduce((s, c) => s + c.r, 0) / 4);
  const bgG = Math.round(corners.reduce((s, c) => s + c.g, 0) / 4);
  const bgB = Math.round(corners.reduce((s, c) => s + c.b, 0) / 4);

  console.log(`  Background sample: rgb(${bgR},${bgG},${bgB})`);

  // BFS flood fill from all four corners
  const visited = new Uint8Array(width * height);
  const queue = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  queue.forEach(([x, y]) => { visited[y * width + x] = 1; });

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const hex = img.getPixelColor(x, y);
    const { r, g, b } = Jimp.intToRGBA(hex);

    if (colorDistance(r, g, b, bgR, bgG, bgB) > TOLERANCE) continue;

    img.setPixelColor(Jimp.rgbaToInt(r, g, b, 0), x, y);

    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny * width + nx]) {
        visited[ny * width + nx] = 1;
        queue.push([nx, ny]);
      }
    }
  }

  await img.writeAsync(filePath);
}

const files = readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));

for (const file of files) {
  const fullPath = path.join(ICONS_DIR, file);
  process.stdout.write(`Processing ${file}...`);
  try {
    await removeBackground(fullPath);
    console.log(' done');
  } catch (err) {
    console.error(` FAILED: ${err.message}`);
  }
}

console.log('\nAll done. Verify the icons have transparent backgrounds.');
