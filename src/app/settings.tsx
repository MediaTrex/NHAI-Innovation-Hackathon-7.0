import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { replaySplash } from '@/components/splash-screen';

const items = [
  { title: 'Theme', subtitle: 'Light (Facebook style)' },
  { title: 'Face recognition', subtitle: 'Offline mode enabled' },
  { title: 'Storage', subtitle: 'SQLite + local files' },
  { title: 'About', subtitle: 'NHAI SecureID v1.0.0' },
];

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="border-b border-[#E4E6EB] bg-white px-4 py-4">
        <Text className="text-xl font-bold text-[#050505]">Settings</Text>
      </View>
      <ScrollView className="flex-1 px-4 pt-4">
        {items.map((item) => (
          <Card key={item.title} className="mb-3">
            <Text className="font-bold text-[#050505]">{item.title}</Text>
            <Text className="text-sm text-[#65676B]">{item.subtitle}</Text>
          </Card>
        ))}
        {__DEV__ && (
          <Card className="mb-3" onPress={replaySplash}>
            <Text className="font-bold text-[#1877F2]">Replay splash (dev)</Text>
          </Card>
        )}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
