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

export const getWAQILabel = (aqi) => {
  if (!aqi || aqi <= 0) return 'Tidak Diketahui';
  if (aqi <= 50) return 'Baik';
  if (aqi <= 100) return 'Sedang';
  if (aqi <= 150) return 'Tidak Sehat';
  if (aqi <= 200) return 'Buruk';
  return 'Sangat Buruk';
};

export const getWAQIRecommendation = (aqi) => {
  if (!aqi || aqi <= 0) return 'Data tidak tersedia';
  if (aqi <= 50) return 'Udara dalam kondisi baik, aman untuk beraktivitas di luar ruangan.';
  if (aqi <= 100) return 'Kualitas udara masih dapat diterima, namun kelompok sensitif disarankan mengurangi aktivitas luar.';
  if (aqi <= 150) return 'Kelompok sensitif seperti anak-anak, lansia, dan penderita asma disarankan mengurangi aktivitas di luar.';
  if (aqi <= 200) return 'Hindari aktivitas luar ruangan. Gunakan masker N95 jika harus keluar.';
  return 'Kondisi udara berbahaya. Hindari keluar rumah dan gunakan alat pembersih udara di dalam ruangan.';
};

export const getAreaDescription = (aqi) => {
  if (aqi <= 50) return 'Area dengan kualitas udara baik.';
  if (aqi <= 100) return 'Area dengan kualitas udara sedang.';
  if (aqi <= 150) return 'Area terdampak polusi tingkat sedang.';
  if (aqi <= 200) return 'Area terdampak polusi tingkat tinggi.';
  return 'Area terdampak polusi tingkat sangat tinggi.';
};