import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { json, makeModelInfo, mockApi, renderRoute } from '../test/fixtures';

describe('Model Lab', () => {
  it('shows a loading state while fetching', async () => {
    mockApi({ 'model/info': () => new Promise<Response>(() => {}) });
    renderRoute('/model-lab');
    expect(await screen.findByText(/loading model information/i)).toBeInTheDocument();
  });

  it('shows an error with retry when the backend is down, then recovers', async () => {
    let up = false;
    mockApi({
      'model/info': () => {
        if (!up) throw new TypeError('Failed to fetch');
        return json(makeModelInfo());
      },
    });
    renderRoute('/model-lab');
    expect(await screen.findByText(/model information unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot reach the emovisionai backend/i)).toBeInTheDocument();

    up = true;
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('heading', { name: /model card/i })).toBeInTheDocument();
  });

  it('renders measured evaluation details', async () => {
    mockApi({ 'model/info': () => json(makeModelInfo(true)) });
    renderRoute('/model-lab');
    expect(await screen.findByRole('heading', { name: /evaluation results/i })).toBeInTheDocument();
    expect(screen.getByText('56.1%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /confusion matrix/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /inference latency/i })).toBeInTheDocument();
    expect(screen.getByText('Test CPU')).toBeInTheDocument();
  });

  it('says "Not evaluated yet" without an evaluation', async () => {
    mockApi({ 'model/info': () => json(makeModelInfo(false)) });
    renderRoute('/model-lab');
    expect(await screen.findByText(/not evaluated yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /confusion matrix/i })).not.toBeInTheDocument();
  });
});
