import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { json, makeModelInfo, mockApi, renderRoute } from '../test/fixtures';

describe('Landing page', () => {
  it('renders the hero, both CTAs and the main sections', async () => {
    mockApi({ 'model/info': () => json(makeModelInfo()) });
    renderRoute('/');

    expect(screen.getByRole('heading', { level: 1, name: /see beyond the expression/i })).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getAllByRole('link', { name: /launch ai studio/i }).length).toBeGreaterThan(0);
    expect(within(main).getByRole('link', { name: /explore the technology/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /five-stage computer-vision pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /know what the model cannot see/i })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('labels the hero graphic as an illustration, not live output', () => {
    mockApi({ 'model/info': () => json(makeModelInfo()) });
    renderRoute('/');
    expect(screen.getByText(/illustration · not live output/i)).toBeInTheDocument();
  });

  it('shows measured evaluation results from the API', async () => {
    mockApi({ 'model/info': () => json(makeModelInfo(true)) });
    renderRoute('/');
    expect(await screen.findByText('56.1%')).toBeInTheDocument();
    expect(screen.getByText('0.508')).toBeInTheDocument();
    expect(screen.getByText(/test-set performance does not prove/i)).toBeInTheDocument();
  });

  it('says "Not evaluated yet" when no evaluation has run', async () => {
    mockApi({ 'model/info': () => json(makeModelInfo(false)) });
    renderRoute('/');
    expect(await screen.findByText(/not evaluated yet/i)).toBeInTheDocument();
    expect(screen.queryByText('56.1%')).not.toBeInTheDocument();
  });

  it('explains when the backend is offline instead of showing numbers', async () => {
    mockApi({});
    renderRoute('/');
    expect(await screen.findByText(/evaluation results unavailable/i)).toBeInTheDocument();
  });

  it('navigates to the AI Studio from the hero CTA', async () => {
    mockApi({
      'model/info': () => json(makeModelInfo()),
      health: () => json({ status: 'ok', model_loaded: true }),
    });
    const { router } = renderRoute('/');
    const hero = screen.getByRole('heading', { level: 1 }).closest('section')!;
    await userEvent.click(within(hero).getByRole('link', { name: /launch ai studio/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /ai studio/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/studio');
  });

  it('navigates between pages from the navbar', async () => {
    mockApi({ 'model/info': () => json(makeModelInfo()) });
    renderRoute('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Model Lab' }));
    expect(await screen.findByRole('heading', { level: 1, name: /model lab/i })).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
  });

  it('renders a 404 page for unknown routes', async () => {
    mockApi({});
    renderRoute('/does-not-exist');
    expect(await screen.findByText(/nothing detected here/i)).toBeInTheDocument();
  });
});
