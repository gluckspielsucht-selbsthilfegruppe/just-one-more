import { Check, Palette } from 'lucide-react';
import type { Profile } from '../../shared/types';
import { Modal } from './ui';
import { APPEARANCES } from '../appearance';

export function AppearancePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Profile['appearance'];
  onChange: (value: Profile['appearance']) => void;
  disabled?: boolean;
}) {
  return (
    <div className="appearance-picker" role="group" aria-label="App theme" aria-busy={disabled}>
      {APPEARANCES.map(({ id, name, description }) => (
        <button
          type="button"
          key={id}
          className={`appearance-choice ${id} ${value === id ? 'chosen' : ''}`}
          onClick={() => {
            if (!disabled) onChange(id);
          }}
          aria-pressed={value === id}
          aria-disabled={disabled}
        >
          <span className="appearance-preview" aria-hidden="true">
            <span className="preview-brand">just one more.</span>
            <span className="preview-felt">
              <span className="preview-card">6</span>
              <span className="preview-card">7</span>
              <span className="preview-card">×2</span>
            </span>
            <span className="preview-actions">
              <i />
              <i />
            </span>
          </span>
          <span className="appearance-name">
            {name}
            {value === id && <Check size={17} />}
          </span>
          <span className="appearance-description">{description}</span>
        </button>
      ))}
    </div>
  );
}

export function AppearanceDialog({
  value,
  hackathonMode,
  onChange,
  onClose,
  busy,
  error,
}: {
  value: Profile['appearance'];
  hackathonMode: boolean;
  onChange: (value: Profile['appearance']) => void;
  onClose: () => void;
  busy: boolean;
  error: string;
}) {
  return (
    <Modal
      title="Find your table’s vibe."
      subtitle={
        hackathonMode
          ? 'Choose the theme that returns when this round ends.'
          : 'Pick a theme to apply and save it instantly.'
      }
      onClose={onClose}
      wide
    >
      <AppearancePicker value={value} onChange={onChange} disabled={busy} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="appearance-note">
        <Palette size={16} />
        {hackathonMode
          ? 'AI Hackathon sets the table’s look for this round. Your choice returns next round.'
          : 'Your choice follows your profile. Other players keep their own theme.'}
      </p>
      <button className="button primary full" onClick={onClose}>
        Back to the game <Check size={17} />
      </button>
    </Modal>
  );
}
