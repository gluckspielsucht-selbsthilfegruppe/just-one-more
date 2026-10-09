import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile, PublicRoom, RoomSummary } from '../shared/types';

export async function api<T = { profile: Profile }>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not reach the table. Please try again.');
  return data;
}
type Snapshot = { profile: Profile | null; room: PublicRoom | null; rooms: RoomSummary[] };
export function useGame() {
  const [state, setState] = useState<Snapshot>({ profile: null, room: null, rooms: [] });
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'offline'>(
    'connecting',
  );
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(0);
  const current = useRef(state);
  current.current = state;
  const socket = useRef<WebSocket | null>(null);
  const pending = useRef(
    new Map<
      string,
      { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
    >(),
  );
  const bootstrap = useRef<Promise<Snapshot> | null>(null);
  useEffect(() => {
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    let attempts = 0;
    let ws: WebSocket | null = null;
    const rejectPending = () => {
      for (const p of pending.current.values()) {
        clearTimeout(p.timer);
        p.reject(new Error('Connection interrupted. Reconnect before trying again.'));
      }
      pending.current.clear();
    };
    const connect = async () => {
      try {
        setConnection(attempts ? 'offline' : 'connecting');
        if (!bootstrap.current)
          bootstrap.current = (async () => {
            let data = await api<Snapshot>('bootstrap');
            if (!data.profile) {
              await api('session', { name: `Guest ${Math.floor(Math.random() * 900 + 100)}` });
              data = await api<Snapshot>('bootstrap');
            }
            return data;
          })();
        const data = await bootstrap.current;
        if (stopped) return;
        setState(data);
        ws = new WebSocket(
          `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`,
        );
        socket.current = ws;
        ws.onopen = () => {
          if (stopped) return;
          attempts = 0;
          setConnection('connected');
          setError('');
        };
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state')
            setState({ profile: msg.profile, room: msg.room, rooms: msg.rooms });
          if (msg.type === 'ack' || msg.type === 'error') {
            const p = pending.current.get(msg.id);
            if (p) {
              clearTimeout(p.timer);
              pending.current.delete(msg.id);
              if (msg.type === 'ack') p.resolve();
              else p.reject(new Error(msg.message));
            } else if (msg.type === 'error') setError(msg.message);
          }
        };
        ws.onclose = () => {
          if (stopped) return;
          setConnection('offline');
          rejectPending();
          bootstrap.current = null;
          retry = setTimeout(connect, Math.min(8000, 700 * 2 ** attempts++));
        };
        ws.onerror = () => ws?.close();
      } catch (e) {
        if (stopped) return;
        bootstrap.current = null;
        setConnection('offline');
        setError(e instanceof Error ? e.message : 'Server unavailable.');
        retry = setTimeout(connect, Math.min(8000, 1000 * 2 ** attempts++));
      }
    };
    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      ws?.close();
      rejectPending();
    };
  }, [generation]);
  const command = useCallback(
    (type: string, payload: Record<string, unknown> = {}) =>
      new Promise<void>((resolve, reject) => {
        if (socket.current?.readyState !== WebSocket.OPEN) {
          reject(new Error('Reconnecting to the table. Please try again shortly.'));
          return;
        }
        const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        const timer = setTimeout(() => {
          pending.current.delete(id);
          reject(
            new Error(
              'The table took too long to respond. Check the latest state before trying again.',
            ),
          );
        }, 12000);
        pending.current.set(id, { resolve, reject, timer });
        socket.current.send(
          JSON.stringify({ id, type, payload, version: current.current.room?.version }),
        );
      }),
    [],
  );
  const reload = () => {
    bootstrap.current = null;
    setGeneration((n) => n + 1);
  };
  return { ...state, connection, error, setError, command, reload };
}
