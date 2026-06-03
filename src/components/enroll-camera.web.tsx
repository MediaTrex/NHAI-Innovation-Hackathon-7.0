import { Pressable, Text, View } from 'react-native';

type Angle = 'front' | 'left' | 'right';

type EnrollCameraProps = {
  angle: Angle;
  onCapture: (uri: string) => void;
};

const angleLabels: Record<Angle, string> = {
  front: 'Front face',
  left: 'Turn left',
  right: 'Turn right',
};

/** Web: mock capture for UI testing (no real camera). */
export function EnrollCamera({ angle, onCapture }: EnrollCameraProps) {
  const mockCapture = () => {
    onCapture(`mock://face-${angle}-${Date.now()}.jpg`);
  };

  return (
    <View className="overflow-hidden rounded-2xl border-2 border-[#1877F2]">
      <View className="h-56 items-center justify-center bg-[#E7F3FF]">
        <Text className="mb-2 text-5xl">📷</Text>
        <Text className="px-4 text-center text-sm text-[#65676B]">
          Web preview — use iPhone/Android build for real camera
        </Text>
      </View>
      <View className="flex-row items-center justify-between bg-[#1877F2] px-4 py-2.5">
        <Text className="text-sm font-medium text-white">{angleLabels[angle]}</Text>
        <Pressable onPress={mockCapture} className="rounded-lg bg-white px-4 py-1.5">
          <Text className="text-sm font-bold text-[#1877F2]">Mock capture</Text>
        </Pressable>
      </View>
    </View>
  );
}
