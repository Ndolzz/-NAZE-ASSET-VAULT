/**
 * Environment sains & futuristik: laboratorium futuristik.
 */
import { makeRoom } from '../engine/environment/roomkit.js';

export function futuristicLab(env) {
  env.scene.add(makeRoom({ w: 10, d: 8, h: 3.6, floor: 'lab.floor', wall: 'tech.panel', wallOverride: { color: 0x1a2028 }, ceiling: false }).group);
  for (let i = 0; i < 7; i++) {
    env.addObject('grid-line', { position: [-3 + i, 0.01, 0] });
  }
  for (let i = 0; i < 5; i++) {
    env.addObject('grid-line', { position: [0, 0.01, -2 + i], rotation: [0, Math.PI / 2, 0], name: 'grid-line-z' + i });
  }
  env.addObject('lab-table', { position: [-2.6, 0, -1.6] });
  env.addObject('robot-arm', { position: [-2.6, 0.76, -1.6], env });
  env.addObject('lab-table', { position: [-2.6, 0, -0.4], name: 'lab-table-2' });
  env.addObject('glass-tube', { position: [-2.6, 0.78, -0.4] });
  env.addObject('lab-table', { position: [2.6, 0, -1.6], name: 'lab-table-3' });
  env.addObject('crystal', { position: [2.6, 0.78, -1.6], env });
  env.addObject('energy-core', { position: [0, 0, 0.2], env });
  env.addObject('holo-panel', { position: [0, 0, -3.6], env });
  env.addObject('holo-panel', { position: [-4.4, 0, -1], rotation: [0, Math.PI / 2, 0], env, name: 'holo-panel-2' });
  env.addObject('particle-field', { position: [0, 0, 0], count: 28, env });
  env.addObject('holo-ring', { position: [0, 0, 0.2], radius: 1.6, y: 2.6, env });
}
