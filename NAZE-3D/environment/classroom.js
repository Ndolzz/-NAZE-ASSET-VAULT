/**
 * Environment pendidikan: ruang kelas, lab komputer, perpustakaan.
 */
import { makeRoom } from '../engine/environment/roomkit.js';

export function modernClassroom(env) {
  env.scene.add(makeRoom({ w: 8, d: 6, h: 3.2, floor: 'home.tile', wall: 'home.wall' }).group);
  env.addObject('blackboard', { position: [0, 1.5, -2.95] });
  env.addObject('desk', { position: [0, 0, -2.0], scale: [1.2, 1, 1.4] });
  env.addObject('desk-chair', { position: [0, 0, -2.65] });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const x = -1.4 + c * 2.8;
      const z = -0.6 + r * 1.4;
      env.addObject('desk', { position: [x, 0, z] });
      env.addObject('desk-chair', { position: [x, 0, z + 0.5], rotation: [0, Math.PI, 0] });
    }
  }
  env.addObject('laptop', { position: [0, 0.78, -2.1], rotation: [0, 0.4, 0] });
  env.addObject('bookshelf', { position: [3.9, 0, -1.5], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('wall-clock', { position: [-2.5, 2.4, -2.96] });
  env.addObject('door', { position: [3.98, 0, 1.8], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('window-frame', { position: [-3.96, 1.7, -0.5], rotation: [0, Math.PI / 2, 0] });
  const proyektor = env.addObject('projector', { position: [0, 2.9, 1.6], rotation: [0.35, Math.PI, 0] });
  const lensa = proyektor.children[proyektor.children.length - 1];
  if (lensa && lensa.material) {
    lensa.material.transparent = true;
    env.addAnimation('lensa-proyektor-berkedip', (t) => {
      lensa.material.opacity = 0.7 + Math.abs(Math.sin(t * 2.6)) * 0.3;
    });
  }
  env.addObject('potted-plant', { position: [-3.4, 0, 2.4] });
}

export function computerLab(env) {
  env.scene.add(makeRoom({ w: 8, d: 6, h: 3.2, floor: 'home.tile', wall: 'home.wall' }).group);
  env.addObject('dashboard-screen', { position: [0, 1.6, -2.95] });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = -2 + c * 2;
      const z = -1.2 + r * 1.6;
      env.addObject('desk', { position: [x, 0, z], scale: [1.1, 1, 1.1] });
      env.addObject('monitor', { position: [x, 0.78, z - 0.15] });
      env.addObject('keyboard', { position: [x, 0.78, z + 0.15] });
      env.addObject('office-chair', { position: [x, 0, z + 0.75], rotation: [0, Math.PI, 0] });
    }
  }
  env.addObject('pc-tower', { position: [-3.5, 0, 2.2], env });
  env.addObject('window-frame', { position: [3.96, 1.7, -0.5], rotation: [0, -Math.PI / 2, 0] });
}

export function library(env) {
  env.scene.add(makeRoom({ w: 9, d: 7, h: 3.4, floor: 'home.floor', wall: 'home.wall' }).group);
  for (let i = 0; i < 4; i++) {
    env.addObject('bookshelf', { position: [-3 + i * 2, 0, -2.6], rotation: [0, Math.PI, 0] });
  }
  env.addObject('desk', { position: [-1.2, 0, 1.4] });
  env.addObject('desk', { position: [1.8, 0, 1.4], name: 'desk-2' });
  env.addObject('desk-chair', { position: [-1.2, 0, 2.0], rotation: [0, Math.PI, 0] });
  env.addObject('desk-chair', { position: [1.8, 0, 2.0], rotation: [0, Math.PI, 0], name: 'desk-chair-2' });
  env.addObject('laptop', { position: [-1.2, 0.78, 1.4] });
  for (const [x, z] of [[-3.8, 2.8], [3.8, 2.8]]) {
    env.addObject('potted-plant', { position: [x, 0, z] });
  }
  env.addObject('wall-clock', { position: [0, 2.5, -3.46] });
  env.addObject('window-frame', { position: [4.46, 1.7, 0], rotation: [0, -Math.PI / 2, 0] });
}
