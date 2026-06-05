import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { embeddingToJson } from '@/lib/embedding';
import { embedFaceFromUri, checkFaceApiHealth, detectFaceFromUri } from '@/lib/face-api';
import { DUMMY_WORKERS } from '@/lib/dummy-workers';
import {
  getAllEmployees,
  initDatabase,
  persistFacePhoto,
  upsertEmployee,
} from '@/lib/database';

type Stage = 'capture' | 'enrolled';
type StepKey = 'blink' | 'left' | 'right' | 'straight';

type CaptureStep = {
  key: StepKey;
  label: string;
  instruction: string;
  auto: boolean;
};

const STEPS: CaptureStep[] = [
  { key: 'blink', label: 'Blink', instruction: 'Blink your eyes…', auto: true },
  { key: 'left', label: 'Turn Left', instruction: 'Turn left — capturing…', auto: true },
  { key: 'right', label: 'Turn Right', instruction: 'Turn right — capturing…', auto: true },
  { key: 'straight', label: 'Look Straight', instruction: 'Look straight — capturing…', auto: true },
];

const STEP_DELAY_MS: Record<StepKey, number> = {
  blink: 220,
  left: 280,
  right: 280,
  straight: 280,
};

const PARTICLE_COLORS = ['#22C55E','#1877F2','#FBBF24','#A855F7','#EC4899','#14B8A6','#F97316','#6366F1'];

export default function EnrollScreen() {
  const router = useRouter();

  const [employeeId,   setEmployeeId]   = useState('');
  const [fullName,     setFullName]     = useState('');
  const [department,   setDepartment]   = useState('');
  const [siteLocation, setSiteLocation] = useState('');

  const [stage,      setStage]      = useState<Stage>('capture');
  const [stepIndex,  setStepIndex]  = useState(0);
  const [captured,   setCaptured]   = useState<Record<string, string>>({});
  const [apiOnline,  setApiOnline]  = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving'|'saved'|'failed'>('saving');
  const [modelReady, setModelReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [blinkDone, setBlinkDone] = useState(false);
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [faceBar, setFaceBar] = useState(0); // 0..1
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const capturedRef = useRef<Record<string, string>>({});
  const [permission, requestPermission] = useCameraPermissions();
  const faceBarRef = useRef(0);

  // Enrolled animations
  const scaleAnim     = useRef(new Animated.Value(0)).current;
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const blinkPulse    = useRef(new Animated.Value(1)).current;
  const particleAnims = useRef(
    Array.from({ length: 8 }, () => ({
      x: new Animated.Value(0), y: new Animated.Value(0),
      opacity: new Animated.Value(0), scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => { checkFaceApiHealth().then(setApiOnline); }, []);
  useEffect(() => { if (!permission?.granted) requestPermission(); }, [permission, requestPermission]);

  const loadEnrollmentState = useCallback(async () => {
    await initDatabase();
    const list = await getAllEmployees();
    const withFace = new Set(
      list.filter((e) => e.face_front_path && !e.face_front_path.startsWith('mock://')).map((e) => e.employee_id)
    );
    setEnrolledIds(withFace);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEnrollmentState();
    }, [loadEnrollmentState])
  );

  const applyDummyWorker = (worker: (typeof DUMMY_WORKERS)[number]) => {
    setEmployeeId(worker.employeeId);
    setFullName(worker.fullName);
    setDepartment(worker.department);
    setSiteLocation(worker.siteLocation);
    setCaptured({});
    capturedRef.current = {};
    setBlinkDone(false);
    setStepIndex(0);
    setSequenceRunning(false);
  };

  // Blink pulse animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkPulse, { toValue: 1.18, duration: 380, useNativeDriver: true }),
        Animated.timing(blinkPulse, { toValue: 1,    duration: 380, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [blinkPulse]);

  useEffect(() => {
    capturedRef.current = captured;
  }, [captured]);

  // Live face detection bar (fast + lightweight)
  useEffect(() => {
    const formReady = employeeId.trim().length > 0 && fullName.trim().length > 0;
    if (!permission?.granted || stage !== 'capture' || !formReady) {
      setFaceBar(0);
      faceBarRef.current = 0;
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled || !cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
        const preview = await cameraRef.current.takePictureAsync({
          quality: 0.04,
          shutterSound: false,
        });
        if (!preview?.uri || cancelled) return;

        const r = await detectFaceFromUri(preview.uri);
        const target = r.detected ? 1 : 0;
        const next = faceBarRef.current * 0.7 + target * 0.3; // smooth
        faceBarRef.current = next;
        setFaceBar(next);
      } catch {
        // keep last value
      } finally {
        busyRef.current = false;
      }
    };

    const interval = setInterval(tick, 300);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [employeeId, fullName, permission?.granted, stage]);

  const saveEnrollment = async (photos: Record<string, string>) => {
    setSaveStatus('saving');
    setModelReady(false);
    setStage('enrolled');

    await initDatabase();

    const frontPath = await persistFacePhoto(photos.straight, employeeId.trim(), 'front');
    const leftPath = photos.left
      ? await persistFacePhoto(photos.left, employeeId.trim(), 'left')
      : null;
    const rightPath = photos.right
      ? await persistFacePhoto(photos.right, employeeId.trim(), 'right')
      : null;

    let faceEmbedding: string | null = null;
    if (apiOnline) {
      try {
        const { embedding } = await embedFaceFromUri(frontPath);
        faceEmbedding = embeddingToJson(embedding);
        setModelReady(true);
      } catch {
        /* build later */
      }
    }

    await upsertEmployee({
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      department: department.trim(),
      siteLocation: siteLocation.trim(),
      faceFrontPath: frontPath,
      faceLeftPath: leftPath,
      faceRightPath: rightPath,
      faceEmbedding,
    });
    setSaveStatus('saved');
    await loadEnrollmentState();
  };

  const startAutoSequence = () => {
    if (!formReady || !permission?.granted || sequenceRunning) return;
    setCaptured({});
    capturedRef.current = {};
    setBlinkDone(false);
    setStepIndex(0);
    setSequenceRunning(true);
  };

  const manualCapture = async () => {
    if (!formReady || !permission?.granted || capturing) return;
    const step = STEPS[stepIndex];
    if (!step) return;

    // Manual override stops the auto runner.
    if (sequenceRunning) setSequenceRunning(false);

    // Blink step can be skipped manually.
    if (step.key === 'blink') {
      setBlinkDone(true);
      setStepIndex(1);
      return;
    }

    if (!cameraRef.current || busyRef.current) return;
    busyRef.current = true;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, shutterSound: false });
      if (!photo?.uri) throw new Error('No photo captured.');

      const nextCaptured = { ...capturedRef.current, [step.key]: photo.uri };
      capturedRef.current = nextCaptured;
      setCaptured(nextCaptured);

      if (step.key !== 'straight') {
        setStepIndex(stepIndex + 1);
        return;
      }

      await saveEnrollment(nextCaptured);
    } catch (e) {
      setSaveStatus('failed');
      setStage('capture');
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
    } finally {
      busyRef.current = false;
      setCapturing(false);
    }
  };

  // Auto: blink → left → right → straight → enroll
  useEffect(() => {
    if (!sequenceRunning || !permission?.granted || stage !== 'capture') return;

    const step = STEPS[stepIndex];
    if (!step) return;

    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, STEP_DELAY_MS[step.key]));
      if (cancelled) return;

      if (step.key === 'blink') {
        setBlinkDone(true);
        setStepIndex(1);
        return;
      }

      if (!cameraRef.current || busyRef.current) return;
      busyRef.current = true;
      setCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          shutterSound: false,
        });
        if (!photo?.uri || cancelled) return;

        const nextCaptured = { ...capturedRef.current, [step.key]: photo.uri };
        capturedRef.current = nextCaptured;
        setCaptured(nextCaptured);

        if (step.key !== 'straight') {
          setStepIndex(stepIndex + 1);
          return;
        }

        setSequenceRunning(false);
        await saveEnrollment(nextCaptured);
      } catch (e) {
        setSequenceRunning(false);
        setStage('capture');
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
      } finally {
        busyRef.current = false;
        setCapturing(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceRunning, stepIndex, permission?.granted, stage]);

  // Enrolled screen animations
  useEffect(() => {
    if (stage !== 'enrolled') return;
    scaleAnim.setValue(0); fadeAnim.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, tension: 130, friction: 6, useNativeDriver: true }).start();
    Animated.timing(fadeAnim,  { toValue: 1, duration: 480, delay: 320, useNativeDriver: true }).start();
    particleAnims.forEach((p, i) => {
      const angle = (i / particleAnims.length) * Math.PI * 2;
      const dist  = 55 + (i % 3) * 22;
      p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0);
      Animated.sequence([
        Animated.delay(40 * i),
        Animated.parallel([
          Animated.spring(p.x,       { toValue: Math.cos(angle) * dist, useNativeDriver: true, tension: 90, friction: 5 }),
          Animated.spring(p.y,       { toValue: Math.sin(angle) * dist, useNativeDriver: true, tension: 90, friction: 5 }),
          Animated.timing(p.opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
          Animated.spring(p.scale,   { toValue: 1, useNativeDriver: true, tension: 90, friction: 5 }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 550, delay: 280, useNativeDriver: true }),
      ]).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const formReady   = employeeId.trim().length > 0 && fullName.trim().length > 0;
  const currentStep = STEPS[stepIndex];
  const isLastStep  = stepIndex === STEPS.length - 1;

  const isBlinkStep = currentStep?.key === 'blink';
  const canStart = formReady && permission?.granted && !sequenceRunning && !capturing;
  const canManual = formReady && permission?.granted && !capturing;

  // ── Screen 1: Form + Camera ───────────────────────────────────────────────
  if (stage === 'capture') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Enroll Employee</Text>
          <Text style={styles.headerSub}>Register a new field worker</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Demo workers */}
          <Text style={styles.sectionLabel}>Demo workers</Text>
          <Text style={styles.demoHint}>Tap a worker to fill details, then capture their face.</Text>
          <View style={styles.demoGrid}>
            {DUMMY_WORKERS.map((worker) => {
              const enrolled = enrolledIds.has(worker.employeeId);
              const selected = employeeId === worker.employeeId;
              return (
                <Pressable
                  key={worker.employeeId}
                  onPress={() => applyDummyWorker(worker)}
                  style={[
                    styles.demoChip,
                    selected && styles.demoChipSelected,
                    enrolled && styles.demoChipEnrolled,
                  ]}
                >
                  <Text style={[styles.demoChipName, selected && styles.demoChipNameSelected]}>
                    {worker.fullName}
                  </Text>
                  <Text style={[styles.demoChipMeta, selected && styles.demoChipMetaSelected]}>
                    {worker.employeeId}
                  </Text>
                  <Text style={[styles.demoChipDept, selected && styles.demoChipMetaSelected]} numberOfLines={1}>
                    {worker.department}
                  </Text>
                  {enrolled ? (
                    <Text style={styles.demoEnrolledBadge}>Enrolled</Text>
                  ) : (
                    <Text style={styles.demoPendingBadge}>Tap to enroll</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Employee Details */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Employee Details</Text>
          <Input label="Full Name *"   value={fullName}     onChangeText={setFullName}     placeholder="Full name" />
          <Input label="Employee ID *" value={employeeId}   onChangeText={setEmployeeId}   placeholder="e.g. NHAI-1024" autoCapitalize="characters" />
          <Input label="Department"    value={department}   onChangeText={setDepartment}   placeholder="Optional" />
          <Input label="Site Location" value={siteLocation} onChangeText={setSiteLocation} placeholder="Optional" />

          {/* Capture Face */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Capture Face</Text>

          {/* Step dots */}
          <View style={styles.stepRow}>
            {STEPS.map((s, i) => {
              const done   = s.key === 'blink' ? blinkDone : captured[s.key] !== undefined;
              const active = i === stepIndex;
              return (
                <View key={s.key} style={styles.stepItem}>
                  <View style={[
                    styles.stepDot,
                    done   && styles.stepDotDone,
                    active && !done && styles.stepDotActive,
                  ]}>
                    {done
                      ? <Text style={styles.stepDotCheck}>✓</Text>
                      : s.auto && active
                        ? <ActivityIndicator size="small" color="#1877F2" />
                        : <Text style={[styles.stepDotNum, active && styles.stepDotNumActive]}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.stepDotLabel, active && !done && { color: '#1877F2' }]}>{s.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Camera */}
          <View style={styles.cameraCard}>
            {!permission ? (
              <View style={styles.cameraPlaceholder}>
                <ActivityIndicator color="#1877F2" />
              </View>
            ) : !permission.granted ? (
              <View style={styles.cameraPlaceholder}>
                <Pressable onPress={requestPermission} style={styles.allowBtn}>
                  <Text style={styles.allowBtnText}>Allow Camera</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.cameraWrap}>
                <CameraView ref={cameraRef} style={styles.camera} facing="front" />
                <View pointerEvents="none" style={styles.overlay}>
                  <Animated.View style={[
                    styles.ovalRing,
                    !formReady && styles.ovalRingDisabled,
                    isBlinkStep && formReady && { transform: [{ scale: blinkPulse }] },
                  ]} />
                  <View style={styles.faceBarWrap}>
                    <View style={styles.faceBarTrack}>
                      <View style={[styles.faceBarFill, { width: `${Math.round(faceBar * 100)}%` }]} />
                    </View>
                    <Text style={styles.faceBarText}>
                      Face {Math.round(faceBar * 100)}%
                    </Text>
                  </View>
                  <View style={styles.hintBadge}>
                    <Text style={styles.hintText}>
                      {!formReady
                        ? 'Fill in details above first'
                        : isBlinkStep && blinkDone
                          ? 'Blink detected!'
                          : currentStep.instruction
                      }
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.captureBar, !canStart && !sequenceRunning && styles.captureBarDisabled]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.captureBarStep}>
                  {sequenceRunning
                    ? `Step ${stepIndex + 1} / ${STEPS.length} — Auto`
                    : 'Ready when details are filled'}
                </Text>
                <Text style={styles.captureBarLabel}>
                  {!formReady
                    ? 'Fill details first'
                    : sequenceRunning
                      ? capturing
                        ? 'Saving enrollment…'
                        : currentStep.instruction
                      : 'One tap — blink, left, right, straight'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {sequenceRunning ? (
                  capturing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.autoCheckText}>⟳</Text>
                  )
                ) : (
                  <Pressable
                    onPress={startAutoSequence}
                    disabled={!canStart}
                    style={[styles.captureBtn, !canStart && styles.captureBtnDisabled]}
                  >
                    <Text style={[styles.captureBtnText, !canStart && { color: '#6B7280' }]}>Auto</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={manualCapture}
                  disabled={!canManual}
                  style={[styles.captureBtn, !canManual && styles.captureBtnDisabled]}
                >
                  <Text style={[styles.captureBtnText, !canManual && { color: '#6B7280' }]}>
                    {isBlinkStep ? 'Skip' : 'Capture'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {!formReady && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>Fill in Employee ID and Full Name, then tap Start.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Screen 2: ENROLLED ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enrollment Complete</Text>
      </View>

      <ScrollView contentContainerStyle={styles.enrolledScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <View style={styles.particleOrigin} pointerEvents="none">
            {particleAnims.map((p, i) => (
              <Animated.View key={i} style={[styles.particle, {
                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                opacity: p.opacity,
                transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
              }]} />
            ))}
          </View>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.successCheck}>✓</Text>
          </Animated.View>
          <Animated.Text style={[styles.enrolledLabel, { opacity: fadeAnim }]}>ENROLLED</Animated.Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileMeta}>Employee ID: {employeeId}</Text>
            {department   ? <Text style={styles.profileMeta}>{department}</Text>   : null}
            {siteLocation ? <Text style={styles.profileMeta}>{siteLocation}</Text> : null}
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Photos</Text>
            <View style={[styles.pill, styles.pillGreen]}>
              <Text style={styles.pillText}>{Object.keys(captured).length}/3</Text>
            </View>
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Face Model</Text>
            {saveStatus === 'saving'
              ? <ActivityIndicator size="small" color="#1877F2" style={{ marginTop: 6 }} />
              : <View style={[styles.pill, modelReady ? styles.pillGreen : styles.pillAmber]}>
                  <Text style={styles.pillText}>{modelReady ? 'Ready' : 'Build later'}</Text>
                </View>
            }
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Record</Text>
            {saveStatus === 'saving'
              ? <ActivityIndicator size="small" color="#1877F2" style={{ marginTop: 6 }} />
              : <View style={[styles.pill, saveStatus === 'saved' ? styles.pillGreen : styles.pillRed]}>
                  <Text style={styles.pillText}>{saveStatus === 'saved' ? 'Saved' : 'Failed'}</Text>
                </View>
            }
          </View>
        </View>

        <Button label="Continue" onPress={() => router.replace('/home')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    borderBottomWidth: 1, borderBottomColor: '#E4E6EB',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
  },
  backText:    { color: '#1877F2', fontWeight: '600', fontSize: 14, marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#050505' },
  headerSub:   { fontSize: 13, color: '#65676B', marginTop: 2 },

  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#65676B',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 20, marginBottom: 8,
  },
  demoHint: { fontSize: 13, color: '#65676B', marginBottom: 10 },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  demoChip: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4E6EB',
  },
  demoChipSelected: {
    borderColor: '#1877F2',
    backgroundColor: '#E7F3FF',
  },
  demoChipEnrolled: { opacity: 0.85 },
  demoChipName: { fontSize: 14, fontWeight: '800', color: '#050505' },
  demoChipNameSelected: { color: '#1877F2' },
  demoChipMeta: { fontSize: 11, color: '#65676B', marginTop: 2, fontWeight: '600' },
  demoChipMetaSelected: { color: '#1877F2' },
  demoChipDept: { fontSize: 11, color: '#8A8D91', marginTop: 2 },
  demoEnrolledBadge: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '800',
    color: '#22C55E',
    textTransform: 'uppercase',
  },
  demoPendingBadge: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '800',
    color: '#1877F2',
    textTransform: 'uppercase',
  },

  // Step dots
  stepRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E4E6EB', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E4E6EB',
  },
  stepDotActive: { borderColor: '#1877F2', backgroundColor: '#E7F3FF' },
  stepDotDone:   { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  stepDotNum:       { fontSize: 14, fontWeight: '700', color: '#65676B' },
  stepDotNumActive: { color: '#1877F2' },
  stepDotCheck:     { fontSize: 16, color: '#fff', fontWeight: '800' },
  stepDotLabel:     { fontSize: 11, fontWeight: '600', color: '#65676B' },

  // Camera card
  cameraCard: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 2, borderColor: '#1877F2',
    backgroundColor: '#111',
  },
  cameraPlaceholder: { height: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F3FF' },
  cameraWrap: { height: 280 },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ovalRing: {
    width: 160, height: 200, borderRadius: 80,
    borderWidth: 3, borderColor: 'rgba(24,119,242,0.9)',
  },
  ovalRingDisabled: { borderColor: 'rgba(150,150,150,0.5)' },
  hintBadge: {
    position: 'absolute', bottom: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999,
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  faceBarWrap: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faceBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  faceBarFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  faceBarText: { color: '#fff', fontSize: 12, fontWeight: '800', width: 78, textAlign: 'right' },

  // Capture / auto bar
  captureBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1877F2', paddingHorizontal: 16, paddingVertical: 12,
  },
  captureBarDisabled: { backgroundColor: '#9CA3AF' },
  captureBarStep:  { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  captureBarLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  autoCheckText:   { color: '#fff', fontSize: 22, fontWeight: '900', marginLeft: 8 },

  captureBtn: {
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
    minWidth: 90, alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText:     { color: '#1877F2', fontWeight: '800', fontSize: 14 },

  allowBtn:     { backgroundColor: '#1877F2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  allowBtnText: { color: '#fff', fontWeight: '700' },

  warningBanner: {
    marginTop: 10, backgroundColor: '#FEF3C7',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warningText: { fontSize: 12, color: '#92400E', fontWeight: '600', textAlign: 'center' },

  // Enrolled screen
  enrolledScroll: { paddingHorizontal: 16, paddingBottom: 32 },
  heroWrap: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  particleOrigin: {
    position: 'absolute', width: 88, height: 88,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
  },
  particle: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
  successCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  successCheck:  { color: '#fff', fontSize: 40, fontWeight: '800' },
  enrolledLabel: { fontSize: 28, fontWeight: '900', color: '#22C55E', letterSpacing: 2, marginTop: 14 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E4E6EB', marginBottom: 16,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E7F3FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 28, fontWeight: '800', color: '#1877F2' },
  profileInfo:  { marginLeft: 14, flex: 1 },
  profileName:  { fontSize: 18, fontWeight: '800', color: '#050505' },
  profileMeta:  { fontSize: 13, color: '#65676B', marginTop: 2 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statusBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E4E6EB', alignItems: 'center',
  },
  statusLabel: { fontSize: 11, color: '#65676B', fontWeight: '600' },
  pill:      { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText:  { fontSize: 12, fontWeight: '700', color: '#050505' },
  pillGreen: { backgroundColor: '#DCFCE7' },
  pillAmber: { backgroundColor: '#FEF3C7' },
  pillRed:   { backgroundColor: '#FEE2E2' },
});
