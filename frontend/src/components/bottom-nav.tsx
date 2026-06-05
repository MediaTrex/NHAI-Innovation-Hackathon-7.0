import { usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { notifyHomeStatsRefresh } from '@/lib/app-refresh';

const tabs = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/enroll', label: 'Enroll', icon: '👤' },
  { href: '/records', label: 'Logs', icon: '📋' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
] as const;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-t border-[#E4E6EB] bg-white"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="flex-row items-center justify-around py-2">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href === '/home' && pathname === '/') ||
            (tab.href !== '/home' && pathname.startsWith(tab.href));
          return (
            <Pressable
              key={tab.href}
              onPress={() => {
                router.push(tab.href as '/');
                if (tab.href === '/home') notifyHomeStatsRefresh();
              }}
              className="items-center px-3 py-1"
            >
              <Text className="text-xl">{tab.icon}</Text>
              <Text
                className={`mt-0.5 text-xs font-semibold ${active ? 'text-[#1877F2]' : 'text-[#65676B]'}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
