/**
 * Karakter NAZE (SVG Character Engine) sebagai billboard 3D.
 * Gunakan env.addCharacter(...) sebagai API utama.
 */
import { CharacterBillboard } from '../../engine/characters/character.js';

export const ASSETS = {
  nendi: {
    id: 'nendi',
    name: 'Nendi (karakter billboard SVG)',
    category: 'characters',
    factory: (opts) => new CharacterBillboard(Object.assign({ id: 'nendi' }, opts || {})).group,
  },
};
