import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { getSession, isLoggedIn } from '@/lib/auth';
import { getEmployeeCount, initDatabase } from '@/lib/database';

const actions = [
  { title: 'Authenticate Worker', subtitle: 'Verify face & mark attendance', icon: '🔍', route: '/authenticate' },
  { title: 'Enroll Employee', subtitle: 'Register new worker offline', icon: '➕', route: '/enroll' },
  { title: 'Attendance Records', subtitle: 'View offline logs', icon: '📋', route: '/records' },
  { title: 'Sync Data', subtitle: 'Upload when online', icon: '☁️', route: '/sync' },
  { title: 'Settings', subtitle: 'App preferences', icon: '⚙️', route: '/settings' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [workerCount, setWorkerCount] = useState(0);
  const [supervisorName, setSupervisorName] = useState('Supervisor');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!(await isLoggedIn())) {
          router.replace('/login');
          return;
        }
        await initDatabase();
        const count = await getEmployeeCount();
        setWorkerCount(count);
        const session = await getSession();
        if (session?.name) setSupervisorName(session.name);
      })();
    }, [router])
  );

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
          <View className="mb-4 flex-row flex-wrap gap-3">
            <View className="min-w-[46%] flex-1">
              <Card>
                <Text className="text-2xl font-bold text-[#1877F2]">{workerCount}</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Total Workers</Text>
              </Card>
            </View>
            <View className="min-w-[46%] flex-1">
              <Card>
                <Text className="text-2xl font-bold text-[#22C55E]">0</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Present Today</Text>
              </Card>
            </View>
            <View className="min-w-[46%] flex-1">
              <Card>
                <Text className="text-2xl font-bold text-[#F59E0B]">0</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Pending Sync</Text>
              </Card>
            </View>
            <View className="min-w-[46%] flex-1">
              <Card>
                <Text className="text-sm font-bold text-[#65676B]">—</Text>
                <Text className="mt-1 text-xs text-[#65676B]">Last Sync</Text>
              </Card>
            </View>
          </View>

          <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-[#65676B]">
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
                <Text className="text-[#1877F2] text-lg">›</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
