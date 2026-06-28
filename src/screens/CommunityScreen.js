// screens/CommunityScreen.js
import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  RefreshControl,
  Animated,
  Alert,
  Share,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import BottomTab from '../components/BottomTab';
import ReportItem from '../components/ReportItem';

const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: 'grid-view' },
  { id: 'Asap pabrik', label: 'Asap Pabrik', icon: 'factory' },
  { id: 'Pembakaran', label: 'Pembakaran', icon: 'fireplace' },
  { id: 'Sampah Terbakar', label: 'Sampah Terbakar', icon: 'delete-outline' },
  { id: 'Knalpot Kendaraan', label: 'Knalpot', icon: 'time-to-leave' },
];

export default function CommunityScreen({
  reports,
  onUpvote,
  onAddReportPress,
  onTabPress,
  navigation,
  onRefresh,
}) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('terbaru');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [upvotedReports, setUpvotedReports] = useState([]);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cityList = useMemo(() => {
    const cities = new Set();
    reports.forEach((report) => {
      if (report.location) {
        const parts = report.location.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          cities.add(parts[parts.length - 1]);
          if (parts.length >= 2) {
            cities.add(parts[parts.length - 2]);
          }
        } else if (parts.length === 1) {
          cities.add(parts[0]);
        }
      }
    });
    return Array.from(cities).sort();
  }, [reports]);

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return cityList;
    const q = searchQuery.toLowerCase();
    return cityList.filter(city => city.toLowerCase().includes(q));
  }, [cityList, searchQuery]);

  const filteredByCity = useMemo(() => {
    if (!selectedCity) return reports;
    return reports.filter(report =>
      report.location && report.location.toLowerCase().includes(selectedCity.toLowerCase())
    );
  }, [reports, selectedCity]);

  const filteredByCategory = useMemo(() => {
    if (selectedCategory === 'all') return filteredByCity;
    return filteredByCity.filter(report =>
      report.category === selectedCategory
    );
  }, [filteredByCity, selectedCategory]);

  const filteredReports = useMemo(() => {
    const sorted = [...filteredByCategory];
    if (sortBy === 'terpopuler') {
      sorted.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }
    return sorted;
  }, [filteredByCategory, sortBy]);

  const getAvatarColors = (initials) => {
    const list = {
      'AR': { bg: '#EEF2FF', text: '#4F46E5' },
      'DN': { bg: '#ECFDF5', text: '#059669' },
      'CH': { bg: '#F0F9FF', text: '#0284C7' },
      'YB': { bg: '#FFF7ED', text: '#EA580C' },
      'BS': { bg: '#FCE4EC', text: '#C62828' },
      'AW': { bg: '#E8F5E9', text: '#2E7D32' },
      'RF': { bg: '#F3E5F5', text: '#6A1B9A' },
      'DK': { bg: '#FFF3E0', text: '#E65100' },
      'AN': { bg: '#E3F2FD', text: '#0D47A1' },
      'US': { bg: '#F3F4F6', text: '#4B5563' },
    };
    return list[initials] || { bg: '#F3F4F6', text: '#4B5563' };
  };

  const getCategoryColorsWithSeverity = (category, severity) => {
    const baseColors = {
      'Asap pabrik': { bg: '#FFEBE6', text: '#E53E3E' },
      'Pembakaran': { bg: '#FFF3E0', text: '#DD6B20' },
      'Sampah Terbakar': { bg: '#FFF3E0', text: '#DD6B20' },
      'Knalpot': { bg: '#E0F2FE', text: '#0284C7' },
      'Knalpot Kendaraan': { bg: '#E0F2FE', text: '#0284C7' },
    };

    const base = baseColors[category] || { bg: '#F1F5F9', text: '#475569' };

    if (severity === 'Ringan') {
      return { bg: '#D1FAE5', text: '#065F46' };
    } else if (severity === 'Sedang') {
      return { bg: '#FEF3C7', text: '#92400E' };
    } else if (severity === 'Parah') {
      return { bg: '#FEE2E2', text: '#991B1B' };
    }
    return base;
  };

  const isUpvoted = (reportId) => {
    return upvotedReports.includes(reportId);
  };

  const handleUpvote = (reportId) => {
    if (isUpvoted(reportId)) {
      setUpvotedReports(prev => prev.filter(id => id !== reportId));
    } else {
      setUpvotedReports(prev => [...prev, reportId]);
    }
    if (onUpvote) {
      onUpvote(reportId);
    }
  };

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setSearchModalVisible(false);
    setSearchQuery('');
  };

  const handleClearFilter = () => {
    setSelectedCity(null);
    setSearchModalVisible(false);
    setSearchQuery('');
  };

  const handleCategoryPress = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSort = (type) => {
    setSortBy(type);
    setSortModalVisible(false);
  };

  const getSortLabel = () => {
    return sortBy === 'terpopuler' ? '🔥 Terpopuler' : '📅 Terbaru';
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  }, [onRefresh]);

  const handleCardPress = (reportId) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (navigation && navigation.navigate) {
      navigation.navigate('detail-laporan', { reportId });
    }
  };

  const handleShare = async (item) => {
    try {
      await Share.share({
        message: `🌿 ${item.title}\n📍 ${item.location}\n⚠️ ${item.severity}\n\nLihat di SkySentry!`,
        title: 'Laporan Polusi Udara',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const renderCategoryFilter = () => {
    return (
      <View style={styles.categoryFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => handleCategoryPress(cat.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={cat.icon}
                  size={16}
                  color={isActive ? '#FFFFFF' : colors.textGray}
                  style={styles.categoryChipIcon}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Laporan Polusi</Text>
        <Text style={styles.headerTitle}>Komunitas</Text>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCity && styles.filterButtonActive
          ]}
          onPress={() => setSearchModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="location-on"
            size={16}
            color={selectedCity ? '#FFFFFF' : colors.textDark}
          />
          <Text style={[
            styles.filterButtonText,
            selectedCity && styles.filterButtonTextActive
          ]} numberOfLines={1}>
            {selectedCity || 'Semua Kota'}
          </Text>
          <MaterialIcons
            name="expand-more"
            size={16}
            color={selectedCity ? '#FFFFFF' : colors.textGray}
          />
        </TouchableOpacity>

        {selectedCity && (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={handleClearFilter}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={16} color={colors.textGray} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="filter-list" size={14} color={colors.textDark} />
          <Text style={styles.sortButtonText} numberOfLines={1}>
            {getSortLabel()}
          </Text>
          <MaterialIcons name="expand-more" size={14} color={colors.textGray} />
        </TouchableOpacity>

        <View style={styles.filterCountBadge}>
          <Text style={styles.filterCountText}>{filteredReports.length}</Text>
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.legendText}>Ringan</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
          <Text style={styles.legendText}>Sedang</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Parah</Text>
        </View>
      </View>

      {/* ScrollView */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {filteredReports.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="search" size={48} color={colors.textGray} />
              <Text style={styles.emptyTitle}>Tidak ada laporan</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCategory !== 'all'
                  ? `Belum ada laporan untuk kategori "${CATEGORIES.find(c => c.id === selectedCategory)?.label}"`
                  : `Belum ada laporan polusi di ${selectedCity || 'area ini'}.`
                }
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={onAddReportPress}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Buat Laporan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredReports.map((item, index) => {
              const avatar = getAvatarColors(item.initials);
              const catColors = getCategoryColorsWithSeverity(item.category, item.severity);
              const isItemUpvoted = upvotedReports.includes(item.id);

              return (
                <ReportItem
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={handleCardPress}
                  onUpvote={handleUpvote}
                  onShare={handleShare}
                  isUpvoted={isItemUpvoted}
                  avatarColors={avatar}
                  categoryColors={catColors}
                />
              );
            })
          )}
        </Animated.View>

        {filteredReports.length > 0 && (
          <View style={styles.bottomLoader}>
            <Text style={styles.bottomLoaderText}>
              {filteredReports.length} laporan ditampilkan
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onAddReportPress}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <BottomTab activeTab="tren" onTabPress={onTabPress} />

      {/* Modal Pilih Kota */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSearchModalVisible(false);
          setSearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setSearchModalVisible(false);
            setSearchQuery('');
          }}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kota</Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchModalVisible(false);
                  setSearchQuery('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={18} color={colors.textGray} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama kota..."
                placeholderTextColor={colors.textGray}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="cancel" size={18} color={colors.textGray} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.cityItem,
                !selectedCity && styles.cityItemActive
              ]}
              onPress={handleClearFilter}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="public"
                size={18}
                color={!selectedCity ? colors.primary : colors.textGray}
              />
              <Text style={[
                styles.cityItemText,
                !selectedCity && styles.cityItemTextActive
              ]}>Semua Kota</Text>
              {!selectedCity && (
                <MaterialIcons name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {filteredCities.length === 0 ? (
              <View style={styles.noResultContainer}>
                <MaterialIcons name="location-pin" size={32} color={colors.textGray} />
                <Text style={styles.noResultText}>Kota "{searchQuery}" tidak ditemukan</Text>
              </View>
            ) : (
              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item}
                style={styles.cityList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: city }) => {
                  const isSelected = selectedCity === city;
                  const count = reports.filter(r =>
                    r.location && r.location.toLowerCase().includes(city.toLowerCase())
                  ).length;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.cityItem,
                        isSelected && styles.cityItemActive
                      ]}
                      onPress={() => handleSelectCity(city)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="location-on"
                        size={18}
                        color={isSelected ? colors.primary : colors.textGray}
                      />
                      <Text style={[
                        styles.cityItemText,
                        isSelected && styles.cityItemTextActive
                      ]}>{city}</Text>
                      <View style={styles.cityCountBadge}>
                        <Text style={styles.cityCountText}>{count}</Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Sort */}
      <Modal
        visible={sortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModalVisible(false)}
        >
          <Pressable style={styles.sortModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Urutkan Laporan</Text>
              <TouchableOpacity
                onPress={() => setSortModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === 'terbaru' && styles.sortOptionActive
              ]}
              onPress={() => handleSort('terbaru')}
              activeOpacity={0.7}
            >
              <View style={styles.sortOptionLeft}>
                <MaterialIcons name="access-time" size={18} color={sortBy === 'terbaru' ? colors.primary : colors.textGray} />
                <Text style={[
                  styles.sortOptionText,
                  sortBy === 'terbaru' && styles.sortOptionTextActive
                ]}>Terbaru</Text>
              </View>
              {sortBy === 'terbaru' && (
                <MaterialIcons name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortOption,
                sortBy === 'terpopuler' && styles.sortOptionActive
              ]}
              onPress={() => handleSort('terpopuler')}
              activeOpacity={0.7}
            >
              <View style={styles.sortOptionLeft}>
                <MaterialIcons name="trending-up" size={18} color={sortBy === 'terpopuler' ? colors.primary : colors.textGray} />
                <Text style={[
                  styles.sortOptionText,
                  sortBy === 'terpopuler' && styles.sortOptionTextActive
                ]}>Terpopuler (Upvote Tertinggi)</Text>
              </View>
              {sortBy === 'terpopuler' && (
                <MaterialIcons name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textGray,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDark,
    maxWidth: 100,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  clearFilterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDark,
    maxWidth: 80,
  },
  filterCountBadge: {
    marginLeft: 'auto',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textGray,
  },
  categoryFilterContainer: {
    backgroundColor: colors.cardBg,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryScrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipIcon: {
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textGray,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textGray,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomLoaderText: {
    fontSize: 11,
    color: colors.textGray,
  },
  fab: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
    height: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    marginBottom: 4,
  },
  cityList: {
    paddingHorizontal: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    borderRadius: 12,
    gap: 10,
  },
  cityItemActive: {
    backgroundColor: colors.primaryLight,
  },
  cityItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  cityItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  cityCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cityCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textGray,
  },
  noResultContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  noResultText: {
    fontSize: 14,
    color: colors.textGray,
    fontWeight: '500',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sortOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});