import type { ContainerRule } from '../container-rules';
import type { Preset, ProbeSummary } from '../types';

const SUBTITLE_CONVERT_CODEC = 'mov_text';

export interface SubtitlePlanDecision {
  mode: 'drop' | 'copy' | 'convert';
  note: string;
  /** Whether image-based subtitles should be excluded from mapping */
  excludeImageStreams?: boolean;
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
        const containerSupportsMovText =
          !rule || subtitleCodecAllowed(rule?.text, SUBTITLE_CONVERT_CODEC);

        if (!hasAny) {
          return {
            mode: 'drop',
            note: 'Subtitles: no streams detected.',
          };
        }

        if (!hasText) {
          if (hasImage) {
            warnings.push('Only image-based subtitles detected; dropping for compatibility.');
          } else {
            warnings.push('No text subtitles available for conversion.');
          }
          return {
            mode: 'drop',
            note: 'Subtitles: drop (no convertible text streams).',
          };
        }

        if (!containerSupportsMovText) {
          warnings.push(
            `${preset.container} container does not advertise ${SUBTITLE_CONVERT_CODEC}; dropping subtitles to avoid failure.`,
          );
          return {
            mode: 'drop',
            note: `Subtitles: drop (target lacks ${SUBTITLE_CONVERT_CODEC} support).`,
          };
        }

        if (hasImage) {
          warnings.push('Image-based subtitles dropped; conversion only affects text streams.');
        }

        return {
          mode: 'convert',
          note: hasImage
            ? 'Subtitles: convert text streams to mov_text; drop image-based streams.'
            : 'Subtitles: convert text streams to mov_text.',
          excludeImageStreams: hasImage,
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
