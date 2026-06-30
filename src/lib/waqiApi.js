// lib/waqiApi.js
import Constants from 'expo-constants';

const WAQI_TOKEN =
  Constants.expoConfig?.extra?.waqiToken ||
  process.env.EXPO_PUBLIC_WAQI_TOKEN;
const WAQI_BASE_URL = 'https://api.waqi.info';

export const fetchWAQIPollution = async (lat, lon) => {
  try {
    if (!WAQI_TOKEN) {
      console.error('WAQI Token tidak ditemukan!');
      return null;
    }

    const url = `${WAQI_BASE_URL}/feed/geo:${lat};${lon}/?token=${WAQI_TOKEN}`;
    console.log('Fetching WAQI for:', lat, lon);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'ok' && data.data) {
      const iaqi = data.data.iaqi || {};

      return {
        aqi: data.data.aqi,
        idx: data.data.idx,
        city: data.data.city?.name || 'Lokasi Anda',
        cityGeo: data.data.city?.geo || [lat, lon],
        time: data.data.time?.iso || data.data.time?.s || new Date().toISOString(),
        components: {
          pm2_5: iaqi.pm25?.v ?? null,
          pm10: iaqi.pm10?.v ?? null,
          o3: iaqi.o3?.v ?? null,
          no2: iaqi.no2?.v ?? null,
          so2: iaqi.so2?.v ?? null,
          co: iaqi.co?.v ?? null,
        },
        temperature: iaqi.t?.v ?? null,
        humidity: iaqi.h?.v ?? null,
        pressure: iaqi.p?.v ?? null,
        wind: iaqi.w?.v ?? null,
        station: data.data.city?.url || null,
        dominant: data.data.dominentpol || null,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching WAQI:', error.message);
    return null;
  }
};

export const searchCityWAQI = async (cityName) => {
  try {
    const url = `${WAQI_BASE_URL}/feed/${encodeURIComponent(cityName)}/?token=${WAQI_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'ok' && data.data) {
      return {
        city: data.data.city?.name || cityName,
        lat: parseFloat(data.data.city?.geo?.[0]) || 0,
        lon: parseFloat(data.data.city?.geo?.[1]) || 0,
        aqi: data.data.aqi,
      };
    }
    return null;
  } catch (error) {
    console.error('Error searching city:', error.message);
    return null;
  }
};

export const hasData = (value) => {
  return value !== null && value !== undefined && value !== 0 && value !== '...' && value !== '';
};

export const getWAQIColor = (aqi) => {
  if (!aqi || aqi <= 0) return '#808080';
  if (aqi <= 50) return '#00e400';
  if (aqi <= 100) return '#f59e0b';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  return '#8f3f97';
};

export const getWAQILabel = (aqi, t) => {
  if (!aqi || aqi <= 0) return t('waqi_unknown');
  if (aqi <= 50) return t('waqi_good');
  if (aqi <= 100) return t('waqi_moderate');
  if (aqi <= 150) return t('waqi_unhealthy');
  if (aqi <= 200) return t('waqi_bad');
  return t('waqi_very_bad');
};

export const getWAQIRecommendation = (aqi, t) => {
  if (!aqi || aqi <= 0) return t('waqi_data_unavailable');
  if (aqi <= 50) return t('waqi_rec_good');
  if (aqi <= 100) return t('waqi_rec_moderate');
  if (aqi <= 150) return t('waqi_rec_unhealthy');
  if (aqi <= 200) return t('waqi_rec_bad');
  return t('waqi_rec_very_bad');
};

export const getAreaDescription = (aqi, t) => {
  if (!aqi || aqi <= 0) return t('waqi_data_unavailable');
  if (aqi <= 50) return t('waqi_area_good');
  if (aqi <= 100) return t('waqi_area_moderate');
  if (aqi <= 150) return t('waqi_area_unhealthy');
  if (aqi <= 200) return t('waqi_area_bad');
  return t('waqi_area_very_bad');
};