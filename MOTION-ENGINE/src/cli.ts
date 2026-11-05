/**
 * NAZE Motion Engine CLI.
 *
 * Commands:
 *   naze styles [topik]           - list all styles/palettes, or rank for a topic
 *   naze policy [file]            - show the active permanent policy
 *   naze render <projectDir>      - produce a video
 *
 * Render options:
 *   --out <dir>                   - output directory (default: <repo>/dist/<project>)
 *   --profile <id>                - vertical-1080 | vertical-1440 | vertical-2160
 *   --policy <file>               - path to naze.policy.json
 *   --explicit-override "<reason>" - bypass policy violations with a documented reason
 *
 * Environment:
 *   NAZE_REPO_ROOT                - repository root (default: inferred ../../ from src)
 *   NAZE_POLICY                   - default policy file path
 */
import * as path from "node:path";
import { listStyles, recommendStyles, styleCount } from "./styles/registry";
import { palettePresets, recommendPalette } from "./color/palette";
import { loadPolicy } from "./core/policy";
import { produceVideo } from "./pipeline/production";

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const repoRoot = process.env.NAZE_REPO_ROOT
    ? path.resolve(process.env.NAZE_REPO_ROOT)
    : path.resolve(__dirname, "..", "..");

  switch (cmd) {
    case "styles": {
      const topic = rest[0];
      console.log(`Style tersedia: ${styleCount()} (minimum kebijakan: 17)`);
      if (topic) {
        console.log(`\nRekomendasi style untuk topik "${topic}":`);
        for (const s of recommendStyles(topic, 5)) {
          console.log(`  ${s.id.padEnd(24)} - ${s.name}`);
        }
        const pal = recommendPalette(topic);
        console.log(`\nPalet yang direkomendasikan: ${pal.id} (${pal.name})`);
      } else {
        for (const s of listStyles()) {
          console.log(`  ${s.id.padEnd(24)} - ${s.name}: ${s.tagline}`);
        }
        console.log(`\nPalet warna tersedia:`);
        for (const p of palettePresets) {
          console.log(`  ${p.id.padEnd(24)} - ${p.name}: ${[p.background, p.primary, p.secondary, p.accent, p.text].join(", ")}`);
        }
      }
      break;
    }
    case "policy": {
      const file = rest[0] ?? process.env.NAZE_POLICY ?? path.join(repoRoot, "naze.policy.json");
      console.log(JSON.stringify(loadPolicy(file), null, 2));
      break;
    }
    case "render": {
      const projectDir = rest[0];
      if (!projectDir) {
        console.error(
          'Gunakan: naze render <projectDir> [--out dir] [--profile id] [--policy file] [--explicit-override "alasan"]'
        );
        process.exit(1);
      }
      const result = await produceVideo({
        projectDir,
        outDir:
          argValue(rest, "--out") ?? path.join(repoRoot, "dist", path.basename(path.resolve(projectDir))),
        repoRoot,
        policyFile: argValue(rest, "--policy"),
        profileOverride: argValue(rest, "--profile"),
        explicitOverride: argValue(rest, "--explicit-override"),
      });
      console.log(`\nOutput : ${result.outFile}`);
      console.log(`Durasi : ${result.duration.toFixed(2)}s (${result.frames} frame)`);
      console.log(`Style  : ${result.styleId} | Palet: ${result.paletteId} | Profil: ${result.profileId}`);
      console.log(`Laporan: ${result.reportFile}`);
      break;
    }
    default:
      console.log("NAZE Motion Engine v2");
      console.log("Perintah: styles [topik] | policy [file] | render <projectDir> [...opsi]");
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`\n[NAZE] GAGAL: ${err.message}`);
  process.exit(1);
});
