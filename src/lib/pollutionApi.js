import Constants from 'expo-constants';

const API_KEY = Constants.expoConfig?.extra?.openWeatherApiKey || process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

export const fetchAirPollution = async (lat, lon) => {
  try {
    if (!API_KEY) {
      console.error('API Key tidak ditemukan!');
      return null;
    }

    const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    console.log('Fetching pollution data from:', url);

    const response = await fetch(url);
    const data = await response.json();

    if (data.list && data.list.length > 0) {
      const item = data.list[0];
      return {
        aqi: item.main.aqi,
        components: item.components,
        dt: item.dt,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching pollution:', error);
    return null;
  }
};

export const getAqiColor = (aqi) => {
  switch (aqi) {
    case 1: return '#00e400'; // Baik
    case 2: return '#ffff00'; // Sedang
    case 3: return '#ff7e00'; // Tidak sehat untuk sensitif
    case 4: return '#ff0000'; // Tidak sehat
    case 5: return '#8f3f97'; // Sangat tidak sehat
    default: return '#808080';
  }
};

export const getAqiLabel = (aqi) => {
  switch (aqi) {
    case 1: return 'Baik';
    case 2: return 'Sedang';
    case 3: return 'Tidak Sehat (Sensitif)';
    case 4: return 'Tidak Sehat';
    case 5: return 'Sangat Tidak Sehat';
    default: return 'Tidak Diketahui';
  }
};

export default {
  fetchAirPollution,
  getAqiColor,
  getAqiLabel,
};