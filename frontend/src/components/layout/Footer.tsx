import { Link } from 'react-router';

import { Wordmark } from './Logo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'AI Studio', to: '/studio' },
      { label: 'Model Lab', to: '/model-lab' },
      { label: 'Settings', to: '/settings' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Technology', to: '/#technology' },
      { label: 'Evaluation', to: '/#evaluation' },
      { label: 'Responsible AI', to: '/#responsible-ai' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API docs (local)', href: 'http://127.0.0.1:8000/docs' },
      { label: 'HSEmotion model', href: 'https://github.com/av-savchenko/face-emotion-recognition' },
      {
        label: 'OpenCV YuNet',
        href: 'https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet',
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-4 text-sm text-fg-muted">
            Real-time facial expression recognition using deep learning and computer vision. Runs entirely on
            your computer.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="eyebrow mb-4 !text-[11px]">{column.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {'to' in link && link.to ? (
                    <Link to={link.to} className="text-fg-muted transition-colors hover:text-fg">
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={'href' in link ? link.href : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="text-fg-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-xs text-fg-subtle sm:flex-row sm:justify-between sm:px-6">
          <p>
            EmoVisionAI is a portfolio project. Not for medical, employment or other consequential decisions.
          </p>
          <p>Frames are processed locally and never stored.</p>
        </div>
      </div>
    </footer>
  );
}
