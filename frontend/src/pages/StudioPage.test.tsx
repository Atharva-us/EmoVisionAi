import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fakeStream,
  installMediaDevices,
  json,
  makeModelInfo,
  makePrediction,
  mockApi,
  noFacePrediction,
  renderRoute,
} from '../test/fixtures';

vi.mock('../services/frameCapture', () => ({
  captureFrame: vi.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })),
}));

const health = () =>
  json({ status: 'ok', model_loaded: true, device: 'cpu', version: '1', uptime_s: 1, message: null });

beforeEach(() => {
  // jsdom never loads media; pretend the video has frames so the capture loop runs.
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { configurable: true, get: () => 4 });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
});

afterEach(() => {
  delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>).readyState;
  delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>).videoWidth;
  delete (HTMLVideoElement.prototype as unknown as Record<string, unknown>).videoHeight;
});

describe('AI Studio', () => {
  it('shows a permission-denied state with a retry when camera access is refused', async () => {
    mockApi({ health, 'model/info': () => json(makeModelInfo()) });
    installMediaDevices(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));
    renderRoute('/studio');

    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/permission denied/i)).toBeInTheDocument();
    expect(within(alert).getByText(/allow camera access/i)).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('reports an unsupported browser when getUserMedia is missing', async () => {
    mockApi({ health, 'model/info': () => json(makeModelInfo()) });
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    renderRoute('/studio');
    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));
    expect(await screen.findByText(/does not support camera access/i)).toBeInTheDocument();
  });

  it('starts and stops the camera, releasing every track', async () => {
    mockApi({ health, 'model/info': () => json(makeModelInfo()), predict: () => json(makePrediction()) });
    const { stream, track } = fakeStream();
    const media = installMediaDevices(async () => stream);
    renderRoute('/studio');

    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));
    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(media.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));

    await userEvent.click(screen.getByRole('button', { name: /stop camera/i }));
    expect(track.stop).toHaveBeenCalled();
    expect(await screen.findByText('Camera off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
  });

  it('reports a camera that stops while starting instead of showing Live (regression)', async () => {
    mockApi({ health, 'model/info': () => json(makeModelInfo()) });
    const { stream, track } = fakeStream();
    installMediaDevices(async () => stream);
    let resolvePlay!: () => void;
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => new Promise<void>((resolve) => (resolvePlay = resolve)));
    renderRoute('/studio');

    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));
    await waitFor(() => expect(play).toHaveBeenCalled());
    // The device ends the track while play() is still pending.
    const onEnded = track.addEventListener.mock.calls.find(([type]) => type === 'ended')![1] as () => void;
    Object.assign(track, { readyState: 'ended' });
    onEnded();
    resolvePlay();

    expect(await screen.findByText(/disconnected or stopped by the system/i)).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('renders real predictions, requested categories and analytics', async () => {
    const fetchMock = mockApi({
      health,
      'model/info': () => json(makeModelInfo()),
      predict: () => json(makePrediction()),
    });
    installMediaDevices(async () => fakeStream().stream);
    renderRoute('/studio');

    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));

    const prediction = screen.getByRole('region', { name: /^prediction$/i });
    expect(
      await within(prediction).findByText('Happiness', { selector: 'p.font-display' }),
    ).toBeInTheDocument();
    // Shown as the headline confidence and as the top bar of the class distribution.
    expect(within(prediction).getAllByText('70.0%')).toHaveLength(2);
    expect(within(prediction).getByRole('list', { name: /class probabilities/i }).children).toHaveLength(8);

    const requested = screen.getByRole('region', { name: /requested categories/i });
    expect(within(requested).getByText(/70\.0%/)).toBeInTheDocument();
    expect(within(requested).getAllByText('Not available')).toHaveLength(2);

    const analytics = screen.getByRole('region', { name: /session analytics/i });
    expect(await within(analytics).findByTestId('session-summary')).toHaveTextContent(
      /most frequent top expression was Happiness/,
    );

    const predictCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/predict'));
    expect(predictCalls[0][1]?.method).toBe('POST');
    expect(predictCalls[0][1]?.body).toBeInstanceOf(FormData);
  });

  it('shows a no-face state without inventing a prediction', async () => {
    mockApi({ health, 'model/info': () => json(makeModelInfo()), predict: () => json(noFacePrediction()) });
    installMediaDevices(async () => fakeStream().stream);
    renderRoute('/studio');
    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));

    const prediction = screen.getByRole('region', { name: /^prediction$/i });
    expect(await within(prediction).findByText('No face detected')).toBeInTheDocument();
    expect(within(prediction).queryByText('Happiness')).not.toBeInTheDocument();
    expect(within(prediction).queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.getByText(/no face detected\. face the camera/i)).toBeInTheDocument();
  });

  it('shows the backend error message when inference fails', async () => {
    mockApi({
      health,
      'model/info': () => json(makeModelInfo()),
      predict: () =>
        json(
          { success: false, error: { code: 'model_unavailable', message: 'The model is not loaded.' } },
          503,
        ),
    });
    installMediaDevices(async () => fakeStream().stream);
    renderRoute('/studio');
    await userEvent.click(await screen.findByRole('button', { name: /start camera/i }));

    const prediction = screen.getByRole('region', { name: /^prediction$/i });
    expect(await within(prediction).findByText('Model not loaded')).toBeInTheDocument();
    expect(within(prediction).getByText(/the model is not loaded/i)).toBeInTheDocument();
  });

  it('reports an offline backend', async () => {
    mockApi({});
    renderRoute('/studio');
    expect(await screen.findByText('Backend offline')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/uvicorn app\.main:app/)).toBeInTheDocument());
  });
});
