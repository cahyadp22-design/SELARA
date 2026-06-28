// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import BottomTab from '../components/BottomTab';
import { supabase } from '../config/supabase';

// 🔑 LEVEL TRUST METER
const TRUST_LEVELS = [
  { key: 'Pemula', icon: '🥚', color: '#94A3B8', bg: '#F1F5F9', minScore: 0, description: 'Mulai perjalananmu sebagai pelapor polusi' },
  { key: 'Kontributor', icon: '🌱', color: '#22C55E', bg: '#DCFCE7', minScore: 21, description: 'Mulai berkontribusi dalam komunitas' },
  { key: 'Aktif', icon: '🌿', color: '#16A34A', bg: '#BBF7D0', minScore: 51, description: 'Pengguna aktif yang peduli lingkungan' },
  { key: 'Terpercaya', icon: '🌳', color: '#15803D', bg: '#86EFAC', minScore: 81, description: 'Laporanmu dipercaya komunitas' },
  { key: 'Ahli', icon: '🏆', color: '#EAB308', bg: '#FEF08A', minScore: 121, description: 'Ahli dalam memantau kualitas udara' },
  { key: 'Master', icon: '👑', color: '#7C3AED', bg: '#DDD6FE', minScore: 181, description: 'Master pelapor, inspirasi bagi banyak orang' },
];

export default function ProfileScreen({ profileData, onEditPress, onTabPress, onLogout }) {

  // 🔑 FUNGSI LOGOUT
  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah kamu yakin ingin keluar dari akun?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: onLogout },
      ]
    );
  };
  // State untuk pengaturan notifikasi
  const [badZoneAlert, setBadZoneAlert] = useState(profileData.badZoneAlert ?? true);
  const [morningSummary, setMorningSummary] = useState(profileData.morningSummary ?? true);
  const [morningTime, setMorningTime] = useState(profileData.morningTime || '07:00');

  // 🔑 State untuk Trust Meter
  const [trustData, setTrustData] = useState({
    score: 0,
    level: 'Pemula',
    totalReports: 0,
    totalUpvotes: 0,
    totalComments: 0,
    isVerified: false,
    joinedAt: null,
    streakDays: 0,
  });
  const [loadingTrust, setLoadingTrust] = useState(true);

  // State untuk Time Picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // State untuk statistik
  const [stats, setStats] = useState({
    daysMonitored: profileData.daysMonitored || 0,
    alertsReceived: 0,
  });

  // 🔑 LOAD TRUST DATA
  useEffect(() => {
    loadTrustData();
  }, []);

  const loadTrustData = async () => {
    setLoadingTrust(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('trust_score, trust_level, total_reports, total_upvotes_received, total_comments, is_verified, joined_at, streak_days')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setTrustData({
          score: data.trust_score || 0,
          level: data.trust_level || 'Pemula',
          totalReports: data.total_reports || 0,
          totalUpvotes: data.total_upvotes_received || 0,
          totalComments: data.total_comments || 0,
          isVerified: data.is_verified || false,
          joinedAt: data.joined_at,
          streakDays: data.streak_days || 0,
        });
      }
    } catch (error) {
      console.log('Error loading trust data:', error);
    } finally {
      setLoadingTrust(false);
    }
  };

  // 🔑 UPDATE PREFERENCE KE SUPABASE
  const updatePreference = async (key, value) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ [key]: value })
          .eq('id', user.id);
      }
    } catch (error) {
      console.log('Error updating preference:', error);
    }
  };

  // 🔑 HANDLE TIME CHANGE
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setMorningTime(timeString);
      updatePreference('morning_time', timeString);
    }
  };

  const showTimePickerModal = () => {
    const [hours, minutes] = morningTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 7);
    date.setMinutes(minutes || 0);
    setTempTime(date);
    setShowTimePicker(true);
  };

  // 🔑 GET CURRENT LEVEL
  const getCurrentLevel = (levelKey) => {
    return TRUST_LEVELS.find(l => l.key === levelKey) || TRUST_LEVELS[0];
  };

  const getNextLevel = (score) => {
    return TRUST_LEVELS.find(l => l.minScore > score) || null;
  };

  // 🔑 GET PROGRESS TO NEXT LEVEL
  const getProgressToNextLevel = (score) => {
    const next = getNextLevel(score);
    if (!next) return 100;

    const current = TRUST_LEVELS.find(l => l.minScore <= score &&
      (TRUST_LEVELS[TRUST_LEVELS.indexOf(l) + 1]?.minScore > score ||
        TRUST_LEVELS.indexOf(l) === TRUST_LEVELS.length - 1));

    if (!current) return 0;

    const currentIndex = TRUST_LEVELS.indexOf(current);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= TRUST_LEVELS.length) return 100;

    const currentMin = current.minScore;
    const nextMin = TRUST_LEVELS[nextIndex].minScore;

    return Math.min(((score - currentMin) / (nextMin - currentMin)) * 100, 100);
  };

  // Dapatkan inisial dari nama lengkap
  const getInitials = (name) => {
    if (!name) return 'SS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const currentLevel = getCurrentLevel(trustData.level);
  const nextLevel = getNextLevel(trustData.score);
  const progressToNext = getProgressToNextLevel(trustData.score);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Akun & preferensi</Text>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <TouchableOpacity style={styles.profileCard} onPress={onEditPress} activeOpacity={0.9}>
          <View style={styles.profileInfo}>
            {profileData.photoUri ? (
              <Image source={{ uri: profileData.photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarText}>{getInitials(profileData.fullName)}</Text>
              </View>
            )}

            <View style={styles.nameContainer}>
              <Text style={styles.fullName}>{profileData.fullName || 'Sentry Sky'}</Text>
              <Text style={styles.emailText}>{profileData.email || 's.sentry@gmail.com'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
            <MaterialIcons name="edit" size={20} color={colors.textDark} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 🔑 TRUST METER - FULL VERSION */}
        <View style={styles.trustCard}>
          {/* Header Level */}
          <View style={styles.trustHeader}>
            <View style={styles.trustLevelContainer}>
              <Text style={styles.trustIcon}>{currentLevel.icon}</Text>
              <View>
                <Text style={styles.trustLevelText}>{currentLevel.key}</Text>
                <Text style={styles.trustLevelDesc}>{currentLevel.description}</Text>
              </View>
            </View>
            <View style={[styles.trustScoreBadge, { backgroundColor: currentLevel.bg }]}>
              <Text style={[styles.trustScoreText, { color: currentLevel.color }]}>
                {trustData.score} poin
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progressToNext, 100)}%`,
                    backgroundColor: currentLevel.color
                  }
                ]}
              />
            </View>
            {nextLevel && (
              <Text style={styles.progressLabel}>
                {progressToNext < 100
                  ? `Menuju ${nextLevel.icon} ${nextLevel.key} (${Math.round(progressToNext)}%)`
                  : '✨ Level maksimum tercapai!'}
              </Text>
            )}
          </View>

          {/* Trust Stats */}
          <View style={styles.trustStats}>
            <View style={styles.trustStat}>
              <Text style={styles.trustStatNumber}>{trustData.totalReports}</Text>
              <Text style={styles.trustStatLabel}>📄 Laporan</Text>
            </View>
            <View style={styles.trustStatDivider} />
            <View style={styles.trustStat}>
              <Text style={styles.trustStatNumber}>{trustData.totalUpvotes}</Text>
              <Text style={styles.trustStatLabel}>⬆️ Upvote</Text>
            </View>
            <View style={styles.trustStatDivider} />
            <View style={styles.trustStat}>
              <Text style={styles.trustStatNumber}>{trustData.totalComments}</Text>
              <Text style={styles.trustStatLabel}>💬 Komentar</Text>
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.trustInfo}>
            <View style={styles.trustInfoItem}>
              <MaterialIcons name="check-circle" size={14} color={trustData.isVerified ? '#10B981' : colors.textGray} />
              <Text style={[styles.trustInfoText, trustData.isVerified && { color: '#10B981' }]}>
                {trustData.isVerified ? 'Akun Terverifikasi ✅' : 'Belum Terverifikasi'}
              </Text>
            </View>
            {trustData.streakDays > 0 && (
              <View style={styles.trustInfoItem}>
                <MaterialIcons name="whatshot" size={14} color="#F59E0B" />
                <Text style={styles.trustInfoText}>🔥 {trustData.streakDays} hari berturut-turut</Text>
              </View>
            )}
            <View style={styles.trustInfoItem}>
              <MaterialIcons name="info" size={14} color={colors.textGray} />
              <Text style={styles.trustInfoText}>
                Semakin aktif berkontribusi, semakin tinggi tingkat kepercayaan Anda
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={[styles.statsNumber, { color: colors.primary }]}>
              {stats.daysMonitored || 0}
            </Text>
            <Text style={styles.statsLabel}>Hari dipantau</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={[styles.statsNumber, { color: '#EF4444' }]}>
              {stats.alertsReceived || 0}
            </Text>
            <Text style={styles.statsLabel}>Alert diterima</Text>
          </View>
        </View>

        {/* SECTION: NOTIFIKASI */}
        <Text style={styles.sectionTitle}>NOTIFIKASI</Text>
        <View style={styles.optionsCard}>
          {/* Opsi 1: Peringatan zona buruk */}
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <MaterialIcons name="notifications-none" size={22} color={colors.primary} style={styles.optionIcon} />
              <View>
                <Text style={styles.optionText}>Peringatan zona buruk</Text>
                <Text style={styles.optionSubtext}>
                  Notifikasi saat memasuki area polusi berbahaya
                </Text>
              </View>
            </View>
            <Switch
              value={badZoneAlert}
              onValueChange={(val) => {
                setBadZoneAlert(val);
                updatePreference('bad_zone_alert', val);
              }}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
              disabled={loading}
            />
          </View>

          {/* Opsi 2: Ringkasan pagi dengan pilihan jam */}
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <MaterialIcons name="access-time" size={20} color={colors.primary} style={styles.optionIcon} />
              <View>
                <Text style={styles.optionText}>Ringkasan pagi</Text>
                <Text style={styles.optionSubtext}>
                  Notifikasi kondisi udara setiap pagi
                </Text>
              </View>
            </View>
            <Switch
              value={morningSummary}
              onValueChange={(val) => {
                setMorningSummary(val);
                updatePreference('morning_summary', val);
              }}
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
              disabled={loading}
            />
          </View>

          {/* Opsi 3: Pilih Jam Ringkasan Pagi */}
          {morningSummary && (
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={showTimePickerModal}
              activeOpacity={0.7}
              disabled={loading}
            >
              <View style={styles.optionLeft}>
                <MaterialIcons name="access-time" size={20} color={colors.primary} style={styles.optionIcon} />
                <View>
                  <Text style={styles.optionText}>Jam ringkasan pagi</Text>
                  <Text style={styles.optionSubtext}>
                    Notifikasi akan dikirim setiap hari jam {morningTime}
                  </Text>
                </View>
              </View>
              <View style={styles.timeValueContainer}>
                <Text style={styles.timeValue}>{morningTime}</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.textGray} />
              </View>
            </TouchableOpacity>
          )}
        </View>



      </ScrollView>

      {/* TIME PICKER MODAL */}
      {showTimePicker && (
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerOverlay}>
            <TouchableOpacity
              style={styles.timePickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
            />
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>Pilih Jam Ringkasan Pagi</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <MaterialIcons name="close" size={24} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                style={styles.timePicker}
              />

              {Platform.OS === 'android' && (
                <View style={styles.timePickerActions}>
                  <TouchableOpacity
                    style={[styles.timePickerBtn, styles.timePickerCancel]}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.timePickerBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timePickerBtn, styles.timePickerConfirm]}
                    onPress={() => {
                      onTimeChange(null, tempTime);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.timePickerBtnText, { color: '#FFFFFF' }]}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      <BottomTab activeTab="profil" onTabPress={onTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
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
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  nameContainer: {
    marginLeft: 16,
    flex: 1,
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: colors.textGray,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 🔑 TRUST METER
  trustCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  trustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trustLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustIcon: {
    fontSize: 28,
  },
  trustLevelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  trustLevelDesc: {
    fontSize: 11,
    color: colors.textGray,
  },
  trustScoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trustScoreText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textGray,
  },
  trustStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  trustStat: {
    alignItems: 'center',
    flex: 1,
  },
  trustStatDivider: {
    width: 1,
    backgroundColor: '#F1F5F9',
  },
  trustStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  trustStatLabel: {
    fontSize: 12,
    color: colors.textGray,
  },
  trustInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  trustInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textGray,
    fontStyle: 'italic',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: colors.textGray,
    fontWeight: '500',
  },

  // Sections
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textGray,
    marginBottom: 10,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
  optionsCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },
  optionSubtext: {
    fontSize: 11,
    color: colors.textGray,
    marginTop: 1,
  },
  timeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },

  // TIME PICKER MODAL
  timePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  timePickerOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  timePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  timePicker: {
    width: '100%',
  },
  timePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timePickerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timePickerCancel: {
    backgroundColor: '#F1F5F9',
  },
  timePickerConfirm: {
    backgroundColor: colors.primary,
  },
  timePickerBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textDark,
  },
});