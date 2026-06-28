// src/components/AQIIndicator.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getWAQIColor } from '../lib/waqiApi';

export default function AQIIndicator({ aqiValue, color, label }) {
  const aqiColor = color || getWAQIColor(aqiValue || 0);
  const aqiLabel = label || '';

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { borderColor: aqiColor }]}>
        <Text style={[styles.aqiValue, { color: aqiColor }]}>
          {aqiValue || 0}
        </Text>
      </View>
      {aqiLabel ? (
        <Text style={[styles.aqiLabel, { color: aqiColor }]}>
          {aqiLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  aqiValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  aqiLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});