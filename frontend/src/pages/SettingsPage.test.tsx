import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useSession } from '../context/SessionContext';
import { STORAGE_KEY } from '../context/SettingsContext';
import { makePrediction, mockApi, renderRoute } from '../test/fixtures';

describe('Settings page', () => {
  it('persists harmless preferences to local storage', async () => {
    mockApi({});
    renderRoute('/settings');
    const mirror = await screen.findByRole('switch', { name: /mirror preview/i });
    expect(mirror).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(mirror);
    expect(mirror).toHaveAttribute('aria-checked', 'false');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ mirrorVideo: false });

    await userEvent.selectOptions(screen.getByLabelText(/capture width/i), '480');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ captureWidth: 480 });
  });

  it('clears saved preferences and restores defaults', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mirrorVideo: false, intervalMs: 1500 }));
    mockApi({});
    renderRoute('/settings');
    expect(await screen.findByText(/1500 ms/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /clear saved preferences/i }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/700 ms/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /mirror preview/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('ignores corrupt stored preferences', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{"intervalMs": "fast", "captureWidth": 99999');
    mockApi({});
    renderRoute('/settings');
    expect(await screen.findByText(/700 ms/)).toBeInTheDocument();
  });

  it('resets the in-memory session analytics', async () => {
    mockApi({});
    let session: ReturnType<typeof useSession> | null = null;
    function Probe() {
      session = useSession();
      return null;
    }
    // Render the settings route plus a probe that shares the same providers.
    const { AppProviders, routes } = await import('../App');
    const { createMemoryRouter, RouterProvider } = await import('react-router');
    const { render } = await import('@testing-library/react');
    const router = createMemoryRouter(routes, { initialEntries: ['/settings'] });
    render(
      <AppProviders>
        <Probe />
        <RouterProvider router={router} />
      </AppProviders>,
    );

    act(() => {
      session!.record(makePrediction(), 80);
      session!.record(makePrediction(), 90);
    });
    const reset = await screen.findByRole('button', { name: /reset session \(2 frames\)/i });
    await userEvent.click(reset);
    expect(session!.summary.frames).toBe(0);
    expect(screen.getByRole('button', { name: /reset session \(0 frames\)/i })).toBeDisabled();
    expect(screen.getByText(/session analytics cleared/i)).toBeInTheDocument();
  });

  it('keeps preferences usable when the page is reached directly', () => {
    mockApi({});
    renderRoute('/settings');
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });
});
