export type Angle = 'front' | 'left' | 'right';

export type AngleValidation = 'pending' | 'valid' | 'invalid' | 'unchecked';

export type LivePreviewState =
  | 'need_id'
  | 'warmup'
  | 'offline'
  | 'scanning'
  | 'no_face'
  | 'face_found'
  | 'ready'
  | 'captured';

export type QualityTier = 'poor' | 'fair' | 'good' | 'excellent';

const ANGLE_WEIGHT: Record<Angle, number> = { front: 45, left: 28, right: 27 };

const LIVE_SCORE: Record<LivePreviewState, number> = {
  need_id: 0,
  warmup: 5,
  offline: 22,
  scanning: 10,
  no_face: 6,
  face_found: 50,
  ready: 78,
  captured: 0,
};

export function computeEnrollmentQuality(
  captured: Partial<Record<Angle, boolean>>,
  validations: Partial<Record<Angle, AngleValidation>>,
  live: LivePreviewState,
  activeAngle: Angle
): { tier: QualityTier; label: string; percent: number; color: string; hint: string } {
  const count = (['front', 'left', 'right'] as Angle[]).filter((a) => captured[a]).length;

  let percent = 0;
  for (const angle of ['front', 'left', 'right'] as Angle[]) {
    if (!captured[angle]) continue;
    const w = ANGLE_WEIGHT[angle];
    const v = validations[angle];
    if (v === 'valid') percent += w;
    else if (v === 'invalid') percent += w * 0.3;
    else percent += w * 0.85;
  }

  if (count === 0) {
    percent = LIVE_SCORE[live];
  } else if (count < 3 && live !== 'captured') {
    percent = Math.max(percent, LIVE_SCORE[live] * 0.4 + percent);
  }

  percent = Math.min(100, Math.round(percent));

  let tier: QualityTier = 'poor';
  let label = 'Poor';
  let color = 'text-[#EF4444]';
  let hint = 'Enter Employee ID';

  const angleHint =
    activeAngle === 'front'
      ? 'Look straight at camera'
      : activeAngle === 'left'
        ? 'Turn your head LEFT'
        : 'Turn your head RIGHT';

  if (live === 'need_id') {
    hint = 'Enter Employee ID first';
    label = 'Waiting';
  } else if (live === 'warmup') {
    hint = `${angleHint} — get ready (2 sec)`;
    label = 'Preparing';
    color = 'text-[#65676B]';
  } else if (live === 'ready') {
    hint = `${angleHint} — tap Capture`;
    label = 'Good — ready';
    tier = 'good';
    color = 'text-[#22C55E]';
  } else if (live === 'face_found') {
    hint = `${angleHint} — hold still`;
    label = 'Fair — face detected';
    tier = 'fair';
    color = 'text-[#F59E0B]';
  } else if (live === 'no_face') {
    hint = `${angleHint} — no face in frame`;
    label = 'Poor — no face';
  } else if (live === 'offline') {
    hint = `${angleHint} — tap Capture when ready`;
    label = 'Fair — ready';
    tier = 'fair';
    color = 'text-[#F59E0B]';
    percent = Math.max(percent, 20);
  } else if (live === 'captured' && captured[activeAngle]) {
    const next =
      !captured.front
        ? 'front'
        : !captured.left
          ? 'left'
          : !captured.right
            ? 'right'
            : null;
    if (next) {
      hint = `${activeAngle} saved ✓ — now capture ${next.toUpperCase()}`;
    } else {
      hint = 'All angles captured — tap Save offline';
      label = 'Excellent';
      tier = 'excellent';
      color = 'text-[#22C55E]';
      percent = 100;
    }
    label = label === 'Poor' ? 'Good — saved' : label;
    tier = tier === 'poor' ? 'good' : tier;
    color = color === 'text-[#EF4444]' ? 'text-[#22C55E]' : color;
  }

  if (count === 1) {
    percent = Math.max(percent, 38);
    label = 'Fair — 1 of 3';
    tier = 'fair';
    color = 'text-[#F59E0B]';
    hint = captured.front ? 'Capture LEFT profile' : hint;
  }
  if (count === 2) {
    percent = Math.max(percent, 68);
    label = 'Good — 2 of 3';
    tier = 'good';
    color = 'text-[#22C55E]';
    hint = 'Capture RIGHT profile';
  }
  if (count === 3) {
    percent = 100;
    label = 'Excellent';
    tier = 'excellent';
    color = 'text-[#22C55E]';
    hint = 'All done — tap Save offline';
  }

  return { tier, label, percent, color, hint };
}
