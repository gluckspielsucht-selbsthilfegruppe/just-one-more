import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makePlayer } from '../../src/shared/engine';
import type { Card } from '../../src/shared/types';
import { readCachedAppearance } from '../../src/client/appearance';
import { DEFAULT_AUDIO_SETTINGS } from '../../src/client/audio';
import { AppearancePicker } from '../../src/client/components/Appearance';
import { AudioControls } from '../../src/client/components/AudioControls';
import { HandCards } from '../../src/client/components/HandCards';
import { Rules } from '../../src/client/components/Rules';
import { Modal, PlayerStatus, PlayingCard } from '../../src/client/components/ui';

const number = (value: number, extra: Partial<Card> = {}): Card => ({
  id: `n${value}`,
  kind: 'number',
  value,
  ...extra,
});

afterEach(() => localStorage.clear());

describe('PlayingCard', () => {
  it('describes number, frozen, disabled, and special cards for assistive technology', () => {
    render(
      <>
        <PlayingCard card={number(7)} />
        <PlayingCard card={number(4, { frozen: true })} />
        <PlayingCard card={{ id: 'b', kind: 'bonus', value: 6, disabled: true }} />
        <PlayingCard card={{ id: 'h', kind: 'hackathon', value: 0 }} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Number 7' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Number 4 — frozen/ })).toHaveClass('frozen');
    expect(screen.getByRole('img', { name: '+6 points — disabled' })).toHaveTextContent('Disabled');
    expect(screen.getByRole('img', { name: /AI Hackathon/ })).toHaveTextContent('AI');
  });
});

describe('HandCards', () => {
  it('puts special cards above number cards and shows the prediction multiplier', () => {
    const player = makePlayer('a', 'Alice');
    player.hand = [number(3), { id: 'c', kind: 'chance', value: 0 }, number(9)];
    player.predictionMultiplier = 9;
    render(<HandCards player={player} />);
    const special = screen.getByRole('group', { name: 'Special cards' });
    const numbers = screen.getByRole('group', { name: 'Number cards' });
    expect(within(special).getByRole('img', { name: 'Second Chance' })).toBeInTheDocument();
    expect(within(special).getByText('×9')).toBeInTheDocument();
    expect(
      within(numbers)
        .getAllByRole('img')
        .map((card) => card.getAttribute('aria-label')),
    ).toEqual(['Number 3', 'Number 9']);
  });

  it('shows empty rows and marks a banked hand as out', () => {
    const player = makePlayer('a', 'Alice');
    player.status = 'banked';
    const { container } = render(<HandCards player={player} small />);
    expect(screen.getByText('No special cards')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a number…')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('opponent-cards', 'is-out');
  });
});

describe('PlayerStatus', () => {
  it.each([
    [{ status: 'busted' as const }, 'Busted'],
    [{ status: 'banked' as const, roundScore: 42 }, 'Banked 42'],
    [{ connected: false }, 'Reconnecting'],
    [{}, 'In the round'],
  ])('labels %o as %s', (patch, label) => {
    render(<PlayerStatus player={{ ...makePlayer('a', 'Alice'), ...patch }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('Modal', () => {
  it('opens as a labelled dialog and closes via the button or Escape', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Settings" subtitle="Tune it" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAttribute('open');
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    dialog.dispatchEvent(new Event('cancel'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('AppearancePicker', () => {
  it('marks the current theme and reports a new choice', async () => {
    const onChange = vi.fn();
    render(<AppearancePicker value="velvet" onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Velvet Club/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: /High Noon/ }));
    expect(onChange).toHaveBeenCalledWith('western');
  });

  it('ignores clicks while saving', async () => {
    const onChange = vi.fn();
    render(<AppearancePicker value="neon" onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole('button', { name: /Lucky Pop/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('readCachedAppearance', () => {
  it('defaults to Neon Arcade and only accepts known themes', () => {
    expect(readCachedAppearance()).toBe('neon');
    localStorage.setItem('jom-appearance', 'glow');
    expect(readCachedAppearance()).toBe('glow');
    localStorage.setItem('jom-appearance', 'unknown');
    expect(readCachedAppearance()).toBe('neon');
  });
});

describe('Rules', () => {
  it('explains every special card and closes on confirmation', async () => {
    const onClose = vi.fn();
    render(<Rules onClose={onClose} />);
    for (const heading of ['Prediction', 'Flip Three', 'Second Chance', 'AI Hackathon'])
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Got it/ }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AudioControls', () => {
  function setup(settings = DEFAULT_AUDIO_SETTINGS) {
    const update = vi.fn();
    render(
      <AudioControls
        audio={{
          settings,
          update,
          play: vi.fn(),
          unlocked: true,
          error: '',
          soundtrack: 'neon',
        }}
        onClose={vi.fn()}
      />,
    );
    return update;
  }

  it('changes music style, playback, volume, and effects', async () => {
    const update = setup();
    expect(screen.getByRole('heading', { name: 'Midnight Circuit' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Music style' }), 'western');
    expect(update).toHaveBeenLastCalledWith({ style: 'western' });
    await userEvent.click(screen.getByRole('button', { name: /Play background music/ }));
    expect(update).toHaveBeenLastCalledWith({ music: true });
    await userEvent.click(screen.getByRole('button', { name: /Game sound effects/ }));
    expect(update).toHaveBeenLastCalledWith({ effects: true });
  });

  it('offers to pause while music is playing', async () => {
    const update = setup({ ...DEFAULT_AUDIO_SETTINGS, music: true });
    await userEvent.click(screen.getByRole('button', { name: /Pause music/ }));
    expect(update).toHaveBeenLastCalledWith({ music: false });
  });
});
