import { CameraView, useCameraPermissions } from 'expo-camera';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function FaceAuthScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle" style={styles.message}>
          Face auth requires a device camera
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          Open this screen on iOS or Android (Expo Go or a dev build).
        </ThemedText>
      </ThemedView>
    );
  }

  if (!permission) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          Checking camera permission…
        </ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle" style={styles.message}>
          Camera access needed
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          We use the front camera to verify your identity.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={requestPermission}
          style={({ pressed }) => [styles.allowButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.allowButtonLabel}>
            Allow camera
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      <CameraView style={StyleSheet.absoluteFill} facing="front" />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <ThemedView style={styles.overlayCard}>
          <ThemedText type="smallBold">Face verification</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Center your face in the frame
          </ThemedText>
        </ThemedView>
        <View style={styles.faceFrame} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
  allowButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#3c87f7',
  },
  allowButtonLabel: {
    color: '#fff',
  },
  pressed: {
    opacity: 0.85,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  overlayCard: {
    alignSelf: 'stretch',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    opacity: 0.92,
  },
  faceFrame: {
    width: 220,
    height: 280,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.six,
  },
});
