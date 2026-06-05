import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSession, isLoggedIn } from '@/lib/auth';
import {
  getEnrolledEmployeeCount,
  getPendingSyncCount,
  getTodayPresentCount,
  initDatabase,
} from '@/lib/database';
import { subscribeHomeStats } from '@/lib/app-refresh';
import { formatLastSync, getLastSyncTime, syncPendingAttendance } from '@/lib/sync-service';

const actions = [
  { title: 'Authenticate Worker', subtitle: 'Verify face & mark attendance', icon: '🔍', route: '/authenticate' },
  { title: 'Enroll Employee', subtitle: 'Register new worker offline', icon: '➕', route: '/enroll' },
  { title: 'Attendance Records', subtitle: 'View offline logs', icon: '📋', route: '/records' },
  { title: 'Settings', subtitle: 'App preferences', icon: '⚙️', route: '/settings' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [workerCount, setWorkerCount] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [supervisorName, setSupervisorName] = useState('Supervisor');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const loadStats = useCallback(async () => {
    await initDatabase();
    const [workers, present, pending, last] = await Promise.all([
      getEnrolledEmployeeCount(),
      getTodayPresentCount(),
      getPendingSyncCount(),
      getLastSyncTime(),
    ]);
    setWorkerCount(workers);
    setPresentToday(present);
    setPendingSync(pending);
    setLastSync(last);
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!(await isLoggedIn())) {
      router.replace('/login');
      return;
    }
    await loadStats();
    const session = await getSession();
    if (session?.name) setSupervisorName(session.name);
  }, [router, loadStats]);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard])
  );

  useEffect(() => subscribeHomeStats(() => void refreshDashboard()), [refreshDashboard]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingAttendance();
      await loadStats();
      Alert.alert('Sync complete', result.message);
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Could not sync.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="bg-[#1877F2] px-5 pb-6 pt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-white">NHAI SecureID</Text>
              <Text className="mt-0.5 text-sm text-white/85">Field Supervisor Portal</Text>
            </View>
            <View className="rounded-full bg-white/20 px-3 py-1">
              <Text className="text-xs font-semibold text-white">● Offline</Text>
            </View>
          </View>

          <Card className="mt-4 !bg-white">
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#E7F3FF]">
                <Text className="text-2xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-[#050505]">
                  Welcome, {supervisorName}
                </Text>
                <Text className="text-sm text-[#65676B]">NHAI Field Officer</Text>
                <Text className="mt-1 text-xs text-[#65676B]">
                  {dateStr} · {timeStr}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View className="px-4 pt-4">
          <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-[#65676B]">
            Statistics
          </Text>
          <View className="mb-3 flex-row flex-wrap gap-3">
            <View className="min-w-[46%] flex-1">
              <Card onPress={() => router.push('/workers')}>
                <Text className="text-2xl font-bold text-[#1877F2]">{workerCount}</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Total Workers</Text>
                <Text className="mt-1 text-[10px] font-semibold text-[#1877F2]">Tap to view ›</Text>
              </Card>
            </View>
            <View className="min-w-[46%] flex-1">
              <Card onPress={() => router.push('/records')}>
                <Text className="text-2xl font-bold text-[#22C55E]">{presentToday}</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Present Today</Text>
                <Text className="mt-1 text-[10px] font-semibold text-[#22C55E]">Verified today ›</Text>
              </Card>
            </View>
            <View className="min-w-[46%] flex-1">
              <Card onPress={() => router.push('/sync')}>
                <Text className="text-2xl font-bold text-[#F59E0B]">{pendingSync}</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Pending Sync</Text>
                <Text className="mt-1 text-[10px] font-semibold text-[#F59E0B]">Tap to sync ›</Text>
              </Card>
            </View>
            <View className="min-w-[46%] flex-1">
              <Card onPress={() => router.push('/sync')}>
                <Text className="text-sm font-bold text-[#050505]">{formatLastSync(lastSync)}</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Last Sync</Text>
              </Card>
            </View>
          </View>

          <Button
            label={pendingSync > 0 ? `Sync Data (${pendingSync})` : 'Sync Data'}
            onPress={runSync}
            loading={syncing}
            disabled={syncing}
          />

          <Text className="mb-3 mt-5 text-sm font-bold uppercase tracking-wide text-[#65676B]">
            Quick actions
          </Text>
          {actions.map((item) => (
            <Card key={item.route} className="mb-3" onPress={() => router.push(item.route as '/')}>
              <View className="flex-row items-center gap-4">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#E7F3FF]">
                  <Text className="text-2xl">{item.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#050505]">{item.title}</Text>
                  <Text className="text-sm text-[#65676B]">{item.subtitle}</Text>
                </View>
                <Text className="text-lg text-[#1877F2]">›</Text>
              </View>
            </Card>
          ))}

          <Card className="mt-1" onPress={() => router.push('/sync')}>
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#E7F3FF]">
                <Text className="text-2xl">☁️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-[#050505]">Sync Data</Text>
                <Text className="text-sm text-[#65676B]">
                  {pendingSync > 0
                    ? `${pendingSync} record(s) waiting to upload`
                    : 'Upload attendance when online'}
                </Text>
              </View>
              <Text className="text-lg text-[#1877F2]">›</Text>
            </View>
          </Card>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
