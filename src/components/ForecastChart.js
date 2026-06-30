// src/components/ForecastChart.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getWAQIColor, getWAQILabel } from '../lib/waqiApi';
import { useLanguage } from '../i18n/i18n';

const { width } = Dimensions.get('window');

export default function ForecastChart({ forecastData, loading }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>{t('forecast_loading') || 'Memuat prakiraan...'}</Text>
      </View>
    );
  }

  if (!forecastData || forecastData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="cloud-rain" size={32} color={colors.textGray} />
        <Text style={styles.emptyText}>{t('forecast_unavailable') || 'Data prakiraan belum tersedia'}</Text>
        <Text style={styles.emptySubtext}>{t('forecast_retry') || 'Coba lagi nanti'}</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {forecastData.map((item, index) => {
          const aqi = item.aqi || 0;
          const color = getWAQIColor(aqi);
          const label = getWAQILabel(aqi, t);
          const isToday = index === 0;

          // ✅ FIX: Definisikan barHeight
          const barHeight = Math.min((aqi / 300) * 120, 120);

          return (
            <View key={index} style={styles.dayContainer}>
              <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                {isToday ? (t('home_today') || 'Hari Ini') : item.day || `H+${index}`}
              </Text>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 16),
                      backgroundColor: color,
                    }
                  ]}
                />
              </View>
              <Text style={[styles.aqiValue, { color }]}>
                {aqi}
              </Text>
              <Text style={[styles.aqiLabel, { color }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.forecastNote}>
        {t('forecast_note') || 'Perkiraan berdasarkan pola historis'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dayContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 56,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.textGray,
    marginBottom: 8,
    fontWeight: '500',
  },
  todayLabel: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  barWrapper: {
    height: 140,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  bar: {
    width: 28,
    borderRadius: 6,
    minHeight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aqiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  aqiLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textGray,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textGray,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textGray,
    opacity: 0.7,
  },
  forecastNote: {
    fontSize: 10,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    fontStyle: 'italic',
    opacity: 0.6,
  },
});