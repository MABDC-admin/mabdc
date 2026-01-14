import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = path.join(__dirname, 'public', 'app-icon.jpg');

const webIconSizes = [192, 512];

async function generateWebIcons() {
  console.log('Generating web app icons...');

  for (const size of webIconSizes) {
    await sharp(sourceImage)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(__dirname, 'public', 'icons', `icon-${size}x${size}.png`));
    
    console.log(`  Generated icon-${size}x${size}.png`);
  }

  // Generate favicon
  await sharp(sourceImage)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(__dirname, 'public', 'favicon.png'));
  
  console.log('  Generated favicon.png');
  
  console.log('\n✓ Web icons generated successfully!');
}

generateWebIcons().catch(console.error);
