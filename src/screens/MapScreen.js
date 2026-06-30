// src/screens/MapScreen.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  Dimensions,
  Animated,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import BottomTab from '../components/BottomTab';
import {
  fetchWAQIPollution,
  hasData,
  getWAQIColor,
  getWAQILabel,
  getWAQIRecommendation,
  getAreaDescription,
} from '../lib/waqiApi';
import { useLanguage } from '../i18n/i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.7;
const BOTTOM_SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.15;

// ============================================================
// 🔹 CUSTOM MODAL
// ============================================================
const CustomAlertModal = React.memo(({ visible, onClose, data }) => {
  const { t } = useLanguage();
  if (!data) return null;

  const aqi = data.aqi;
  const label = getWAQILabel(aqi, t); // ✅ FIX: tambah parameter t
  const recommendation = getWAQIRecommendation(aqi, t); // ✅ FIX: tambah parameter t
  const color = getWAQIColor(aqi);

  const components = useMemo(() => {
    const comps = data.components;
    const result = [];

    if (hasData(comps?.pm2_5)) result.push({ label: 'PM2.5', value: comps.pm2_5, unit: 'µg/m³' });
    if (hasData(comps?.pm10)) result.push({ label: 'PM10', value: comps.pm10, unit: 'µg/m³' });
    if (hasData(comps?.no2)) result.push({ label: 'NO₂', value: comps.no2, unit: 'µg/m³' });
    if (hasData(comps?.o3)) result.push({ label: 'O₃', value: comps.o3, unit: 'µg/m³' });
    if (hasData(comps?.so2)) result.push({ label: 'SO₂', value: comps.so2, unit: 'µg/m³' });
    if (hasData(comps?.co)) result.push({ label: 'CO', value: comps.co, unit: 'µg/m³' });

    return result;
  }, [data.components]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: color }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalStatusDot, { backgroundColor: color }]} />
              <Text style={styles.modalTitle}>{t('map_air_quality')}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={22} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
          >
            <View style={styles.modalAqiSection}>
              <View style={styles.modalAqiContainer}>
                <Text style={[styles.modalAqiValue, { color }]}>{aqi}</Text>
                <Text style={[styles.modalAqiLabel, { color }]}>AQI</Text>
              </View>
              <View style={styles.modalAqiInfo}>
                <Text style={[styles.modalAqiStatus, { color }]}>{label}</Text>
                <Text style={styles.modalAqiRecommendation}>{recommendation}</Text>
              </View>
            </View>

            <View style={styles.modalDivider} />

            <Text style={styles.modalSectionTitle}>{t('map_pollution_comp')}</Text>
            <View style={styles.modalComponentsGrid}>
              {components.map((comp, index) => (
                <View key={index} style={styles.modalComponentCard}>
                  <Text style={styles.modalComponentLabel}>{comp.label}</Text>
                  <Text style={[styles.modalComponentValue, { color: comp.value > 50 ? '#DC2626' : '#059669' }]}>
                    {comp.value}
                  </Text>
                  <Text style={styles.modalComponentUnit}>{comp.unit}</Text>
                </View>
              ))}
              {components.length === 0 && (
                <Text style={styles.modalNoData}>{t('map_no_comp_data')}</Text>
              )}
            </View>

            {(hasData(data.temperature) || hasData(data.humidity) || hasData(data.pressure)) && (
              <>
                <Text style={styles.modalSectionTitle}>{t('map_weather')}</Text>
                <View style={styles.modalWeatherGrid}>
                  {hasData(data.temperature) && (
                    <View style={styles.modalWeatherCard}>
                      <MaterialIcons name="thermostat" size={20} color={colors.textGray} />
                      <Text style={styles.modalWeatherValue}>{data.temperature}°C</Text>
                      <Text style={styles.modalWeatherLabel}>{t('map_temp')}</Text>
                    </View>
                  )}
                  {hasData(data.humidity) && (
                    <View style={styles.modalWeatherCard}>
                      <MaterialIcons name="opacity" size={20} color={colors.textGray} />
                      <Text style={styles.modalWeatherValue}>{data.humidity}%</Text>
                      <Text style={styles.modalWeatherLabel}>{t('map_humidity')}</Text>
                    </View>
                  )}
                  {hasData(data.pressure) && (
                    <View style={styles.modalWeatherCard}>
                      <MaterialIcons name="explore" size={20} color={colors.textGray} />
                      <Text style={styles.modalWeatherValue}>{data.pressure} hPa</Text>
                      <Text style={styles.modalWeatherLabel}>{t('map_pressure')}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            <Text style={styles.modalUpdateTime}>
              <MaterialIcons name="access-time" size={12} color={colors.textGray} />{' '}
              {t('home_last_updated')}: {new Date(data.time).toLocaleString('id-ID')}
            </Text>

            <TouchableOpacity
              style={[styles.modalCloseButtonFull, { backgroundColor: color }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>{t('map_understand')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ============================================================
// 🔹 KOMPONEN UTAMA
// ============================================================
export default function MapScreen({ onTabPress, onBack }) {
  const { t } = useLanguage();
  const [location, setLocation] = useState(null);
  const [currentPollution, setCurrentPollution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(t('map_updating'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState(BOTTOM_SHEET_MIN_HEIGHT);
  const [isExpanded, setIsExpanded] = useState(false);
  const mapRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const animatedHeight = useRef(new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT)).current;

  // ============================================================
  // 🔹 LOADING DENGAN CACHE & TIMEOUT
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      setLoadingMessage(t('map_loading_cached'));
      const cachedData = await AsyncStorage.getItem('lastPollution');
      let hasCachedData = false;

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed && parsed.aqi) {
            setCurrentPollution(parsed);
            setLastUpdate(new Date(parsed.time || Date.now()));
            hasCachedData = true;
            setLoadingMessage(t('map_loading_last'));
          }
        } catch (e) { }
      }

      setLoadingMessage(t('map_loading_perm'));
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('route_permission_title'), t('route_permission_msg'));
        const defaultLoc = { latitude: -6.2088, longitude: 106.8456 };
        setLocation({
          latitude: defaultLoc.latitude,
          longitude: defaultLoc.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setMapRegion({
          latitude: defaultLoc.latitude,
          longitude: defaultLoc.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        await fetchPollutionData(defaultLoc.latitude, defaultLoc.longitude);
        setLoading(false);
        return;
      }

      setLoadingMessage(t('map_loading_gps'));
      let loc;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GPS Timeout')), 8000)
          )
        ]);
      } catch (error) {
        setLoadingMessage(t('map_loading_timeout'));
        if (hasCachedData && currentPollution?.latitude && currentPollution?.longitude) {
          loc = {
            coords: {
              latitude: currentPollution.latitude,
              longitude: currentPollution.longitude
            }
          };
        } else {
          loc = { coords: { latitude: -6.2088, longitude: 106.8456 } };
        }
      }

      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setLocation(region);
      setMapRegion(region);

      await fetchPollutionData(loc.coords.latitude, loc.coords.longitude);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', t('home_load_error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPollutionData = useCallback(async (lat, lon) => {
    try {
      setLoadingMessage(t('map_loading_pol'));
      const mainData = await fetchWAQIPollution(lat, lon);

      if (mainData) {
        const newData = {
          ...mainData,
          latitude: lat,
          longitude: lon,
        };
        setCurrentPollution(newData);
        setLastUpdate(new Date());
        await AsyncStorage.setItem('lastPollution', JSON.stringify(newData));
      }
    } catch (error) {
      console.error('Error fetching pollution:', error);
    }
  }, []);

  const refreshData = useCallback(async (lat, lon) => {
    setIsRefreshing(true);
    try {
      await fetchPollutionData(lat, lon);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPollutionData]);

  useEffect(() => {
    loadData();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (mapRegion) {
          refreshData(mapRegion.latitude, mapRegion.longitude);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRegionChangeComplete = useCallback(async (region) => {
    setMapRegion(region);
    await refreshData(region.latitude, region.longitude);
  }, [refreshData]);

  const goToMyLocation = useCallback(async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setLocation(region);
      setMapRegion(region);
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 1000);
      }
      await refreshData(loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      Alert.alert('Error', t('map_error_loc'));
    }
  }, [refreshData]);

  const handleMarkerPress = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  // 🔥 TANPA PANRESPONDER - Hanya toggle dengan TouchableOpacity
  const expandBottomSheet = useCallback(() => {
    setIsExpanded(true);
    Animated.timing(animatedHeight, {
      toValue: BOTTOM_SHEET_MAX_HEIGHT,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setBottomSheetHeight(BOTTOM_SHEET_MAX_HEIGHT));
  }, []);

  const collapseBottomSheet = useCallback(() => {
    setIsExpanded(false);
    Animated.timing(animatedHeight, {
      toValue: BOTTOM_SHEET_MIN_HEIGHT,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setBottomSheetHeight(BOTTOM_SHEET_MIN_HEIGHT));
  }, []);

  const toggleBottomSheet = useCallback(() => {
    if (isExpanded) {
      collapseBottomSheet();
    } else {
      expandBottomSheet();
    }
  }, [isExpanded, expandBottomSheet, collapseBottomSheet]);

  const CustomMarker = useCallback(({ data, isUser }) => {
    if (!data) return null;
    const aqi = data.aqi;
    const color = getWAQIColor(aqi);
    const size = isUser ? 60 : 44;

    let ringSize = size + 12;
    if (aqi > 150) ringSize = size + 24;
    else if (aqi > 100) ringSize = size + 18;

    return (
      <View style={[styles.markerContainer, { width: size, height: size }]}>
        <View style={[
          styles.markerRing,
          {
            borderColor: color,
            width: ringSize,
            height: ringSize,
            opacity: aqi > 150 ? 0.5 : 0.3,
          }
        ]} />

        <View style={[styles.markerDot, { backgroundColor: color, width: size - 8, height: size - 8 }]}>
          <MaterialIcons
            name="rss-feed"
            size={isUser ? 20 : 14}
            color="#FFFFFF"
          />
          <Text style={[styles.markerText, { fontSize: isUser ? 11 : 9 }]}>
            {aqi}
          </Text>
        </View>

        {isUser && (
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>ANDA</Text>
          </View>
        )}
      </View>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
          <Text style={styles.loadingSubtext}>{t('map_wait')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapArea}>
        {location && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={location}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onRegionChangeComplete={handleRegionChangeComplete}
          >
            {currentPollution && currentPollution.aqi > 0 && (
              <Circle
                center={{
                  latitude: currentPollution.latitude,
                  longitude: currentPollution.longitude
                }}
                radius={currentPollution.aqi > 150 ? 8000 : 5000}
                strokeColor={`${getWAQIColor(currentPollution.aqi)}88`}
                fillColor={`${getWAQIColor(currentPollution.aqi)}22`}
                strokeWidth={2}
                zIndex={1}
              />
            )}

            {currentPollution && currentPollution.aqi > 0 && (
              <Marker
                coordinate={{
                  latitude: currentPollution.latitude,
                  longitude: currentPollution.longitude
                }}
                onPress={handleMarkerPress}
                zIndex={3}
              >
                <CustomMarker data={currentPollution} isUser={true} />
              </Marker>
            )}
          </MapView>
        )}

        {/* Header */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity style={styles.iconButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('map_title')}</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={goToMyLocation}
          >
            <MaterialIcons name="my-location" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        {currentPollution && currentPollution.aqi > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoMain}>
              <View style={styles.infoAqiContainer}>
                <Text style={[styles.infoAqi, { color: getWAQIColor(currentPollution.aqi) }]}>
                  {currentPollution.aqi}
                </Text>
                <Text style={[styles.infoAqiLabel, { color: getWAQIColor(currentPollution.aqi) }]}>
                  AQI
                </Text>
                <View style={[styles.aqiBar, {
                  backgroundColor: getWAQIColor(currentPollution.aqi),
                  width: Math.min((currentPollution.aqi / 300) * 60, 60)
                }]} />
              </View>

              <View style={styles.infoRight}>
                {/* ✅ FIX: tambah parameter t */}
                <Text style={[styles.infoLabel, { color: getWAQIColor(currentPollution.aqi) }]}>
                  {getWAQILabel(currentPollution.aqi, t)}
                </Text>

                <View style={styles.infoDetailRow}>
                  {hasData(currentPollution.components?.pm2_5) && (
                    <View style={styles.infoDetailItem}>
                      <MaterialIcons name="toys" size={12} color={colors.textGray} />
                      <Text style={styles.infoDetailText}>
                        PM2.5: {currentPollution.components?.pm2_5} µg/m³
                      </Text>
                    </View>
                  )}
                  {hasData(currentPollution.temperature) && (
                    <View style={styles.infoDetailItem}>
                      <MaterialIcons name="thermostat" size={12} color={colors.textGray} />
                      <Text style={styles.infoDetailText}>
                        {currentPollution.temperature}°C
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.infoAreaNote}>
                  <MaterialIcons name="info" size={10} color={colors.textGray} />{' '}
                  {t('map_impact_radius')(currentPollution.aqi > 150 ? '8' : '5')}
                </Text>

                <Text style={styles.infoUpdate}>
                  <MaterialIcons name="access-time" size={10} color={colors.textGray} />{' '}
                  {t('home_last_updated')} {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '...'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {isRefreshing && (
          <View style={styles.refreshOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.refreshText}>{t('map_updating')}</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet - TANPA PANRESPONDER */}
      <Animated.View
        style={[styles.bottomSheet, { height: animatedHeight }]}
      >
        {/* 🔥 Handle - Hanya TouchableOpacity */}
        <TouchableOpacity
          style={styles.sheetHandleContainer}
          onPress={toggleBottomSheet}
          activeOpacity={0.7}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetHandleText}>
            {isExpanded ? t('map_sheet_close') : t('map_sheet_detail')}
          </Text>
        </TouchableOpacity>

        {/* Konten - Tidak kena PanResponder */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={async () => {
                if (mapRegion) {
                  await refreshData(mapRegion.latitude, mapRegion.longitude);
                }
              }}
              colors={[colors.primary]}
            />
          }
        >
          {currentPollution && (
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: currentPollution.aqi > 150 ? '#FEE2E2' :
                    currentPollution.aqi > 100 ? '#FEF3C7' : '#D1FAE5',
                  borderColor: currentPollution.aqi > 150 ? '#FCA5A5' :
                    currentPollution.aqi > 100 ? '#FCD34D' : '#6EE7B7',
                }
              ]}>
                {/* ✅ FIX: tambah parameter t */}
                <Text style={[
                  styles.statusText,
                  {
                    color: currentPollution.aqi > 150 ? '#DC2626' :
                      currentPollution.aqi > 100 ? '#D97706' : '#059669'
                  }
                ]}>
                  {getWAQIRecommendation(currentPollution.aqi, t)}
                </Text>
                <Text style={styles.statusTime}>
                  <MaterialIcons name="access-time" size={10} color={colors.textGray} />{' '}
                  {new Date().toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('map_pollution_comp')}</Text>

          {currentPollution && (
            <View style={styles.detailGrid}>
              {hasData(currentPollution.components?.pm2_5) && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardLabel}>PM2.5</Text>
                  <Text style={[styles.detailCardValue, { color: currentPollution.components?.pm2_5 > 50 ? '#DC2626' : '#059669' }]}>
                    {currentPollution.components?.pm2_5}
                  </Text>
                  <Text style={styles.detailCardUnit}>µg/m³</Text>
                </View>
              )}

              {hasData(currentPollution.components?.pm10) && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardLabel}>PM10</Text>
                  <Text style={[styles.detailCardValue, { color: currentPollution.components?.pm10 > 100 ? '#DC2626' : '#059669' }]}>
                    {currentPollution.components?.pm10}
                  </Text>
                  <Text style={styles.detailCardUnit}>µg/m³</Text>
                </View>
              )}

              {hasData(currentPollution.components?.no2) && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardLabel}>NO₂</Text>
                  <Text style={styles.detailCardValue}>
                    {currentPollution.components?.no2}
                  </Text>
                  <Text style={styles.detailCardUnit}>µg/m³</Text>
                </View>
              )}

              {hasData(currentPollution.components?.o3) && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardLabel}>O₃</Text>
                  <Text style={styles.detailCardValue}>
                    {currentPollution.components?.o3}
                  </Text>
                  <Text style={styles.detailCardUnit}>µg/m³</Text>
                </View>
              )}

              {hasData(currentPollution.components?.so2) && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardLabel}>SO₂</Text>
                  <Text style={styles.detailCardValue}>
                    {currentPollution.components?.so2}
                  </Text>
                  <Text style={styles.detailCardUnit}>µg/m³</Text>
                </View>
              )}

              {hasData(currentPollution.components?.co) && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardLabel}>CO</Text>
                  <Text style={styles.detailCardValue}>
                    {currentPollution.components?.co}
                  </Text>
                  <Text style={styles.detailCardUnit}>µg/m³</Text>
                </View>
              )}
            </View>
          )}

          {currentPollution && (
            <View style={styles.areaInfoContainer}>
              <MaterialIcons name="info" size={14} color={colors.primary} />
              <Text style={styles.areaInfoText}>
                {t('map_impact_radius_full')(currentPollution.aqi > 150 ? '8' : '5')}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('map_rec_title')}</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => onTabPress('rute')}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconBg, { backgroundColor: colors.primaryLight }]}>
                <MaterialIcons name="directions" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.actionText}>{t('map_rec_route')}</Text>
                <Text style={styles.actionSubtext}>{t('map_rec_route_desc')}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textGray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconBg, { backgroundColor: '#E0F2FE' }]}>
                <MaterialIcons name="description" size={16} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.actionText}>{t('map_full_report')}</Text>
                <Text style={styles.actionSubtext}>{t('map_full_report_desc')}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textGray} />
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>

      <CustomAlertModal
        visible={modalVisible}
        onClose={handleCloseModal}
        data={currentPollution}
      />

      <BottomTab activeTab="peta" onTabPress={onTabPress} />
    </SafeAreaView>
  );
}

// ============================================================
// 🔹 STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F6F8' },
  loadingContent: { alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: 'bold', color: colors.textDark, textAlign: 'center' },
  loadingSubtext: { marginTop: 6, fontSize: 14, color: colors.textGray, textAlign: 'center' },
  mapArea: { flex: 1, position: 'relative' },
  map: { flex: 1 },

  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  infoCard: {
    position: 'absolute',
    top: 70,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  infoMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoAqiContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  infoAqi: {
    fontSize: 44,
    fontWeight: 'bold',
  },
  infoAqiLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    opacity: 0.6,
    marginTop: -2,
  },
  aqiBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 2,
  },
  infoRight: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoDetailRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  infoDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoDetailText: {
    fontSize: 12,
    color: colors.textGray,
  },
  infoAreaNote: {
    fontSize: 10,
    color: colors.textGray,
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoUpdate: {
    fontSize: 10,
    color: colors.textGray,
    marginTop: 2,
  },

  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerRing: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 2,
    opacity: 0.3,
  },
  markerDot: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  userBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  refreshOverlay: {
    position: 'absolute',
    top: 130,
    left: '50%',
    transform: [{ translateX: -80 }],
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  refreshText: { color: '#FFFFFF', marginLeft: 8, fontSize: 12 },

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
    paddingVertical: 4,
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

  statusContainer: { marginBottom: 10 },
  statusBadge: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  statusText: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  statusTime: { fontSize: 10, color: colors.textGray, marginTop: 1 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textGray,
    marginBottom: 8,
    marginTop: 2,
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailCardLabel: {
    fontSize: 11,
    color: colors.textGray,
    fontWeight: '600',
  },
  detailCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  detailCardUnit: {
    fontSize: 10,
    color: colors.textGray,
  },

  areaInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  areaInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },

  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  actionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  actionSubtext: { fontSize: 10, color: colors.textGray },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 3,
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseButtonFull: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  modalAqiSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAqiContainer: {
    alignItems: 'center',
    marginRight: 20,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  modalAqiValue: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  modalAqiLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.7,
  },
  modalAqiInfo: {
    flex: 1,
  },
  modalAqiStatus: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalAqiRecommendation: {
    fontSize: 13,
    color: colors.textGray,
    marginTop: 4,
    lineHeight: 18,
  },

  modalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },

  modalSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 10,
  },

  modalComponentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalComponentCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 6,
  },
  modalComponentLabel: {
    fontSize: 10,
    color: colors.textGray,
    fontWeight: '600',
  },
  modalComponentValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalComponentUnit: {
    fontSize: 9,
    color: colors.textGray,
  },
  modalNoData: {
    fontSize: 13,
    color: colors.textGray,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 10,
  },

  modalWeatherGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  modalWeatherCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minWidth: 80,
  },
  modalWeatherValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 4,
  },
  modalWeatherLabel: {
    fontSize: 10,
    color: colors.textGray,
  },

  modalUpdateTime: {
    fontSize: 11,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 4,
  },
});