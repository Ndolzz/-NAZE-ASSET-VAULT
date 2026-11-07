/**
 * Perekam frame ke MP4 (H.264 yuv420p) melalui FFmpeg rawvideo RGBA.
 */
import { spawn } from 'node:child_process';

export class FrameRecorder {
  constructor(opts) {
    const o = opts || {};
    this.width = o.width;
    this.height = o.height;
    this.ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', this.width + 'x' + this.height,
      '-r', String(o.fps || 12),
      '-i', 'pipe:0',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      o.outFile || 'out.mp4',
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    this.ffmpeg.on('error', (e) => { this.error = e; });
  }

  writeFrame(rgba) {
    const buf = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
    if (this.ffmpeg.exitCode !== null && this.ffmpeg.exitCode !== undefined) {
      if (this.ffmpeg.exitCode === 0) return Promise.resolve();
      return Promise.reject(new Error('ffmpeg keluar dengan kode ' + this.ffmpeg.exitCode));
    }
    if (this.ffmpeg.stdin.write(buf)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const stdin = this.ffmpeg.stdin;
      const cleanup = () => { stdin.removeListener('drain', onDrain); stdin.removeListener('error', onError); };
      const onDrain = () => { cleanup(); resolve(); };
      const onError = () => {
        cleanup();
        if (this.ffmpeg.exitCode === 0) { resolve(); return; }
        this.ffmpeg.once('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('ffmpeg keluar dengan kode ' + code));
        });
      };
      stdin.once('drain', onDrain);
      stdin.once('error', onError);
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      const done = (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg keluar dengan kode ' + code)));
      if (this.ffmpeg.exitCode !== null && this.ffmpeg.exitCode !== undefined) return done(this.ffmpeg.exitCode);
      this.ffmpeg.once('close', done);
      this.ffmpeg.stdin.end();
    });
  }
}
