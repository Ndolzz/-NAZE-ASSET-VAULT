/**
 * SVG Character Engine: karakter NAZE 2D digambar ke canvas menjadi tekstur
 * billboard 3D (plane transparan) yang kompatibel dengan kamera 3D.
 * Pose: stand, walk, sit, point, explain, hold.
 * Ekspresi: neutral, confident, happy, thinking.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as THREE from 'three';

const W = 256;
const H = 512;

const COLORS = {
  outline: '#1a1c22', skin: '#e8b98a', hair: '#262626', shirt: '#3f7fd6',
  pants: '#2c3242', shoes: '#1c1c22', accent: '#f97316',
};

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCharacter(ctx, pose, expression) {
  const cx = W / 2;
  const s = H / 512;
  const c = COLORS;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const limb = (x1, y1, x2, y2, w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(x1 * s, y1 * s);
    ctx.lineTo(x2 * s, y2 * s);
    ctx.stroke();
  };
  const polyLimb = (pts, w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * s, pts[i][1] * s);
    ctx.stroke();
  };

  let hipY = 330;
  let torsoTop = 240;
  if (pose === 'sit') { hipY = 360; torsoTop = 270; }

  // Kaki
  ctx.strokeStyle = c.outline;
  if (pose === 'sit') {
    polyLimb([[cx - 22, hipY], [cx - 52, hipY], [cx - 52, hipY + 110]], 20, c.pants);
    polyLimb([[cx + 22, hipY], [cx + 52, hipY], [cx + 52, hipY + 110]], 20, c.pants);
    ctx.fillStyle = c.shoes;
    ctx.fillRect((cx - 62) * s, (hipY + 104) * s, 22 * s, 12 * s);
    ctx.fillRect((cx + 42) * s, (hipY + 104) * s, 22 * s, 12 * s);
  } else if (pose === 'walk') {
    polyLimb([[cx - 16, hipY], [cx - 48, hipY + 150]], 20, c.pants);
    polyLimb([[cx + 16, hipY], [cx + 44, hipY + 138]], 20, c.pants);
    ctx.fillStyle = c.shoes;
    ctx.fillRect((cx - 58) * s, (hipY + 144) * s, 24 * s, 12 * s);
    ctx.fillRect((cx + 36) * s, (hipY + 132) * s, 24 * s, 12 * s);
  } else {
    limb(cx - 18, hipY, cx - 24, hipY + 152, 20, c.pants);
    limb(cx + 18, hipY, cx + 24, hipY + 152, 20, c.pants);
    ctx.fillStyle = c.shoes;
    ctx.fillRect((cx - 36) * s, (hipY + 146) * s, 26 * s, 12 * s);
    ctx.fillRect((cx + 12) * s, (hipY + 146) * s, 26 * s, 12 * s);
  }

  // Torso
  ctx.fillStyle = c.shirt;
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 4 * s;
  roundRectPath(ctx, (cx - 48) * s, torsoTop * s, 96 * s, (hipY - torsoTop + 16) * s, 18 * s);
  ctx.fill();
  ctx.stroke();

  // Lengan
  const shoulderY = torsoTop + 22;
  if (pose === 'point') {
    limb(cx - 40, shoulderY, cx - 52, shoulderY + 78, 16, c.shirt);
    polyLimb([[cx + 40, shoulderY], [cx + 112, shoulderY - 14], [cx + 128, shoulderY - 18]], 16, c.shirt);
  } else if (pose === 'explain') {
    polyLimb([[cx - 40, shoulderY], [cx - 78, shoulderY + 34], [cx - 66, shoulderY - 16]], 16, c.shirt);
    polyLimb([[cx + 40, shoulderY], [cx + 78, shoulderY + 34], [cx + 66, shoulderY - 16]], 16, c.shirt);
  } else if (pose === 'hold') {
    limb(cx - 40, shoulderY, cx - 48, shoulderY + 70, 16, c.shirt);
    polyLimb([[cx + 40, shoulderY], [cx + 74, shoulderY + 40], [cx + 52, shoulderY + 66]], 16, c.shirt);
    ctx.fillStyle = c.accent;
    roundRectPath(ctx, (cx + 34) * s, (shoulderY + 58) * s, 30 * s, 22 * s, 5 * s);
    ctx.fill();
    ctx.stroke();
  } else if (pose === 'walk') {
    limb(cx - 40, shoulderY, cx - 62, shoulderY + 52, 16, c.shirt);
    limb(cx + 40, shoulderY, cx + 62, shoulderY - 42, 16, c.shirt);
  } else if (pose === 'sit') {
    limb(cx - 40, shoulderY, cx - 50, shoulderY + 72, 16, c.shirt);
    limb(cx + 40, shoulderY, cx + 50, shoulderY + 72, 16, c.shirt);
  } else {
    limb(cx - 40, shoulderY, cx - 50, shoulderY + 78, 16, c.shirt);
    limb(cx + 40, shoulderY, cx + 50, shoulderY + 78, 16, c.shirt);
  }

  // Leher dan kepala
  limb(cx, torsoTop + 6, cx, torsoTop - 16, 14, c.skin);
  const headR = 44;
  const headY = torsoTop - 16 - headR + 6;
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(cx * s, headY * s, headR * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rambut
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.arc(cx * s, headY * s, (headR + 3) * s, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const hx = cx - 26 + i * 26;
    ctx.beginPath();
    ctx.moveTo((hx - 10) * s, (headY - headR + 6) * s);
    ctx.quadraticCurveTo(hx * s, (headY - headR - 16) * s, (hx + 12) * s, (headY - headR + 8) * s);
    ctx.closePath();
    ctx.fill();
  }

  // Wajah
  const eyeY = headY + 4;
  ctx.fillStyle = c.outline;
  const eye = (ex, ey) => { ctx.beginPath(); ctx.arc(ex * s, ey * s, 5 * s, 0, Math.PI * 2); ctx.fill(); };
  if (expression === 'thinking') {
    eye(cx - 16, eyeY - 8);
    eye(cx + 16, eyeY - 8);
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.arc(cx * s, (eyeY + 16) * s, 9 * s, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    eye(cx - 16, eyeY);
    eye(cx + 16, eyeY);
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    if (expression === 'happy') {
      ctx.arc(cx * s, (eyeY + 10) * s, 13 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (expression === 'confident') {
      ctx.arc(cx * s, (eyeY + 12) * s, 11 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    } else {
      ctx.moveTo((cx - 10) * s, (eyeY + 14) * s);
      ctx.lineTo((cx + 10) * s, (eyeY + 14) * s);
    }
    ctx.stroke();
  }
  if (expression === 'confident' || expression === 'thinking') {
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo((cx - 26) * s, (eyeY - 16) * s);
    ctx.lineTo((cx - 8) * s, (eyeY - 20) * s);
    ctx.moveTo((cx + 8) * s, (eyeY - 20) * s);
    ctx.lineTo((cx + 26) * s, (eyeY - 16) * s);
    ctx.stroke();
  }
}

export function makeCharacterTexture(opts) {
  const o = opts || {};
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawCharacter(ctx, o.pose || 'stand', o.expression || 'neutral');
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, canvas };
}

export class CharacterBillboard {
  constructor(opts) {
    const o = opts || {};
    this.id = o.id || 'nendi';
    this.name = o.name || this.id;
    this.pose = o.pose || 'stand';
    this.expression = o.expression || 'neutral';
    this.height = o.height || 1.7;
    this.billboard = o.billboard !== false;
    this.group = new THREE.Group();
    this.group.name = 'character:' + this.name;

    const tex = makeCharacterTexture({ pose: this.pose, expression: this.expression });
    this.texture = tex.texture;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.height * 0.52, this.height), this.material);
    this.mesh.position.y = this.height / 2;
    this.group.add(this.mesh);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(this.height * 0.2, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    this.group.add(shadow);
  }

  setPose(pose) {
    if (pose === this.pose) return this;
    this.pose = pose;
    const tex = makeCharacterTexture({ pose: this.pose, expression: this.expression });
    this.material.map.dispose();
    this.material.map = tex.texture;
    this.material.needsUpdate = true;
    return this;
  }

  setExpression(expression) {
    if (expression === this.expression) return this;
    this.expression = expression;
    const tex = makeCharacterTexture({ pose: this.pose, expression: this.expression });
    this.material.map.dispose();
    this.material.map = tex.texture;
    this.material.needsUpdate = true;
    return this;
  }

  face(target) {
    const dx = target[0] - this.group.position.x;
    const dz = target[2] - this.group.position.z;
    this.group.rotation.y = Math.atan2(dx, dz);
    return this;
  }

  update(time, camera) {
    if (this.billboard && camera) {
      this.group.rotation.y = Math.atan2(
        camera.position.x - this.group.position.x,
        camera.position.z - this.group.position.z
      );
    }
    if (this.pose === 'walk') {
      this.mesh.position.y = this.height / 2 + Math.abs(Math.sin(time * 7)) * 0.045;
    }
  }
}
