
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const convertImageToWebp = async (inputPath, outputPath) => {
  try {
    await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
    console.log(`Converted: ${inputPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error);
  }
};

const processDirectory = async (directoryPath) => {
  try {
    const files = await fs.readdir(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await processDirectory(filePath); // 재귀적으로 하위 디렉토리 처리
      } else if (stat.isFile() && file.endsWith('.png')) {
        const outputFileName = file.replace('.png', '.webp');
        const outputPath = path.join(directoryPath, outputFileName);
        await convertImageToWebp(filePath, outputPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directoryPath}:`, error);
  }
};

const main = async () => {
  const assetsPath = path.resolve(process.cwd(), 'assets');
  const publicAssetsPath = path.resolve(process.cwd(), 'public', 'assets');

  console.log('Starting image conversion to WebP...');

  await processDirectory(assetsPath);
  await processDirectory(publicAssetsPath);

  console.log('Image conversion to WebP finished.');
};

main();

