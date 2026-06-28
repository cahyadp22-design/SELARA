// components/CustomButton.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

// Logo Google asli (multicolor "G")
const GoogleLogo = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.77.9 7.35 2.56 10.53l7.97-5.94z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.94C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

export default function CustomButton({
  title,
  onPress,
  type = 'primary',
  iconName,
  iconSource,
  disabled = false
}) {
  const isSocial = type === 'social';
  const isPrimary = type === 'primary';

  const getIconColor = () => {
    if (iconName === 'apple') return '#000000';
    return colors.textDark;
  };

  const renderIcon = () => {
    if (!iconName) return null;

    if (iconName === 'google') {
      return <View style={styles.icon}><GoogleLogo size={20} /></View>;
    }
    if (iconName === 'apple') {
      return <FontAwesome name="apple" size={20} color="#000000" style={styles.icon} />;
    }
    return <FontAwesome name={iconName} size={20} color={getIconColor()} style={styles.icon} />;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.socialButton,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <View style={styles.content}>
        {isSocial && renderIcon()}
        <Text style={[
          styles.text,
          isPrimary ? styles.primaryText : styles.socialText
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#EEF2F5',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    minWidth: 120,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryText: {
    color: '#1F2937',
  },
  socialText: {
    color: '#1F2937',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});