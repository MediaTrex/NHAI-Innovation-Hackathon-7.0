import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { LivenessAuthFlow } from '@/components/liveness-auth-flow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { embeddingToJson } from '@/lib/embedding';
import {
  checkFaceApiHealth,
  embedFaceFromUri,
  FaceApiError,
} from '@/lib/face-api';
import { connectFaceApi } from '@/lib/face-settings';
import {
  getEnrolledEmployees,
  initDatabase,
  updateEmployeeEmbedding,
  type Employee,
} from '@/lib/database';

function isEnrolledWithPhoto(emp: Employee) {
  return !!emp.face_front_path && !emp.face_front_path.startsWith('mock://');
}

type BackfillResult = {
  updated: Employee[];
  errors: { name: string; reason: string }[];
};

async function backfillEmbeddings(
  employees: Employee[],
  apiOnline: boolean
): Promise<BackfillResult> {
  if (!apiOnline) return { updated: employees, errors: [] };

  const updated = [...employees];
  const errors: { name: string; reason: string }[] = [];

  for (let i = 0; i < updated.length; i++) {
    const emp = updated[i];
    if (emp.face_embedding || !emp.face_front_path || emp.face_front_path.startsWith('mock://')) {
      continue;
    }
    try {
      const { embedding } = await embedFaceFromUri(emp.face_front_path);
      const json = embeddingToJson(embedding);
      await updateEmployeeEmbedding(emp.employee_id, json);
      updated[i] = { ...emp, face_embedding: json };
    } catch (e) {
      errors.push({
        name: emp.full_name,
        reason: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }
  return { updated, errors };
}

export default function AuthenticateScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<Employee[]>([]);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [buildingModels, setBuildingModels] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initDatabase();
      const { ok: apiOk, url } = await connectFaceApi();
      const enrolled = await getEnrolledEmployees();
      setApiUrl(url);
      setApiOnline(apiOk);

      const { updated: refreshed } = await backfillEmbeddings(enrolled, apiOk);
      const ready = refreshed.filter(isEnrolledWithPhoto);
      const needsModel = ready.filter((e) => !e.face_embedding);

      setEmployees(ready);
      setPendingPhotos(needsModel);
      setSelectedId((prev) => {
        if (prev && ready.some((e) => e.employee_id === prev)) return prev;
        return ready[0]?.employee_id ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const buildModels = async () => {
    setBuildingModels(true);
    try {
      const apiOk = await checkFaceApiHealth();
      setApiOnline(apiOk);

      if (!apiOk) {
        Alert.alert(
          'Face API offline',
          `Cannot reach ${apiUrl}.\n\nStart the backend on your Mac, then retry.`
        );
        return;
      }

      const enrolled = await getEnrolledEmployees();
      const { updated: refreshed, errors } = await backfillEmbeddings(enrolled, true);
      const ready = refreshed.filter(isEnrolledWithPhoto);
      const needsModel = ready.filter((e) => !e.face_embedding);

      setEmployees(ready);
      setPendingPhotos(needsModel);

      if (errors.length > 0 && ready.length === 0) {
        Alert.alert('Build failed', errors.map((e) => `${e.name}: ${e.reason}`).join('\n'));
      } else if (needsModel.length === 0 && ready.length > 0) {
        Alert.alert('Ready', `${ready.length} worker(s) can authenticate.`);
      } else if (needsModel.length > 0) {
        Alert.alert(
          'Partially ready',
          `${ready.length - needsModel.length} ready · ${needsModel.length} still need face models.`
        );
      }
    } catch (e) {
      Alert.alert('Error', e instanceof FaceApiError ? e.message : 'Could not build models.');
    } finally {
      setBuildingModels(false);
    }
  };

  const selected = employees.find((e) => e.employee_id === selectedId) ?? null;

  const verifyWorker = () => {
    if (!selected) {
      Alert.alert('Select worker', 'Choose an enrolled worker first.');
      return;
    }
    if (!apiOnline) {
      Alert.alert('Face API offline', 'Start the backend and tap Retry connection.');
      return;
    }
    setVerifying(true);
  };

  const apiStatusText =
    loading || apiOnline === null
      ? 'Checking…'
      : apiOnline
        ? 'Online'
        : `Offline — ${apiUrl || 'set URL in Settings'}`;

  if (verifying && selected) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <LivenessAuthFlow employee={selected} onDone={() => setVerifying(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Text className="text-xl font-bold text-[#050505]">Authenticate Worker</Text>
        <Text className="text-sm text-[#65676B]">Select worker · one tap to verify</Text>
        <Text
          className={`mt-1 text-xs font-semibold ${
            apiOnline ? 'text-[#22C55E]' : 'text-[#F59E0B]'
          }`}
        >
          Face API: {apiStatusText}
        </Text>
        {!loading && !apiOnline && (
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Pressable onPress={load} className="rounded-lg bg-[#E7F3FF] px-3 py-1.5">
              <Text className="text-xs font-bold text-[#1877F2]">↻ Retry</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                setLoading(true);
                try {
                  const { ok, url } = await connectFaceApi();
                  setApiUrl(url);
                  setApiOnline(ok);
                  Alert.alert(
                    ok ? 'Face API online' : 'Still offline',
                    ok
                      ? `Connected to ${url}`
                      : `Cannot reach Face API.\n\n1. Mac & iPhone on same Wi‑Fi\n2. Start backend on Mac:\ncd DatalakeApp/backend\nsource .venv/bin/activate\nuvicorn main:app --host 0.0.0.0 --port 8000\n\nTrying: ${url}`
                  );
                  if (ok) await load();
                } finally {
                  setLoading(false);
                }
              }}
              className="rounded-lg bg-[#1877F2] px-3 py-1.5"
            >
              <Text className="text-xs font-bold text-white">Find Face API</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              className="rounded-lg border border-[#E4E6EB] bg-white px-3 py-1.5"
            >
              <Text className="text-xs font-bold text-[#65676B]">Settings</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View className="flex-1 px-4 pt-4">
        {employees.length === 0 ? (
          <Card>
            <Text className="font-bold text-[#050505]">No enrolled workers</Text>
            <Text className="mt-2 text-sm text-[#65676B]">
              Enroll workers with face capture first. Workers appear here after enrollment.
            </Text>
            <View className="mt-4 gap-2">
              {pendingPhotos.length > 0 && (
                <Button
                  label="Build face models"
                  onPress={buildModels}
                  loading={buildingModels}
                  disabled={buildingModels}
                />
              )}
              <Button label="Go to Enroll" variant="secondary" onPress={() => router.push('/enroll')} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text className="font-bold text-[#050505]">Select worker</Text>
            <Text className="mt-1 text-xs text-[#65676B]">
              {employees.length} enrolled
              {pendingPhotos.length > 0 ? ` · ${pendingPhotos.length} need face model` : ''}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {employees.map((emp) => (
                <Pressable
                  key={emp.employee_id}
                  onPress={() => setSelectedId(emp.employee_id)}
                  className={`rounded-xl px-3 py-2 ${
                    selectedId === emp.employee_id ? 'bg-[#1877F2]' : 'border border-[#E4E6EB] bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selectedId === emp.employee_id ? 'text-white' : 'text-[#050505]'
                    }`}
                  >
                    {emp.full_name}
                  </Text>
                  <Text
                    className={`text-xs ${
                      selectedId === emp.employee_id ? 'text-white/80' : 'text-[#65676B]'
                    }`}
                  >
                    {emp.employee_id}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="mt-4 gap-2">
              <Button
                label="Verify Worker"
                onPress={verifyWorker}
                disabled={!apiOnline || !selectedId}
              />
              {pendingPhotos.length > 0 && (
                <Button
                  label="Build face models"
                  variant="secondary"
                  onPress={buildModels}
                  loading={buildingModels}
                />
              )}
            </View>
          </Card>
        )}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}
