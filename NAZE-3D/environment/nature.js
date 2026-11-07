/**
 * Environment alam & luar ruangan.
 */
import { makeFloor } from '../engine/environment/roomkit.js';

function windAnimation(env, trees) {
  env.addAnimation('wind-sway', (t) => {
    for (let i = 0; i < trees.length; i++) {
      trees[i].rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.03;
    }
  });
}

function driftAnimation(env, clouds) {
  env.addAnimation('cloud-drift', () => {
    for (const c of clouds) {
      c.position.x = ((c.position.x + 0.006 + 14) % 28) - 14;
    }
  });
}

export function tropicalForest(env) {
  env.scene.add(makeFloor(60, 60, 'nature.grass'));
  const trees = [];
  for (const [x, z] of [[-3.2, -2], [-4.5, 1.5], [3.4, -3], [4.2, 1.2], [-1.5, -4.5], [2, 4]]) {
    trees.push(env.addObject('palm-tree', { position: [x, 0, z] }));
  }
  for (const [x, z] of [[-2, 2.5], [3.8, -0.8], [0.5, -3]]) {
    trees.push(env.addObject('broadleaf-tree', { position: [x, 0, z] }));
  }
  windAnimation(env, trees);
  for (const [x, z] of [[-1, 0.5], [1.6, 2.2], [2.6, -1.5], [-3, -0.5]]) {
    env.addObject('bush', { position: [x, 0, z] });
  }
  for (const [x, z, s] of [[-0.8, -1.2, 1.2], [2.8, 0.8, 0.8], [-4, 3.2, 1.5]]) {
    env.addObject('rock', { position: [x, 0, z], scale: s });
  }
  for (const [x, z] of [[-0.4, 1.6], [0.8, -2.2], [-2.2, 3]]) {
    env.addObject('flower', { position: [x, 0, z] });
  }
  const clouds = [];
  for (const [x, y, z] of [[-6, 7.5, -8], [5, 8.5, -12], [0, 7, -16]]) {
    clouds.push(env.addObject('cloud', { position: [x, y, z] }));
  }
  driftAnimation(env, clouds);
}

export function pineForest(env) {
  env.scene.add(makeFloor(60, 60, 'nature.grass', { color: 0x2f6b3a }));
  const trees = [];
  for (const [x, z] of [[-3, -3], [-1, -5], [1, -2], [3, -4], [-4, 1], [2, 2], [-2, 4], [4, 5]]) {
    trees.push(env.addObject('pine-tree', { position: [x, 0, z] }));
  }
  windAnimation(env, trees);
  for (const [x, z, s] of [[-0.5, 0.5, 1], [2.5, 3, 0.7], [-3.5, -1, 1.3]]) {
    env.addObject('rock', { position: [x, 0, z], scale: s });
  }
  const clouds = [];
  for (const [x, y, z] of [[-4, 8, -10], [4, 7, -14]]) {
    clouds.push(env.addObject('cloud', { position: [x, y, z] }));
  }
  driftAnimation(env, clouds);
}

export function mountain(env) {
  env.scene.add(makeFloor(80, 80, 'nature.rock'));
  for (const [x, z, r, h] of [[-8, -10, 9, 12], [4, -14, 7, 10], [12, -8, 6, 8], [-16, -4, 5, 7], [0, -22, 10, 14]]) {
    env.addObject('mountain-peak', { position: [x, 0, z], scale: [r / 5, h / 8, r / 5] });
  }
  for (const [x, z, s] of [[-2, 2, 1.4], [3, 4, 1], [-6, 6, 1.8]]) {
    env.addObject('rock', { position: [x, 0, z], scale: s });
  }
}

export function beach(env) {
  env.scene.add(makeFloor(60, 60, 'nature.sand'));
  env.addObject('water-plane', { position: [0, 0.02, -14], env });
  const trees = [];
  for (const [x, z] of [[-3, 2], [3, 4], [-1.5, 5], [4.5, 0]]) {
    trees.push(env.addObject('palm-tree', { position: [x, 0, z] }));
  }
  windAnimation(env, trees);
  const clouds = [];
  for (const [x, y, z] of [[-5, 8, -10], [5, 7.5, -13]]) {
    clouds.push(env.addObject('cloud', { position: [x, y, z] }));
  }
  driftAnimation(env, clouds);
}

export function desert(env) {
  env.scene.add(makeFloor(60, 60, 'nature.sand', { color: 0xd9b26a }));
  for (const [x, z, s] of [[-4, -3, 2.2], [3, -5, 1.6], [5, 2, 1.9], [-6, 4, 1.4]]) {
    env.addObject('rock', { position: [x, 0, z], scale: s });
  }
  for (const [x, z] of [[-1.5, 0.5], [2, 3], [-3.5, 5]]) {
    env.addObject('cactus', { position: [x, 0, z] });
  }
  const clouds = [];
  for (const [x, y, z] of [[-6, 9, -12], [6, 10, -16]]) {
    clouds.push(env.addObject('cloud', { position: [x, y, z] }));
  }
  driftAnimation(env, clouds);
}

export function cityPark(env) {
  env.scene.add(makeFloor(40, 40, 'nature.grass'));
  const trees = [];
  for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
    trees.push(env.addObject('broadleaf-tree', { position: [x, 0, z] }));
  }
  windAnimation(env, trees);
  env.addObject('road-strip', { position: [0, 0.01, 0], scale: [0.3, 1, 0.9] });
  env.addObject('park-bench', { position: [-1.6, 0, 1.2], rotation: [0, Math.PI / 2, 0] });
  env.addObject('park-bench', { position: [1.6, 0, -1.2], rotation: [0, -Math.PI / 2, 0], name: 'park-bench-2' });
  env.addObject('street-lamp', { position: [-2.2, 0, -1.5] });
  env.addObject('street-lamp', { position: [2.2, 0, 1.5], rotation: [0, Math.PI, 0], name: 'street-lamp-2' });
  for (const [x, z] of [[-1, -2.5], [1, 2.5], [-2.5, 0], [2.5, 0]]) {
    env.addObject('flower', { position: [x, 0, z] });
  }
}
