import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { SplashScreenContent } from '@/components/splash-screen';

const SPLASH_MS = 4500;

/** App entry — splash screen (matches design mockup). */
export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return <SplashScreenContent />;
}
