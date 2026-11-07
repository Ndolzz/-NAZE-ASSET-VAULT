/**
 * Sistem kamera: preset Framing Shot, gerakan dolly/pan/zoom/orbit/follow.
 */
import * as THREE from 'three';

export const CAMERA_PRESETS = {
  wide: { position: [6, 3, 8], target: [0, 1, 0], fov: 60 },
  medium: { position: [3, 1.8, 4], target: [0, 1.2, 0], fov: 45 },
  closeUp: { position: [1.2, 1.6, 1.8], target: [0, 1.5, 0], fov: 35 },
  lowAngle: { position: [2.5, 0.3, 3.5], target: [0, 1.6, 0], fov: 50 },
  highAngle: { position: [2, 5, 4], target: [0, 0.8, 0], fov: 50 },
  orbit: { position: [5, 2.5, 5], target: [0, 1, 0], fov: 50 },
};

const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.tracks = [];
    this.base = { position: camera.position.clone(), target: new THREE.Vector3(0, 1, 0) };
  }

  set(presetName) {
    const p = CAMERA_PRESETS[presetName] || CAMERA_PRESETS.medium;
    this.camera.position.set(p.position[0], p.position[1], p.position[2]);
    this.camera.lookAt(new THREE.Vector3(p.target[0], p.target[1], p.target[2]));
    if (p.fov) {
      this.camera.fov = p.fov;
      this.camera.updateProjectionMatrix();
    }
    this.base = { position: this.camera.position.clone(), target: new THREE.Vector3(...p.target) };
    return this;
  }

  moveTo(opts) {
    const o = opts || {};
    const from = o.from ? new THREE.Vector3(...o.from) : this.camera.position.clone();
    const to = new THREE.Vector3(...(o.to || [from.x, from.y, from.z]));
    const targetFrom = this.base.target.clone();
    const targetTo = o.target ? new THREE.Vector3(...o.target) : targetFrom.clone();
    this.tracks.push({
      start: o.start || 0,
      duration: o.duration || 4,
      ease: o.ease || easeInOut,
      tick: (k) => {
        this.camera.position.lerpVectors(from, to, k);
        this.base.target.lerpVectors(targetFrom, targetTo, k);
        this.camera.lookAt(this.base.target);
      },
    });
    this.base = { position: to.clone(), target: targetTo.clone() };
    return this;
  }

  dolly(opts) {
    return this.moveTo(opts);
  }

  pan(opts) {
    const o = opts || {};
    const from = this.base.target.clone();
    const to = new THREE.Vector3(...(o.to || [0, 1, 0]));
    this.tracks.push({
      start: o.start || 0,
      duration: o.duration || 3,
      ease: o.ease || easeInOut,
      tick: (k) => {
        this.base.target.lerpVectors(from, to, k);
        this.camera.lookAt(this.base.target);
      },
    });
    this.base = { position: this.camera.position.clone(), target: to.clone() };
    return this;
  }

  zoom(opts) {
    const o = opts || {};
    const fromFov = o.from ?? this.camera.fov;
    const toFov = o.to ?? this.camera.fov;
    this.tracks.push({
      start: o.start || 0,
      duration: o.duration || 2,
      ease: o.ease || easeInOut,
      tick: (k) => {
        this.camera.fov = fromFov + (toFov - fromFov) * k;
        this.camera.updateProjectionMatrix();
      },
    });
    return this;
  }

  orbit(opts) {
    const o = opts || {};
    const center = new THREE.Vector3(...(o.target || this.base.target.toArray()));
    const radius = o.radius ?? (this.camera.position.distanceTo(center) || 6);
    const height = o.height ?? this.camera.position.y;
    const a0 = o.angleFrom ?? Math.atan2(this.camera.position.z - center.z, this.camera.position.x - center.x);
    const a1 = o.angleTo ?? a0 + Math.PI / 2;
    this.tracks.push({
      start: o.start || 0,
      duration: o.duration || 6,
      ease: o.ease || ((x) => x),
      tick: (k) => {
        const a = a0 + (a1 - a0) * k;
        this.camera.position.set(center.x + Math.cos(a) * radius, height, center.z + Math.sin(a) * radius);
        this.camera.lookAt(center);
      },
    });
    return this;
  }

  follow(object3d, opts) {
    const o = opts || {};
    this.following = { object: object3d, offset: new THREE.Vector3(...(o.offset || [3, 2, 5])), target: o.targetHeight ?? 1.2 };
    return this;
  }

  update(time, dt) {
    for (const t of this.tracks) {
      if (time < t.start) continue;
      const k = Math.min(1, (time - t.start) / t.duration);
      t.tick(t.ease(k));
    }
    if (this.following && this.following.object) {
      const p = this.following.object.position;
      const off = this.following.offset;
      this.camera.position.set(p.x + off.x, p.y + off.y, p.z + off.z);
      this.camera.lookAt(p.x, p.y + this.following.target * 0.5, p.z);
    }
  }
}
