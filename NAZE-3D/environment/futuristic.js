/**
 * Environment futuristik & abstrak: dunia digital.
 */
import { makeFloor } from '../engine/environment/roomkit.js';

export function digitalWorld(env) {
  env.scene.add(makeFloor(40, 40, 'lab.floor', { color: 0x05070c }));
  for (let i = 0; i < 9; i++) {
    env.addObject('grid-line', { position: [-8 + i * 2, 0.01, 0], scale: [1, 1, 2] });
    env.addObject('grid-line', { position: [0, 0.01, -8 + i * 2], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 2], name: 'grid-line-z' + i });
  }
  env.addObject('energy-core', { position: [0, 0, -4], env });
  const platY = [1.2, 2.0, 1.4];
  const plats = [];
  for (let i = 0; i < 3; i++) {
    const pos = [[-3, 1.5], [0, 3], [3, 1]][i];
    plats.push(env.addObject('floating-platform', { position: [pos[0], platY[i], pos[1]] }));
  }
  env.addAnimation('platform-bob', (t) => {
    for (let i = 0; i < plats.length; i++) {
      plats[i].position.y = platY[i] + Math.sin(t * 1.2 + i * 2) * 0.18;
    }
  });
  for (const [x, z] of [[-5, -2], [5, -2], [-5, 3], [5, 3]]) {
    env.addObject('data-pillar', { position: [x, 0, z], env });
  }
  env.addObject('particle-field', { position: [0, 0, -2], count: 36, color: 0x8b5cf6, env });
  env.addObject('holo-ring', { position: [0, 0, -4], radius: 2.2, y: 1.6, env });
  env.addObject('crystal', { position: [0, 0, 2.5], env });
}
