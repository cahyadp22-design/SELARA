// src/screens/RouteScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import BottomTab from '../components/BottomTab';
import { getWAQIColor, getWAQILabel } from '../lib/waqiApi';
import { generateFullRoute } from '../lib/routeApi';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.6;
const BOTTOM_SHEET_MIN_HEIGHT = height * 0.12;

const CITY_NAMES = {
  '-6.2,106.8': 'Jakarta Pusat',
  '-6.3,106.8': 'Jakarta Selatan',
  '-6.2,106.9': 'Jakarta Timur',
  '-6.1,106.7': 'Jakarta Barat',
  '-6.1,106.8': 'Jakarta Utara',
  '-6.9,107.6': 'Bandung',
  '-7.2,112.7': 'Surabaya',
  '-7.0,110.4': 'Semarang',
  '3.6,98.7': 'Medan',
  '-5.1,119.4': 'Makassar',
  '-7.8,110.4': 'Yogyakarta',
  '-8.7,115.2': 'Denpasar',
  '-6.2,107.0': 'Bekasi',
  '-6.3,107.2': 'Cikarang',
  '-6.0,106.0': 'Cilegon',
  '-6.6,106.8': 'Bogor',
  '-6.4,106.8': 'Depok',
  '-6.2,106.6': 'Tangerang',
};

const getCityName = (lat, lon) => {
  const key = Object.keys(CITY_NAMES).find(k => {
    const [kLat, kLon] = k.split(',').map(Number);
    const distance = Math.sqrt(Math.pow(kLat - lat, 2) + Math.pow(kLon - lon, 2));
    return distance < 0.2;
  });
  return key ? CITY_NAMES[key] : null;
};

export default function RouteScreen({ onTabPress, onBack }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [originAddress, setOriginAddress] = useState('Mendapatkan lokasi...');
  const [destinationAddress, setDestinationAddress] = useState('Pilih tujuan');
  const [mapRegion, setMapRegion] = useState(null);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [apiError, setApiError] = useState(null);
  const mapRef = useRef(null);
  
  const [bottomSheetHeight, setBottomSheetHeight] = useState(BOTTOM_SHEET_MIN_HEIGHT);
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;

  const expandBottomSheet = () => {
    setIsExpanded(true);
    Animated.timing(animatedHeight, {
      toValue: BOTTOM_SHEET_MAX_HEIGHT,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setBottomSheetHeight(BOTTOM_SHEET_MAX_HEIGHT));
  };

  const collapseBottomSheet = () => {
    setIsExpanded(false);
    Animated.timing(animatedHeight, {
      toValue: BOTTOM_SHEET_MIN_HEIGHT,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setBottomSheetHeight(BOTTOM_SHEET_MIN_HEIGHT));
  };

  const toggleBottomSheet = () => {
    if (isExpanded) collapseBottomSheet();
    else expandBottomSheet();
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Lokasi', 'Aktifkan izin lokasi untuk fitur ini');
        setOriginAddress('Lokasi tidak diketahui');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setOrigin({ lat: latitude, lon: longitude });
      
      const cityName = getCityName(latitude, longitude);
      setOriginAddress(cityName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setOriginAddress('Error');
      setLoading(false);
    }
  };

  const startSelectingDestination = () => {
    setIsSelectingDestination(true);
  };

  const handleMapPress = async (event) => {
    if (!isSelectingDestination) return;
    
    const { coordinate } = event.nativeEvent;
    const dest = {
      lat: coordinate.latitude,
      lon: coordinate.longitude,
    };
    setDestination(dest);
    
    const cityName = getCityName(coordinate.latitude, coordinate.longitude);
    setDestinationAddress(cityName || `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`);
    
    setIsSelectingDestination(false);
    setApiError(null);
    
    if (origin) {
      await calculateRoute(origin.lat, origin.lon, dest.lat, dest.lon);
    }
  };

  const handleMarkerDrag = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const dest = { lat: latitude, lon: longitude };
    setDestination(dest);
    
    const cityName = getCityName(latitude, longitude);
    setDestinationAddress(cityName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    setApiError(null);
    
    if (origin) {
      await calculateRoute(origin.lat, origin.lon, dest.lat, dest.lon);
    }
  };

  const calculateRoute = async (originLat, originLon, destLat, destLon) => {
    setIsCalculating(true);
    setApiError(null);
    
    try {
      const result = await generateFullRoute(originLat, originLon, destLat, destLon);
      if (result.isOffline) {
        setApiError('Data rute estimasi, server tidak merespons.');
      }
      setRouteData(result);
      expandBottomSheet();
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Gagal menghitung rute.');
    } finally {
      setIsCalculating(false);
    }
  };

  const resetDestination = () => {
    setDestination(null);
    setDestinationAddress('Pilih tujuan');
    setRouteData(null);
    setApiError(null);
    collapseBottomSheet();
    setIsSelectingDestination(true);
  };

  const openGoogleMaps = async () => {
    if (!origin || !destination) {
      Alert.alert('Info', 'Pilih tujuan terlebih dahulu');
      return;
    }

    try {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lon}&destination=${destination.lat},${destination.lon}&travelmode=driving`;
      
      if (Platform.OS === 'android') {
        await Linking.openURL(url);
        return;
      }
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        const appleUrl = `https://maps.apple.com/?daddr=${destination.lat},${destination.lon}&saddr=${origin.lat},${origin.lon}`;
        await Linking.openURL(appleUrl);
      }
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      try {
        const fallbackUrl = `https://www.google.com/maps/dir/${origin.lat},${origin.lon}/${destination.lat},${destination.lon}`;
        await Linking.openURL(fallbackUrl);
      } catch (e) {
        Alert.alert(
          'Tidak Dapat Membuka Maps',
          'Pastikan Google Maps terinstall atau koneksi internet aktif.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const getRecommendation = (aqi) => {
    if (aqi <= 50) return 'Kualitas udara baik. Perjalanan aman.';
    if (aqi <= 100) return 'Kualitas udara sedang. Kelompok sensitif disarankan menggunakan masker.';
    if (aqi <= 150) return 'Kualitas udara tidak sehat. Gunakan masker selama perjalanan.';
    return 'Kualitas udara sangat tidak sehat. Hindari perjalanan jika tidak penting.';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Mendapatkan lokasi...</Text>
        <Text style={styles.loadingSubtext}>Pastikan GPS aktif</Text>
      </SafeAreaView>
    );
  }

  const aqi = routeData?.aqi?.avgAqi || 50;
  const aqiColor = getWAQIColor(aqi);
  const aqiLabel = getWAQILabel(aqi);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rute Perjalanan</Text>
        <TouchableOpacity 
          style={[styles.selectButton, isSelectingDestination && styles.selectButtonActive]}
          onPress={startSelectingDestination}
        >
          <MaterialIcons name="place" size={18} color={isSelectingDestination ? '#FFFFFF' : colors.primary} />
          <Text style={[styles.selectButtonText, isSelectingDestination && styles.selectButtonTextActive]}>
            {isSelectingDestination ? 'Sedang memilih...' : 'Pilih Tujuan'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={mapRegion}
          showsUserLocation={true}
          onPress={handleMapPress}
        >
          {origin && (
            <Marker coordinate={{ latitude: origin.lat, longitude: origin.lon }} title="Lokasi Anda">
              <View style={styles.originMarker} />
            </Marker>
          )}

          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lon }}
              title="Tujuan"
              draggable
              onDragEnd={handleMarkerDrag}
            >
              <View style={styles.destMarker}>
                <MaterialIcons name="place" size={20} color="#FFFFFF" />
              </View>
            </Marker>
          )}

          {routeData?.aqi?.points?.map((point, idx) => (
            <Circle
              key={`aqi-${idx}`}
              center={{ latitude: point.lat, longitude: point.lon }}
              radius={120}
              fillColor={`${getWAQIColor(point.aqi)}44`}
              strokeColor={getWAQIColor(point.aqi)}
              strokeWidth={1.5}
            />
          ))}

          {routeData && (
            <Polyline
              coordinates={routeData.coordinates}
              strokeColor={aqiColor}
              strokeWidth={5}
            />
          )}
        </MapView>

        {isSelectingDestination && (
          <View style={styles.selectOverlay}>
            <View style={styles.selectOverlayLeft}>
              <MaterialIcons name="place" size={16} color="#FFFFFF" />
              <Text style={styles.selectText}>
                {destination ? 'Ketuk peta untuk ubah tujuan' : 'Ketuk peta untuk pilih tujuan'}
              </Text>
            </View>
            <TouchableOpacity style={styles.cancelSelectButton} onPress={() => setIsSelectingDestination(false)}>
              <Text style={styles.cancelSelectText}>Batal</Text>
            </TouchableOpacity>
          </View>
        )}

        {apiError && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="warning" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>{apiError}</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet - Tanpa PanResponder */}
      <Animated.View 
        style={[styles.bottomSheet, { height: animatedHeight }]}
      >
        {/* Handle - Klik untuk expand/collapse */}
        <TouchableOpacity 
          style={styles.sheetHandleContainer} 
          onPress={toggleBottomSheet}
          activeOpacity={0.7}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetHandleText}>
            {isExpanded ? '⬇️ Klik untuk tutup' : '⬆️ Klik untuk detail rute'}
          </Text>
        </TouchableOpacity>

        {/* Konten - Tanpa PanResponder */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.locationCard}>
            <View style={styles.locationItem}>
              <View style={[styles.locationDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.locationLabel}>Dari</Text>
              <Text style={styles.locationText} numberOfLines={1}>{originAddress}</Text>
            </View>
            <View style={styles.locationArrow}>
              <MaterialIcons name="arrow-downward" size={14} color={colors.textGray} />
            </View>
            <TouchableOpacity 
              style={styles.locationItem} 
              onPress={resetDestination}
            >
              <View style={[styles.locationDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.locationLabel}>Ke</Text>
              <Text style={[styles.locationText, { color: destination ? colors.textDark : colors.textGray }]} numberOfLines={1}>
                {destinationAddress}
              </Text>
              {destination ? (
                <View style={styles.editBadge}>
                  <MaterialIcons name="edit" size={12} color="#FFFFFF" />
                  <Text style={styles.editBadgeText}>Ubah</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            
            {!destination && !isCalculating && !isSelectingDestination && (
              <TouchableOpacity 
                style={styles.selectDestHint}
                onPress={startSelectingDestination}
              >
                <MaterialIcons name="place" size={14} color={colors.primary} />
                <Text style={styles.selectDestHintText}>Ketuk "Pilih Tujuan" di atas atau ketuk peta</Text>
              </TouchableOpacity>
            )}
          </View>

          {routeData && destination ? (
            <>
              <View style={styles.aqiSection}>
                <View style={[styles.aqiCircle, { backgroundColor: aqiColor }]}>
                  <Text style={styles.aqiCircleText}>{aqi}</Text>
                </View>
                <View style={styles.aqiInfo}>
                  <Text style={[styles.aqiStatus, { color: aqiColor }]}>{aqiLabel}</Text>
                  <Text style={styles.aqiRecommend}>{getRecommendation(aqi)}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="access-time" size={16} color={colors.textGray} />
                  <Text style={styles.detailValue}>{Math.round(routeData.duration)}</Text>
                  <Text style={styles.detailLabel}>menit</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="map" size={16} color={colors.textGray} />
                  <Text style={styles.detailValue}>{Math.round(routeData.distance)}</Text>
                  <Text style={styles.detailLabel}>km</Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="trending-up" size={16} color={colors.textGray} />
                  <Text style={styles.detailValue}>{routeData.aqi?.maxAqi || 50}</Text>
                  <Text style={styles.detailLabel}>AQI tertinggi</Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>Kualitas udara sepanjang rute</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { 
                    width: `${Math.min((aqi / 300) * 100, 100)}%`,
                    backgroundColor: aqiColor
                  }]} />
                </View>
              </View>

              {/* 🔥 Tombol Google Maps - TIDAK KENA GESTURE */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={openGoogleMaps}
                activeOpacity={0.8}
              >
                <MaterialIcons name="map" size={18} color="#FFFFFF" />
                <Text style={styles.googleText}>Navigasi dengan Google Maps</Text>
              </TouchableOpacity>
            </>
          ) : isCalculating ? (
            <View style={styles.calculatingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.calculatingText}>Menghitung rute...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="place" size={36} color={colors.textGray} />
              <Text style={styles.emptyStateText}>Belum ada tujuan dipilih</Text>
              <Text style={styles.emptyStateSubtext}>Ketuk tombol "Pilih Tujuan" di pojok kanan atas</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <BottomTab activeTab="rute" onTabPress={onTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: colors.textDark },
  loadingSubtext: { marginTop: 6, fontSize: 14, color: colors.textGray },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  backButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  selectButtonActive: {
    backgroundColor: colors.primary,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },

  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: { flex: 1 },

  originMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  destMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },

  selectOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectOverlayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  cancelSelectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  cancelSelectText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },

  errorBanner: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 12, color: '#DC2626' },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginBottom: 4,
  },
  sheetHandleText: {
    fontSize: 10,
    color: colors.textGray,
    opacity: 0.6,
  },
  sheetContent: {
    paddingBottom: 16,
  },

  locationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textGray,
    width: 30,
  },
  locationArrow: {
    alignItems: 'center',
    paddingVertical: 2,
    paddingLeft: 38,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: colors.textDark,
    fontWeight: '500',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectDestHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    gap: 6,
  },
  selectDestHintText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },

  aqiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  aqiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  aqiCircleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  aqiInfo: { flex: 1 },
  aqiStatus: { fontSize: 15, fontWeight: 'bold' },
  aqiRecommend: { fontSize: 12, color: colors.textGray, marginTop: 2, lineHeight: 16 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F4F8',
    marginBottom: 12,
  },
  detailItem: { alignItems: 'center' },
  detailValue: { fontSize: 16, fontWeight: 'bold', color: colors.textDark, marginTop: 2 },
  detailLabel: { fontSize: 10, color: colors.textGray },

  progressSection: { marginBottom: 12 },
  progressLabel: { fontSize: 11, color: colors.textGray, marginBottom: 4 },
  progressTrack: {
    height: 4,
    backgroundColor: '#E8ECF0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    gap: 8,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  googleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  calculatingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  calculatingText: { fontSize: 13, color: colors.textGray },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  emptyStateText: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  emptyStateSubtext: { fontSize: 12, color: colors.textGray, textAlign: 'center' },
});