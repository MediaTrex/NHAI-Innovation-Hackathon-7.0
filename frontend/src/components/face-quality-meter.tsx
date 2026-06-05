import { Text, View } from 'react-native';

import type { Angle } from '@/lib/face-quality';

type FaceQualityMeterProps = {
  percent: number;
  label: string;
  color: string;
  hint: string;
  activeAngle: Angle;
  captured: Partial<Record<Angle, boolean>>;
};

const steps: { key: Angle; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
];

export function FaceQualityMeter({
  percent,
  label,
  color,
  hint,
  activeAngle,
  captured,
}: FaceQualityMeterProps) {
  return (
    <View className="mt-3 rounded-2xl border border-[#E4E6EB] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-[#050505]">Face quality</Text>
        <Text className={`text-sm font-bold ${color}`}>
          {label} · {percent}%
        </Text>
      </View>

      <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E4E6EB]">
        <View className="h-full rounded-full bg-[#1877F2]" style={{ width: `${percent}%` }} />
      </View>

      <View className="mt-3 flex-row gap-2">
        {steps.map(({ key, label: stepLabel }) => {
          const done = !!captured[key];
          const active = activeAngle === key && !done;
          return (
            <View key={key} className="flex-1 items-center">
              <View
                className={`h-2 w-full rounded-full ${
                  done ? 'bg-[#22C55E]' : active ? 'bg-[#1877F2]' : 'bg-[#E4E6EB]'
                }`}
              />
              <Text
                className={`mt-1 text-[10px] font-semibold ${
                  done ? 'text-[#22C55E]' : active ? 'text-[#1877F2]' : 'text-[#65676B]'
                }`}
              >
                {stepLabel}
                {done ? ' ✓' : active ? ' ●' : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="mt-3 text-center text-xs text-[#65676B]">{hint}</Text>
    </View>
  );
}
