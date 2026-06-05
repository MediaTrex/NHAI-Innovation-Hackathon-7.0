import * as ExpoSplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
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

const FADE_DURATION_MS = 800;
const useNativeDriver = Platform.OS !== 'web';

function FeaturePill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export function SplashScreenContent() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});

    fadeAnim.setValue(0);
    slideAnim.setValue(24);

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
    ]).start(() => setReady(true));
  }, [fadeAnim, slideAnim]);

  const animatedEntry = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <LinearGradient
      colors={['#1877F2', '#0B4FBF', '#063A8C']}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <View style={styles.roadGlow} />

      <Animated.View style={[styles.content, animatedEntry]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🛡️</Text>
        </View>

        <Text style={styles.title}>NHAI SecureID</Text>
        <Text style={styles.subtitle}>Offline Face Authentication for Field Personnel</Text>

        <View style={styles.pillRow}>
          <FeaturePill icon="📴" label="Offline" />
          <FeaturePill icon="🛡️" label="Secure" />
          <FeaturePill icon="✓" label="Reliable" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.loader, { opacity: fadeAnim }]}>
        <ActivityIndicator size="large" color="#E7F3FF" />
        <Text style={styles.loaderText}>
          {ready ? 'Loading secure modules…' : 'Starting…'}
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by <Text style={styles.footerBold}>NHAI-AI</Text>
        </Text>
        <Text style={styles.footerSub}>Built for a Connected India</Text>
      </View>
    </LinearGradient>
  );
}

export default SplashScreenContent;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadGlow: {
    position: 'absolute',
    bottom: '18%',
    width: '120%',
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ skewY: '-8deg' }],
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    marginTop: 20,
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 40,
  },
  pill: {
    alignItems: 'center',
  },
  pillIcon: {
    fontSize: 22,
  },
  pillLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  loader: {
    position: 'absolute',
    bottom: '22%',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.75)',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  footerBold: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerSub: {
    marginTop: 4,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
  },
});
