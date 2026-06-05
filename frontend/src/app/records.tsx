import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import {
  AttendanceRecord,
  Employee,
  getAllAttendanceRecords,
  getAllEmployees,
  getTodayAttendanceCount,
  initDatabase,
} from '@/lib/database';

function formatTime(iso: string) {
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function RecordsScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await initDatabase();
        const [list, emps, today] = await Promise.all([
          getAllAttendanceRecords(),
          getAllEmployees(),
          getTodayAttendanceCount(),
        ]);
        setRecords(list);
        setEmployees(emps);
        setTodayCount(today);
      })();
    }, [])
  );

  const employeeMap = new Map(employees.map((e) => [e.employee_id, e]));

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Text className="text-xl font-bold text-[#050505]">Attendance Records</Text>
        <Text className="text-sm text-[#65676B]">
          {records.length} log(s) · {todayCount} verified today
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 16 }}>
        {records.length === 0 ? (
          <Card>
            <Text className="text-center font-semibold text-[#050505]">No attendance yet</Text>
            <Text className="mt-2 text-center text-sm text-[#65676B]">
              Authenticate a worker to log a VERIFIED attendance record here.
            </Text>
          </Card>
        ) : (
          records.map((rec) => {
            const emp = employeeMap.get(rec.employee_id);
            const verified = rec.verified === 1;
            const livenessOk = rec.liveness_passed === 1;
            const photo = emp?.face_front_path;

            return (
              <View key={rec.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, verified ? styles.verified : styles.failed]}>
                    <Text style={styles.statusText}>{verified ? 'VERIFIED' : 'FAILED'}</Text>
                  </View>
                  <Text style={styles.timeText}>{formatTime(rec.checked_in_at)}</Text>
                </View>

                <View style={styles.profileRow}>
                  {photo && !photo.startsWith('mock://') ? (
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarLetter}>{rec.full_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.profileInfo}>
                    <Text style={styles.name}>{rec.full_name}</Text>
                    <Text style={styles.meta}>Employee ID: {rec.employee_id}</Text>
                    <Text style={styles.meta}>{rec.department || emp?.department || 'Field Officer'}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Match Score</Text>
                    <Text style={[styles.statValue, verified && styles.statGreen]}>
                      {(rec.match_score * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Liveness</Text>
                    <View style={[styles.pill, livenessOk ? styles.pillOk : styles.pillFail]}>
                      <Text style={styles.pillText}>{livenessOk ? 'Passed' : 'Failed'}</Text>
                    </View>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Sync</Text>
                    <Text style={styles.syncText}>{rec.synced ? 'Synced' : 'Pending'}</Text>
                  </View>
                </View>
              </View>
            );
          })
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verified: { backgroundColor: '#DCFCE7' },
  failed: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '800', color: '#050505' },
  timeText: { fontSize: 11, color: '#65676B', fontWeight: '600' },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    backgroundColor: '#E7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '800', color: '#1877F2' },
  profileInfo: { marginLeft: 12, flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#050505' },
  meta: { fontSize: 12, color: '#65676B', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: '#65676B', fontWeight: '600' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#050505', marginTop: 4 },
  statGreen: { color: '#22C55E' },
  pill: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillOk: { backgroundColor: '#DCFCE7' },
  pillFail: { backgroundColor: '#FEE2E2' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#050505' },
  syncText: { fontSize: 11, fontWeight: '700', color: '#050505', marginTop: 6 },
});
