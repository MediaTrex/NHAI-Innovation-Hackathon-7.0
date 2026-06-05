import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import type { Angle } from '@/lib/face-quality';

const GUIDE: Record<Angle, { label: string; hint: string }> = {
  front: { label: 'Look straight', hint: 'Center your face in the oval' },
  left: { label: 'Turn LEFT', hint: 'Slowly turn your head to the left' },
  right: { label: 'Turn RIGHT', hint: 'Slowly turn your head to the right' },
};

type HeadTurnGuideProps = {
  angle: Angle;
};

export function HeadTurnGuide({ angle }: HeadTurnGuideProps) {
  const turn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    turn.setValue(0);
    const target = angle === 'left' ? -1 : angle === 'right' ? 1 : 0;
    const turnAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(turn, { toValue: target, duration: 900, useNativeDriver: true }),
        Animated.timing(turn, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    turnAnim.start();
    pulseAnim.start();
    return () => {
      turnAnim.stop();
      pulseAnim.stop();
    };
  }, [angle, pulse, turn]);

  const rotate = turn.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-28deg', '0deg', '28deg'],
  });

  const guide = GUIDE[angle];

  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-xl border border-[#E4E6EB] bg-white px-4 py-3">
      <Animated.View
        style={{
          transform: [{ rotate }, { scale: pulse }],
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: '#E7F3FF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 28 }}>🙂</Text>
      </Animated.View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-[#1877F2]">{guide.label}</Text>
        <Text className="text-xs text-[#65676B]">{guide.hint}</Text>
      </View>
      <Text className="text-2xl font-bold text-[#1877F2]">
        {angle === 'left' ? '←' : angle === 'right' ? '→' : '◎'}
      </Text>
    </View>
  );
}
