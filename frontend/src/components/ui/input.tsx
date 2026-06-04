import { Text, TextInput, View } from 'react-native';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
}: InputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-semibold text-[#050505]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#65676B"
        autoCapitalize={autoCapitalize}
        className="rounded-xl border border-[#E4E6EB] bg-white px-4 py-3.5 text-base text-[#050505]"
      />
    </View>
  );
}
