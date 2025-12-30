import { describe, it, expect } from 'vitest';
import { ref } from 'vue';

import { planJob } from '@/lib/ffmpeg-plan';
import { PRESETS } from '@/lib/presets';
import type { ProbeSummary, CapabilitySnapshot } from '@/lib/types';
import { createPlannerClient } from '@/composables/orchestrator/planner-client';

const baseSummary: ProbeSummary = {
  durationSec: 120,
  width: 1920,
  height: 1080,
  fps: 30,
  vcodec: 'h264',
  acodec: 'aac',
};

describe('planner-client', () => {
  it('injects input paths for every preset decision', () => {
    const planner = createPlannerClient({
      simulate: true,
      capabilities: ref<CapabilitySnapshot | undefined>(undefined),
      requirePresetBeforeStart: false,
    });

    for (const preset of PRESETS) {
      const decision = planJob({ presetId: preset.id, summary: baseSummary });
      const sourcePath = `/tmp/input.${preset.container}`;
      const updated = planner.ensureDecisionHasInput(decision, sourcePath);

      const inputIndex = updated.ffmpegArgs.indexOf('-i');
      expect(inputIndex).toBeGreaterThanOrEqual(0);
      expect(updated.ffmpegArgs[inputIndex + 1]).toBe(sourcePath);
    }
  });
});
