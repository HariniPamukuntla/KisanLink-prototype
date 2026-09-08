import type { CropQualityInput, CropQualityResult } from '../types';

export interface CropQualityAssessmentRequest extends CropQualityInput {
  images: File[];
}

export class CropQualityServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CropQualityServiceError';
  }
}

interface EncodedImage {
  data: string;
  mimeType: string;
}

function encodeImage(file: File): Promise<EncodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new CropQualityServiceError('This image could not be prepared for assessment.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      resolve({ data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new CropQualityServiceError('One of the selected images could not be read.'));
    };
    image.src = url;
  });
}

export async function assessCropQuality(input: CropQualityAssessmentRequest): Promise<CropQualityResult> {
  const images = await Promise.all(input.images.map(encodeImage));
  let response: Response;
  try {
    response = await fetch('/api/quality/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cropName: input.cropName,
        variety: input.variety,
        harvestDate: input.harvestDate,
        quantityQuintals: input.quantityQuintals,
        storageCondition: input.storageCondition,
        storageLocation: input.storageLocation,
        handlingNotes: input.handlingNotes,
        images,
      }),
    });
  } catch {
    throw new CropQualityServiceError('The quality assessment service could not be reached.');
  }

  const payload = await response.json().catch(() => null) as { error?: unknown } | CropQualityResult | null;
  if (!response.ok) {
    throw new CropQualityServiceError(
      payload && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Quality assessment is unavailable right now. Please try again.'
    );
  }

  if (
    !payload ||
    typeof (payload as CropQualityResult).grade !== 'string' ||
    !['A', 'B', 'C'].includes((payload as CropQualityResult).grade)
  ) {
    throw new CropQualityServiceError('The quality service returned an incomplete assessment.');
  }
  return payload as CropQualityResult;
}