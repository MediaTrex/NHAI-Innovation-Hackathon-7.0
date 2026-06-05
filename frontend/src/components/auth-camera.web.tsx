import { Pressable, Text, View } from 'react-native';

type AuthCameraProps = {
  onCapture: (uri: string) => void;
  disabled?: boolean;
};

export function AuthCamera({ onCapture, disabled }: AuthCameraProps) {
  return (
    <View className="h-64 items-center justify-center rounded-2xl border-2 border-dashed border-[#1877F2] bg-[#E7F3FF]">
      <Text className="mb-2 text-center text-sm text-[#65676B]">Camera requires the iPhone app</Text>
      <Pressable
        disabled={disabled}
        onPress={() => onCapture('mock://web-verify-face')}
        className="rounded-xl bg-[#1877F2] px-6 py-3"
      >
        <Text className="font-bold text-white">Capture</Text>
      </Pressable>
    </View>
  );
}
