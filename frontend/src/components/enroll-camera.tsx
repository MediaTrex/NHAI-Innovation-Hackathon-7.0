import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FaceScanFrame } from '@/components/face-scan-frame';
import { detectFaceFromUri } from '@/lib/face-api';
import type { Angle, LivePreviewState } from '@/lib/face-quality';

const WARMUP_MS = 2000;
const SCAN_INTERVAL_MS = 3000;

type EnrollCameraProps = {
  hasEmployeeId: boolean;
  apiOnline: boolean;
  activeAngle: Angle;
  angleCaptured: boolean;
  onCapture: (uri: string) => void;
  onLiveQualityChange?: (state: LivePreviewState) => void;
};

const liveHints: Record<LivePreviewState, string> = {
  need_id: 'Enter Employee ID first',
  warmup: 'Get ready… (2 sec)',
  offline: 'Tap Capture when ready',
  scanning: 'Scanning…',
  no_face: 'No face — center in circle',
  face_found: 'Face detected — hold still',
  ready: 'Tap Capture',
  captured: 'Photo saved ✓',
};

export function EnrollCamera({
  hasEmployeeId,
  apiOnline,
  activeAngle,
  angleCaptured,
  onCapture,
  onLiveQualityChange,
}: EnrollCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [liveState, setLiveState] = useState<LivePreviewState>('need_id');
  const [warmupDone, setWarmupDone] = useState(false);
  const qualityCallback = useRef(onLiveQualityChange);
  qualityCallback.current = onLiveQualityChange;

  const setLive = (state: LivePreviewState) => {
    setLiveState(state);
    qualityCallback.current?.(state);
  };

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (angleCaptured) {
      setLive('captured');
      return;
    }
    if (!hasEmployeeId) {
      setWarmupDone(false);
      setLive('need_id');
      return;
    }

    setLive('warmup');
    setWarmupDone(false);
    const t = setTimeout(() => setWarmupDone(true), WARMUP_MS);
    return () => clearTimeout(t);
  }, [hasEmployeeId, angleCaptured, activeAngle]);

  useEffect(() => {
    if (!warmupDone || angleCaptured || !hasEmployeeId || !permission?.granted) return;

    if (!apiOnline) {
      setLive('offline');
      const t1 = setTimeout(() => setLive('face_found'), 1500);
      const t2 = setTimeout(() => setLive('ready'), 3000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    let cancelled = false;
    let hits = 0;

    const runScan = async () => {
      if (cancelled || busyRef.current || !cameraRef.current) return;
      busyRef.current = true;
      setLive('scanning');

      try {
        const preview = await cameraRef.current.takePictureAsync({
          quality: 0.1,
          shutterSound: false,
        });
        if (!preview?.uri || cancelled) return;

        const result = await detectFaceFromUri(preview.uri);
        if (cancelled) return;

        if (result.detected) {
          hits += 1;
          setLive(hits >= 2 ? 'ready' : 'face_found');
        } else {
          hits = 0;
          setLive('no_face');
        }
      } catch {
        if (!cancelled) setLive('offline');
      } finally {
        busyRef.current = false;
      }
    };

    const delay = setTimeout(runScan, 500);
    const interval = setInterval(runScan, SCAN_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(delay);
      clearInterval(interval);
    };
  }, [warmupDone, angleCaptured, hasEmployeeId, apiOnline, permission?.granted, activeAngle]);

  if (!permission) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color="#1877F2" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.placeholder}>
        <Text className="mb-3 text-center text-sm text-[#65676B]">Camera permission required</Text>
        <Pressable onPress={requestPermission} className="rounded-xl bg-[#1877F2] px-5 py-2.5">
          <Text className="font-semibold text-white">Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  const capture = async () => {
    if (!hasEmployeeId) {
      Alert.alert('Employee ID required', 'Enter Employee ID first.');
      return;
    }
    if (!cameraRef.current || capturing || angleCaptured || busyRef.current) return;

    busyRef.current = true;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        shutterSound: false,
      });
      if (!photo?.uri) throw new Error('No photo returned');
      onCapture(photo.uri);
      setLive('captured');
    } catch (e) {
      Alert.alert('Capture failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      busyRef.current = false;
      setCapturing(false);
    }
  };

  const guideLabel =
    activeAngle === 'front' ? 'Front' : activeAngle === 'left' ? 'Left' : 'Right';

  return (
    <View className="overflow-hidden rounded-2xl border-2 border-[#1877F2]">
      <View className="h-56">
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View pointerEvents="none" style={styles.overlay}>
          <FaceScanFrame animate={!angleCaptured && liveState !== 'need_id'} />
          <View style={styles.badgeTop}>
            <Text style={styles.badgeText}>Step: {guideLabel}</Text>
          </View>
          <View style={styles.badgeBottom}>
            <Text style={styles.badgeText}>{liveHints[liveState]}</Text>
          </View>
        </View>
      </View>
      <View className="flex-row items-center justify-between bg-[#1877F2] px-4 py-2.5">
        <Text className="text-sm font-medium text-white">
          {angleCaptured ? `${guideLabel} saved ✓` : `Capture · ${guideLabel}`}
        </Text>
        <Pressable
          onPress={capture}
          disabled={!hasEmployeeId || capturing || angleCaptured}
          hitSlop={8}
          style={[
            styles.captureBtn,
            (liveState === 'ready' || liveState === 'offline') && styles.captureBtnReady,
            (!hasEmployeeId || angleCaptured) && styles.captureBtnDisabled,
          ]}
        >
          <Text
            style={[
              styles.captureBtnText,
              (liveState === 'ready' || liveState === 'offline') && styles.captureBtnTextReady,
            ]}
          >
            {angleCaptured ? 'Done ✓' : capturing ? 'Saving…' : 'Capture'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 224,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#E7F3FF',
    paddingHorizontal: 16,
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTop: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeBottom: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  captureBtn: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  captureBtnReady: {
    backgroundColor: '#22C55E',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1877F2',
  },
  captureBtnTextReady: {
    color: '#fff',
  },
});
