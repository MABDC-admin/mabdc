import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceImage = path.join(__dirname, 'public', 'app-icon.jpg');

const mipmapSizes = { 'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192 };

const splashSizes = {
  'land-mdpi': { width: 480, height: 320 },
  'land-hdpi': { width: 800, height: 480 },
  'land-xhdpi': { width: 1280, height: 720 },
  'land-xxhdpi': { width: 1600, height: 960 },
  'land-xxxhdpi': { width: 1920, height: 1280 },
  'port-mdpi': { width: 320, height: 480 },
  'port-hdpi': { width: 480, height: 800 },
  'port-xhdpi': { width: 720, height: 1280 },
  'port-xxhdpi': { width: 960, height: 1600 },
  'port-xxxhdpi': { width: 1280, height: 1920 }
};

const androidApps = ['android-admin', 'android-employee', 'android-kiosk'];

async function generateIcons() {
  console.log('Generating app icons...');

  for (const app of androidApps) {
    console.log(Processing + app + ...);
    const resPath = path.join(__dirname, app, 'app', 'src', 'main', 'res');

    for (const [density, size] of Object.entries(mipmapSizes)) {
      const mipmapDir = path.join(resPath, mipmap-+ density);
      
      if (!fs.existsSync(mipmapDir)) {
        fs.mkdirSync(mipmapDir, { recursive: true });
      }

      await sharp(sourceImage).resize(size, size, { fit: 'cover' }).png().toFile(path.join(mipmapDir, 'ic_launcher.png'));
      await sharp(sourceImage).resize(size, size, { fit: 'cover' }).png().toFile(path.join(mipmapDir, 'ic_launcher_round.png'));
      await sharp(sourceImage).resize(size, size, { fit: 'cover' }).png().toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));

      console.log(  Generated mipmap-+ density +  icons ( + size + x + size + ));
    }

    for (const [orientation, dimensions] of Object.entries(splashSizes)) {
      const drawableDir = path.join(resPath, drawable-+ orientation);
      
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }

      await sharp(sourceImage).resize(dimensions.width, dimensions.height, { fit: 'contain', background: { r: 255, g: 255, b: 255 } }).png().toFile(path.join(drawableDir, 'splash.png'));

      console.log(  Generated drawable-+ orientation +  splash ( + dimensions.width + x + dimensions.height + ));
    }
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
