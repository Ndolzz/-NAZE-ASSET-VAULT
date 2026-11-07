# NAZE 3D Environment & Asset Library

Sistem produksi motion graphics 3D berbasis JavaScript ES Modules dan three.js.
Semua aset dibuat secara prosedural sehingga tidak memerlukan unduhan model besar.
Dirancang agar dapat dijalankan di CI GitHub Actions dan perangkat Termux Android (ARMv7).

## Arsitektur

```
NAZE-3D/
  engine/
    modeling/procedural.js   Geometri prosedural dengan cache reuse
    materials/materials.js   Pustaka material bernama + material bercahaya
    lighting/lighting.js     11 preset pencahayaan (daylight .. dramatic)
    camera/camera.js         CameraRig: preset, dolly, pan, zoom, orbit, follow
    animation/animation.js   Timeline keyframe Animator
    physics/physics.js       AABB collision, grounding, pushApart
    environment/roomkit.js   makeFloor / makeWall / makeRoom
    environment/builder.js   NazeEnvironment + createEnvironment
    renderer/renderer.js     SoftwareRenderer three.js headless + profil kualitas
    renderer/video.js        FrameRecorder FFmpeg (rawvideo -> libx264)
    characters/character.js  SVG Character Engine + CharacterBillboard
  assets-3d/                 Registry aset (60+ aset, 7 kategori)
  environment/               20 environment dalam 8 kategori
  scenes/demos.js            8 demo siap render
  tests/qa.js                QA otomatis semua demo
  cli.js                     Render MP4 per demo
```

## API NazeEnvironment

```js
import { createEnvironment } from './engine/environment/builder.js';

const env = await createEnvironment({
  environment: 'server-room',  // lihat katalog di bawah
  variant: 'data-center',      // opsional
  lighting: 'dark-technology', // preset pencahayaan
  quality: 'low',              // low | medium | high
});

env.addObject('monitor', { position: [2, 1, -2], rotation: [0, 0.5, 0], scale: 1.2 });
env.addCharacter('nendi', { position: [0, 0, 2], pose: 'explaining', expression: 'confident' });
env.setCamera({ preset: 'medium', position: [5, 3, 8], target: [0, 1, 0], fov: 45 });
env.cameraRig.orbit({ duration: 8, radius: 7, height: 2.5, angleFrom: 0, angleTo: 1.6 });
env.addAnimation('kustom', (t) => { /* gerak objek per waktu t */ });

const frame = await env.render();          // { pixels, png(), width, height }
await env.renderVideo({ outFile: 'demo.mp4', duration: 3, fps: 12 });
env.dispose();                             // geometri & material cache tetap dipakai ulang
```

## Katalog Environment (20)

- Nature: tropical-forest, pine-forest, mountain, beach, desert, city-park
- Home: modern-bedroom, minimalist-bedroom, gaming-bedroom, living-room
- Technology: server-room, data-center
- Education: modern-classroom, computer-lab, library
- Office: developer-workspace
- Science: futuristic-laboratory
- Urban: city-street, cyberpunk-city
- Futuristic: digital-world

## Katalog Aset (60+)

- vegetation: palm-tree, pine-tree, broadleaf-tree, bush, grass-patch, flower, rock, cloud, water-plane (gelombang animatif), cactus, mountain-peak
- furniture: bed, wardrobe, desk, desk-chair, office-chair, sofa, coffee-table, tv, table-lamp, floor-lamp, bookshelf, rug, door, window-frame, wall-clock
- electronics: server-rack (LED + kipas animatif), monitor, keyboard, mouse, pc-tower, laptop, router, patch-panel, dashboard-screen, holo-ring, light-strip, rgb-strip
- buildings: building-block, house, road-strip, sidewalk, street-lamp, park-bench, traffic-light
- vehicles: car
- props: blackboard, whiteboard, projector, book, mug, potted-plant, lab-table, energy-core, robot-arm, crystal, holo-panel, glass-tube, floating-platform, data-pillar, particle-field, grid-line, tripod-camera, desk-mic
- characters: nendi (billboard SVG dengan pose stand/walk/sit/point/explain/hold)

## Kamera

Preset: wide, medium, closeUp, lowAngle, highAngle, orbit.
Gerakan: moveTo/dolly, pan, zoom, orbit, follow.
Semua gerakan menerima start, duration, dan easing kustom.

## Pencahayaan

Preset: daylight, sunset, night, indoor-warm, indoor-cool, cinematic, neon, dark-technology, laboratory, natural, dramatic.

## Profil Kualitas

| Profil | Resolusi | Sasaran |
|---------|----------|---------|
| low | 360x640 | Termux ARMv7, QA cepat |
| medium | 540x960 | Perangkat menengah |
| high | 720x1280 | Render final |

## Degradasi perangkat lunak (renderer Software three.js)

- Bayangan dinamis tidak tersedia; CharacterBillboard memakai contact shadow manual.
- InstancedMesh tidak tersedia; penggantinya cache geometri bersama (geometryStats di QA).
- Depth of field dan bloom tidak tersedia (no-op).

## Menjalankan di Termux

```bash
pkg install ffmpeg
cd NAZE-3D
npm install
node tests/qa.js --outDir ../RENDER-3D/qa
node cli.js --demo server-room,digital-world --frames 36 --fps 12
```

## CI

Workflow render-3d.yml menjalankan QA dan render semua demo pada setiap perubahan NAZE-3D, lalu mengunggah artefak naze-3d-render (PNG QA, MP4 demo, qa-report.json, catalog.json).

## Menambah Aset Baru

1. Tambahkan factory di assets-3d/<kategori>/<file>.js; origin di lantai pusat objek.
2. Daftarkan di objek ASSETS dalam file yang sama.
3. Impor dan gabungkan di assets-3d/index.js.
4. Aset animatif menerima opsi env dan mendaftarkan env.addAnimation sendiri.
