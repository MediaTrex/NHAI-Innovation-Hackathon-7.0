import { Text, TextInput, View, type TextInputProps } from 'react-native';

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'sentences',
  secureTextEntry,
  keyboardType,
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
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        className="rounded-xl border border-[#E4E6EB] bg-white px-4 py-3.5 text-base text-[#050505]"
      />
    </View>
  );
}
