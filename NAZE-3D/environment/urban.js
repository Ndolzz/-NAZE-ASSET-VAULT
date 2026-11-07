/**
 * Environment perkotaan: jalan kota & varian cyberpunk.
 */
import { makeFloor } from '../engine/environment/roomkit.js';

function tandaiLantai(obj) {
  obj.traverse((o) => {
    o.userData.ground = true;
  });
}

export function cityStreet(env, variant) {
  env.scene.add(makeFloor(48, 40, 'city.sidewalk', { color: 0x6f7a85 }));
  tandaiLantai(env.addObject('road-strip', { position: [0, 0.01, 0] }));
  tandaiLantai(env.addObject('sidewalk', { position: [-4.2, 0.02, 0] }));
  tandaiLantai(env.addObject('sidewalk', { position: [4.2, 0.02, 0], name: 'sidewalk-2' }));
  const heights = [9, 7, 11, 8, 10, 6];
  for (let i = 0; i < 3; i++) {
    const z = -12 + i * 8;
    env.addObject('building-block', { position: [-7.5, 0, z], rotation: [0, Math.PI / 2, 0], w: 5, h: heights[i * 2], d: 5, seed: i + 1 });
    env.addObject('building-block', { position: [7.5, 0, z], rotation: [0, -Math.PI / 2, 0], w: 5, h: heights[i * 2 + 1], d: 5, seed: i + 5, name: 'building-r' + i });
  }
  for (let i = 0; i < 4; i++) {
    const z = -12 + i * 8;
    const left = i % 2 === 0;
    env.addObject('street-lamp', { position: [left ? -4.6 : 4.6, 0, z + 2], rotation: left ? [0, 0, 0] : [0, Math.PI, 0] });
  }
  env.addObject('park-bench', { position: [-4.8, 0, -3] });
  env.addObject('traffic-light', { position: [4.6, 0, -2] });
  env.addObject('car', { position: [2.6, 0, -4], rotation: [0, Math.PI, 0], color: 0xa5484d });
  env.addObject('car', { position: [2.6, 0, 2], rotation: [0, Math.PI, 0], color: 0x3b5b8c, name: 'car-2' });
  env.addObject('broadleaf-tree', { position: [-4.6, 0, 5] });
  env.addObject('broadleaf-tree', { position: [-4.6, 0, 8], name: 'broadleaf-tree-2' });
  if (variant === 'cyberpunk') {
    env.addObject('rgb-strip', { position: [-4.97, 3.4, -6], env });
    env.addObject('rgb-strip', { position: [4.97, 4.2, 2], env, name: 'rgb-strip-2' });
    env.addObject('dashboard-screen', { position: [-4.98, 2.2, 4], rotation: [0, Math.PI / 2, 0] });
  }
}
