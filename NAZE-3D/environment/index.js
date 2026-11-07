/**
 * Registry environment: setiap entri adalah fungsi builder (env, variant).
 */
import * as nature from './nature.js';
import * as home from './home.js';
import * as serverRoomMod from './server-room.js';
import * as classroomMod from './classroom.js';
import * as office from './office.js';
import * as laboratory from './laboratory.js';
import * as urban from './urban.js';
import * as futuristic from './futuristic.js';

export const ENVIRONMENTS = {
  'tropical-forest': nature.tropicalForest,
  'pine-forest': nature.pineForest,
  mountain: nature.mountain,
  beach: nature.beach,
  desert: nature.desert,
  'city-park': nature.cityPark,
  'modern-bedroom': home.modernBedroom,
  'minimalist-bedroom': (env) => home.modernBedroom(env, 'minimalist'),
  'gaming-bedroom': (env) => home.modernBedroom(env, 'gaming'),
  'living-room': home.livingRoom,
  'server-room': serverRoomMod.serverRoom,
  'data-center': (env) => serverRoomMod.serverRoom(env, 'data-center'),
  'modern-classroom': classroomMod.modernClassroom,
  'computer-lab': classroomMod.computerLab,
  library: classroomMod.library,
  'developer-workspace': office.developerWorkspace,
  'futuristic-laboratory': laboratory.futuristicLab,
  'city-street': urban.cityStreet,
  'cyberpunk-city': (env) => urban.cityStreet(env, 'cyberpunk'),
  'digital-world': futuristic.digitalWorld,
};

export function buildEnvironment(env, id, variant) {
  const fn = ENVIRONMENTS[id];
  if (!fn) throw new Error('Environment tidak ditemukan: ' + id);
  fn(env, variant);
}

export function listEnvironments() {
  return Object.keys(ENVIRONMENTS);
}
