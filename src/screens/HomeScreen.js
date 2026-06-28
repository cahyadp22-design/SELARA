// src/screens/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import AQIIndicator from '../components/AQIIndicator';
import ForecastChart from '../components/ForecastChart';
import BottomTab from '../components/BottomTab';
import { fetchWAQIPollution, getWAQIColor, getWAQILabel, hasData } from '../lib/waqiApi';

const { height } = Dimensions.get('window');

// 🔥 Fungsi hitung jarak (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

// 🔥 Fungsi untuk generate forecast data
const generateForecastData = (currentAqi) => {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const today = new Date().getDay();
  const result = [];
  const variations = [0, 5, -8, 12, -5, 15, -10];

  for (let i = 0; i < 7; i++) {
    const dayIndex = (today + i) % 7;
    let aqi = Math.max(10, currentAqi + variations[i] + Math.floor(Math.random() * 10 - 5));
    aqi = Math.min(500, Math.max(0, aqi));

    result.push({
      day: days[dayIndex],
      aqi: Math.round(aqi),
      date: new Date(Date.now() + i * 86400000),
    });
  }
  return result;
};

// 🔑 GENERATE NOTIFICATIONS
const generateNotifications = (aqi, cityName) => {
  const notifications = [];

  // Notifikasi berdasarkan AQI
  if (aqi > 150) {
    notifications.push({
      id: '1',
      title: '⚠️ Peringatan Polusi Tinggi!',
      message: `Kualitas udara di ${cityName} mencapai ${aqi} AQI (Tidak Sehat). Hindari aktivitas luar ruangan dan gunakan masker N95.`,
      time: 'Sekarang',
      type: 'danger',
      icon: 'warning',
    });
  } else if (aqi > 100) {
    notifications.push({
      id: '2',
      title: '🌿 Kualitas Udara Sedang',
      message: `AQI ${aqi} di ${cityName}. Kelompok sensitif disarankan memakai masker saat beraktivitas.`,
      time: 'Sekarang',
      type: 'warning',
      icon: 'info',
    });
  } else {
    notifications.push({
      id: '3',
      title: '✅ Kualitas Udara Baik',
      message: `AQI ${aqi} di ${cityName}. Udara bersih, aman untuk beraktivitas di luar.`,
      time: 'Sekarang',
      type: 'success',
      icon: 'check',
    });
  }

  // Notifikasi rekomendasi
  notifications.push({
    id: '4',
    title: '💡 Tips Hari Ini',
    message: 'Gunakan transportasi umum atau sepeda untuk mengurangi emisi karbon.',
    time: '1 jam lalu',
    type: 'info',
    icon: 'lightbulb-outline',
  });

  // Notifikasi komunitas
  notifications.push({
    id: '5',
    title: '📢 Laporan Komunitas',
    message: 'Ada 3 laporan baru dari warga sekitar tentang polusi asap pabrik.',
    time: '2 jam lalu',
    type: 'info',
    icon: 'people',
  });

  return notifications;
};

export default function HomeScreen({ profileData, onLogout, onTabPress }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pollutionData, setPollutionData] = useState(null);
  const [cityName, setCityName] = useState('Mendapatkan lokasi...');
  const [forecastData, setForecastData] = useState([]);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasCachedData, setHasCachedData] = useState(false);
  const isFetching = useRef(false);

  // 🔑 STATE UNTUK NOTIFICATION MODAL
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const slideAnim = useRef(new Animated.Value(height)).current;

  // 🔥 Reverse Geocoding
  const getCityNameFromCoords = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`
      );
      const data = await response.json();

      if (data.city) return data.city;
      if (data.locality) return data.locality;
      if (data.principalSubdivision) return data.principalSubdivision;

      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting city name:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  // 🔥 LOAD DATA
  const loadData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    setLoading(true);
    setError(null);
    setForecastLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { latitude, longitude } = loc.coords;
        const city = await getCityNameFromCoords(latitude, longitude);
        setCityName(city);

        const cachedData = await AsyncStorage.getItem('lastPollution');
        let cachedPollution = null;
        let useCache = false;

        if (cachedData) {
          try {
            cachedPollution = JSON.parse(cachedData);
            if (cachedPollution?.latitude && cachedPollution?.longitude) {
              const distance = calculateDistance(
                cachedPollution.latitude, cachedPollution.longitude,
                latitude, longitude
              );
              if (distance < 5) {
                useCache = true;
              }
            }
          } catch (e) { }
        }

        if (useCache && cachedPollution) {
          setPollutionData(cachedPollution);
          setHasCachedData(true);
          const forecast = generateForecastData(cachedPollution.aqi || 50);
          setForecastData(forecast);
          setForecastLoading(false);
          setLoading(false);
        }

        const data = await fetchWAQIPollution(latitude, longitude);
        if (data) {
          const newData = { ...data, latitude, longitude };
          setPollutionData(newData);
          const forecast = generateForecastData(data.aqi || 50);
          setForecastData(forecast);
          await AsyncStorage.setItem('lastPollution', JSON.stringify(newData));

          // 🔑 GENERATE NOTIFICATIONS
          const notifs = generateNotifications(data.aqi || 50, city);
          setNotifications(notifs);
          setUnreadCount(notifs.length);
        }

      } else {
        const cachedData = await AsyncStorage.getItem('lastPollution');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (parsed?.aqi) {
            setPollutionData(parsed);
            setHasCachedData(true);
            const forecast = generateForecastData(parsed.aqi || 50);
            setForecastData(forecast);
            setForecastLoading(false);
            if (parsed.city) {
              setCityName(parsed.city.replace(/, Indonesia$/, ''));
            }
          }
        } else {
          setError('Izin lokasi diperlukan');
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      if (!hasCachedData) {
        setError('Gagal memuat data. Periksa koneksi internet.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setForecastLoading(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🔑 FUNGSI BUKA NOTIFICATION MODAL
  const openNotifModal = () => {
    setNotifModalVisible(true);
    setUnreadCount(0);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // 🔑 FUNGSI TUTUP NOTIFICATION MODAL
  const closeNotifModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotifModalVisible(false);
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refreshData();
  };

  const refreshData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        const city = await getCityNameFromCoords(latitude, longitude);
        setCityName(city);

        const data = await fetchWAQIPollution(latitude, longitude);
        if (data) {
          const newData = { ...data, latitude, longitude };
          setPollutionData(newData);
          const forecast = generateForecastData(data.aqi || 50);
          setForecastData(forecast);
          await AsyncStorage.setItem('lastPollution', JSON.stringify(newData));

          // 🔑 UPDATE NOTIFICATIONS
          const notifs = generateNotifications(data.aqi || 50, city);
          setNotifications(notifs);
          setUnreadCount(notifs.length);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'SS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // 🔑 RENDER NOTIFICATION ITEM
  const renderNotificationItem = ({ item }) => {
    const getIconColor = () => {
      switch (item.type) {
        case 'danger': return '#EF4444';
        case 'warning': return '#F59E0B';
        case 'success': return '#10B981';
        default: return colors.primary;
      }
    };

    const getIconName = () => {
      return item.icon || 'bell';
    };

    return (
      <TouchableOpacity style={styles.notifItem} activeOpacity={0.7}>
        <View style={[styles.notifIcon, { backgroundColor: `${getIconColor()}20` }]}>
          <MaterialIcons name={getIconName()} size={20} color={getIconColor()} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !hasCachedData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data kualitas udara...</Text>
          <Text style={styles.loadingSubtext}>Mengambil lokasi Anda</Text>
        </View>
        <BottomTab activeTab="home" onTabPress={onTabPress} />
      </SafeAreaView>
    );
  }

  if (error && !pollutionData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="warning" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
        <BottomTab activeTab="home" onTabPress={onTabPress} />
      </SafeAreaView>
    );
  }

  const aqi = pollutionData?.aqi || 0;
  const aqiLabel = getWAQILabel(aqi);
  const aqiColor = getWAQIColor(aqi);
  const pm25 = pollutionData?.components?.pm2_5 || 0;
  const pm10 = pollutionData?.components?.pm10 || 0;
  const o3 = pollutionData?.components?.o3 || 0;
  const temperature = pollutionData?.temperature || 0;
  const humidity = pollutionData?.humidity || 0;

  const statusText = (() => {
    if (aqi <= 50) return 'Baik';
    if (aqi <= 100) return 'Sedang';
    if (aqi <= 150) return 'Tidak Sehat';
    if (aqi <= 200) return 'Buruk';
    return 'Sangat Buruk';
  })();

  const statusColor = (() => {
    if (aqi <= 50) return '#10B981';
    if (aqi <= 100) return '#FBBF24';
    if (aqi <= 150) return '#F97316';
    if (aqi <= 200) return '#EF4444';
    return '#8B5CF6';
  })();

  const getRecommendation = (aqi) => {
    if (aqi <= 50) return 'Udara bersih, aman untuk beraktivitas di luar.';
    if (aqi <= 100) return 'Kualitas udara masih dapat diterima. Kelompok sensitif disarankan memakai masker.';
    if (aqi <= 150) return 'Gunakan masker N95 jika beraktivitas di luar ruangan.';
    if (aqi <= 200) return 'Hindari aktivitas luar ruangan. Gunakan masker N95.';
    return 'Kondisi udara berbahaya. Tetap di dalam ruangan.';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.lokasiLabel}>Lokasi aktif</Text>
          <TouchableOpacity style={styles.lokasiSelector}>
            <MaterialIcons name="location-on" size={18} color={colors.primary} style={styles.pinIcon} />
            <Text style={styles.lokasiText}>{cityName}</Text>
            {hasCachedData && (
              <Text style={styles.cacheBadge}>📡</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {/* 🔑 NOTIFICATION BUTTON - BUKA MODAL */}
          <TouchableOpacity style={styles.notificationBtn} onPress={openNotifModal}>
            <MaterialIcons name="notifications" size={24} color={colors.textDark} />
            {unreadCount > 0 && (
              <View style={styles.redBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileAvatar} onPress={() => onTabPress('profil')}>
            {profileData?.photoUri ? (
              <Image source={{ uri: profileData.photoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(profileData?.fullName)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.aqiCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.aqiStatusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>

          <View style={styles.aqiDetailsRow}>
            <AQIIndicator
              aqiValue={aqi}
              color={aqiColor}
              label={aqiLabel}
            />
            <View style={styles.aqiInfoContainer}>
              <Text style={styles.aqiInfoTitle}>
                {aqi <= 50 ? 'Layak beraktivitas' :
                  aqi <= 100 ? 'Aman untuk umum' :
                    aqi <= 150 ? 'Kurangi aktivitas luar' :
                      aqi <= 200 ? 'Hindari luar ruangan' :
                        'Tetap di dalam ruangan'}
              </Text>
              <Text style={styles.aqiInfoDesc}>
                {getRecommendation(aqi)}
              </Text>
              {hasData(temperature) && (
                <Text style={styles.aqiTemp}>
                  <MaterialIcons name="thermostat" size={12} color={colors.textGray} /> {temperature}°C
                  {hasData(humidity) && ` • 💧 ${humidity}%`}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.polutanGrid}>
          <View style={styles.polutanCard}>
            <Text style={styles.polutanName}>PM2.5</Text>
            <Text style={[styles.polutanValue, { color: pm25 > 50 ? '#DC2626' : colors.blueText }]}>
              {pm25}
            </Text>
            <Text style={styles.polutanUnit}>µg/m³</Text>
          </View>

          <View style={styles.polutanCard}>
            <Text style={styles.polutanName}>PM10</Text>
            <Text style={[styles.polutanValue, { color: pm10 > 100 ? '#DC2626' : colors.blueText }]}>
              {pm10}
            </Text>
            <Text style={styles.polutanUnit}>µg/m³</Text>
          </View>

          <View style={styles.polutanCard}>
            <Text style={styles.polutanName}>O₃</Text>
            <Text style={[styles.polutanValue, { color: o3 > 100 ? '#DC2626' : colors.blueText }]}>
              {o3}
            </Text>
            <Text style={styles.polutanUnit}>ppb</Text>
          </View>
        </View>

        <View style={styles.forecastCard}>
          <View style={styles.forecastHeader}>
            <View style={styles.forecastHeaderLeft}>
              <Text style={styles.forecastTitle}>PRAKIRAAN 7 HARI</Text>
              <MaterialIcons name="info" size={14} color={colors.textGray} style={styles.forecastInfoIcon} />
            </View>
          </View>
          <ForecastChart
            forecastData={forecastData}
            loading={forecastLoading}
          />
        </View>

        {pollutionData?.time && (
          <Text style={styles.updateTime}>
            <MaterialIcons name="access-time" size={12} color={colors.textGray} />
            Terakhir diperbarui: {new Date(pollutionData.time).toLocaleString('id-ID')}
          </Text>
        )}
      </ScrollView>

      {/* 🔑 NOTIFICATION MODAL */}
      <Modal
        visible={notifModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeNotifModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeNotifModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalInner}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🔔 Notifikasi</Text>
                <TouchableOpacity onPress={closeNotifModal} style={styles.modalCloseBtn}>
                  <MaterialIcons name="close" size={24} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              {/* Notifikasi List */}
              {notifications.length === 0 ? (
                <View style={styles.emptyNotif}>
                  <MaterialIcons name="notifications-off" size={48} color={colors.textGray} />
                  <Text style={styles.emptyNotifText}>Tidak ada notifikasi</Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.notifList}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <BottomTab activeTab="home" onTabPress={onTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  lokasiLabel: {
    fontSize: 12,
    color: colors.textGray,
  },
  lokasiSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pinIcon: {
    marginRight: 4,
  },
  lokasiText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cacheBadge: {
    fontSize: 12,
    marginLeft: 6,
    color: colors.textGray,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBtn: {
    position: 'relative',
    marginRight: 16,
    padding: 4,
  },
  redBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  aqiCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: -8,
    zIndex: 10,
  },
  aqiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  aqiDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aqiInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  aqiInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  aqiInfoDesc: {
    fontSize: 13,
    color: colors.textGray,
    lineHeight: 18,
  },
  aqiTemp: {
    fontSize: 12,
    color: colors.textGray,
    marginTop: 4,
  },
  polutanGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  polutanCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  polutanName: {
    fontSize: 12,
    color: colors.textGray,
    fontWeight: '500',
    marginBottom: 4,
  },
  polutanValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  polutanUnit: {
    fontSize: 11,
    color: colors.textGray,
  },
  forecastCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  forecastHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textGray,
    letterSpacing: 0.5,
  },
  forecastInfoIcon: {
    marginLeft: 4,
  },
  updateTime: {
    fontSize: 11,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 12,
  },

  // 🔑 NOTIFICATION MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalCloseBtn: {
    padding: 4,
  },
  notifList: {
    paddingTop: 8,
  },
  notifItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 13,
    color: colors.textGray,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: colors.textGray,
    marginTop: 4,
  },
  emptyNotif: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyNotifText: {
    fontSize: 16,
    color: colors.textGray,
    fontWeight: '500',
  },
});