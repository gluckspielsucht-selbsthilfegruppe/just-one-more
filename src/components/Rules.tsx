import {
  BrainCircuit,
  Eye,
  Layers3,
  ShieldCheck,
  Dices,
  Snowflake,
  Trophy,
  ArrowUpRight,
} from 'lucide-react';
import { Modal, PlayingCard } from './ui';

export function Rules({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="A little luck. Here are the rules."
      subtitle="Easy to start. Hard to stop."
      onClose={onClose}
      wide
    >
      <div className="rules-intro">
        <div>
          <span className="eyebrow">THE BIG IDEA</span>
          <h3>
            Keep the cards.
            <br />
            Know when to quit.
          </h3>
          <p>
            On your turn, draw another card or bank your points. Draw a number you already have and
            you bust — losing everything from this round. Your previous rounds’ points are safe.
          </p>
        </div>
        <div className="rules-cards">
          <PlayingCard card={{ id: 'r1', kind: 'number', value: 6 }} small />
          <PlayingCard card={{ id: 'r2', kind: 'number', value: 7 }} small />
        </div>
      </div>
      <div className="rules-grid">
        <article>
          <Trophy />
          <h4>The race to 200</h4>
          <p>
            Highest qualifying total wins after the whole round. In “200 + seven” mode, you must
            also bank seven unfrozen numbers in that finishing round. A tie sends everyone into
            another round.
          </p>
        </article>
        <article>
          <ArrowUpRight />
          <h4>Bigger hand, bigger bonus</h4>
          <p>
            7 numbers = +15. 8 = +30. 9 = +60. 10 = +120. Only your highest bonus counts. Ten
            unfrozen numbers ends the round for everyone, with a final Bank or Roulette choice.
          </p>
        </article>
        <article>
          <Eye />
          <h4>Prediction</h4>
          <p>
            Choose any active player, including yourself. They guess their next exact numbered card.
            Correct? ×3 on their number total, stacking with other multipliers. Wrong? Every number
            they hold, including the new one, freezes.
          </p>
        </article>
        <article>
          <Snowflake />
          <h4>Ice has a sharp edge</h4>
          <p>
            Frozen numbers score nothing, earn no bonuses, and still bust you on duplicates. A
            prediction miss also disables existing +point and ×2 cards and resets earned ×3
            multipliers. New cards can rebuild your score.
          </p>
        </article>
        <article>
          <Layers3 />
          <h4>Flip Three</h4>
          <p>
            Choose an active player to draw three physical cards. Special cards count toward three.
            Prediction and Flip Three cards drawn in a forced sequence wait until the sequence
            finishes, then resolve in reveal order.
          </p>
        </article>
        <article>
          <ShieldCheck />
          <h4>Second Chance</h4>
          <p>
            Discard this protection and your next duplicate to stay in. Hold one at a time; extras
            pass to the next active, unprotected player. Protection survives a prediction miss and
            expires at round end.
          </p>
        </article>
        <article>
          <Dices />
          <h4>Double or nothing</h4>
          <p>
            When banking, choose Roulette for a 50/50 chance to double the whole round score or lose
            it. Losing also removes your seven-card qualification. Bank safely to keep the score you
            see.
          </p>
        </article>
        <article>
          <Trophy />
          <h4>A good combination</h4>
          <p>
            Unfrozen 6 + 7 gives +10. Unfrozen 4 + 2 + 0 gives +25. Both can pay, once each. +point
            cards add their value; ×2 and earned ×3 multiply only the numbered-card sum.
          </p>
        </article>
        <article>
          <BrainCircuit />
          <h4>AI Hackathon</h4>
          <p>
            One card reverses the current round for everyone. Turns run backward. Your first number
            is safe; after that, a new value busts and repeats are safe. Second Chance discards the
            next new value. Number points become the maximum minus the card value. Point cards,
            combinations, and hand bonuses subtract; ×2 halves the number sum. Prediction now
            rewards a wrong guess and freezes on a correct one. Flip Three discards the target’s
            three most recent held cards. Scores cannot fall below zero. Existing banked hands
            recalculate when the card appears. The next round starts normally.
          </p>
        </article>
      </div>
      <div className="formula">
        <span className="eyebrow">HOW YOUR SCORE ADDS UP</span>
        <p>(Number sum × multipliers + point cards + combinations + hand bonus) × roulette</p>
      </div>
      <details className="rules-details">
        <summary>The deck & the small print</summary>
        <p>
          The deck has one 0 and v copies of each value v up to your chosen maximum (12–15). Add
          three each of Prediction, Flip Three, and Second Chance, plus +2, +4, +6, +8, +10, ×2, and
          one AI Hackathon card. Deal one opening card to each seat, resolving effects as they
          appear. Play follows join order; the starting seat rotates each round.
        </p>
        <p>
          Unused cards stay in the deck between rounds. If it empties, shuffle only previous-round
          discards. If those are also empty, everyone banks or takes roulette. Ten numbers cancels
          all unfinished draws and queued actions. Banked and busted players cannot be targeted. A
          correct prediction can still bust on a duplicate. All hands and effects reset between
          rounds.
        </p>
      </details>
      <button className="button primary full" onClick={onClose}>
        Got it. Let’s play <ArrowUpRight size={18} />
      </button>
    </Modal>
  );
}
