// screens/AddReportScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { supabase } from '../config/supabase';
import { File, Paths } from 'expo-file-system';

export default function AddReportScreen({ onSubmit, onBack }) {
  const [selectedType, setSelectedType] = useState('Asap pabrik');
  const [severity, setSeverity] = useState('Sedang');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const hasSubmitted = useRef(false);

  // Location state
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);

  const pollutionTypes = [
    { id: 'Asap pabrik', label: 'Asap pabrik', icon: () => <MaterialIcons name="domain" size={24} color={colors.textDark} /> },
    { id: 'Pembakaran', label: 'Pembakaran', icon: () => <MaterialIcons name="whatshot" size={24} color={colors.textDark} /> },
    { id: 'Sampah Terbakar', label: 'Sampah Terbakar', icon: () => <MaterialIcons name="delete" size={24} color={colors.textDark} /> },
    { id: 'Knalpot Kendaraan', label: 'Knalpot Kendaraan', icon: () => <MaterialIcons name="directions-car" size={24} color={colors.textDark} /> },
  ];

  const severities = ['Ringan', 'Sedang', 'Parah'];

  useEffect(() => {
    fetchLocation();
    // Reset ref saat komponen mount
    hasSubmitted.current = false;
  }, []);

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Izin lokasi ditolak. Aktifkan di pengaturan.');
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);

      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (addr) {
        setAddress(addr);
      }
    } catch (err) {
      setLocationError('Gagal mendapatkan lokasi. Coba lagi.');
      console.error('Location error:', err);
    } finally {
      setLocationLoading(false);
    }
  };

  const getAddressText = () => {
    if (!address) return 'Lokasi tidak diketahui';
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.subregion) parts.push(address.subregion);
    if (address.city) parts.push(address.city);
    if (parts.length === 0 && address.name) parts.push(address.name);
    return parts.join(', ') || 'Lokasi ditemukan';
  };

  const getAccuracyText = () => {
    if (!location) return '';
    const accuracy = Math.round(location.coords.accuracy);
    return `GPS aktif · akurasi ${accuracy}m`;
  };

  const uploadImageToSupabase = async (uri) => {
    try {
      console.log('📤 [1] Starting upload from URI:', uri);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      console.log('✅ [2] User authenticated:', user.id);

      const file = new File(uri);

      if (!file.exists) {
        throw new Error('File not found: ' + uri);
      }
      console.log('📦 [3] File exists, size:', file.size, 'bytes');

      const fileBytes = file.bytesSync(); // Atau gunakan await file.bytes() untuk async
      console.log('📦 [4] File read successfully, bytes length:', fileBytes.length);

      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `reports/${fileName}`;
      console.log('📁 [5] File path:', filePath);

      console.log('📤 [6] Uploading to Supabase Storage...');
      const { data, error } = await supabase.storage
        .from('report-images')
        .upload(filePath, fileBytes, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.log('❌ [6] Upload error:', error);
        throw error;
      }

      console.log('✅ [6] Upload success:', data);

      // 🔑 DAPATKAN PUBLIC URL
      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(filePath);

      console.log('🔗 [7] Public URL:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.log('❌ [uploadImageToSupabase] Error:', error);
      throw error;
    }
  };

  const uploadMultipleImages = async (imageUris) => {
    const uploadedUrls = [];
    const totalImages = imageUris.length;
    console.log(`📸 Uploading ${totalImages} images...`);

    for (let i = 0; i < imageUris.length; i++) {
      try {
        console.log(`📤 Uploading image ${i + 1}/${totalImages}...`);
        const url = await uploadImageToSupabase(imageUris[i]);
        if (url && typeof url === 'string' && url.startsWith('http')) {
          uploadedUrls.push(url);
          console.log(`✅ Image ${i + 1} uploaded:`, url);
        } else {
          console.log(`⚠️ Image ${i + 1} returned invalid URL:`, url);
        }
      } catch (error) {
        console.log(`❌ Error uploading image ${i + 1}:`, error);
        Alert.alert(
          'Gagal Upload Foto',
          `Foto ${i + 1} gagal diupload. Laporan tetap akan dikirim tanpa foto. Error: ${error.message || 'Unknown error'}`
        );
      }
      const progress = ((i + 1) / totalImages) * 70;
      setUploadProgress(progress);
    }

    console.log('📦 All uploaded URLs:', uploadedUrls);
    return uploadedUrls;
  };

  const base64ToBlob = (base64, contentType = 'image/jpeg') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  const handleSubmit = async () => {
    if (hasSubmitted.current) {
      console.log('⚠️ Submit sudah diproses, skip...');
      return;
    }

    if (!selectedType) {
      Alert.alert("Error", "Harap pilih jenis polusi.");
      return;
    }
    if (!location) {
      Alert.alert("Error", "Lokasi belum tersedia. Pastikan GPS aktif.");
      return;
    }

    hasSubmitted.current = true;
    setIsSubmitting(true);
    setUploadProgress(10);

    let reportTitle = '';
    let photoUrls = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Anda harus login terlebih dahulu');
        hasSubmitted.current = false;
        setIsSubmitting(false);
        return;
      }

      console.log('👤 User ID:', user.id);

      // Auto-generate title
      if (selectedType === 'Asap pabrik') {
        reportTitle = severity === 'Parah' ? 'Asap pabrik tebal' : 'Polusi asap pabrik';
      } else if (selectedType === 'Pembakaran') {
        reportTitle = 'Pembakaran sampah warga';
      } else if (selectedType === 'Sampah Terbakar') {
        reportTitle = 'Pembakaran sampah';
      } else {
        reportTitle = severity === 'Parah' ? 'Asap knalpot truk tebal' : 'Asap knalpot kendaraan';
      }
      if (description.trim().length > 0) {
        reportTitle = description.trim().substring(0, 30) + (description.trim().length > 30 ? '...' : '');
      }
      console.log('📝 Report title:', reportTitle);

      if (photos.length > 0) {
        setUploadProgress(20);
        console.log('📸 Uploading photos...');

        for (let i = 0; i < photos.length; i++) {
          try {
            console.log(`📤 Uploading image ${i + 1}/${photos.length}...`);
            const url = await uploadImageToSupabase(photos[i]);
            if (url && typeof url === 'string' && url.startsWith('http')) {
              photoUrls.push(url);
              console.log(`✅ Image ${i + 1} uploaded:`, url);
            } else {
              console.log(`⚠️ Image ${i + 1} returned invalid URL:`, url);
            }
          } catch (error) {
            console.log(`❌ Error uploading image ${i + 1}:`, error);
            Alert.alert(
              'Gagal Upload Foto',
              `Foto ${i + 1} gagal diupload. Laporan tetap akan dikirim tanpa foto. Error: ${error.message || 'Network error'}`
            );
            // Lanjutkan ke gambar berikutnya
          }
          const progress = ((i + 1) / photos.length) * 70;
          setUploadProgress(progress);
        }

        console.log('📦 Upload result:', photoUrls);
        setUploadProgress(80);
      } else {
        console.log('📸 No photos to upload');
      }

      const finalPhotoUrls = Array.isArray(photoUrls) ? photoUrls : [];
      console.log('✅ Final photo URLs:', finalPhotoUrls);

      const reportData = {
        user_id: user.id,
        category: selectedType,
        severity: severity,
        location_name: getAddressText(),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        description: reportTitle,
        photo_urls: finalPhotoUrls,
        upvotes_count: 1,
      };

      console.log('📤 Data to insert:', JSON.stringify(reportData, null, 2));

      const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select();

      if (error) {
        console.log('❌ Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Report saved:', data);
      setUploadProgress(100);

      if (onSubmit && typeof onSubmit === 'function') {
        onSubmit({
          title: reportTitle,
          location: getAddressText(),
          category: selectedType,
          severity: severity,
          description: description,
          photos: finalPhotoUrls,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      Alert.alert(
        "✅ Laporan Terkirim",
        finalPhotoUrls.length > 0
          ? "Terima kasih! Laporan dan foto Anda berhasil diunggah."
          : "Terima kasih! Laporan berhasil diunggah. (Foto gagal diupload)",
        [
          {
            text: "OK",
            onPress: () => {
              setPhotos([]);
              setDescription('');
              hasSubmitted.current = false;
              onBack();
            }
          }
        ]
      );

    } catch (error) {
      console.log('❌ Submit error:', error);
      Alert.alert('Error', `Gagal mengirim laporan: ${error.message || 'Silakan coba lagi'}`);
      hasSubmitted.current = false;
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Info', 'Maksimum 3 foto.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Izinkan akses kamera untuk mengambil foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  useEffect(() => {
    console.log("Current Photos:", photos);
  }, [photos]);

  const handlePickFromGallery = async () => {
    if (photos.length >= 3) {
      Alert.alert('Info', 'Maksimum 3 foto.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Izinkan akses galeri untuk memilih foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const renderProgressBar = () => {
    if (!isSubmitting || uploadProgress === 0) return null;

    let statusText = 'Mempersiapkan...';
    if (uploadProgress < 20) statusText = 'Mempersiapkan...';
    else if (uploadProgress < 80) statusText = `Mengunggah foto (${Math.round(uploadProgress)}%)...`;
    else if (uploadProgress < 100) statusText = 'Menyimpan data...';
    else statusText = 'Selesai! ✅';

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{statusText}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tambah Laporan Polusi</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section: Jenis Polusi */}
          <Text style={styles.label}>Jenis Polusi <Text style={styles.asterisk}>*</Text></Text>
          <View style={styles.grid}>
            {pollutionTypes.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.gridItem,
                    isSelected && styles.gridItemActive
                  ]}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <View style={styles.iconBg}>
                    {type.icon()}
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={1}>{type.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: Tingkat Keparahan */}
          <Text style={styles.label}>Tingkat Keparahan <Text style={styles.asterisk}>*</Text></Text>
          <View style={styles.severityRow}>
            {severities.map((item) => {
              const isSelected = severity === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.severityBtn,
                    isSelected && styles.severityBtnActive
                  ]}
                  onPress={() => setSeverity(item)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <Text style={[
                    styles.severityText,
                    isSelected && styles.severityTextActive
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section: Lokasi Kejadian (GPS) */}
          <Text style={styles.label}>Lokasi Kejadian <Text style={styles.asterisk}>*</Text></Text>
          <TouchableOpacity style={styles.locationBox} onPress={fetchLocation} activeOpacity={0.7} disabled={isSubmitting}>
            {locationLoading ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
                <Text style={styles.locationText}>Mencari lokasi...</Text>
                <Text style={styles.locationSubText}>Mohon tunggu sebentar</Text>
              </>
            ) : locationError ? (
              <>
                <MaterialIcons name="warning" size={26} color="#EF4444" style={styles.locationPin} />
                <Text style={[styles.locationText, { color: '#EF4444' }]}>{locationError}</Text>
                <Text style={styles.locationSubText}>Ketuk untuk coba lagi</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="location-on" size={26} color={colors.primary} style={styles.locationPin} />
                <Text style={styles.locationText}>{getAddressText()}</Text>
                <Text style={styles.locationSubText}>Ketuk untuk refresh lokasi</Text>
              </>
            )}
          </TouchableOpacity>
          {location && !locationLoading && (
            <View style={styles.gpsRow}>
              <MaterialIcons name="my-location" size={16} color={colors.primary} style={styles.gpsIcon} />
              <Text style={styles.gpsText}>{getAccuracyText()}</Text>
            </View>
          )}

          {/* Section: Foto (opsional) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>Foto (opsional)</Text>
            <Text style={styles.counterText}>{photos.length} / 3</Text>
          </View>

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <View style={styles.thumbnailRow}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.thumbnailContainer}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => removePhoto(index)}
                    activeOpacity={0.7}
                    disabled={isSubmitting}
                  >
                    <MaterialIcons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} activeOpacity={0.7} disabled={isSubmitting}>
              <MaterialIcons name="photo-camera" size={24} color={colors.textGray} />
              <Text style={styles.photoBtnText}>Ambil foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoBtn} onPress={handlePickFromGallery} activeOpacity={0.7} disabled={isSubmitting}>
              <MaterialIcons name="image" size={24} color={colors.textGray} />
              <Text style={styles.photoBtnText}>Dari galeri</Text>
            </TouchableOpacity>
          </View>

          {/* Section: Deskripsi tambahan */}
          <Text style={styles.label}>Deskripsi tambahan (opsional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ceritakan kondisi lebih detail..."
            placeholderTextColor={colors.textGray}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />

          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              isSubmitting && styles.submitBtnDisabled
            ]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitText}> Mengirim...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="send" size={18} color="#FFFFFF" style={styles.submitIcon} />
                <Text style={styles.submitText}>Kirim laporan</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textDark,
    marginTop: 16,
    marginBottom: 10,
  },
  asterisk: {
    color: '#EF4444',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
  },
  iconBg: {
    marginBottom: 8,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  severityBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  severityText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textGray,
  },
  severityTextActive: {
    color: '#FFFFFF',
  },
  locationBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  locationPin: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  locationSubText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  gpsIcon: {
    marginRight: 6,
  },
  gpsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  counterText: {
    fontSize: 13,
    color: colors.textGray,
    fontWeight: 'bold',
    marginTop: 16,
  },
  thumbnailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoBtn: {
    flex: 1,
    height: 80,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  photoBtnText: {
    fontSize: 12,
    color: colors.textGray,
    fontWeight: 'bold',
    marginTop: 6,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 100,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textGray,
    textAlign: 'center',
  },
  submitBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});