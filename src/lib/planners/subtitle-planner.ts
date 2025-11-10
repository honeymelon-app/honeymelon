import type { ContainerRule } from '../container-rules';
import type { Preset, ProbeSummary } from '../types';

const SUBTITLE_CONVERT_CODEC = 'mov_text';

interface SubtitlePlanDecision {
  mode: 'drop' | 'copy' | 'convert';
  note: string;
}

function allowsAny(list: 'any' | string[] | undefined): boolean {
  if (!list || list === 'any') {
    return true;
  }
  return list.length > 0;
}

function subtitleCodecAllowed(list: 'any' | string[] | undefined, codec: string): boolean {
  if (!list || list === 'any') {
    return true;
  }
  return list.includes(codec);
}

export class SubtitlePlanner {
  plan(
    preset: Preset,
    containerRule: ContainerRule | undefined,
    summary: ProbeSummary,
    warnings: string[],
  ): SubtitlePlanDecision {
    const hasText = Boolean(summary.hasTextSubs);
    const hasImage = Boolean(summary.hasImageSubs);
    const hasAny = hasText || hasImage;
    const rule = containerRule?.subtitles;

    if (!preset.subs) {
      return {
        mode: 'drop',
        note: hasAny
          ? 'Subtitles: drop (preset has no subtitle policy).'
          : 'Subtitles: no streams detected.',
      };
    }

    switch (preset.subs.mode) {
      case 'keep': {
        if (!hasAny) {
          return {
            mode: 'copy',
            note: 'Subtitles: keep requested but no streams detected.',
          };
        }
        if (hasText && rule && !allowsAny(rule.text)) {
          warnings.push(
            `${preset.container} does not permit text subtitles; consider converting or burning in.`,
          );
        }
        if (hasImage && rule && !allowsAny(rule.image)) {
          warnings.push(`${preset.container} does not permit image subtitles; consider burn-in.`);
        }
        return {
          mode: 'copy',
          note: 'Subtitles: keep existing streams.',
        };
      }
      case 'convert': {
        if (!hasText) {
          warnings.push('No text subtitles available for conversion.');
        }
        if (hasImage) {
          warnings.push('Image-based subtitles detected; conversion to mov_text not supported.');
        }
        if (rule && !subtitleCodecAllowed(rule.text, SUBTITLE_CONVERT_CODEC)) {
          warnings.push(
            `${preset.container} container does not advertise ${SUBTITLE_CONVERT_CODEC}; conversion may fail.`,
          );
        }
        return {
          mode: 'convert',
          note: 'Subtitles: convert text streams to mov_text.',
        };
      }
      case 'burn': {
        warnings.push('Subtitle burn-in requested; execution layer must inject subtitle filters.');
        return {
          mode: 'drop',
          note: 'Subtitles: burn-in requested (planner defers to execution).',
        };
      }
      case 'drop':
        return {
          mode: 'drop',
          note: hasAny ? 'Subtitles: drop streams per preset.' : 'Subtitles: no streams detected.',
        };
      default:
        return {
          mode: 'drop',
          note: 'Subtitles: drop (unrecognized mode).',
        };
    }
  }
}

export { SUBTITLE_CONVERT_CODEC };
