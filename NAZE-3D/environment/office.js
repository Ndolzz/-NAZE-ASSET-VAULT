/**
 * Environment kantor: ruang kerja developer.
 */
import { makeRoom } from '../engine/environment/roomkit.js';

export function developerWorkspace(env) {
  env.scene.add(makeRoom({ w: 6, d: 6, h: 3.1, floor: 'home.floor', wall: 'home.wall', wallOverride: { color: 0xcfd6e4 } }).group);
  env.addObject('desk', { position: [0, 0, -2.3] });
  env.addObject('office-chair', { position: [0, 0, -1.55], rotation: [0, Math.PI, 0] });
  env.addObject('monitor', { position: [-0.4, 0.78, -2.45] });
  env.addObject('monitor', { position: [0.45, 0.78, -2.45], name: 'monitor-2' });
  env.addObject('keyboard', { position: [0, 0.78, -2.15], glow: true, env });
  env.addObject('mouse', { position: [0.55, 0.78, -2.12] });
  env.addObject('mug', { position: [-0.85, 0.78, -2.2] });
  env.addObject('pc-tower', { position: [1.15, 0, -2.5], env });
  env.addObject('coffee-table', { position: [1.9, 0, 0.2] });
  env.addObject('laptop', { position: [1.9, 0.42, 0.2], rotation: [0, -0.5, 0] });
  env.addObject('bookshelf', { position: [-2.85, 0, -1.4], rotation: [0, Math.PI / 2, 0] });
  env.addObject('whiteboard', { position: [2.95, 1.7, -0.8], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('potted-plant', { position: [-2.5, 0, 2.4] });
  env.addObject('floor-lamp', { position: [2.5, 0, 2.3] });
  env.addObject('rgb-strip', { position: [-2.97, 2.6, 0.4], env });
  env.addObject('tripod-camera', { position: [-2.2, 0, 0.6], rotation: [0, 0.8, 0] });
  env.addObject('desk-mic', { position: [-1.3, 0.78, -2.35] });
}
