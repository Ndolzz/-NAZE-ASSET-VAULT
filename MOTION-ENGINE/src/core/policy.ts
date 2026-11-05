/**
 * Global permanent NAZE policy loader and enforcement.
 * Project configuration can never silently disable mandatory requirements.
 */
import * as fs from "node:fs";

export interface NazePolicy {
  policyVersion: string;
  standards: {
    resolution: { width: number; height: number; aspectRatio: string };
    frameRate: { value: number; mode: string };
    video: { codec: string; pixelFormat: string; container: string };
    audio: { codec: string; narrationDominant: boolean; backgroundMusic: string };
    captions: { required: boolean; maxLines: number; syncRequired: boolean };
    illustrations: { required: boolean; everyScene: boolean };
    styles: { minCount: number };
    color: { blueDominanceForbidden: boolean };
    validation: { required: boolean; failOnViolation: boolean };
    quality: { motionRequired: boolean };
  };
  overrides: { allowed: boolean; onlyByExplicitUserInstruction: boolean; cliFlag: string; requiresReason: boolean };
}

export interface PolicyViolation {
  rule: string;
  detail: string;
}

export function loadPolicy(path: string): NazePolicy {
  const raw = fs.readFileSync(path, "utf-8");
  const policy = JSON.parse(raw) as NazePolicy;
  if (!policy.standards || !policy.standards.resolution) {
    throw new Error(`Invalid NAZE policy file: ${path}`);
  }
  return policy;
}

export interface PolicyCheckInput {
  resolution: { width: number; height: number };
  fps: number;
  profileId: string;
  hasCaptions: boolean;
  hasIllustrationsPerScene: boolean;
  backgroundMusicExplicit: boolean;
  styleCount: number;
}

export interface ExplicitOverride {
  flag: string;
  reason: string;
}

/**
 * Validates a project configuration against the permanent policy.
 * Returns the list of violations; empty means compliant.
 * Only a user-supplied --explicit-override with a reason may bypass, and the bypass is logged.
 */
export function validateAgainstPolicy(
  policy: NazePolicy,
  input: PolicyCheckInput,
  override?: ExplicitOverride
): { violations: PolicyViolation[]; overriddenRules: string[] } {
  const violations: PolicyViolation[] = [];
  const s = policy.standards;

  if (input.resolution.width < s.resolution.width || input.resolution.height < s.resolution.height) {
    violations.push({
      rule: "resolution",
      detail: `Resolution ${input.resolution.width}x${input.resolution.height} is below the permanent standard ${s.resolution.width}x${s.resolution.height}. Secretly lowering quality is forbidden.`,
    });
  }
  if (Math.abs(input.resolution.width / input.resolution.height - 9 / 16) > 0.001) {
    violations.push({ rule: "aspect", detail: `Aspect ratio must be ${s.resolution.aspectRatio}.` });
  }
  if (input.fps !== s.frameRate.value) {
    violations.push({ rule: "fps", detail: `Frame rate must be ${s.frameRate.value} FPS ${s.frameRate.mode}.` });
  }
  if (s.captions.required && !input.hasCaptions) {
    violations.push({ rule: "captions", detail: "Closed captions are mandatory for narrated videos and cannot be skipped." });
  }
  if (s.illustrations.required && s.illustrations.everyScene && !input.hasIllustrationsPerScene) {
    violations.push({ rule: "illustrations", detail: "Every scene requires an original illustration (text-only scenes are forbidden)." });
  }
  if (input.styleCount < s.styles.minCount) {
    violations.push({ rule: "styles", detail: `Style library must expose at least ${s.styles.minCount} styles, found ${input.styleCount}.` });
  }

  if (violations.length === 0) return { violations, overriddenRules: [] };

  const overrideValid =
    !!override &&
    override.flag === policy.overrides.cliFlag &&
    policy.overrides.onlyByExplicitUserInstruction &&
    !!override.reason &&
    override.reason.trim().length >= 10;

  if (overrideValid) {
    console.warn(`[POLICY] Explicit user override applied (reason: ${override!.reason.trim()}).`);
    return { violations: [], overriddenRules: violations.map((v) => v.rule) };
  }
  return { violations, overriddenRules: [] };
}

export function assertPolicyCompliant(
  policy: NazePolicy,
  input: PolicyCheckInput,
  override?: ExplicitOverride
): string[] {
  const { violations } = validateAgainstPolicy(policy, input, override);
  if (violations.length > 0) {
    const lines = violations.map((v) => `  - [${v.rule}] ${v.detail}`).join("\n");
    throw new Error(`NAZE permanent policy violations:\n${lines}\nPolicy version: ${policy.policyVersion}`);
  }
  return [];
}
