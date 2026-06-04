import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';

export default function SyncScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={['top']}>
      <View className="flex-1 px-4 pt-8">
        <Card>
          <Text className="text-lg font-bold text-[#050505]">Sync & Purge</Text>
          <Text className="mt-2 text-[#65676B]">Offline sync when connectivity is available.</Text>
        </Card>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}
