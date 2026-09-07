export type CropQualityLabel = 'GOOD' | 'FAIR' | 'POOR';

export interface CropQualityResult {
  label: CropQualityLabel;
  score: number;
  issues: string[];
  recommendedAction: string;
  storageSuggestion: string;
  analysisNote: string;
}

interface ImageMetrics {
  averageBrightness: number;
  averageSaturation: number;
  darkPixelRatio: number;
  lightPixelRatio: number;
  colorVariation: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read. Please try another photo.'));
    };
    image.src = url;
  });
}

function readMetrics(image: HTMLImageElement): ImageMetrics {
  const canvas = document.createElement('canvas');
  const size = 160;
  const scale = Math.min(size / image.width, size / image.height, 1);
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) throw new Error('Image analysis is not available in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let brightness = 0;
  let saturation = 0;
  let darkPixels = 0;
  let lightPixels = 0;
  let colorVariation = 0;
  const sampleCount = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i] / 255;
    const green = pixels[i + 1] / 255;
    const blue = pixels[i + 2] / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const pixelBrightness = (red + green + blue) / 3;
    brightness += pixelBrightness;
    saturation += max === 0 ? 0 : (max - min) / max;
    if (pixelBrightness < 0.16) darkPixels++;
    if (pixelBrightness > 0.96) lightPixels++;
    colorVariation += max - min;
  }

  return {
    averageBrightness: brightness / sampleCount,
    averageSaturation: saturation / sampleCount,
    darkPixelRatio: darkPixels / sampleCount,
    lightPixelRatio: lightPixels / sampleCount,
    colorVariation: colorVariation / sampleCount,
  };
}

export async function analyzeCropImage(file: File): Promise<CropQualityResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file for crop quality assessment.');
  }

  const image = await loadImage(file);
  const metrics = readMetrics(image);
  let score = 86;
  const issues: string[] = [];

  if (metrics.averageBrightness < 0.25 || metrics.darkPixelRatio > 0.28) {
    score -= 18;
    issues.push('The photo is quite dark; surface details may be hidden.');
  } else if (metrics.averageBrightness > 0.88 || metrics.lightPixelRatio > 0.38) {
    score -= 12;
    issues.push('Bright or reflective areas make some details hard to assess.');
  }

  if (metrics.colorVariation > 0.5 && metrics.darkPixelRatio > 0.12) {
    score -= 16;
    issues.push('Uneven colour patches are visible and may need a closer inspection.');
  }

  if (metrics.averageSaturation < 0.12) {
    score -= 10;
    issues.push('The produce looks pale or the image has low colour contrast.');
  }

  score = Math.max(35, Math.min(96, score));
  const label: CropQualityLabel = score >= 75 ? 'GOOD' : score >= 55 ? 'FAIR' : 'POOR';

  if (issues.length === 0) {
    issues.push('No obvious visual damage was detected in this photo.');
  }

  return {
    label,
    score,
    issues,
    recommendedAction:
      label === 'GOOD'
        ? 'Keep the best produce together and remove any damaged pieces before packing.'
        : label === 'FAIR'
          ? 'Separate marked pieces, take a closer photo in daylight, and inspect before selling.'
          : 'Separate affected produce immediately and ask a local agriculture officer for an in-person assessment.',
    storageSuggestion:
      label === 'GOOD'
        ? 'Store in a cool, dry, well-ventilated place away from direct sunlight.'
        : 'Keep this batch dry and ventilated, avoid stacking tightly, and do not store it with healthy produce.',
    analysisNote:
      'This is an AI-assisted visual quality estimate based on the uploaded image. It is not a scientific plant-disease diagnosis.',
  };
}