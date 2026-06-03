import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const base = 'flex-row items-center justify-center rounded-xl py-3.5 px-5';
  const variants = {
    primary: 'bg-[#1877F2]',
    secondary: 'bg-[#E7F3FF]',
    outline: 'border-2 border-[#1877F2] bg-white',
  };
  const textVariants = {
    primary: 'text-white font-semibold text-base',
    secondary: 'text-[#1877F2] font-semibold text-base',
    outline: 'text-[#1877F2] font-semibold text-base',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${disabled || loading ? 'opacity-50' : 'active:opacity-90'}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#1877F2'} />
      ) : (
        <>
          {icon}
          <Text className={textVariants[variant]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
