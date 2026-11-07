/**
 * Environment rumah: kamar tidur (modern/minimalis/gaming) & ruang keluarga.
 */
import { makeRoom } from '../engine/environment/roomkit.js';

function lampuBerdenyut(env, obj, name) {
  const light = obj.children.find((c) => c.isLight);
  if (light) {
    env.addAnimation(name, (t) => {
      light.intensity = 0.5 + Math.sin(t * 2.2) * 0.07;
    });
  }
}

export function modernBedroom(env, variant) {
  env.scene.add(makeRoom({ w: 6, d: 6, h: 3.1, floor: 'home.floor', wall: 'home.wall' }).group);
  env.addObject('bed', { position: [-1.5, 0, -1.8] });
  env.addObject('rug', { position: [-1.5, 0, -0.2] });
  env.addObject('wardrobe', { position: [-2.8, 0, 0.6], rotation: [0, Math.PI / 2, 0] });
  env.addObject('desk', { position: [1.8, 0, -2.4] });
  env.addObject('desk-chair', { position: [1.8, 0, -1.7], rotation: [0, Math.PI, 0] });
  env.addObject('monitor', { position: [1.8, 0.78, -2.5] });
  env.addObject('keyboard', { position: [1.8, 0.78, -2.28] });
  env.addObject('mouse', { position: [2.3, 0.78, -2.28] });
  env.addObject('wall-clock', { position: [0.4, 2.2, -2.96] });
  env.addObject('bookshelf', { position: [2.85, 0, 0.8], rotation: [0, -Math.PI / 2, 0] });
  env.addObject('window-frame', { position: [0.6, 1.6, -2.97] });
  if (variant !== 'minimalist') {
    lampuBerdenyut(env, env.addObject('table-lamp', { position: [2.45, 0.78, -2.5] }), 'lampu-meja-berdenyut');
    env.addObject('potted-plant', { position: [2.5, 0, 2.4] });
  }
  if (variant === 'gaming') {
    env.addObject('pc-tower', { position: [2.35, 0, -2.6], env });
    env.addObject('rgb-strip', { position: [-2.98, 2.4, 0.6], env });
    env.addObject('rgb-strip', { position: [2.98, 2.4, -0.6], env, name: 'rgb-strip-2' });
    env.addObject('keyboard', { position: [1.8, 0.78, -2.24], glow: true, env, name: 'keyboard-glow' });
  }
}

export function livingRoom(env) {
  env.scene.add(makeRoom({ w: 7, d: 6, h: 3.1, floor: 'home.floor', wall: 'home.wall' }).group);
  env.addObject('sofa', { position: [0, 0, -2.2] });
  env.addObject('coffee-table', { position: [0, 0, -0.8] });
  env.addObject('rug', { position: [0, 0, -1.4] });
  env.addObject('tv', { position: [-2.85, 0, -0.5], rotation: [0, Math.PI / 2, 0] });
  lampuBerdenyut(env, env.addObject('floor-lamp', { position: [2.8, 0, -2.2] }), 'lampu-lantai-berdenyut');
  env.addObject('potted-plant', { position: [3, 0, 2.3] });
  env.addObject('window-frame', { position: [0, 1.7, -2.97] });
  env.addObject('bookshelf', { position: [2.85, 0, 0.6], rotation: [0, -Math.PI / 2, 0] });
}
