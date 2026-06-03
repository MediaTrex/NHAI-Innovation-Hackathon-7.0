import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Employee, getAllEmployees, initDatabase } from '@/lib/database';

export default function RecordsScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await initDatabase();
        setEmployees(await getAllEmployees());
      })();
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Text className="text-xl font-bold text-[#050505]">Enrolled Workers</Text>
        <Text className="text-sm text-[#65676B]">{employees.length} records in SQLite</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 16 }}>
        {employees.length === 0 ? (
          <Card>
            <Text className="text-center text-[#65676B]">No employees enrolled yet.</Text>
          </Card>
        ) : (
          employees.map((emp) => (
            <Card key={emp.id} className="mb-3">
              <Text className="text-base font-bold text-[#050505]">{emp.full_name}</Text>
              <Text className="text-sm text-[#1877F2]">{emp.employee_id}</Text>
              <Text className="mt-1 text-xs text-[#65676B]">
                {emp.department || '—'} · {emp.site_location || '—'}
              </Text>
              <Text className="mt-2 text-xs text-[#22C55E]">
                Faces: {[emp.face_front_path, emp.face_left_path, emp.face_right_path].filter(Boolean).length}/3
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
