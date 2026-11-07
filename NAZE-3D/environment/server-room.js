/**
 * Environment teknologi: ruang server & data center.
 */
import { makeRoom } from '../engine/environment/roomkit.js';
import { cyl, mesh } from '../engine/modeling/procedural.js';
import { mat } from '../engine/materials/materials.js';

export function serverRoom(env, variant) {
  env.scene.add(makeRoom({ w: 8, d: 10, h: 3.2, floor: 'lab.floor', wall: 'tech.panel', floorOverride: { color: 0x23272e } }).group);
  for (let i = 0; i < 3; i++) {
    env.addObject('light-strip', { position: [0, 3.18, -3.5 + i * 3] });
  }
  const count = variant === 'data-center' ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const z = -3.5 + Math.floor(i / 4) * 5 + (i % 4) * 1.1;
    env.addObject('server-rack', { position: [-2.8, 0, z], rotation: [0, Math.PI / 2, 0], env });
  }
  if (variant === 'data-center') {
    for (let i = 0; i < 4; i++) {
      env.addObject('server-rack', { position: [2.8, 0, -3.5 + i * 1.1], rotation: [0, -Math.PI / 2, 0], env });
    }
  }
  env.addObject('desk', { position: [2.4, 0, -1.5], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('monitor', { position: [2.45, 0.78, -1.5], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('keyboard', { position: [2.15, 0.78, -1.5], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('office-chair', { position: [1.6, 0, -1.5], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('dashboard-screen', { position: [3.95, 1.9, -3], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('holo-ring', { position: [0.8, 0, 0.5], radius: 0.9, y: 1.3, env });
  env.addObject('router', { position: [2.4, 0.78, -0.9] });
  env.addObject('patch-panel', { position: [3.98, 2.0, 1.5], rotation: [0, -Math.PI / 2, 0] });
  const cableMat = mat('plastic.black');
  for (let i = 0; i < 3; i++) {
    env.scene.add(mesh(cyl(0.015, 0.015, 3.2, 6), cableMat, [-2.4, 0.06 + i * 0.02, -3 + i * 1.4], [Math.PI / 2, 0, 0]));
  }
}
