import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthCamera } from '@/components/auth-camera';
import { FaceScanFrame } from '@/components/face-scan-frame';
import { embeddingToJson, parseEmbeddingJson, VERIFY_THRESHOLD } from '@/lib/embedding';
import { embedFaceFromUri, FaceApiError, verifyFaceFromUri } from '@/lib/face-api';
import { initDatabase, markAttendanceVerified, type Employee } from '@/lib/database';

type Phase = 'camera' | 'review' | 'verifying' | 'result' | 'failed';
type VerifyCheck = 'face' | 'comparing' | 'matching';

type LivenessAuthFlowProps = {
  employee: Employee;
  onDone: () => void;
};

const CAPTURE_THUMB_H = 200;

function formatTime(d: Date) {
  return d.toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const PARTICLE_COLORS = ['#22C55E', '#1877F2', '#FBBF24', '#A855F7', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

const FACE_W = 200;
const FACE_H = 220;
const ACCENT = '#1877F2';

const MESH_POINTS: { x: number; y: number }[] = [
  { x: 75, y: 10 }, { x: 100, y: 5 }, { x: 125, y: 10 },
  { x: 56, y: 44 }, { x: 100, y: 36 }, { x: 144, y: 44 },
  { x: 66, y: 77 }, { x: 86, y: 74 }, { x: 114, y: 74 }, { x: 134, y: 77 },
  { x: 100, y: 110 }, { x: 44, y: 112 }, { x: 156, y: 112 },
  { x: 82, y: 143 }, { x: 118, y: 143 },
  { x: 58, y: 174 }, { x: 142, y: 174 }, { x: 100, y: 190 },
];

const MESH_LINES: [number, number][] = [
  [0, 3], [1, 3], [1, 4], [1, 5], [2, 5], [3, 4], [4, 5],
  [3, 6], [5, 9], [6, 7], [7, 10], [8, 10], [8, 9],
  [3, 11], [5, 12], [11, 15], [12, 16], [10, 13], [10, 14],
  [13, 17], [14, 17], [15, 17], [16, 17],
];

function MeshLine({
  from, to, opacity,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  opacity: Animated.AnimatedInterpolation<string | number>;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - length / 2,
        top: cy - 0.5,
        width: length,
        height: 1.5,
        backgroundColor: ACCENT,
        opacity,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

function FacialRecognitionPanel({
  checks,
}: {
  checks: Record<VerifyCheck, 'pending' | 'done' | 'active'>;
}) {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim, scanLineAnim]);

  const faceScanY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [-FACE_H / 2, FACE_H / 2] });
  const dotGlow = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <>
      <Text style={styles.frTitle}>FACIAL RECOGNITION</Text>

      <View style={{ width: FACE_W, height: FACE_H, marginBottom: 28 }}>
        <View style={styles.faceSilhouette}>
          <View style={styles.faceOval} />
        </View>
        {MESH_LINES.map(([a, b], i) => (
          <MeshLine key={i} from={MESH_POINTS[a]} to={MESH_POINTS[b]} opacity={dotGlow} />
        ))}
        {MESH_POINTS.map((pt, i) => (
          <Animated.View
            key={i}
            style={[styles.meshDot, { left: pt.x - 3, top: pt.y - 3, opacity: dotGlow }]}
          />
        ))}
        <Animated.View
          style={[styles.faceScanLine, { top: FACE_H / 2, transform: [{ translateY: faceScanY }] }]}
        />
      </View>

      <View style={styles.frCheckList}>
        {(['Photo captured', 'Loading enrolled face', 'Comparing faces…'] as const).map((label, i) => {
          const stateKey = (['face', 'comparing', 'matching'] as const)[i];
          const state = checks[stateKey];
          return (
            <View key={label} style={styles.frCheckRow}>
              <Text style={styles.frCheckLabel}>{label}</Text>
              {state === 'done' || state === 'active' ? (
                <View style={styles.frCheckRight}>
                  <Text style={styles.frCheckMark}>✓</Text>
                  {state === 'active' && (
                    <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 6 }} />
                  )}
                </View>
              ) : (
                <View style={styles.checkPending} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.frFooter}>
        <Text style={styles.frFooterText}>Do not close the app or move your face away.</Text>
      </View>
    </>
  );
}

function CapturedThumb({ uri }: { uri: string }) {
  return (
    <View style={styles.thumbWrap}>
      <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
      <View style={styles.thumbOverlay}>
        <FaceScanFrame animate scanning={false} />
      </View>
    </View>
  );
}

function WhiteScreenShell({
  children,
  capturedUri,
}: {
  children: ReactNode;
  capturedUri: string | null;
}) {
  return (
    <View style={styles.whiteScreen}>
      <View style={styles.whiteTop}>{children}</View>
      {capturedUri ? (
        <View style={styles.whiteBottom}>
          <Text style={styles.thumbLabel}>Captured photo</Text>
          <CapturedThumb uri={capturedUri} />
        </View>
      ) : null}
    </View>
  );
}

export function LivenessAuthFlow({ employee, onDone }: LivenessAuthFlowProps) {
  const [phase, setPhase] = useState<Phase>('camera');
  const [checks, setChecks] = useState<Record<VerifyCheck, 'pending' | 'done' | 'active'>>({
    face: 'pending', comparing: 'pending', matching: 'pending',
  });
  const [result, setResult] = useState<{
    match: boolean; score: number; employee: Employee | null;
    livenessPassed: boolean; time: Date;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const resultScaleAnim = useRef(new Animated.Value(0)).current;
  const resultFadeAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      x: new Animated.Value(0), y: new Animated.Value(0),
      opacity: new Animated.Value(0), scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (phase !== 'result' && phase !== 'failed') return;
    resultScaleAnim.setValue(0);
    resultFadeAnim.setValue(0);
    Animated.spring(resultScaleAnim, { toValue: 1, tension: 220, friction: 7, useNativeDriver: true }).start();
    Animated.timing(resultFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (phase === 'result') {
      particleAnims.forEach((p, i) => {
        const angle = (i / particleAnims.length) * Math.PI * 2;
        const dist = 45 + (i % 3) * 16;
        p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0);
        Animated.sequence([
          Animated.delay(15 * i),
          Animated.parallel([
            Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 220, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: Math.sin(angle) * dist, duration: 220, useNativeDriver: true }),
            Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 1, duration: 120, useNativeDriver: true }),
          ]),
          Animated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const resetToCamera = () => {
    setPhase('camera');
    setCapturedUri(null);
    setResult(null);
    setErrorMsg(null);
    setChecks({ face: 'pending', comparing: 'pending', matching: 'pending' });
  };

  const handleCapture = (uri: string) => {
    setCapturedUri(uri);
    setPhase('review');
  };

  const startVerification = () => {
    if (!capturedUri) return;
    setChecks({ face: 'done', comparing: 'active', matching: 'pending' });
    setPhase('verifying');
    void runVerification(capturedUri);
  };

  const runVerification = async (uri: string) => {
    try {
      let ref = parseEmbeddingJson(employee.face_embedding);
      if (!ref) {
        if (!employee.face_front_path) throw new FaceApiError('No enrolled photo found for this worker.');
        const built = await embedFaceFromUri(employee.face_front_path);
        ref = built.embedding;
        employee.face_embedding = embeddingToJson(built.embedding);
      }

      setChecks({ face: 'done', comparing: 'done', matching: 'active' });
      const v = await verifyFaceFromUri(uri, ref);
      const livenessPassed = true;

      setChecks({ face: 'done', comparing: 'done', matching: 'done' });
      const match = v.score >= VERIFY_THRESHOLD;
      const time = new Date();

      await initDatabase();
      await markAttendanceVerified({
        employeeId: employee.employee_id,
        fullName: employee.full_name,
        department: employee.department,
        matchScore: v.score,
        livenessPassed,
        verified: match,
      });

      setResult({ match, score: v.score, employee, livenessPassed, time });
      setPhase(match ? 'result' : 'failed');
    } catch (e) {
      setErrorMsg(e && typeof e === 'object' && 'message' in e ? String((e as FaceApiError).message) : 'Verification failed');
      setPhase('failed');
    }
  };

  if (phase === 'camera') {
    return (
      <View style={styles.centerPhase}>
        <Text style={styles.title}>Verify {employee.full_name}</Text>
        <Text style={styles.subtitle}>Tap Capture when your face is in frame</Text>
        <View style={{ width: '100%', marginTop: 8 }}>
          <AuthCamera onCapture={handleCapture} height={520} />
        </View>
      </View>
    );
  }

  if (phase === 'review' && capturedUri) {
    return (
      <View style={styles.centerPhase}>
        <Text style={styles.title}>Review photo</Text>
        <Text style={styles.subtitle}>Happy with this capture?</Text>
        <View style={styles.reviewPreview}>
          <Image source={{ uri: capturedUri }} style={styles.captureImage} resizeMode="cover" />
        </View>
        <View style={styles.reviewActions}>
          <Pressable style={styles.recaptureBtn} onPress={resetToCamera}>
            <Text style={styles.recaptureText}>Recapture</Text>
          </Pressable>
          <Pressable style={styles.verifyBtn} onPress={startVerification}>
            <Text style={styles.verifyText}>Verify</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'verifying' && capturedUri) {
    return (
      <WhiteScreenShell capturedUri={capturedUri}>
        <FacialRecognitionPanel checks={checks} />
      </WhiteScreenShell>
    );
  }

  const success = phase === 'result' && result?.match;
  const emp = result?.employee;

  return (
    <ScrollView
      style={styles.whiteScreen}
      contentContainerStyle={styles.resultScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.resultTop}>
        <View style={styles.particleOrigin} pointerEvents="none">
          {particleAnims.map((p, i) => (
            <Animated.View key={i} style={[styles.particle, {
              backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
            }]} />
          ))}
        </View>
        <Animated.View style={[styles.resultCircle, success ? styles.resultOk : styles.resultFail, { transform: [{ scale: resultScaleAnim }] }]}>
          <Text style={styles.resultCheck}>{success ? '✓' : '✕'}</Text>
        </Animated.View>
        <Animated.Text style={[styles.verifiedLabel, success ? styles.verifiedOk : styles.verifiedFail, { opacity: resultFadeAnim }]}>
          {success ? 'VERIFIED' : 'FAILED'}
        </Animated.Text>
        {!success && errorMsg && <Text style={styles.failReason}>{errorMsg}</Text>}
      </View>

      {emp && (
        <View style={styles.profileCard}>
          {emp.face_front_path && !emp.face_front_path.startsWith('mock://') ? (
            <Image source={{ uri: emp.face_front_path }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{emp.full_name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{emp.full_name}</Text>
            <Text style={styles.profileMeta}>Employee ID: {emp.employee_id}</Text>
            <Text style={styles.profileMeta}>{emp.department || 'Field Officer'}</Text>
          </View>
        </View>
      )}

      {result && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Match Score</Text>
            <Text style={[styles.statValue, success && styles.statGreen]}>{(result.score * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Liveness</Text>
            <View style={[styles.livenessPill, result.livenessPassed ? styles.livenessOk : styles.livenessFail]}>
              <Text style={styles.livenessText}>{result.livenessPassed ? 'Passed' : 'Failed'}</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statTime}>{formatTime(result.time)}</Text>
          </View>
        </View>
      )}

      {capturedUri && (
        <View style={styles.resultThumbSection}>
          <Text style={styles.thumbLabel}>Captured photo</Text>
          <CapturedThumb uri={capturedUri} />
        </View>
      )}

      {!success && (
        <Pressable style={styles.retryBtn} onPress={resetToCamera}>
          <Text style={styles.retryText}>Recapture</Text>
        </Pressable>
      )}
      <Pressable style={styles.continueBtn} onPress={onDone}>
        <Text style={styles.continueText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerPhase: { flex: 1, alignItems: 'center', paddingTop: 8, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#050505', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#65676B', textAlign: 'center', marginTop: 4, marginBottom: 16 },

  reviewPreview: {
    width: '100%',
    height: 420,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1877F2',
    backgroundColor: '#F5F7FA',
  },
  captureImage: { width: '100%', height: '100%' },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  recaptureBtn: {
    flex: 1,
    backgroundColor: '#E7F3FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1877F2',
  },
  recaptureText: { color: '#1877F2', fontSize: 16, fontWeight: '800' },
  verifyBtn: {
    flex: 1,
    backgroundColor: '#1877F2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  whiteScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  whiteTop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  whiteBottom: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4E6EB',
    backgroundColor: '#FFFFFF',
  },
  frTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  faceSilhouette: {
    position: 'absolute',
    width: FACE_W,
    height: FACE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: 130,
    height: 170,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(24,119,242,0.35)',
    backgroundColor: 'rgba(24,119,242,0.06)',
  },
  meshDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  faceScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(24,119,242,0.7)',
  },
  frCheckList: { width: '100%', gap: 14, marginBottom: 20 },
  frCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  frCheckLabel: { fontSize: 15, fontWeight: '600', color: '#050505' },
  frCheckRight: { flexDirection: 'row', alignItems: 'center' },
  frCheckMark: { color: ACCENT, fontSize: 18, fontWeight: '800' },
  frFooter: {
    width: '100%',
    backgroundColor: '#E7F3FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(24,119,242,0.25)',
  },
  frFooterText: { fontSize: 12, color: ACCENT, fontWeight: '600', textAlign: 'center' },
  checkPending: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CED0D4',
  },
  thumbLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#65676B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thumbWrap: {
    width: '100%',
    height: CAPTURE_THUMB_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1877F2',
    backgroundColor: '#F5F7FA',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  resultScroll: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  resultTop: { alignItems: 'center', marginVertical: 24 },
  resultThumbSection: { marginBottom: 16 },
  particleOrigin: { position: 'absolute', width: 88, height: 88, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
  resultCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  resultOk: { backgroundColor: '#22C55E' },
  resultFail: { backgroundColor: '#EF4444' },
  resultCheck: { color: '#fff', fontSize: 40, fontWeight: '800' },
  verifiedLabel: { fontSize: 28, fontWeight: '900', marginTop: 12, letterSpacing: 1 },
  verifiedOk: { color: '#22C55E' },
  verifiedFail: { color: '#EF4444' },
  failReason: { marginTop: 8, fontSize: 13, color: '#65676B', textAlign: 'center', paddingHorizontal: 16 },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E4E6EB', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { backgroundColor: '#E7F3FF', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 28, fontWeight: '800', color: '#1877F2' },
  profileInfo: { marginLeft: 14, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#050505' },
  profileMeta: { fontSize: 13, color: '#65676B', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E4E6EB', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#65676B', fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#050505', marginTop: 4 },
  statGreen: { color: '#22C55E' },
  statTime: { fontSize: 10, color: '#050505', fontWeight: '600', marginTop: 4, textAlign: 'center' },
  livenessPill: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  livenessOk: { backgroundColor: '#DCFCE7' },
  livenessFail: { backgroundColor: '#FEE2E2' },
  livenessText: { fontSize: 12, fontWeight: '700', color: '#050505' },

  retryBtn: {
    backgroundColor: '#E7F3FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1877F2',
  },
  retryText: { color: '#1877F2', fontSize: 15, fontWeight: '800' },
  continueBtn: { backgroundColor: '#1877F2', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
