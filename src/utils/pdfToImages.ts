import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set up the worker - using legacy build for compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

export interface PdfPageImages {
  page1: Blob;
  page2?: Blob;
  totalPages: number;
}

/**
 * Converts PDF pages to images (JPEG format)
 * Returns up to 2 pages as image blobs
 */
export async function extractPdfPagesAsImages(file: File): Promise<PdfPageImages> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const totalPages = pdf.numPages;
  
  // Render page 1
  const page1Blob = await renderPageToBlob(pdf, 1);
  
  // Render page 2 if it exists
  let page2Blob: Blob | undefined;
  if (totalPages >= 2) {
    page2Blob = await renderPageToBlob(pdf, 2);
  }
  
  return {
    page1: page1Blob,
    page2: page2Blob,
    totalPages
  };
}

/**
 * Renders a single PDF page to a JPEG blob
 */
async function renderPageToBlob(pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number): Promise<Blob> {
  const page = await pdf.getPage(pageNumber);
  
  // Use a scale that produces good quality images (2x for retina-like quality)
  const scale = 2;
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not create canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render the page
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/jpeg',
      0.92 // Quality setting
    );
  });
}

/**
 * Creates a preview URL from a blob
 */
export function createBlobPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Checks if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
