import { BookOpen, ChevronDown, Eye, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import type { Prompt } from '../../shared/types';

export function SpecialCardGuide() {
  return (
    <details className="special-card-guide">
      <summary>
        <span>
          <BookOpen size={17} /> Special cards
        </span>
        <span>
          What does each do? <ChevronDown size={16} />
        </span>
      </summary>
      <div className="special-card-list">
        <div>
          <span className="special-card-mark">+2…10</span>
          <p>
            <strong>Point cards</strong> Add the shown points to your round score.
          </p>
        </div>
        <div>
          <span className="special-card-mark">×2</span>
          <p>
            <strong>Double</strong> Doubles your numbered-card sum, before point and hand bonuses.
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <Eye size={19} />
          </span>
          <p>
            <strong>Prediction</strong> Pick an active player to guess their next numbered card.
            Correct triples their number sum; wrong freezes their numbers and resets existing score
            modifiers.
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <Layers3 size={19} />
          </span>
          <p>
            <strong>Flip Three</strong> Pick an active player to draw up to three cards. Special
            cards count; any action cards they draw resolve after the sequence.
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <ShieldCheck size={19} />
          </span>
          <p>
            <strong>Second Chance</strong> Discards itself and your next duplicate number so you
            stay in. You can hold one at a time.
          </p>
        </div>
      </div>
      <p className="special-card-footnote">
        <Sparkles size={14} /> Prediction and Flip Three take effect when drawn; they do not stay in
        your hand.
      </p>
    </details>
  );
}

export function ActiveEffectHint({ prompt }: { prompt: Prompt | null }) {
  if (prompt?.kind !== 'target' && prompt?.kind !== 'guess') return null;
  const flipThree = prompt.kind === 'target' && prompt.effect === 'flip3';
  return (
    <div className="active-effect-hint">
      {flipThree ? <Layers3 size={19} /> : <Eye size={19} />}
      <p>
        <strong>{flipThree ? 'Flip Three' : 'Prediction'}</strong>{' '}
        {flipThree
          ? 'The chosen player draws up to three cards. Special cards count toward the three; action cards resolve afterward.'
          : prompt.kind === 'target'
            ? 'Choose any active player to guess their next numbered card. A miss freezes their numbers.'
            : 'Guess your next numbered card. Correct triples your number sum; wrong freezes your numbers and resets existing score modifiers. Duplicates still count.'}
      </p>
    </div>
  );
}
