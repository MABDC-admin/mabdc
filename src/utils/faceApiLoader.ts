import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    console.log('Face-api models loaded');
  })();
  
  return loadingPromise;
}

export async function detectFace(
  videoOrImage: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>> | null> {
  const detection = await faceapi
    .detectSingleFace(videoOrImage, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  
  return detection || null;
}

export function computeDistance(descriptor1: Float32Array | number[], descriptor2: Float32Array | number[]): number {
  return faceapi.euclideanDistance(
    descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1),
    descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2)
  );
}

export function findBestMatch(
  queryDescriptor: Float32Array | number[],
  storedDescriptors: { employeeId: string; descriptor: number[]; name: string; hrmsNo: string }[],
  threshold: number = 0.5
): { employeeId: string; name: string; hrmsNo: string; distance: number } | null {
  let bestMatch: { employeeId: string; name: string; hrmsNo: string; distance: number } | null = null;
  
  for (const stored of storedDescriptors) {
    const distance = computeDistance(queryDescriptor, stored.descriptor);
    
    if (distance < threshold && (!bestMatch || distance < bestMatch.distance)) {
      bestMatch = {
        employeeId: stored.employeeId,
        name: stored.name,
        hrmsNo: stored.hrmsNo,
        distance,
      };
    }
  }
  
  return bestMatch;
}

export { faceapi };
