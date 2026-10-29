/** The three requested categories the model measures directly, with validated chart colours. */
export const MEASURED_SERIES = [
  { key: 'Happiness', label: 'Happy', color: '#3987e5' },
  { key: 'Sadness', label: 'Sad', color: '#d95926' },
  { key: 'Anger', label: 'Angry', color: '#199e70' },
] as const;

/** Fallback order if the backend is unreachable; the API's /model/info is authoritative. */
export const MODEL_LABELS = [
  'Anger',
  'Contempt',
  'Disgust',
  'Fear',
  'Happiness',
  'Neutral',
  'Sadness',
  'Surprise',
] as const;
