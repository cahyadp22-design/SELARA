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
import { useLanguage } from '../i18n/i18n';

// 🔑 LEVEL TRUST METER
const TRUST_LEVELS = [
  { key: 'Pemula', tKey: 'trust_pemula', descKey: 'trust_pemula_desc', icon: '🥚', color: '#94A3B8', bg: '#F1F5F9', minScore: 0 },
  { key: 'Kontributor', tKey: 'trust_kontributor', descKey: 'trust_kontributor_desc', icon: '🌱', color: '#22C55E', bg: '#DCFCE7', minScore: 21 },
  { key: 'Aktif', tKey: 'trust_aktif', descKey: 'trust_aktif_desc', icon: '🌿', color: '#16A34A', bg: '#BBF7D0', minScore: 51 },
  { key: 'Terpercaya', tKey: 'trust_terpercaya', descKey: 'trust_terpercaya_desc', icon: '🌳', color: '#15803D', bg: '#86EFAC', minScore: 81 },
  { key: 'Ahli', tKey: 'trust_ahli', descKey: 'trust_ahli_desc', icon: '🏆', color: '#EAB308', bg: '#FEF08A', minScore: 121 },
  { key: 'Master', tKey: 'trust_master', descKey: 'trust_master_desc', icon: '👑', color: '#7C3AED', bg: '#DDD6FE', minScore: 181 },
];

export default function ProfileScreen({ profileData, onEditPress, onTabPress, onLogout }) {
  const { t, language, setLanguage } = useLanguage();

  // 🔑 FUNGSI LOGOUT
  const handleLogout = () => {
    Alert.alert(
      t('profile_logout_title'),
      t('profile_logout_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('profile_logout_btn'), style: 'destructive', onPress: onLogout },
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
          <Text style={styles.headerSubtitle}>{t('profile_header_subtitle')}</Text>
          <Text style={styles.headerTitle}>{t('profile_header_title')}</Text>
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
                <Text style={styles.trustLevelText}>{t(currentLevel.tKey)}</Text>
                <Text style={styles.trustLevelDesc}>{t(currentLevel.descKey)}</Text>
              </View>
            </View>
            <View style={[styles.trustScoreBadge, { backgroundColor: currentLevel.bg }]}>
              <Text style={[styles.trustScoreText, { color: currentLevel.color }]}>
                {trustData.score} {t('trust_points')}
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
                  ? t('trust_towards')(nextLevel.icon, t(nextLevel.tKey), Math.round(progressToNext))
                  : t('trust_max_reached')}
              </Text>
            )}
          </View>

          {/* Trust Stats */}
          <View style={styles.trustStats}>
            <View style={styles.trustStat}>
              <Text style={styles.trustStatNumber}>{trustData.totalReports}</Text>
              <Text style={styles.trustStatLabel}>{t('trust_reports')}</Text>
            </View>
            <View style={styles.trustStatDivider} />
            <View style={styles.trustStat}>
              <Text style={styles.trustStatNumber}>{trustData.totalUpvotes}</Text>
              <Text style={styles.trustStatLabel}>{t('trust_upvotes')}</Text>
            </View>
            <View style={styles.trustStatDivider} />
            <View style={styles.trustStat}>
              <Text style={styles.trustStatNumber}>{trustData.totalComments}</Text>
              <Text style={styles.trustStatLabel}>{t('trust_comments')}</Text>
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.trustInfo}>
            <View style={styles.trustInfoItem}>
              <MaterialIcons name="check-circle" size={14} color={trustData.isVerified ? '#10B981' : colors.textGray} />
              <Text style={[styles.trustInfoText, trustData.isVerified && { color: '#10B981' }]}>
                {trustData.isVerified ? t('trust_verified') : t('trust_not_verified')}
              </Text>
            </View>
            {trustData.streakDays > 0 && (
              <View style={styles.trustInfoItem}>
                <MaterialIcons name="whatshot" size={14} color="#F59E0B" />
                <Text style={styles.trustInfoText}>{t('trust_streak')(trustData.streakDays)}</Text>
              </View>
            )}
            <View style={styles.trustInfoItem}>
              <MaterialIcons name="info" size={14} color={colors.textGray} />
              <Text style={styles.trustInfoText}>
                {t('trust_info')}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION: NOTIFIKASI */}
        <Text style={styles.sectionTitle}>{t('section_notification')}</Text>
        <View style={styles.optionsCard}>
          {/* Opsi 1: Peringatan zona buruk */}
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <MaterialIcons name="notifications-none" size={22} color={colors.primary} style={styles.optionIcon} />
              <View>
                <Text style={styles.optionText}>{t('notif_bad_zone_title')}</Text>
                <Text style={styles.optionSubtext}>
                  {t('notif_bad_zone_desc')}
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
                <Text style={styles.optionText}>{t('notif_morning_title')}</Text>
                <Text style={styles.optionSubtext}>
                  {t('notif_morning_desc')}
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
                  <Text style={styles.optionText}>{t('notif_morning_time_title')}</Text>
                  <Text style={styles.optionSubtext}>
                    {t('notif_morning_time_desc')(morningTime)}
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

        {/* 🔑 SECTION: BAHASA / LANGUAGE */}
        <Text style={styles.sectionTitle}>{t('section_language')}</Text>
        <View style={styles.optionsCard}>
          <View style={[styles.optionRow, { borderBottomWidth: 0, paddingVertical: 16 }]}>
            <View style={styles.optionLeft}>
              <MaterialIcons name="language" size={22} color={colors.primary} style={styles.optionIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{t('language_title')}</Text>
                <Text style={styles.optionSubtext}>{t('language_desc')}</Text>
                <View style={styles.languagePicker}>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'id' && styles.languageOptionActive,
                    ]}
                    onPress={() => setLanguage('id')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.languageFlag}>🇮🇩</Text>
                    <Text style={[
                      styles.languageOptionText,
                      language === 'id' && styles.languageOptionTextActive,
                    ]}>{t('language_id')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      language === 'en' && styles.languageOptionActive,
                    ]}
                    onPress={() => setLanguage('en')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.languageFlag}>🇺🇸</Text>
                    <Text style={[
                      styles.languageOptionText,
                      language === 'en' && styles.languageOptionTextActive,
                    ]}>{t('language_en')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
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
                <Text style={styles.timePickerTitle}>{t('time_picker_title')}</Text>
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
                    <Text style={styles.timePickerBtnText}>{t('cancel')}</Text>
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
  languagePicker: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  languageOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  languageOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  languageOptionTextActive: {
    color: colors.primary,
  },
});