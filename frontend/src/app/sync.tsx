import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getPendingAttendanceRecords,
  getPendingSyncCount,
  initDatabase,
  type AttendanceRecord,
} from '@/lib/database';
import {
  formatLastSync,
  getLastSyncTime,
  syncPendingAttendance,
} from '@/lib/sync-service';

function formatTime(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: 'numeric',
    month: 'short',
  });
}

export default function SyncScreen() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pending, setPending] = useState<AttendanceRecord[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    await initDatabase();
    const [count, records, last] = await Promise.all([
      getPendingSyncCount(),
      getPendingAttendanceRecords(),
      getLastSyncTime(),
    ]);
    setPendingCount(count);
    setPending(records);
    setLastSync(last);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const runSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingAttendance();
      await load();
      Alert.alert(result.ok ? 'Sync complete' : 'Sync failed', result.message);
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Could not sync data.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Text className="text-xl font-bold text-[#050505]">Sync Data</Text>
        <Text className="text-sm text-[#65676B]">Upload offline attendance when online</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <Card className="mb-4">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs font-bold uppercase text-[#65676B]">Pending sync</Text>
              <Text className="mt-1 text-3xl font-bold text-[#F59E0B]">{pendingCount}</Text>
            </View>
            <View className="items-end">
              <Text className="text-xs font-bold uppercase text-[#65676B]">Last sync</Text>
              <Text className="mt-1 text-sm font-bold text-[#050505]">{formatLastSync(lastSync)}</Text>
            </View>
          </View>
          <View className="mt-4">
            <Button
              label={pendingCount > 0 ? `Sync ${pendingCount} record(s)` : 'Sync now'}
              onPress={runSync}
              loading={syncing}
              disabled={syncing}
            />
          </View>
        </Card>

        {pending.length === 0 ? (
          <Card>
            <Text className="font-semibold text-[#050505]">All caught up</Text>
            <Text className="mt-2 text-sm text-[#65676B]">
              No attendance logs waiting to upload. New authentications will appear here until synced.
            </Text>
          </Card>
        ) : (
          <>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#65676B]">
              Queued records
            </Text>
            {pending.map((rec) => (
              <Card key={rec.id} className="mb-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-[#050505]">{rec.full_name}</Text>
                    <Text className="text-xs text-[#65676B]">{rec.employee_id}</Text>
                  </View>
                  <View className="items-end">
                    <Text
                      className={`text-xs font-bold ${
                        rec.verified === 1 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                      }`}
                    >
                      {rec.verified === 1 ? 'VERIFIED' : 'FAILED'}
                    </Text>
                    <Text className="text-[10px] text-[#65676B]">{formatTime(rec.checked_in_at)}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
