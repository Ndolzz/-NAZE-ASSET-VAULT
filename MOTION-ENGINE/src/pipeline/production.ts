/**
 * Production pipeline: nine stages from policy to validation.
 * Every stage logs progress so GitHub Actions output shows clear status.
 *
 * Narration engines:
 *   - "file": manual voice recording per project (user-supplied); the track
 *     plays continuously and CC cue durations are estimated from the text.
 *   - "espeak-ng": CI demo synthesis, per-cue measurement, exact CC sync.
 * In both cases the narration track is assembled at final timeline positions.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadPolicy,
  assertPolicyCompliant,
  NazePolicy,
  ExplicitOverride,
} from "../core/policy";
import { getProfile, DEFAULT_PROFILE } from "../render/profiles";
import { resolveStyleMix, styleCount, registerStyle } from "../styles/registry";
import { resolvePalette, isBlueDominant, Palette } from "../color/palette";
import { StyleDef } from "../styles/types";
import { IllustrationManager } from "../illustration/manager";
import {
  buildTimeline,
  Timeline,
  SceneDef,
  SfxEvent,
} from "../core/timeline";
import { splitIntoCueTexts as splitCues } from "../captions/segmenter";
import {
  synthesizeCues,
  assembleNarrationTrack,
  cueWeight,
  NarrationConfig,
  TrackSegment,
} from "../audio/narration";
import { mixAudio } from "../audio/mixer";
import { renderVideo } from "../render/renderer";
import { toSrt, toVtt, cueCoverageOk } from "../captions/segmenter";
import { validateOutput, ValidationReport } from "../validation/validate";
import { probeDuration } from "../render/encoder";

interface ProjectFile {
  schema: "naze-project/2.0";
  name: string;
  /** Style id, [primaryId, ...accentIds], or a full custom StyleDef object. */
  style: string | string[] | StyleDef;
  palette: string | Palette;
  profile?: string;
  animationIntensity?: number;
  accentWords?: boolean;
  burnInCc?: boolean;
  /** Explicit background music; absent means no music (permanent policy). */
  musicFile?: string;
  narration: {
    engine: string;
    language?: string;
    voice?: string;
    speed?: number;
    pitch?: number;
    /** Repository-relative path to the manual voice recording. */
    file?: string;
  };
  scenes: SceneDef[];
}

export interface ProduceOptions {
  projectDir: string;
  outDir: string;
  repoRoot: string;
  policyFile?: string;
  profileOverride?: string;
  explicitOverride?: string;
}

export interface ProductionResult {
  pass: boolean;
  outFile: string;
  reportFile: string;
  validation: ValidationReport;
  duration: number;
  frames: number;
  illustrations: { total: number; reused: number };
  styleId: string;
  paletteId: string;
  profileId: string;
}

/** Manual-voice engines play cues contiguously; padding lives only at the head/tail. */
const FILE_ENGINE_LEAD_PAD = 0.25;
const FILE_ENGINE_END_PAD = 1.2;
/** Synthesized engines insert breathing room between scenes. */
const SYNTH_TAIL_PAD = 0.45;
const SYNTH_LEAD_PAD = 0.25;

export async function produceVideo(opts: ProduceOptions): Promise<ProductionResult> {
  const projectDir = path.resolve(opts.projectDir);
  const outDir = path.resolve(opts.outDir);
  const workDir = path.join(outDir, "work");
  fs.mkdirSync(workDir, { recursive: true });

  // Stage 1: permanent policy
  console.log("[STAGE 1/9] Memuat kebijakan global permanen NAZE...");
  const policyFile =
    opts.policyFile ?? process.env.NAZE_POLICY ?? path.join(opts.repoRoot, "naze.policy.json");
  const policy: NazePolicy = loadPolicy(policyFile);

  // Stage 2: project, style, palette, profile
  console.log("[STAGE 2/9] Memuat proyek dan menyelesaikan style, palet, dan profil...");
  const projectPath = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectPath)) throw new Error(`project.json tidak ditemukan di ${projectDir}`);
  const project: ProjectFile = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
  const styleField =
    typeof project.style === "object" && !Array.isArray(project.style)
      ? (() => {
          const custom = project.style as StyleDef;
          registerStyle(custom);
          return custom.id;
        })()
      : project.style;
  const styleMix = resolveStyleMix(styleField);
  const style: StyleDef = styleMix.primary;
  const palette = resolvePalette(project.palette);
  if (isBlueDominant(palette)) {
    console.warn(
      `[POLICY] Peringatan: palet "${palette.id}" didominasi biru. Kebijakan permanen NAZE melarang dominasi biru permanen.`
    );
  }
  const profile = getProfile(opts.profileOverride ?? project.profile ?? DEFAULT_PROFILE);
  const animationIntensity = project.animationIntensity ?? 1;
  const accentWords = project.accentWords !== false;

  // Stage 3: illustration planning + policy enforcement
  console.log("[STAGE 3/9] Merencanakan ilustrasi orisinal dan menegakkan kebijakan...");
  const manager = new IllustrationManager();
  const plans = manager.planScenes(project.scenes, style, palette.id);
  const hasNarration = project.scenes.some((s) => (s.narration ?? "").trim().length > 0);
  const override: ExplicitOverride | undefined = opts.explicitOverride
    ? { flag: "--explicit-override", reason: opts.explicitOverride }
    : undefined;
  assertPolicyCompliant(
    policy,
    {
      resolution: { width: profile.width, height: profile.height },
      fps: profile.fps,
      profileId: profile.id,
      hasCaptions: hasNarration,
      hasIllustrationsPerScene: manager.hasIllustrationPerScene(plans),
      backgroundMusicExplicit: !!project.musicFile,
      styleCount: styleCount(),
    },
    override
  );

  // Stage 4: narration + CC cue durations (manual voice or per-cue synthesis)
  const narrConfig: NarrationConfig = {
    engine: project.narration.engine as NarrationConfig["engine"],
    language: project.narration.language,
    voice: project.narration.voice,
    speed: project.narration.speed,
    pitch: project.narration.pitch,
    file: project.narration.file,
  };
  const cueDurations = new Map<string, number[]>();
  let trackSegments: TrackSegment[] = [];
  let timeline0: Timeline;

  if (narrConfig.engine === "file") {
    console.log("[STAGE 4/9] Memuat narasi manual dan menaksir durasi tiap cue CC...");
    const narrFile = narrConfig.file
      ? path.isAbsolute(narrConfig.file)
        ? narrConfig.file
        : path.resolve(opts.repoRoot, narrConfig.file)
      : path.join(projectDir, "narration.mp3");
    if (!fs.existsSync(narrFile)) {
      throw new Error(`Berkas narasi manual tidak ditemukan: ${narrFile}`);
    }
    const scenesWithoutNarration = project.scenes.filter(
      (s) => splitCues(s.narration ?? "").length === 0
    );
    if (scenesWithoutNarration.length > 0) {
      throw new Error(
        `Engine narasi "file" menuntut teks narasi pada setiap scene. Scene tanpa narasi: ${scenesWithoutNarration
          .map((s) => s.id)
          .join(", ")}.`
      );
    }
    const speechDuration = await probeDuration(narrFile);
    let totalWeight = 0;
    for (const scene of project.scenes) {
      totalWeight += splitCues(scene.narration ?? "").reduce((a, t) => a + cueWeight(t), 0);
    }
    if (totalWeight <= 0) {
      throw new Error("Teks narasi kosong: tidak ada cue yang bisa ditaksir.");
    }
    for (const scene of project.scenes) {
      const texts = splitCues(scene.narration ?? "");
      const weights = texts.map((t) => cueWeight(t));
      cueDurations.set(
        scene.id,
        weights.map((w) => (w / totalWeight) * speechDuration)
      );
      console.log(
        `[STAGE 4/9] Scene ${scene.id}: ${texts.length} cue (taksiran dari berkas suara manual).`
      );
    }
    timeline0 = buildTimeline(
      project.scenes,
      cueDurations,
      profile.fps,
      0,
      FILE_ENGINE_LEAD_PAD,
      FILE_ENGINE_END_PAD
    );
    trackSegments = [{ file: narrFile, at: FILE_ENGINE_LEAD_PAD, duration: speechDuration }];
    console.warn(
      "[POLICY] Sinkronisasi CC pada narasi manual adalah taksiran berbasis bobot teks; pastikan teks narasi sama dengan isi rekaman."
    );
  } else {
    console.log("[STAGE 4/9] Membuat narasi dan mengukur durasi tiap cue CC...");
    const cueFiles: string[] = [];
    const cueMeasured: number[] = [];
    for (const scene of project.scenes) {
      const cueTexts = splitCues(scene.narration ?? "");
      if (cueTexts.length === 0) continue;
      const synth = await synthesizeCues(cueTexts, narrConfig, path.join(workDir, scene.id));
      cueDurations.set(
        scene.id,
        synth.cues.map((c) => c.duration)
      );
      synth.cues.forEach((c) => {
        cueFiles.push(c.wavFile);
        cueMeasured.push(c.duration);
      });
      console.log(`[STAGE 4/9] Scene ${scene.id}: ${cueTexts.length} cue tersintesis.`);
    }
    timeline0 = buildTimeline(
      project.scenes,
      cueDurations,
      profile.fps,
      SYNTH_TAIL_PAD,
      SYNTH_LEAD_PAD
    );
    // Align every cue to its final timeline position; scene padding becomes silence.
    trackSegments = timeline0.cues.map((cue, i) => ({
      file: cueFiles[i],
      at: cue.start,
      duration: cueMeasured[i],
    }));
  }

  // Stage 5: audio mix - narration dominant, SFX synced, no auto music
  console.log("[STAGE 5/9] Mencampur audio: narasi dominan, SFX sinkron, tanpa musik otomatis...");
  const narrationFile = path.join(workDir, "narration.wav");
  await assembleNarrationTrack(trackSegments, narrationFile);
  const sfxResolved: SfxEvent[] = timeline0.sfx.map((e) => ({
    file: path.isAbsolute(e.file) ? e.file : path.resolve(opts.repoRoot, e.file),
    volume: e.volume,
    at: e.at,
  }));
  const mixedAudio = path.join(workDir, "mixed.wav");
  await mixAudio({
    narrationFile,
    sfx: sfxResolved,
    outFile: mixedAudio,
    musicFile: project.musicFile
      ? path.isAbsolute(project.musicFile)
        ? project.musicFile
        : path.resolve(opts.repoRoot, project.musicFile)
      : null,
  });
  const narrationDuration = await probeDuration(mixedAudio);

  // Stage 6: timeline assembly
  console.log("[STAGE 6/9] Timeline scene, keyframe, dan transisi siap.");
  const timeline: Timeline = timeline0;

  // Stage 7: native-resolution render
  console.log(
    `[STAGE 7/9] Merender ${profile.width}x${profile.height} @ ${profile.fps} FPS CFR, style "${style.id}"...`
  );
  const outFile = path.join(outDir, `${project.name}.mp4`);
  const { frames, duration } = await renderVideo({
    profile,
    timeline,
    palette,
    style,
    repoRoot: opts.repoRoot,
    outFile,
    mixedAudioFile: mixedAudio,
    title: project.name,
    animationIntensity,
    burnInCc: project.burnInCc !== false,
    accentWords,
  });

  // Stage 8: CC sidecars (SRT + VTT)
  console.log("[STAGE 8/9] Menulis sidecar CC (SRT + VTT)...");
  const srtFile = path.join(outDir, `${project.name}.srt`);
  const vttFile = path.join(outDir, `${project.name}.vtt`);
  fs.writeFileSync(srtFile, toSrt(timeline.cues), "utf-8");
  fs.writeFileSync(vttFile, toVtt(timeline.cues), "utf-8");
  const fullNarration = project.scenes.map((s) => s.narration ?? "").join(" ");
  const coverageOk = cueCoverageOk(fullNarration, timeline.cues);

  // Stage 9: mandatory 12-point validation
  console.log("[STAGE 9/9] Validasi otomatis 12 titik...");
  const illustrationStats = manager.stats();
  const validation = await validateOutput({
    outFile,
    profile,
    hasNarration,
    srtFile,
    vttFile,
    cueCoverageOk: coverageOk,
    illustrationCount: illustrationStats.total,
    failedScenes: [],
    narrationDuration,
  });

  const reportFile = path.join(outDir, "render-report.json");
  fs.writeFileSync(
    reportFile,
    JSON.stringify(
      {
        project: project.name,
        style: style.id,
        styleAccents: styleMix.accents.map((a) => a.id),
        palette: palette.id,
        profile: profile.id,
        policyFile,
        policyVersion: policy.policyVersion,
        explicitOverride: opts.explicitOverride ?? null,
        narrationEngine: narrConfig.engine,
        duration,
        frames,
        illustrations: illustrationStats,
        cues: timeline.cues.length,
        validation,
      },
      null,
      2
    ),
    "utf-8"
  );

  if (!validation.pass) {
    const failed = validation.checks
      .filter((c) => !c.pass)
      .map((c) => `- [${c.id}] ${c.name}: ${c.detail}`)
      .join("\n");
    throw new Error(`Render dinyatakan GAGAL oleh validasi otomatis.\n${failed}`);
  }
  console.log("[DONE] Render dan seluruh validasi otomatis berhasil.");
  return {
    pass: true,
    outFile,
    reportFile,
    validation,
    duration,
    frames,
    illustrations: illustrationStats,
    styleId: style.id,
    paletteId: palette.id,
    profileId: profile.id,
  };
}
