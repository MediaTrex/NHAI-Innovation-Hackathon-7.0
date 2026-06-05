import '@/global.css';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { resetAuthOnLaunch } from '@/lib/auth';
import { initDatabase } from '@/lib/database';

export default function RootLayout() {
  useEffect(() => {
    resetAuthOnLaunch().catch(console.error);
    initDatabase().catch(console.error);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="home" />
        <Stack.Screen name="enroll" />
        <Stack.Screen name="records" />
        <Stack.Screen name="workers" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="authenticate" />
        <Stack.Screen name="sync" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
