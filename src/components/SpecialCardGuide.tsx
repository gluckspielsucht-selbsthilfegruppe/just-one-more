import {
  BookOpen,
  BrainCircuit,
  ChevronDown,
  Eye,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Prompt } from '../../shared/types';

export function SpecialCardGuide({ reversed = false }: { reversed?: boolean }) {
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
            <strong>Point cards</strong> {reversed ? 'Subtract' : 'Add'} the shown points{' '}
            {reversed ? 'from' : 'to'} your round score.
          </p>
        </div>
        <div>
          <span className="special-card-mark">×2</span>
          <p>
            <strong>Double</strong> {reversed ? 'Halves' : 'Doubles'} your numbered-card sum, before
            point and hand {reversed ? 'penalties' : 'bonuses'}.
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <Eye size={19} />
          </span>
          <p>
            <strong>Prediction</strong> Pick an active player to guess their next numbered card.{' '}
            {reversed ? 'Wrong' : 'Correct'} triples their number sum;{' '}
            {reversed ? 'correct' : 'wrong'} freezes their numbers and resets existing score
            modifiers.
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <Layers3 size={19} />
          </span>
          <p>
            <strong>Flip Three</strong>{' '}
            {reversed
              ? 'Pick an active player to discard their three most recent held cards.'
              : 'Pick an active player to draw up to three cards. Special cards count; any action cards they draw resolve after the sequence.'}
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <ShieldCheck size={19} />
          </span>
          <p>
            <strong>Second Chance</strong> Discards itself and your next{' '}
            {reversed ? 'new' : 'duplicate'} number so you stay in. You can hold one at a time.
          </p>
        </div>
        <div>
          <span className="special-card-mark icon">
            <BrainCircuit size={19} />
          </span>
          <p>
            <strong>AI Hackathon</strong> Reverses the rest of this round for everyone. Turns run
            backward; fresh numbers bust instead of repeats; low numbers score high. Point cards,
            combos, and hand bonuses become penalties, ×2 becomes ÷2, and Prediction rewards a miss.
          </p>
        </div>
      </div>
      <p className="special-card-footnote">
        <Sparkles size={14} /> Prediction, Flip Three, and AI Hackathon take effect when drawn; they
        do not stay in your hand.
      </p>
    </details>
  );
}

export function ActiveEffectHint({
  prompt,
  reversed = false,
}: {
  prompt: Prompt | null;
  reversed?: boolean;
}) {
  if (prompt?.kind !== 'target' && prompt?.kind !== 'guess') return null;
  const flipThree = prompt.kind === 'target' && prompt.effect === 'flip3';
  return (
    <div className="active-effect-hint">
      {flipThree ? <Layers3 size={19} /> : <Eye size={19} />}
      <p>
        <strong>
          {flipThree ? (reversed ? 'Reverse Flip Three' : 'Flip Three') : 'Prediction'}
        </strong>{' '}
        {flipThree
          ? reversed
            ? 'The chosen player discards their three most recent held cards.'
            : 'The chosen player draws up to three cards. Special cards count toward the three; action cards resolve afterward.'
          : prompt.kind === 'target'
            ? `Choose any active player to guess their next numbered card. A ${reversed ? 'correct guess' : 'miss'} freezes their numbers.`
            : `Guess your next numbered card. ${reversed ? 'Wrong' : 'Correct'} triples your number sum; ${reversed ? 'correct' : 'wrong'} freezes your numbers and resets existing score modifiers. ${reversed ? 'New numbers' : 'Duplicates'} can still bust you.`}
      </p>
    </div>
  );
}
