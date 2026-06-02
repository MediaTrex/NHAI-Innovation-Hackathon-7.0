import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

const FADE_DURATION_MS = 1000;
const MIN_VISIBLE_MS = 2500;
const useNativeDriver = Platform.OS !== 'web';

let replaySplashHandler: (() => void) | null = null;

/** Call from anywhere (e.g. Home dev button) to show the splash again. */
export function replaySplash() {
  replaySplashHandler?.();
}

export function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [session, setSession] = useState(0);

  useEffect(() => {
    replaySplashHandler = () => {
      setSession((n) => n + 1);
      setVisible(true);
    };
    return () => {
      replaySplashHandler = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible, session]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <SplashScreen key={session} />
    </View>
  );
}

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION_MS,
        useNativeDriver,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        useNativeDriver,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const animatedEntry = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoCircle, animatedEntry]}>
        <Text style={styles.logoIcon}>🛡️</Text>
      </Animated.View>

      <Animated.View style={animatedEntry}>
        <Text style={styles.appName}>Datalake 3.0</Text>
        <Text style={styles.tagline}>Offline Face Authentication</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderBox, { opacity: fadeAnim }]}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={styles.loaderText}>Loading models...</Text>
      </Animated.View>

      <Text style={styles.footer}>NHAI Hackathon 7.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0F1E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#131929',
    borderWidth: 2,
    borderColor: '#4F8EF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 52,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#4F8EF7',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loaderBox: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  loaderText: {
    color: '#6B7A99',
    fontSize: 13,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: '#3A4460',
    fontSize: 12,
    letterSpacing: 1,
  },
});
