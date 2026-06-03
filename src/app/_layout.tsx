import '@/global.css';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { setSplashReplayHandler, SplashOverlay } from '@/components/splash-screen';
import { initDatabase } from '@/lib/database';

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initDatabase().catch(console.error);
    setSplashReplayHandler(() => setSplashDone(false));
    return () => setSplashReplayHandler(null);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style={splashDone ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="enroll" />
        <Stack.Screen name="records" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="authenticate" />
        <Stack.Screen name="sync" />
      </Stack>
      {!splashDone && <SplashOverlay onFinish={() => setSplashDone(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
