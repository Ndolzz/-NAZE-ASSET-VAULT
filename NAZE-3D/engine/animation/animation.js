/**
 * Animasi berbasis keyframe dan timeline JavaScript.
 */
export const EASE = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
};

export function ease(name, t) {
  const fn = EASE[name] || EASE.linear;
  return fn(Math.min(1, Math.max(0, t)));
}

/** Sampling track keyframe [{t, v}] dengan interpolasi linear. */
export function track(keys, time) {
  if (!keys || keys.length === 0) return 0;
  if (time <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (time >= last.t) return last.v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (time >= a.t && time <= b.t) {
      const u = (time - a.t) / Math.max(1e-6, b.t - a.t);
      return a.v + (b.v - a.v) * u;
    }
  }
  return last.v;
}

/** Registry animasi per lingkungan. fn(time, dt). */
export class Animator {
  constructor() { this.items = []; }
  add(name, fn) {
    this.items.push({ name, fn });
    return this;
  }
  update(time, dt) {
    for (const it of this.items) it.fn(time, dt);
  }
  get names() { return this.items.map((i) => i.name); }
  get count() { return this.items.length; }
  clear() { this.items.length = 0; return this; }
}
