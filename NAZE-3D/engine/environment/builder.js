/**
 * NazeEnvironment: Environment Builder API.
 * Menyusun lingkungan 3D, aset, karakter, kamera, animasi, dan render.
 */
import * as THREE from 'three';
import { applyLighting } from '../lighting/lighting.js';
import { CameraRig } from '../camera/camera.js';
import { Animator } from '../animation/animation.js';
import { CharacterBillboard } from '../characters/character.js';
import { createRenderer, readPixels, readPng, QUALITY_PROFILES } from '../renderer/renderer.js';
import { FrameRecorder } from '../renderer/video.js';
import { getAsset } from '../../assets-3d/index.js';
import { buildEnvironment, ENVIRONMENTS } from '../../environment/index.js';

export { makeFloor, makeWall, makeRoom } from './roomkit.js';

export class NazeEnvironment {
  constructor(opts) {
    const o = opts || {};
    this.environment = o.environment || 'digital-world';
    this.variant = o.variant || null;
    this.lighting = o.lighting || 'cinematic';
    this.quality = o.quality || 'low';
    const profile = QUALITY_PROFILES[this.quality] || QUALITY_PROFILES.low;
    this._sizes = { width: o.width || profile.width, height: o.height || profile.height };
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c12);
    this.camera = new THREE.PerspectiveCamera(45, this._sizes.width / this._sizes.height, 0.1, 400);
    this.camera.position.set(4, 2.5, 6);
    this.camera.lookAt(0, 1, 0);
    this.cameraRig = new CameraRig(this.camera);
    this.animator = new Animator();
    this.characters = new Map();
    this.objects = new Map();
    this.rendererHandle = null;
    this._time = 0;
    applyLighting(this.scene, this.lighting);
    if (this.environment !== 'none') {
      buildEnvironment(this, this.environment, this.variant);
    }
    this.metadata = {
      environment: this.environment,
      variant: this.variant,
      lighting: this.lighting,
      quality: this.quality,
    };
  }

  addObject(assetId, opts) {
    const asset = getAsset(assetId);
    if (!asset) throw new Error('Aset tidak ditemukan: ' + assetId);
    const o = opts || {};
    const obj = asset.factory(Object.assign({ env: this }, o));
    const p = o.position || [0, 0, 0];
    obj.position.set(p[0], p[1], p[2]);
    if (o.rotation) obj.rotation.set(o.rotation[0], o.rotation[1], o.rotation[2]);
    if (typeof o.scale === 'number') obj.scale.setScalar(o.scale);
    else if (Array.isArray(o.scale)) obj.scale.set(o.scale[0], o.scale[1], o.scale[2]);
    const key = o.name || assetId + ':' + (this.objects.size + 1);
    obj.name = key;
    this.objects.set(key, obj);
    this.scene.add(obj);
    return obj;
  }

  addCharacter(id, opts) {
    const o = Object.assign({}, opts || {});
    const ch = new CharacterBillboard({ id, pose: o.pose, expression: o.expression, billboard: o.billboard });
    const p = o.position || [0, 0, 0];
    ch.group.position.set(p[0], p[1], p[2]);
    if (o.lookAt) ch.face(o.lookAt);
    const key = o.name || id;
    this.characters.set(key, ch);
    this.scene.add(ch.group);
    return ch;
  }

  setCamera(opts) {
    const o = opts || {};
    if (o.preset) {
      this.cameraRig.set(o.preset);
    }
    if (o.position) {
      this.camera.position.set(o.position[0], o.position[1], o.position[2]);
      this.cameraRig.base.position = this.camera.position.clone();
    }
    if (o.target) {
      this.camera.lookAt(new THREE.Vector3(o.target[0], o.target[1], o.target[2]));
      this.cameraRig.base.target = new THREE.Vector3(...o.target);
    }
    if (o.fov) {
      this.camera.fov = o.fov;
      this.camera.updateProjectionMatrix();
    }
    return this;
  }

  addAnimation(name, tick) {
    return this.animator.add(name, tick);
  }

  update(dt, time) {
    this._time = time;
    this.animator.update(time, dt);
    this.cameraRig.update(time, dt);
    for (const ch of this.characters.values()) {
      ch.update(time, this.camera);
    }
    this.scene.updateMatrixWorld();
  }

  setRenderSize(width, height) {
    this._sizes = { width, height };
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.rendererHandle) {
      this.rendererHandle.width = width;
      this.rendererHandle.height = height;
      this.rendererHandle.renderer.setSize(width, height);
    }
  }

  async ensureRenderer() {
    if (!this.rendererHandle) {
      this.rendererHandle = await createRenderer(this._sizes.width, this._sizes.height);
      this.camera.aspect = this._sizes.width / this._sizes.height;
      this.camera.updateProjectionMatrix();
    }
    return this.rendererHandle;
  }

  async render() {
    const handle = await this.ensureRenderer();
    this.update(0, this._time);
    handle.renderer.render(this.scene, this.camera);
    return {
      pixels: readPixels(handle),
      png: () => readPng(handle),
      width: handle.width,
      height: handle.height,
    };
  }

  async renderVideo(opts) {
    const o = opts || {};
    if (o.width && o.height) this.setRenderSize(o.width, o.height);
    const handle = await this.ensureRenderer();
    const fps = o.fps || 12;
    const duration = o.duration || 3;
    const outFile = o.outFile || 'demo.mp4';
    const rec = new FrameRecorder({ width: handle.width, height: handle.height, fps, outFile });
    const total = Math.max(1, Math.round(duration * fps));
    const dt = 1 / fps;
    for (let i = 0; i < total; i++) {
      this.update(dt, i * dt);
      handle.renderer.render(this.scene, this.camera);
      await rec.writeFrame(readPixels(handle));
      if (o.onProgress) o.onProgress(i + 1, total);
    }
    await rec.close();
    return { frames: total, duration, fps, outFile };
  }

  dispose() {
    this.scene.clear();
    this.characters.clear();
    this.objects.clear();
    this.animator.clear();
    this.cameraRig.tracks = [];
    this.cameraRig.following = null;
  }
}

export function listEnvironmentIds() {
  return Object.keys(ENVIRONMENTS);
}

export async function createEnvironment(opts) {
  return new NazeEnvironment(opts || {});
}
