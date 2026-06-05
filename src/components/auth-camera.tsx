import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FaceScanFrame } from '@/components/face-scan-frame';

type AuthCameraProps = {
  onCapture: (uri: string) => void;
  disabled?: boolean;
  height?: number;
};

export function AuthCamera({ onCapture, disabled, height = 420 }: AuthCameraProps) {
  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    setCameraReady(false);
  }, [facing]);

  const manualCapture = useCallback(async () => {
    if (!cameraRef.current || busyRef.current || disabled || capturing || !cameraReady) {
      if (!cameraReady) {
        Alert.alert('Camera loading', 'Wait a moment for the camera to start, then tap Capture again.');
      }
      return;
    }

    busyRef.current = true;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        shutterSound: false,
      });
      if (!photo?.uri) {
        throw new Error('No photo returned from camera.');
      }
      onCapture(photo.uri);
    } catch (e) {
      Alert.alert('Capture failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      busyRef.current = false;
      setCapturing(false);
    }
  }, [cameraReady, capturing, disabled, onCapture]);

  const flipCamera = () => {
    if (busyRef.current || capturing || disabled) return;
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  if (!permission) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <ActivityIndicator color="#1877F2" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.permText}>Camera permission required</Text>
        <Pressable onPress={requestPermission} style={styles.allowBtn}>
          <Text style={styles.allowText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  const busy = disabled || capturing;
  const facingLabel = facing === 'front' ? 'Front' : 'Back';

  return (
    <View style={styles.wrap}>
      <View style={{ height }}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={styles.overlay} pointerEvents="box-none">
          <FaceScanFrame animate={!busy} scanning={false} />
          <View style={styles.topRow} pointerEvents="box-none">
            <View style={styles.facingBadge}>
              <Text style={styles.facingText}>{facingLabel} camera</Text>
            </View>
            <Pressable
              onPress={flipCamera}
              disabled={busy}
              style={[styles.flipBtn, busy && styles.btnDisabled]}
            >
              <Text style={styles.flipText}>Flip</Text>
            </Pressable>
          </View>
          <View style={styles.hintBadge}>
            <Text style={styles.hintText}>
              {!cameraReady ? 'Starting camera…' : 'Position face in frame'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.bar, busy && styles.barDisabled]}>
        <View style={styles.barLeft}>
          <Text style={styles.barStep}>Face verification</Text>
          <Text style={styles.barLabel}>Capture and compare with enrolled photo</Text>
        </View>
        <Pressable
          onPress={manualCapture}
          disabled={busy || !cameraReady}
          style={[styles.captureBtn, (busy || !cameraReady) && styles.btnDisabled]}
        >
          {capturing ? (
            <ActivityIndicator color="#1877F2" size="small" />
          ) : (
            <Text style={styles.captureText}>Capture</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1877F2',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#E7F3FF',
    paddingHorizontal: 16,
  },
  permText: { marginBottom: 12, fontSize: 13, color: '#65676B', textAlign: 'center' },
  allowBtn: {
    backgroundColor: '#1877F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  allowText: { color: '#fff', fontWeight: '700' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  facingBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  facingText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  flipBtn: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  flipText: { color: '#1877F2', fontSize: 12, fontWeight: '800' },
  hintBadge: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  barDisabled: { opacity: 0.6 },
  barLeft: { flex: 1 },
  barStep: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  barLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  captureBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureText: { color: '#1877F2', fontSize: 14, fontWeight: '800' },
  btnDisabled: { opacity: 0.45 },
});
