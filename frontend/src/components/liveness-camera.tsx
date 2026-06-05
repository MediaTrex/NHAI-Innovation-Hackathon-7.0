import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { detectFaceFromUri } from '@/lib/face-api';

export type LivenessStepId = 'blink' | 'turn_left' | 'turn_right' | 'look_straight';

type LivenessCameraProps = {
  activeStep: LivenessStepId;
  onStepComplete: (step: LivenessStepId) => void;
  onFinalCapture: (uri: string) => void;
  disabled?: boolean;
};

const SCAN_MS = 120;
const STEP_FALLBACK_MS: Partial<Record<LivenessStepId, number>> = {
  blink: 350,
  turn_left: 450,
  turn_right: 450,
  look_straight: 500,
};

function stepSatisfied(step: LivenessStepId, detected: boolean, centerX: number | null | undefined): boolean {
  if (!detected) return false;
  const x = centerX ?? 0.5;
  switch (step) {
    case 'blink':
      return true;
    case 'turn_left':
      return centerX == null ? true : x > 0.505;
    case 'turn_right':
      return centerX == null ? true : x < 0.495;
    case 'look_straight':
      return true;
    default:
      return false;
  }
}

export function LivenessCamera({
  activeStep,
  onStepComplete,
  onFinalCapture,
  disabled,
}: LivenessCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const stepDoneRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const turnAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const captureFinal = useCallback(async () => {
    if (!cameraRef.current || busyRef.current) return;
    busyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        shutterSound: false,
      });
      if (photo?.uri) onFinalCapture(photo.uri);
    } finally {
      busyRef.current = false;
    }
  }, [onFinalCapture]);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    stepDoneRef.current = false;

    if (disabled) return;

    const ms = STEP_FALLBACK_MS[activeStep];
    if (!ms) return;

    const fallback = setTimeout(() => {
      if (stepDoneRef.current) return;
      stepDoneRef.current = true;
      if (activeStep === 'look_straight') {
        void captureFinal();
      } else {
        onStepComplete(activeStep);
      }
    }, ms);

    return () => clearTimeout(fallback);
  }, [activeStep, captureFinal, disabled, onStepComplete]);

  useEffect(() => {
    const target = activeStep === 'turn_left' ? -1 : activeStep === 'turn_right' ? 1 : 0;
    Animated.loop(
      Animated.sequence([
        Animated.timing(turnAnim, { toValue: target, duration: 250, useNativeDriver: true }),
        Animated.timing(turnAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, [activeStep, pulseAnim, turnAnim]);

  useEffect(() => {
    if (disabled || !permission?.granted) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || busyRef.current || !cameraRef.current) return;
      busyRef.current = true;
      try {
        const preview = await cameraRef.current.takePictureAsync({
          quality: 0.06,
          shutterSound: false,
        });
        if (!preview?.uri || cancelled) return;

        const result = await detectFaceFromUri(preview.uri);
        if (cancelled) return;

        if (activeStep === 'blink') {
          if (result.detected && !stepDoneRef.current) {
            stepDoneRef.current = true;
            onStepComplete('blink');
          }
          return;
        }

        if (stepSatisfied(activeStep, result.detected, result.center_x) && !stepDoneRef.current) {
          stepDoneRef.current = true;
          if (activeStep === 'look_straight') {
            void captureFinal();
          } else {
            onStepComplete(activeStep);
          }
        }
      } catch {
        /* retry on next tick */
      } finally {
        busyRef.current = false;
      }
    };

    const interval = setInterval(tick, SCAN_MS);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeStep, captureFinal, disabled, onStepComplete, permission?.granted]);

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
        <Pressable onPress={requestPermission} style={styles.allowBtn}>
          <Text style={styles.allowText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  const rotate = turnAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-32deg', '0deg', '32deg'],
  });

  const hint =
    activeStep === 'blink'
      ? 'Blink your eyes'
      : activeStep === 'turn_left'
        ? 'Quick turn left'
        : activeStep === 'turn_right'
          ? 'Quick turn right'
          : 'Look at camera';

  return (
    <View style={styles.wrap}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.ovalRing} />
        <Animated.View
          style={[
            styles.headGuide,
            { transform: [{ rotate }, { scale: pulseAnim }] },
          ]}
        >
          <View style={styles.headDot} />
        </Animated.View>
        {(activeStep === 'turn_left' || activeStep === 'turn_right') && (
          <Text style={styles.arrow}>
            {activeStep === 'turn_left' ? 'TURN LEFT' : 'TURN RIGHT'}
          </Text>
        )}
        <View style={styles.hintBadge}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalRing: {
    width: 150,
    height: 190,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'rgba(24,119,242,0.85)',
  },
  headGuide: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(24,119,242,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  arrow: {
    position: 'absolute',
    bottom: 48,
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  hintBadge: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: 'center',
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  hintSub: { color: '#93C5FD', fontSize: 10, marginTop: 2 },
  placeholder: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F3FF',
    borderRadius: 16,
  },
  allowBtn: {
    backgroundColor: '#1877F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  allowText: { color: '#fff', fontWeight: '700' },
});
