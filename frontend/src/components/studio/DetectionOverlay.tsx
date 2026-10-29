import { memo } from 'react';

import type { FacePrediction } from '../../types/api';

interface Props {
  faces: FacePrediction[];
  mirrored: boolean;
  showAllFaces: boolean;
}

/** Face boxes drawn in percentages of the frame, so they track any display size. */
export const DetectionOverlay = memo(function DetectionOverlay({ faces, mirrored, showAllFaces }: Props) {
  const visible = showAllFaces ? faces : faces.filter((f) => f.is_primary);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true" data-testid="detection-overlay">
      {visible.map((face, index) => {
        const { x, y, width, height } = face.box;
        // The preview may be mirrored for comfort; the analysed frame never is.
        const left = mirrored ? 1 - x - width : x;
        const primary = face.is_primary;
        return (
          <div
            key={index}
            className={`absolute rounded-md border-2 transition-all duration-200 ease-out ${
              primary ? 'border-brand-blue shadow-[0_0_24px_-4px_rgb(79_124_255/0.8)]' : 'border-[#a48bff]/80'
            }`}
            style={{
              left: `${left * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            }}
          >
            <span
              className={`absolute -top-7 left-[-2px] whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[11px] text-white ${
                primary ? 'bg-[#3d5ce6]' : 'bg-[#5b45c9]' /* white text >= 5.4:1 */
              }`}
            >
              {face.predicted_expression} · {(face.confidence * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
});
