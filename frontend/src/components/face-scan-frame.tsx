import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const OVAL_W = 140;
const OVAL_H = 180;

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isTop = position.startsWith('t');
  const isLeft = position.endsWith('l');
  return (
    <View
      style={{
        position: 'absolute',
        top: isTop ? -1 : undefined,
        bottom: isTop ? undefined : -1,
        left: isLeft ? -1 : undefined,
        right: isLeft ? undefined : -1,
        width: 22,
        height: 22,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: isTop ? 0 : undefined,
          bottom: isTop ? undefined : 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: '#1877F2',
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: isLeft ? 0 : undefined,
          right: isLeft ? undefined : 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: '#1877F2',
          borderRadius: 2,
        }}
      />
    </View>
  );
}

type FaceScanFrameProps = {
  animate?: boolean;
  scanning?: boolean;
};

export function FaceScanFrame({ animate = true, scanning = false }: FaceScanFrameProps) {
  const scanLine = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!animate) return;
    const scanLoop = Animated.loop(
      Animated.timing(scanLine, { toValue: 1, duration: 700, useNativeDriver: true })
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 400, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 400, useNativeDriver: true }),
      ])
    );
    scanLoop.start();
    glowLoop.start();
    return () => {
      scanLoop.stop();
      glowLoop.stop();
    };
  }, [animate, glowOpacity, scanLine]);

  const scanTranslateY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-(OVAL_H / 2 - 10), OVAL_H / 2 - 10],
  });

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.glow,
          {
            width: OVAL_W + 14,
            height: OVAL_H + 14,
            borderRadius: (OVAL_W + 14) / 2,
            opacity: glowOpacity,
          },
        ]}
      />
      <View style={[styles.oval, { width: OVAL_W, height: OVAL_H, borderRadius: OVAL_W / 2 }]}>
        {animate && (
          <Animated.View
            style={[
              styles.scanLine,
              {
                top: OVAL_H / 2,
                transform: [{ translateY: scanTranslateY }],
              },
            ]}
          />
        )}
      </View>
      <Corner position="tl" />
      <Corner position="tr" />
      <Corner position="bl" />
      <Corner position="br" />
      {scanning && (
        <View style={styles.scanBadge}>
          <Text style={styles.scanBadgeText}>VERIFYING…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: OVAL_W + 28,
    height: OVAL_H + 28,
  },
  glow: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#1877F2',
  },
  oval: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: -OVAL_W,
    right: -OVAL_W,
    height: 2,
    backgroundColor: '#22C55E',
    opacity: 0.85,
  },
  scanBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: 'rgba(24,119,242,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scanBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
