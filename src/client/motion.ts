import { useEffect, useRef, useState } from 'react';
import type { Player } from '../shared/types';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useHandFeedback({
  scope,
  sequence,
  value,
  count,
  status,
  roulette,
}: {
  scope: string;
  sequence: number;
  value: number;
  count: number;
  status: Player['status'];
  roulette: Player['roulette'];
}) {
  const previous = useRef({ scope, value, count, status });
  const [scoreCue, setScoreCue] = useState<{ id: number; delta: number } | null>(null);
  const [milestoneCue, setMilestoneCue] = useState<number | null>(null);
  const [bankCue, setBankCue] = useState<number | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = { scope, value, count, status };
    if (before.scope !== scope) {
      setScoreCue(null);
      setMilestoneCue(null);
      setBankCue(null);
      return;
    }
    if (before.status === 'active' && status === 'active') {
      if (before.value !== value) setScoreCue({ id: sequence, delta: value - before.value });
      if (before.count < 7 && count >= 7) setMilestoneCue(sequence);
    }
    if (before.status === 'active' && status === 'banked' && roulette === 1) {
      setBankCue(sequence);
    }
  }, [scope, sequence, value, count, status, roulette]);
  useEffect(() => {
    if (!scoreCue) return;
    const timer = setTimeout(() => setScoreCue(null), 1400);
    return () => clearTimeout(timer);
  }, [scoreCue]);
  useEffect(() => {
    if (milestoneCue === null) return;
    const timer = setTimeout(() => setMilestoneCue(null), 1500);
    return () => clearTimeout(timer);
  }, [milestoneCue]);
  useEffect(() => {
    if (bankCue === null) return;
    const timer = setTimeout(() => setBankCue(null), 1500);
    return () => clearTimeout(timer);
  }, [bankCue]);
  return { scoreCue, milestoneCue, bankCue };
}
