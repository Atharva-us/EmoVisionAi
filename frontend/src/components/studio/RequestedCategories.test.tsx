import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { makePrediction } from '../../test/fixtures';
import { RequestedCategories } from './RequestedCategories';

function row(name: string) {
  return screen.getByText(name, { selector: 'span.font-medium' }).closest('li')!;
}

describe('RequestedCategories', () => {
  it('shows measured scores for Happy, Sad and Angry', () => {
    render(<RequestedCategories categories={makePrediction().requested_categories} />);
    expect(within(row('Happy')).getByText(/70\.0%/)).toBeInTheDocument();
    expect(within(row('Sad')).getByText(/6\.0%/)).toBeInTheDocument();
    expect(within(row('Angry')).getByText(/5\.0%/)).toBeInTheDocument();
  });

  it('never shows a number for unsupported Stress and Tired', async () => {
    render(<RequestedCategories categories={makePrediction().requested_categories} />);
    for (const name of ['Stress', 'Tired']) {
      const item = row(name);
      expect(within(item).getByText('Not available')).toBeInTheDocument();
      expect(item.textContent).not.toMatch(/\d+(\.\d+)?%/);
    }
    await userEvent.click(within(row('Stress')).getByText('Why?'));
    expect(screen.getByText(/no validated stress model/i)).toBeVisible();
  });

  it('treats Stress and Tired as unavailable even before any response', () => {
    render(<RequestedCategories categories={null} />);
    expect(within(row('Stress')).getByText('Not available')).toBeInTheDocument();
    expect(within(row('Happy')).getByText(/awaiting a detected face/i)).toBeInTheDocument();
  });
});
