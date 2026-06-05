import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { subscribeHomeStats } from '@/lib/app-refresh';
import { Employee, getEnrolledEmployees, initDatabase } from '@/lib/database';

function formatDate(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Employee[]>([]);

  const loadWorkers = useCallback(async () => {
    await initDatabase();
    setWorkers(await getEnrolledEmployees());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWorkers();
    }, [loadWorkers])
  );

  useEffect(() => subscribeHomeStats(() => void loadWorkers()), [loadWorkers]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-bold text-[#1877F2]">← Back</Text>
        </Pressable>
        <Text className="mt-2 text-xl font-bold text-[#050505]">Enrolled Workers</Text>
        <Text className="text-sm text-[#65676B]">
          {workers.length} worker{workers.length === 1 ? '' : 's'} with face enrollment
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 16 }}>
        {workers.length === 0 ? (
          <Card>
            <Text className="text-center font-semibold text-[#050505]">No enrolled workers yet</Text>
            <Text className="mt-2 text-center text-sm text-[#65676B]">
              Enroll a worker with face capture to see them here.
            </Text>
            <Pressable
              onPress={() => router.push('/enroll')}
              className="mt-4 items-center rounded-xl bg-[#1877F2] py-3"
            >
              <Text className="font-bold text-white">Go to Enroll</Text>
            </Pressable>
          </Card>
        ) : (
          workers.map((emp) => (
            <View key={emp.employee_id} style={styles.card}>
              <View style={styles.profileRow}>
                {emp.face_front_path ? (
                  <Image source={{ uri: emp.face_front_path }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>{emp.full_name.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.name}>{emp.full_name}</Text>
                  <Text style={styles.meta}>{emp.employee_id}</Text>
                  <Text style={styles.meta}>{emp.department || 'Field Officer'}</Text>
                  {emp.site_location ? (
                    <Text style={styles.site}>{emp.site_location}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.footer}>
                <View style={[styles.badge, emp.face_embedding ? styles.badgeOk : styles.badgeWarn]}>
                  <Text style={styles.badgeText}>
                    {emp.face_embedding ? 'Face model ready' : 'Model pending'}
                  </Text>
                </View>
                <Text style={styles.enrolledDate}>Enrolled {formatDate(emp.created_at)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E6EB',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: '#E7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 24, fontWeight: '800', color: '#1877F2' },
  profileInfo: { marginLeft: 14, flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: '#050505' },
  meta: { fontSize: 13, color: '#65676B', marginTop: 2 },
  site: { fontSize: 12, color: '#8A8D91', marginTop: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeWarn: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#050505' },
  enrolledDate: { fontSize: 11, color: '#65676B' },
});
