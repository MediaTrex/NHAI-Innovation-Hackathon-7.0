import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { logoutSupervisor } from '@/lib/auth';
import { checkFaceApiHealth } from '@/lib/face-api';
import {
  connectFaceApi,
  getDefaultFaceApiUrl,
  getFaceApiBaseUrl,
  resetFaceApiUrlCache,
  setFaceApiBaseUrl,
} from '@/lib/face-settings';

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(getDefaultFaceApiUrl());
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [finding, setFinding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFaceApiBaseUrl().then(setApiUrl);
    checkFaceApiHealth().then((ok) => setApiStatus(ok ? 'online' : 'offline'));
  }, []);

  const testApi = async () => {
    await setFaceApiBaseUrl(apiUrl);
    const ok = await checkFaceApiHealth();
    setApiStatus(ok ? 'online' : 'offline');
    Alert.alert(
      ok ? 'Connected' : 'Not reachable',
      ok
        ? 'NHAI_HACK Face API is running.'
        : 'Start backend: cd backend && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000'
    );
  };

  const saveUrl = async () => {
    setSaving(true);
    try {
      await setFaceApiBaseUrl(apiUrl);
      await testApi();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Text className="text-xl font-bold text-[#050505]">Settings</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-4">
        <Card className="mb-3">
          <Text className="font-bold text-[#050505]">Face API (NHAI_HACK)</Text>
          <Text className="mt-1 text-sm text-[#65676B]">
            InsightFace backend from github.com/vips725/NHAI_HACK
          </Text>
          <Text
            className={`mt-2 text-xs font-bold ${
              apiStatus === 'online'
                ? 'text-[#22C55E]'
                : apiStatus === 'offline'
                  ? 'text-[#EF4444]'
                  : 'text-[#65676B]'
            }`}
          >
            Status: {apiStatus === 'unknown' ? 'Checking…' : apiStatus}
          </Text>
        </Card>

        <Input
          label="Face API URL"
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.4:8000"
          autoCapitalize="none"
        />
        <View className="mb-4 gap-2">
          <Button
            label="Auto-find Mac on Wi‑Fi"
            onPress={async () => {
              setFinding(true);
              try {
                resetFaceApiUrlCache();
                const { ok, url } = await connectFaceApi();
                setApiUrl(url);
                setApiStatus(ok ? 'online' : 'offline');
                Alert.alert(
                  ok ? 'Connected' : 'Not found',
                  ok
                    ? `Face API at ${url}`
                    : 'Start backend on Mac:\ncd DatalakeApp/backend\nuvicorn main:app --host 0.0.0.0 --port 8000\n\nSame Wi‑Fi as iPhone. Allow Local Network on iOS.'
                );
              } finally {
                setFinding(false);
              }
            }}
            loading={finding}
          />
          <Button label="Save & test connection" onPress={saveUrl} loading={saving} />
          <Button
            label="Use default URL (192.168.1.4:8000)"
            variant="secondary"
            onPress={async () => {
              const url = getDefaultFaceApiUrl();
              setApiUrl(url);
              resetFaceApiUrlCache();
              await setFaceApiBaseUrl(url);
              const ok = await checkFaceApiHealth();
              setApiStatus(ok ? 'online' : 'offline');
              Alert.alert(ok ? 'Connected' : 'Not reachable', ok ? url : `Could not reach ${url}`);
            }}
          />
        </View>

        <Card className="mb-3">
          <Text className="font-bold text-[#050505]">Storage</Text>
          <Text className="text-sm text-[#65676B]">SQLite + local face photos + embeddings</Text>
        </Card>

        <Card className="mb-3">
          <Text className="font-bold text-[#050505]">About</Text>
          <Text className="text-sm text-[#65676B]">NHAI SecureID v1.0.0</Text>
        </Card>

        <Card className="mb-3" onPress={async () => {
          await logoutSupervisor();
          router.replace('/login');
        }}>
          <Text className="font-bold text-[#EF4444]">Sign out</Text>
          <Text className="text-sm text-[#65676B]">Return to supervisor login</Text>
        </Card>

      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
