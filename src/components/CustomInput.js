import React from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import { colors } from '../theme/colors';

export default function CustomInput({ placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textGray}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    height: 52,
    backgroundColor: '#EEF2F5',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
