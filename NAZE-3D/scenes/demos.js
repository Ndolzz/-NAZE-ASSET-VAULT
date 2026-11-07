/**
 * 8 demo environment lengkap: objek 3D, pencahayaan, kamera, karakter.
 */
import { createEnvironment } from '../engine/environment/builder.js';

export const DEMOS = {
  'tropical-forest': async () => {
    const env = await createEnvironment({ environment: 'tropical-forest', lighting: 'daylight', quality: 'low' });
    env.addCharacter('nendi', { position: [0.6, 0, 2.6], pose: 'explain', expression: 'happy', name: 'guide' });
    env.setCamera({ position: [4.6, 2.4, 5.8], target: [0, 1.3, 0], fov: 52 });
    env.cameraRig.orbit({ start: 0, duration: 9, radius: 7, height: 2.6, angleFrom: 0.6, angleTo: 1.7, target: [0, 1.2, 0] });
    return env;
  },
  'modern-bedroom': async () => {
    const env = await createEnvironment({ environment: 'modern-bedroom', lighting: 'indoor-warm', quality: 'low' });
    env.addCharacter('nendi', { position: [-1.5, 0.55, -1.2], pose: 'sit', expression: 'happy', name: 'owner', lookAt: [2.2, 1.4, 3.5] });
    env.setCamera({ position: [3.2, 2.0, 3.8], target: [-1.2, 1.0, -1.5], fov: 50 });
    env.cameraRig.moveTo({ start: 0, duration: 8, from: [3.2, 2.0, 3.8], to: [2.0, 1.5, 2.6], target: [-1.2, 1.0, -1.5] });
    return env;
  },
  'server-room': async () => {
    const env = await createEnvironment({ environment: 'server-room', lighting: 'dark-technology', quality: 'low' });
    env.addCharacter('nendi', { position: [-1.2, 0, 1.6], pose: 'point', expression: 'confident', name: 'engineer', lookAt: [-2.6, 1.4, -0.5] });
    env.setCamera({ position: [3.4, 2.2, 4.6], target: [-2.4, 1.4, -0.5], fov: 50 });
    env.cameraRig.moveTo({ start: 0, duration: 8, from: [3.4, 2.2, 4.6], to: [0.8, 1.5, 2.6], target: [-2.4, 1.4, -0.5] });
    return env;
  },
  'modern-classroom': async () => {
    const env = await createEnvironment({ environment: 'modern-classroom', lighting: 'laboratory', quality: 'low' });
    env.addCharacter('nendi', { position: [0.6, 0, -1.2], pose: 'explain', expression: 'confident', name: 'teacher', lookAt: [0.6, 1.3, 3.5] });
    env.setCamera({ position: [-2.2, 1.9, 3.4], target: [0.4, 1.2, -1.4], fov: 50 });
    env.cameraRig.orbit({ start: 0, duration: 9, radius: 5.5, height: 2.0, angleFrom: 2.4, angleTo: 3.3, target: [0.3, 1.2, -0.6] });
    return env;
  },
  'developer-workspace': async () => {
    const env = await createEnvironment({ environment: 'developer-workspace', lighting: 'indoor-cool', quality: 'low' });
    env.addCharacter('nendi', { position: [0, 0.46, -1.62], pose: 'sit', expression: 'thinking', name: 'developer', lookAt: [0, 1.3, 4] });
    env.setCamera({ position: [2.6, 1.7, 1.6], target: [0, 1.1, -2.0], fov: 50 });
    env.cameraRig.moveTo({ start: 0, duration: 8, from: [2.6, 1.7, 1.6], to: [0.9, 1.4, 0.4], target: [-0.4, 1.05, -2.1] });
    return env;
  },
  'futuristic-laboratory': async () => {
    const env = await createEnvironment({ environment: 'futuristic-laboratory', lighting: 'neon', quality: 'low' });
    env.addCharacter('nendi', { position: [1.6, 0, 1.8], pose: 'point', expression: 'confident', name: 'scientist', lookAt: [0, 1.2, 0.2] });
    env.setCamera({ position: [-3.5, 2.2, 4.5], target: [0, 1.2, 0], fov: 50 });
    env.cameraRig.orbit({ start: 0, duration: 9, radius: 6.5, height: 2.4, angleFrom: 2.2, angleTo: 3.4, target: [0, 1.2, 0] });
    return env;
  },
  'city-street': async () => {
    const env = await createEnvironment({ environment: 'city-street', lighting: 'sunset', quality: 'low' });
    const ch = env.addCharacter('nendi', { position: [-4.9, 0, 4], pose: 'walk', expression: 'neutral', name: 'pedestrian' });
    env.addAnimation('walk-guide', (t) => {
      ch.group.position.z = 4 - t * 0.45;
    });
    env.cameraRig.follow(ch.group, { offset: [2.6, 1.8, 4.6], targetHeight: 1.3 });
    env.setCamera({ position: [-2.3, 1.8, 8.6], target: [-4.9, 1.3, 4], fov: 52 });
    return env;
  },
  'digital-world': async () => {
    const env = await createEnvironment({ environment: 'digital-world', lighting: 'neon', quality: 'low' });
    env.addCharacter('nendi', { position: [0, 2.06, 3], pose: 'explain', expression: 'confident', name: 'avatar' });
    env.setCamera({ position: [4.5, 3.0, 6.5], target: [0, 1.6, -1.5], fov: 52 });
    env.cameraRig.orbit({ start: 0, duration: 9, radius: 8, height: 3.2, angleFrom: 0.8, angleTo: 2.0, target: [0, 1.4, -1] });
    return env;
  },
};

export async function buildDemo(id) {
  const fn = DEMOS[id];
  if (!fn) throw new Error('Demo tidak ditemukan: ' + id);
  return fn();
}

export function listDemos() {
  return Object.keys(DEMOS);
}
