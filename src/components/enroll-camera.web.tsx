import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Angle, LivePreviewState } from '@/lib/face-quality';

type EnrollCameraProps = {
  hasEmployeeId: boolean;
  apiOnline: boolean;
  activeAngle: Angle;
  angleCaptured: boolean;
  onCapture: (uri: string) => void;
  onLiveQualityChange?: (state: LivePreviewState) => void;
};

export function EnrollCamera({
  activeAngle,
  hasEmployeeId,
  angleCaptured,
  onCapture,
  onLiveQualityChange,
}: EnrollCameraProps) {
  useEffect(() => {
    if (!hasEmployeeId) {
      onLiveQualityChange?.('need_id');
      return;
    }
    if (angleCaptured) {
      onLiveQualityChange?.('captured');
      return;
    }
    onLiveQualityChange?.('warmup');
    const t = setTimeout(() => onLiveQualityChange?.('ready'), 2000);
    return () => clearTimeout(t);
  }, [hasEmployeeId, angleCaptured, activeAngle, onLiveQualityChange]);

  return (
    <View className="overflow-hidden rounded-2xl border-2 border-[#1877F2]">
      <View className="h-56 items-center justify-center bg-[#E7F3FF]">
        <Text className="text-5xl">📷</Text>
        <Text className="mt-2 text-sm text-[#65676B]">Camera requires the iPhone app</Text>
      </View>
      <View className="flex-row items-center justify-between bg-[#1877F2] px-4 py-2.5">
        <Text className="text-sm text-white">{activeAngle}</Text>
        <Pressable
          onPress={() => onCapture(`mock://face-${activeAngle}-${Date.now()}.jpg`)}
          disabled={!hasEmployeeId || angleCaptured}
          className="rounded-lg bg-white px-4 py-1.5"
        >
          <Text className="text-sm font-bold text-[#1877F2]">Capture</Text>
        </Pressable>
      </View>
    </View>
  );
}
