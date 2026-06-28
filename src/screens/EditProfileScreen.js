// screens/EditProfileScreen.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import BottomTab from '../components/BottomTab';
import { supabase } from '../config/supabase';
import { File } from 'expo-file-system'; // 🔑 IMPORT SAMA

export default function EditProfileScreen({ profileData, onSubmit, onBack, onTabPress }) {
  const [fullName, setFullName] = useState(profileData.fullName || '');
  const [displayName, setDisplayName] = useState(profileData.displayName || '');
  const [birthday, setBirthday] = useState(profileData.birthday || '');
  const [email, setEmail] = useState(profileData.email || '');
  const [phone, setPhone] = useState(profileData.phone || '');
  const [photoUri, setPhotoUri] = useState(profileData.photoUri || null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadAvatar = async (uri) => {
    try {
      console.log('📤 [1] Starting avatar upload from URI:', uri);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      console.log('✅ [2] User authenticated:', user.id);

      // BACA FILE
      const file = new File(uri);

      if (!file.exists) {
        throw new Error('File not found: ' + uri);
      }
      console.log('📦 [3] File exists, size:', file.size, 'bytes');

      const fileBytes = file.bytesSync();
      console.log('📦 [4] File read successfully, bytes length:', fileBytes.length);

      // 🔑 PATH: avatars/image/nama_file
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/image/${fileName}`; // 🔑 SIMPAN DI FOLDER image/
      console.log('📁 [5] File path:', filePath);

      // UPLOAD KE SUPABASE STORAGE
      console.log('📤 [6] Uploading to Supabase Storage...');
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBytes, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.log('❌ [6] Upload error:', error);
        throw error;
      }

      console.log('✅ [6] Upload success:', data);

      // DAPATKAN PUBLIC URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('🔗 [7] Public URL:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.log('❌ [uploadAvatar] Error:', error);
      throw error;
    }
  };

  // 🔑 HANDLE PILIH GAMBAR DARI GALERI
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        "Izin Galeri Ditolak",
        "Mohon izinkan akses galeri untuk mengganti foto profil.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert("Error", "Gagal memilih gambar dari galeri.");
    }
  };

  // 🔑 HANDLE AMBIL FOTO DARI KAMERA
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        "Izin Kamera Ditolak",
        "Mohon izinkan akses kamera untuk mengambil foto profil.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert("Error", "Gagal membuka kamera.");
    }
  };

  // 🔑 TAMPILKAN OPSI PILIH GAMBAR
  const handlePhotoPress = () => {
    Alert.alert(
      "Ganti Foto Profil",
      "Pilih sumber foto",
      [
        { text: "Galeri", onPress: pickImageFromGallery },
        { text: "Kamera", onPress: takePhoto },
        { text: "Batal", style: "cancel" }
      ]
    );
  };

  // 🔑 HANDLE SAVE - Upload avatar jika ada perubahan
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Validasi Gagal", "Nama lengkap tidak boleh kosong.");
      return;
    }

    let finalPhotoUri = photoUri;

    // Jika ada foto baru yang dipilih (bukan URL dari database)
    if (photoUri && !photoUri.startsWith('http')) {
      setIsUploading(true);
      try {
        const uploadedUrl = await uploadAvatar(photoUri);
        if (uploadedUrl) {
          finalPhotoUri = uploadedUrl;
          console.log('✅ Avatar uploaded successfully:', uploadedUrl);
        } else {
          // Jika upload gagal, tetap pakai foto lokal
          finalPhotoUri = photoUri;
          Alert.alert('Peringatan', 'Foto gagal diupload, tapi perubahan lain tetap disimpan.');
        }
      } catch (error) {
        console.log('❌ Upload error:', error);
        Alert.alert('Error', `Gagal mengupload foto: ${error.message || 'Silakan coba lagi'}`);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Panggil onSubmit dengan data terbaru
    onSubmit({
      fullName,
      displayName,
      birthday,
      email,
      phone,
      photoUri: finalPhotoUri,
    });

    onBack();
  };

  const getInitials = (name) => {
    if (!name) return 'SS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profil</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, isUploading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveBtnText}>SELESAI</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Section Foto Profil */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePhotoPress}
              activeOpacity={0.8}
              disabled={isUploading}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
                </View>
              )}
              <View style={styles.cameraIconBg}>
                <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePhotoPress} disabled={isUploading}>
              <Text style={styles.changePhotoText}>Ganti foto profil</Text>
            </TouchableOpacity>

            {isUploading && (
              <Text style={styles.uploadingText}>Mengupload foto...</Text>
            )}
          </View>

          {/* Section: Info Pribadi */}
          <Text style={styles.sectionTitle}>INFO PRIBADI</Text>
          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Nama lengkap</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nama lengkap"
                  editable={!isUploading}
                />
                <MaterialIcons name="edit" size={16} color={colors.textGray} />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Nama tampilan</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Nama tampilan"
                  editable={!isUploading}
                />
                <MaterialIcons name="edit" size={16} color={colors.textGray} />
              </View>
            </View>

            <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
              <Text style={styles.inputLabel}>Tanggal lahir</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={birthday}
                  onChangeText={setBirthday}
                  placeholder="Belum diisi"
                  placeholderTextColor={colors.textGray}
                  editable={!isUploading}
                />
                <MaterialIcons name="today" size={16} color={colors.textGray} />
              </View>
            </View>
          </View>

          {/* Section: Kontak */}
          <Text style={styles.sectionTitle}>KONTAK</Text>
          <View style={styles.card}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="s.sentry@gmail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isUploading}
                />
                <MaterialIcons name="edit" size={16} color={colors.textGray} />
              </View>
            </View>

            <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
              <Text style={styles.inputLabel}>Nomor HP</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Belum diisi"
                  placeholderTextColor={colors.textGray}
                  keyboardType="phone-pad"
                  editable={!isUploading}
                />
              </View>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

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
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  saveBtn: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  cameraIconBg: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.textGray,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textGray,
    marginBottom: 10,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
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
  inputWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textGray,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
    padding: 0,
  },
});