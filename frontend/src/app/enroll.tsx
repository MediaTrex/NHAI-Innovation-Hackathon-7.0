import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { EnrollCamera } from '@/components/enroll-camera';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  initDatabase,
  persistFacePhoto,
  saveEmployee,
} from '@/lib/database';

type Angle = 'front' | 'left' | 'right';

type FacePaths = {
  front: string | null;
  left: string | null;
  right: string | null;
};

function qualityLabel(count: number): { text: string; color: string } {
  if (count >= 3) return { text: 'Excellent', color: 'text-[#22C55E]' };
  if (count >= 1) return { text: 'Good', color: 'text-[#F59E0B]' };
  return { text: 'Poor — capture faces', color: 'text-[#EF4444]' };
}

export default function EnrollScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [activeAngle, setActiveAngle] = useState<Angle>('front');
  const [faces, setFaces] = useState<FacePaths>({ front: null, left: null, right: null });
  const [saving, setSaving] = useState(false);

  const capturedCount = [faces.front, faces.left, faces.right].filter(Boolean).length;
  const quality = qualityLabel(capturedCount);

  const handleCapture = async (uri: string) => {
    if (!employeeId.trim()) {
      Alert.alert('Employee ID required', 'Enter Employee ID before capturing faces.');
      return;
    }
    try {
      const path = await persistFacePhoto(uri, employeeId, activeAngle);
      setFaces((prev) => ({ ...prev, [activeAngle]: path }));
      Alert.alert('Captured', `${activeAngle} face saved locally.`);
    } catch {
      Alert.alert('Error', 'Could not save photo.');
    }
  };

  const handleSave = async () => {
    if (!employeeId.trim() || !fullName.trim()) {
      Alert.alert('Missing fields', 'Employee ID and Full Name are required.');
      return;
    }
    if (!faces.front) {
      Alert.alert('Face required', 'Capture at least the front face photo.');
      return;
    }

    setSaving(true);
    try {
      await initDatabase();
      await saveEmployee({
        employeeId,
        fullName,
        department,
        siteLocation,
        faceFrontPath: faces.front,
        faceLeftPath: faces.left,
        faceRightPath: faces.right,
      });
      Alert.alert('Saved offline', `${fullName} enrolled successfully.`, [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save employee.';
      Alert.alert('Error', msg.includes('UNIQUE') ? 'Employee ID already exists.' : msg);
    } finally {
      setSaving(false);
    }
  };

  const angles: { key: Angle; label: string }[] = [
    { key: 'front', label: 'Front' },
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-[#1877F2] font-semibold">← Back</Text>
        </Pressable>
        <Text className="mt-1 text-xl font-bold text-[#050505]">Enroll Employee</Text>
        <Text className="text-sm text-[#65676B]">Register worker & capture faces offline</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <Input
          label="Employee ID"
          value={employeeId}
          onChangeText={setEmployeeId}
          placeholder="e.g. NHAI-1024"
          autoCapitalize="characters"
        />
        <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <Input
          label="Department"
          value={department}
          onChangeText={setDepartment}
          placeholder="e.g. Highway Maintenance"
        />
        <Input
          label="Site Location"
          value={siteLocation}
          onChangeText={setSiteLocation}
          placeholder="e.g. NH-44 KM 120"
        />

        <Text className="mb-2 text-sm font-bold text-[#050505]">Face capture</Text>
        <View className="mb-3 flex-row gap-2">
          {angles.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setActiveAngle(key)}
              className={`flex-1 rounded-xl py-2.5 ${
                activeAngle === key ? 'bg-[#1877F2]' : 'bg-white border border-[#E4E6EB]'
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  activeAngle === key ? 'text-white' : 'text-[#65676B]'
                }`}
              >
                {label}
                {faces[key] ? ' ✓' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <EnrollCamera angle={activeAngle} onCapture={handleCapture} />

        <View className="mt-3 flex-row items-center justify-center gap-2">
          <Text className="text-sm text-[#65676B]">Face quality:</Text>
          <Text className={`text-sm font-bold ${quality.color}`}>{quality.text}</Text>
        </View>

        <View className="mt-6 gap-3">
          <Button
            label="Save offline"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
          <Text className="text-center text-xs text-[#65676B]">
            Photos stored on device · SQLite database
          </Text>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
