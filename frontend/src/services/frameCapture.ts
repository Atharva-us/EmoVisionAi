/**
 * Grab the current video frame, downscale it and JPEG-encode it in the browser.
 * Downscaling before upload keeps requests small (~30-60 KB at 640px) and the
 * backend fast; the canvas is reused across calls to avoid allocations.
 */
let sharedCanvas: HTMLCanvasElement | null = null;

export function captureFrame(video: HTMLVideoElement, maxWidth: number, quality: number): Promise<Blob> {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return Promise.reject(new Error('Video is not ready'));

  const scale = Math.min(1, maxWidth / videoWidth);
  const width = Math.round(videoWidth * scale);
  const height = Math.round(videoHeight * scale);

  sharedCanvas ??= document.createElement('canvas');
  const canvas = sharedCanvas;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return Promise.reject(new Error('Canvas 2D context unavailable'));
  // The frame is drawn un-mirrored: mirroring is a display preference only.
  context.drawImage(video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Frame encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
}
