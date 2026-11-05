/**
 * Illustration asset management.
 * Guarantees every scene has original illustrations and keeps character/object
 * consistency across scenes by keying assets deterministically.
 */
import { Subject, SceneDef } from "../core/timeline";
import { StyleDef } from "../styles/types";

export interface IllustrationAsset {
  key: string;
  subject: Subject;
  styleId: string;
  firstSceneId: string;
  reusedIn: string[];
}

export interface SceneIllustrationPlan {
  sceneId: string;
  assets: IllustrationAsset[];
}

export class IllustrationManager {
  private assets = new Map<string, IllustrationAsset>();

  assetKey(subject: Subject, styleId: string, paletteId: string): string {
    const payload = JSON.stringify(subject);
    return `${styleId}|${paletteId}|${payload}`;
  }

  planScenes(scenes: SceneDef[], style: StyleDef, paletteId: string): SceneIllustrationPlan[] {
    return scenes.map((scene) => {
      if (!scene.subjects || scene.subjects.length === 0) {
        throw new Error(
          `Scene "${scene.id}" has no illustration subjects. Every scene requires an original illustration (NAZE permanent policy: no text-only videos).`
        );
      }
      const assets = scene.subjects.map((subject) => {
        const key = this.assetKey(subject, style.id, paletteId);
        const existing = this.assets.get(key);
        if (existing) {
          if (!existing.reusedIn.includes(scene.id)) existing.reusedIn.push(scene.id);
          return existing;
        }
        const asset: IllustrationAsset = {
          key,
          subject,
          styleId: style.id,
          firstSceneId: scene.id,
          reusedIn: [],
        };
        this.assets.set(key, asset);
        return asset;
      });
      return { sceneId: scene.id, assets };
    });
  }

  stats(): { total: number; reused: number } {
    let reused = 0;
    for (const a of this.assets.values()) if (a.reusedIn.length > 0) reused++;
    return { total: this.assets.size, reused };
  }

  hasIllustrationPerScene(plans: SceneIllustrationPlan[]): boolean {
    return plans.every((p) => p.assets.length > 0);
  }
}
