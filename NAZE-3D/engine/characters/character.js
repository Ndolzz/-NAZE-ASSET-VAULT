/**
 * SVG Character Engine: karakter NAZE 2D digambar ke kanvas resolusi ganda
 * (512x1024) menjadi tekstur billboard 3D. Detail wajah, tangan, sepatu,
 * dan gradien pakaian untuk tampilan realistis.
 * Pose: stand, walk, sit, point, explain, hold. Ekspresi: neutral, confident, happy, thinking.
 */
import { createCanvas } from '@napi-rs/canvas';
import * as THREE from 'three';

const DW = 256;
const DH = 512;
const RW = 512;
const RH = 1024;

const COLORS = {
  outline: '#1a1c22', skin: '#e8b98a', skinShade: '#d3a06c', hair: '#262626', hairLight: '#3d3d3d',
  shirt: '#3f7fd6', shirtDark: '#2f62a8', pants: '#2c3242', pantsLight: '#3a4156',
  shoes: '#1c1c22', accent: '#f97316', white: '#ffffff', eye: '#20242e',
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
  const cx = DW / 2;
  const c = COLORS;
  ctx.clearRect(0, 0, DW, DH);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const limb = (x1, y1, x2, y2, w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  const polyLimb = (pts, w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };
  const hand = (x, y) => {
    ctx.fillStyle = c.skin;
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  const shoe = (x, y, flip) => {
    ctx.fillStyle = c.shoes;
    roundRectPath(ctx, x, y, 28, 13, 5);
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = c.white;
    ctx.fillRect(x + 2, y + 8, 24, 4);
    ctx.strokeStyle = c.white;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + (flip ? 7 : 9), y + 3);
    ctx.lineTo(x + (flip ? 13 : 15), y + 6);
    ctx.moveTo(x + (flip ? 13 : 15), y + 3);
    ctx.lineTo(x + (flip ? 19 : 21), y + 6);
    ctx.stroke();
  };

  let hipY = 330;
  let torsoTop = 240;
  if (pose === 'sit') { hipY = 360; torsoTop = 270; }

  // Kaki dan sepatu
  if (pose === 'sit') {
    polyLimb([[cx - 22, hipY], [cx - 52, hipY], [cx - 52, hipY + 108]], 20, c.pants);
    polyLimb([[cx + 22, hipY], [cx + 52, hipY], [cx + 52, hipY + 108]], 20, c.pants);
    shoe(cx - 64, hipY + 104, true);
    shoe(cx + 42, hipY + 104, false);
  } else if (pose === 'walk') {
    polyLimb([[cx - 16, hipY], [cx - 48, hipY + 148]], 20, c.pants);
    polyLimb([[cx + 16, hipY], [cx + 44, hipY + 136]], 20, c.pants);
    limb(cx - 32, hipY + 60, cx - 44, hipY + 120, 16, c.pantsLight);
    shoe(cx - 60, hipY + 142, true);
    shoe(cx + 34, hipY + 130, false);
  } else {
    limb(cx - 18, hipY, cx - 24, hipY + 148, 20, c.pants);
    limb(cx + 18, hipY, cx + 24, hipY + 148, 20, c.pants);
    limb(cx - 21, hipY + 60, cx - 24, hipY + 120, 14, c.pantsLight);
    limb(cx + 21, hipY + 60, cx + 24, hipY + 120, 14, c.pantsLight);
    shoe(cx - 38, hipY + 142, true);
    shoe(cx + 10, hipY + 142, false);
  }

  // Torso dengan gradien
  const grad = ctx.createLinearGradient(0, torsoTop, 0, hipY + 16);
  grad.addColorStop(0, c.shirt);
  grad.addColorStop(1, c.shirtDark);
  ctx.fillStyle = grad;
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 4;
  roundRectPath(ctx, cx - 48, torsoTop, 96, hipY - torsoTop + 16, 18);
  ctx.fill();
  ctx.stroke();

  // Kerah dan garis kancing
  ctx.fillStyle = c.shirtDark;
  ctx.beginPath();
  ctx.moveTo(cx - 14, torsoTop + 2);
  ctx.lineTo(cx, torsoTop + 18);
  ctx.lineTo(cx + 14, torsoTop + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, torsoTop + 20);
  ctx.lineTo(cx, torsoTop + 58);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx - 7, torsoTop + 30 + i * 14, 2, 0, Math.PI * 2);
    ctx.arc(cx + 7, torsoTop + 37 + i * 14, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lengan
  const shoulderY = torsoTop + 22;
  if (pose === 'point') {
    limb(cx - 40, shoulderY, cx - 52, shoulderY + 76, 16, c.shirt);
    polyLimb([[cx + 40, shoulderY], [cx + 108, shoulderY - 12], [cx + 122, shoulderY - 16]], 16, c.shirt);
    hand(cx - 52, shoulderY + 84);
    limb(cx + 122, shoulderY - 16, cx + 134, shoulderY - 20, 7, c.skin);
    hand(cx + 134, shoulderY - 18);
  } else if (pose === 'explain') {
    polyLimb([[cx - 40, shoulderY], [cx - 76, shoulderY + 30], [cx - 66, shoulderY - 14]], 16, c.shirt);
    polyLimb([[cx + 40, shoulderY], [cx + 76, shoulderY + 30], [cx + 66, shoulderY - 14]], 16, c.shirt);
    hand(cx - 66, shoulderY - 20);
    hand(cx + 66, shoulderY - 20);
  } else if (pose === 'hold') {
    limb(cx - 40, shoulderY, cx - 48, shoulderY + 68, 16, c.shirt);
    polyLimb([[cx + 40, shoulderY], [cx + 72, shoulderY + 38], [cx + 52, shoulderY + 62]], 16, c.shirt);
    hand(cx - 48, shoulderY + 76);
    hand(cx + 52, shoulderY + 70);
    ctx.fillStyle = c.accent;
    roundRectPath(ctx, cx + 38, shoulderY + 56, 28, 20, 5);
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (pose === 'walk') {
    limb(cx - 40, shoulderY, cx - 62, shoulderY + 50, 16, c.shirt);
    limb(cx + 40, shoulderY, cx + 62, shoulderY - 40, 16, c.shirt);
    hand(cx - 62, shoulderY + 58);
    hand(cx + 62, shoulderY - 32);
  } else if (pose === 'sit') {
    limb(cx - 40, shoulderY, cx - 50, shoulderY + 70, 16, c.shirt);
    limb(cx + 40, shoulderY, cx + 50, shoulderY + 70, 16, c.shirt);
    hand(cx - 50, shoulderY + 78);
    hand(cx + 50, shoulderY + 78);
  } else {
    limb(cx - 40, shoulderY, cx - 50, shoulderY + 76, 16, c.shirt);
    limb(cx + 40, shoulderY, cx + 50, shoulderY + 76, 16, c.shirt);
    hand(cx - 50, shoulderY + 84);
    hand(cx + 50, shoulderY + 84);
  }

  // Leher dan kepala
  limb(cx, torsoTop + 6, cx, torsoTop - 14, 14, c.skin);
  const headR = 44;
  const headY = torsoTop - 14 - headR + 6;

  // Telinga
  ctx.fillStyle = c.skin;
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 3;
  for (const ex of [cx - headR - 2, cx + headR + 2]) {
    ctx.beginPath();
    ctx.arc(ex, headY + 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bayangan wajah sisi kanan
  ctx.fillStyle = 'rgba(190,140,90,0.35)';
  ctx.beginPath();
  ctx.arc(cx + 12, headY, headR - 8, -1.1, 1.1);
  ctx.closePath();
  ctx.fill();

  // Rambut belakang dan atas
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.arc(cx, headY - 2, headR + 2, Math.PI * 1.0, Math.PI * 2.0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, headY - headR + 10, headR + 2, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const hx = cx - 27 + i * 18;
    ctx.beginPath();
    ctx.moveTo(hx - 9, headY - headR + 8);
    ctx.quadraticCurveTo(hx, headY - headR - 12, hx + 11, headY - headR + 9);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = c.hairLight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx - 6, headY - 16, headR - 10, Math.PI * 1.15, Math.PI * 1.55);
  ctx.stroke();

  // Wajah detail
  const eyeY = headY + 6;
  const eye = (ex, ey, browLift) => {
    ctx.fillStyle = c.white;
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 10, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(ex + 1, ey + 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.white;
    ctx.beginPath();
    ctx.arc(ex + 2.5, ey - 0.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(ex - 11, ey - 11 - browLift);
    ctx.quadraticCurveTo(ex, ey - 15 - browLift * 1.4, ex + 11, ey - 10 - browLift * 0.4);
    ctx.stroke();
  };

  let browL = 0;
  let browR = 0;
  if (expression === 'happy') { browL = 3; browR = 3; }
  if (expression === 'confident') { browL = 4; browR = 0; }
  if (expression === 'thinking') { browL = -2; browR = 4; }
  eye(cx - 17, eyeY - (expression === 'thinking' ? 6 : 0), browL);
  eye(cx + 17, eyeY - (expression === 'thinking' ? 6 : 0), browR);

  // Hidung
  ctx.strokeStyle = c.skinShade;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + 1, eyeY + 4);
  ctx.lineTo(cx + 4, eyeY + 12);
  ctx.stroke();

  // Mulut per ekspresi
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 3.5;
  if (expression === 'happy') {
    ctx.fillStyle = '#7c3a3a';
    ctx.beginPath();
    ctx.arc(cx, eyeY + 16, 12, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.white;
    ctx.fillRect(cx - 7, eyeY + 17, 14, 3.5);
  } else if (expression === 'confident') {
    ctx.beginPath();
    ctx.moveTo(cx - 9, eyeY + 18);
    ctx.quadraticCurveTo(cx + 3, eyeY + 22, cx + 11, eyeY + 13);
    ctx.stroke();
  } else if (expression === 'thinking') {
    ctx.beginPath();
    ctx.arc(cx + 6, eyeY + 19, 4.5, Math.PI * 1.1, Math.PI * 2.1);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, eyeY + 13, 10, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  // Rona pipi untuk ekspresi happy
  if (expression === 'happy') {
    ctx.fillStyle = 'rgba(240,130,130,0.30)';
    for (const bx of [cx - 26, cx + 26]) {
      ctx.beginPath();
      ctx.ellipse(bx, eyeY + 9, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function makeCharacterTexture(opts) {
  const o = opts || {};
  const canvas = createCanvas(RW, RH);
  const ctx = canvas.getContext('2d');
  ctx.scale(RW / DW, RH / DH);
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
      new THREE.CircleGeometry(this.height * 0.22, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.userData.ground = true;
    shadow.userData.groundLayer = 2;
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
