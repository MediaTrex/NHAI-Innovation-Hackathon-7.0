import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginSupervisor } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [supervisorId, setSupervisorId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginSupervisor(supervisorId, pin);
      if (!result.ok) {
        Alert.alert('Cannot sign in', result.message);
        return;
      }
      router.replace('/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient colors={['#1877F2', '#0B4FBF']} style={styles.header}>
            <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-white/40 bg-white/15">
              <Text className="text-4xl">🛡️</Text>
            </View>
            <Text className="mt-4 text-2xl font-bold text-white">Supervisor Login</Text>
            <Text className="mt-2 text-center text-sm text-white/85">
              Sign in to continue
            </Text>
          </LinearGradient>

          <View className="flex-1 px-5 pt-6">
            <View className="mb-6 rounded-2xl border border-[#E4E6EB] bg-white p-4">
              <Text className="text-center text-3xl">👤</Text>
              <Text className="mt-2 text-center text-base font-bold text-[#050505]">
                NHAI Field Officer
              </Text>
              <Text className="mt-1 text-center text-sm text-[#65676B]">
                Enter your ID and PIN to open the dashboard
              </Text>
            </View>

            <Input
              label="Supervisor ID"
              value={supervisorId}
              onChangeText={setSupervisorId}
              placeholder="Your supervisor ID"
              autoCapitalize="characters"
            />
            <Input
              label="PIN"
              value={pin}
              onChangeText={setPin}
              placeholder="Your PIN"
              secureTextEntry
              keyboardType="number-pad"
            />

            <View className="mt-4">
              <Button label="Sign in" onPress={handleLogin} loading={loading} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
});
