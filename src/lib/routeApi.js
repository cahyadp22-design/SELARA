import { fetchWAQIPollution } from './waqiApi';

const OSRM_URL = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';

export const fetchOSRMRoute = async (originLat, originLon, destLat, destLon) => {
  try {
    const url = `${OSRM_URL}/${originLon},${originLat};${destLon},${destLat}?steps=true&geometries=geojson`;
    console.log('Fetching route...');

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      const distance = route.distance / 1000;
      const duration = route.duration / 60;

      return {
        coordinates: coords,
        distance: distance,
        duration: duration,
        error: false,
      };
    }
    return {
      error: true,
      message: 'Tidak ada rute ditemukan',
    };
  } catch (error) {
    console.error('OSRM error:', error.message);
    return {
      error: true,
      message: error.message,
    };
  }
};

export const fetchAQIAlongRoute = async (coordinates, sampleCount = 8) => {
  try {
    const step = Math.floor(coordinates.length / sampleCount);
    const samplePoints = [];

    for (let i = 0; i < coordinates.length && samplePoints.length < sampleCount; i += step) {
      if (coordinates[i]) {
        samplePoints.push({
          lat: coordinates[i].latitude,
          lon: coordinates[i].longitude,
        });
      }
    }

    if (coordinates.length > 0) {
      const last = coordinates[coordinates.length - 1];
      samplePoints.push({ lat: last.latitude, lon: last.longitude });
    }

    const aqiResults = await Promise.all(
      samplePoints.map(async (point) => {
        const data = await fetchWAQIPollution(point.lat, point.lon);
        return {
          ...point,
          aqi: data?.aqi || 50,
        };
      })
    );

    const avgAqi = aqiResults.length > 0
      ? Math.round(aqiResults.reduce((sum, p) => sum + p.aqi, 0) / aqiResults.length)
      : 50;

    const maxAqi = aqiResults.length > 0
      ? Math.max(...aqiResults.map(p => p.aqi))
      : 50;

    return {
      points: aqiResults,
      avgAqi: avgAqi,
      maxAqi: maxAqi,
    };
  } catch (error) {
    console.error('❌ Error fetching AQI:', error.message);
    return {
      points: [],
      avgAqi: 50,
      maxAqi: 50,
    };
  }
};

export const generateDummyRoute = (originLat, originLon, destLat, destLon) => {
  const points = 30;
  const coords = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const lat = originLat + (destLat - originLat) * t;
    const lon = originLon + (destLon - originLon) * t;
    const noise = Math.sin(t * Math.PI * 4) * 0.005;
    const noise2 = Math.cos(t * Math.PI * 3 + 1) * 0.003;
    coords.push({
      latitude: lat + noise,
      longitude: lon + noise2,
    });
  }
  return coords;
};

export const generateFullRoute = async (originLat, originLon, destLat, destLon) => {
  try {
    // 1. Fetch rute
    let routeData = await fetchOSRMRoute(originLat, originLon, destLat, destLon);
    let coords = [];
    let distance = 0;
    let duration = 0;
    let isOffline = false;

    if (routeData.error) {
      console.log('Using dummy route');
      coords = generateDummyRoute(originLat, originLon, destLat, destLon);
      distance = calculateDistance(originLat, originLon, destLat, destLon);
      duration = distance * 1.5;
      isOffline = true;
    } else {
      coords = routeData.coordinates;
      distance = routeData.distance;
      duration = routeData.duration;
    }

    // 2. Ambil AQI
    const aqiResult = await fetchAQIAlongRoute(coords, 8);

    return {
      coordinates: coords,
      distance: distance,
      duration: duration,
      isOffline: isOffline,
      aqi: aqiResult,
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    const dummyCoords = generateDummyRoute(originLat, originLon, destLat, destLon);
    return {
      coordinates: dummyCoords,
      distance: calculateDistance(originLat, originLon, destLat, destLon),
      duration: calculateDistance(originLat, originLon, destLat, destLon) * 1.5,
      isOffline: true,
      aqi: { points: [], avgAqi: 50, maxAqi: 50 },
    };
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default {
  fetchOSRMRoute,
  fetchAQIAlongRoute,
  generateDummyRoute,
  generateFullRoute,
  calculateDistance,
};