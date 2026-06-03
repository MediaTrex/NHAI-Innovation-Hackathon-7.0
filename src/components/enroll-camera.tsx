import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

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

export function EnrollCamera({ angle, onCapture }: EnrollCameraProps) {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View className="h-56 items-center justify-center rounded-2xl bg-[#E7F3FF] px-4">
        <Text className="mb-3 text-center text-sm text-[#65676B]">Camera permission required</Text>
        <Pressable onPress={requestPermission} className="rounded-xl bg-[#1877F2] px-5 py-2.5">
          <Text className="font-semibold text-white">Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View className="h-56 items-center justify-center rounded-2xl bg-[#E7F3FF]">
        <ActivityIndicator color="#1877F2" />
        <Text className="mt-2 text-sm text-[#65676B]">Loading camera…</Text>
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      onCapture(photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View className="overflow-hidden rounded-2xl border-2 border-[#1877F2]">
      <View className="h-56">
        <Camera ref={cameraRef} style={{ flex: 1 }} device={device} isActive photo />
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="h-40 w-32 rounded-full border-2 border-white/80" />
        </View>
      </View>
      <View className="flex-row items-center justify-between bg-[#1877F2] px-4 py-2.5">
        <Text className="text-sm font-medium text-white">{angleLabels[angle]}</Text>
        <Pressable
          onPress={capture}
          disabled={capturing}
          className="rounded-lg bg-white px-4 py-1.5 active:opacity-90"
        >
          <Text className="text-sm font-bold text-[#1877F2]">{capturing ? '…' : 'Capture'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
