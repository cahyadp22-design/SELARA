// screens/LoginScreen.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import { supabase } from '../config/supabase';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  // State untuk Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // 🔑 STATE UNTUK RESET PASSWORD IN-APP
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 🔑 VALIDASI PASSWORD
  const validatePassword = (pass) => {
    if (pass.length < 8) {
      return { valid: false, message: 'Kata sandi minimal 8 karakter' };
    }
    return { valid: true, message: '' };
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password tidak boleh kosong.');
      return;
    }

    if (isRegister) {
      const validation = validatePassword(password);
      if (!validation.valid) {
        Alert.alert('Validasi Gagal', validation.message);
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Validasi Gagal', 'Konfirmasi kata sandi tidak cocok.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
            display_name: fullName.split(' ')[0] || email.split('@')[0],
          }
        }
      });
      if (error) {
        let msg = error.message;
        if (msg.includes('rate limit')) {
          msg = 'Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.';
        } else if (msg.includes('password')) {
          msg = 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.';
        }
        Alert.alert('Pendaftaran Gagal', msg);
      } else if (data?.session) {
        onLoginSuccess();
      } else {
        Alert.alert('Berhasil', 'Pendaftaran berhasil! Cek email kamu untuk konfirmasi, lalu masuk.');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        let msg = error.message;
        if (msg.includes('Email not confirmed')) {
          msg = 'Email belum dikonfirmasi. Cek inbox email kamu, atau daftar ulang dengan email baru.';
        } else if (msg.includes('Invalid login credentials')) {
          msg = 'Email atau kata sandi salah.';
        }
        Alert.alert('Login Gagal', msg);
      } else {
        onLoginSuccess();
      }
    }
  };

  const handleSendOTP = async () => {
    if (!resetEmail.trim()) {
      setEmailError('Email tidak boleh kosong');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setEmailError('Format email tidak valid');
      return;
    }

    setEmailError('');
    setIsVerifying(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: 'skysentry://reset-password',
        }
      );

      if (error) {
        console.log('Reset error:', error);

        if (error.message.includes('User not found')) {
          Alert.alert(
            'Email Tidak Ditemukan',
            'Email yang Anda masukkan tidak terdaftar. Silakan daftar akun terlebih dahulu.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setResetModalVisible(false);
                  setIsRegister(true);
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Gagal mengirim link reset. Silakan coba lagi.');
        }
        setIsVerifying(false);
        return;
      }

      setResetStep(2);
      Alert.alert(
        '✅ Link Reset Dikirim',
        `Kami telah mengirimkan link reset kata sandi ke ${resetEmail}. Silakan cek email Anda (termasuk folder spam) dan ikuti petunjuk untuk membuat kata sandi baru.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordError(validation.message);
      return;
    }
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: 'skysentry://reset-password',
        }
      );

      if (error) {
        console.log('Reset error:', error);

        if (error.message.includes('User not found')) {
          Alert.alert('Error', 'Email tidak ditemukan. Silakan coba lagi.');
        } else {
          Alert.alert('Error', 'Gagal mereset kata sandi. Silakan coba lagi.');
        }
        setIsResetting(false);
        return;
      }

      setResetSuccess(true);
      Alert.alert(
        '✅ Link Reset Dikirim',
        `Kami telah mengirimkan link reset kata sandi ke ${resetEmail}. Silakan cek email Anda dan ikuti petunjuk untuk membuat kata sandi baru.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setResetModalVisible(false);
              setResetEmail('');
              setNewPassword('');
              setConfirmNewPassword('');
              setResetStep(1);
              setResetSuccess(false);
              setIsResetting(false);
              setEmailError('');
              setPasswordError('');
            }
          }
        ]
      );

    } catch (error) {
      console.log('Reset password error:', error);
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsResetting(false);
    }
  };

  const closeResetModal = () => {
    if (!isVerifying && !isResetting) {
      setResetModalVisible(false);
      setResetEmail('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetStep(1);
      setResetSuccess(false);
      setEmailError('');
      setPasswordError('');
    }
  };

  // 🔑 TOGGLE PASSWORD VISIBILITY
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmNewPasswordVisibility = () => setShowConfirmNewPassword(!showConfirmNewPassword);

  // 🔑 LOGIN DENGAN GOOGLE
  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'skysentry://home',
        },
      });

      if (error) {
        console.log('Google login error:', error);
        Alert.alert('Login Gagal', 'Gagal login dengan Google: ' + error.message);
      } else {
        Alert.alert('Info', 'Fitur login dengan Google sedang dalam pengembangan.');
      }
    } catch (error) {
      console.log('Google login error:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat login dengan Google.');
    }
  };

  // 🔑 LOGIN DENGAN APPLE
  const handleAppleLogin = async () => {
    try {
      // 🔑 Coba login dengan Apple (jika support)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'skysentry://home',
        },
      });

      if (error) {
        console.log('Apple login error:', error);
        Alert.alert('Login Gagal', 'Gagal login dengan Apple: ' + error.message);
      } else {
        // 🔑 Tampilkan alert bahwa fitur dalam pengembangan
        Alert.alert('Info', 'Fitur login dengan Apple sedang dalam pengembangan.');
      }
    } catch (error) {
      console.log('Apple login error:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat login dengan Apple.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.navHeader}>Navigasi Login</Text>

          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/Logo_SELARA.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.locationBadgeContainer}>
            <View style={styles.locationBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.locationBadgeText}>Lokasi kamu · Deteksi otomatis</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            {isRegister && (
              <>
                <CustomInput
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <View style={styles.securityWarning}>
                  <MaterialIcons name="security" size={16} color="#D97706" />
                  <Text style={styles.securityWarningText}>
                    ⚠️ Jangan gunakan kata sandi yang sama dengan email Anda. Gunakan kombinasi huruf, angka, dan simbol.
                  </Text>
                </View>
              </>
            )}

            <CustomInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Kata Sandi"
                placeholderTextColor={colors.textGray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={togglePasswordVisibility} activeOpacity={0.7}>
                <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textGray} />
              </TouchableOpacity>
            </View>

            {isRegister && (
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Konfirmasi Kata Sandi"
                  placeholderTextColor={colors.textGray}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeIcon} onPress={toggleConfirmPasswordVisibility} activeOpacity={0.7}>
                  <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textGray} />
                </TouchableOpacity>
              </View>
            )}

            {isRegister && password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View style={[styles.passwordStrengthFill, { width: `${Math.min((password.length / 8) * 100, 100)}%`, backgroundColor: password.length >= 8 ? '#10B981' : password.length >= 4 ? '#F59E0B' : '#EF4444' }]} />
                </View>
                <Text style={styles.passwordStrengthText}>
                  {password.length >= 8 ? '✅ Kuat' : password.length >= 4 ? '⚠️ Sedang' : '❌ Lemah (minimal 8 karakter)'}
                </Text>
              </View>
            )}
          </View>

          <CustomButton title={isRegister ? "Daftar" : "Masuk"} onPress={handleLogin} type="primary" />

          {!isRegister && (
            <TouchableOpacity style={styles.forgotButton} onPress={() => { setResetEmail(email); setResetModalVisible(true); }} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Lupa kata sandi?</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dividerContainer}>
            <Text style={styles.dividerText}>atau lanjutkan dengan</Text>
          </View>

          {/* 🔥 SOCIAL BUTTONS - Google & Apple */}
          <View style={styles.socialRow}>
            <CustomButton title="Google" type="social" iconName="google" onPress={handleGoogleLogin} />
            <CustomButton title="Apple" type="social" iconName="apple" onPress={handleAppleLogin} />
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>{isRegister ? "Sudah punya akun? " : "Belum punya akun? "}</Text>
            <TouchableOpacity onPress={() => { setIsRegister(!isRegister); setPassword(''); setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); }}>
              <Text style={styles.footerLink}>{isRegister ? "Masuk sekarang" : "Daftar sekarang"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🔑 MODAL RESET PASSWORD */}
      <Modal
        visible={resetModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeResetModal}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeResetModal}>
          <View style={styles.modalContent}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{resetStep === 1 ? '🔑 Verifikasi Email' : '🔒 Reset Kata Sandi'}</Text>
                <TouchableOpacity onPress={closeResetModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={isVerifying || isResetting}>
                  <MaterialIcons name="close" size={24} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              {/* STEP 1: Verifikasi Email */}
              {resetStep === 1 && (
                <>
                  <Text style={styles.modalSubtitle}>
                    Masukkan email yang terdaftar untuk memverifikasi akun Anda.
                  </Text>

                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalLabel}>Email</Text>
                    <View style={[styles.modalInputContainer, emailError !== '' && styles.modalInputError]}>
                      <MaterialIcons name="email" size={20} color={colors.textGray} style={styles.modalInputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Masukkan email Anda"
                        placeholderTextColor={colors.textGray}
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isVerifying}
                      />
                    </View>
                    {emailError !== '' && <Text style={styles.modalErrorText}>{emailError}</Text>}
                  </View>

                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={closeResetModal} disabled={isVerifying}>
                      <Text style={styles.modalButtonCancelText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary, isVerifying && styles.modalButtonDisabled]} onPress={handleSendOTP} disabled={isVerifying} activeOpacity={0.7}>
                      {isVerifying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalButtonPrimaryText}>Kirim Verifikasi</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* STEP 2: Reset Password */}
              {resetStep === 2 && (
                <>
                  <Text style={styles.modalSubtitle}>
                    Masukkan kata sandi baru untuk akun Anda.
                  </Text>

                  {/* Input Password Baru */}
                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalLabel}>Kata Sandi Baru</Text>
                    <View style={[styles.modalInputContainer, passwordError !== '' && styles.modalInputError]}>
                      <MaterialIcons name="lock" size={20} color={colors.textGray} style={styles.modalInputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Masukkan kata sandi baru"
                        placeholderTextColor={colors.textGray}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        editable={!isResetting}
                      />
                      <TouchableOpacity onPress={toggleNewPasswordVisibility} activeOpacity={0.7} disabled={isResetting}>
                        <MaterialIcons name={showNewPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textGray} />
                      </TouchableOpacity>
                    </View>

                    {newPassword.length > 0 && (
                      <View style={styles.modalStrengthContainer}>
                        <View style={styles.modalStrengthBar}>
                          <View style={[styles.modalStrengthFill, { width: `${Math.min((newPassword.length / 8) * 100, 100)}%`, backgroundColor: newPassword.length >= 8 ? '#10B981' : newPassword.length >= 4 ? '#F59E0B' : '#EF4444' }]} />
                        </View>
                        <Text style={styles.modalStrengthText}>
                          {newPassword.length >= 8 ? '✅ Kuat' : newPassword.length >= 4 ? '⚠️ Sedang' : '❌ Lemah (minimal 8 karakter)'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Input Konfirmasi Password */}
                  <View style={styles.modalInputWrapper}>
                    <Text style={styles.modalLabel}>Konfirmasi Kata Sandi</Text>
                    <View style={[styles.modalInputContainer, passwordError !== '' && styles.modalInputError]}>
                      <MaterialIcons name="lock-outline" size={20} color={colors.textGray} style={styles.modalInputIcon} />
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Konfirmasi kata sandi baru"
                        placeholderTextColor={colors.textGray}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry={!showConfirmNewPassword}
                        autoCapitalize="none"
                        editable={!isResetting}
                      />
                      <TouchableOpacity onPress={toggleConfirmNewPasswordVisibility} activeOpacity={0.7} disabled={isResetting}>
                        <MaterialIcons name={showConfirmNewPassword ? 'visibility' : 'visibility-off'} size={20} color={colors.textGray} />
                      </TouchableOpacity>
                    </View>
                    {passwordError !== '' && <Text style={styles.modalErrorText}>{passwordError}</Text>}
                  </View>

                  {resetSuccess && (
                    <View style={styles.modalSuccessContainer}>
                      <MaterialIcons name="check-circle" size={20} color="#10B981" />
                      <Text style={styles.modalSuccessText}>Kata sandi berhasil direset!</Text>
                    </View>
                  )}

                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={closeResetModal} disabled={isResetting}>
                      <Text style={styles.modalButtonCancelText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary, (isResetting || resetSuccess) && styles.modalButtonDisabled]} onPress={handleResetPassword} disabled={isResetting || resetSuccess} activeOpacity={0.7}>
                      {isResetting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalButtonPrimaryText}>{resetSuccess ? 'Selesai ✅' : 'Reset Kata Sandi'}</Text>}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.modalBackStep} onPress={() => { setResetStep(1); setNewPassword(''); setConfirmNewPassword(''); setPasswordError(''); }} disabled={isResetting}>
                    <Text style={styles.modalBackStepText}>← Gunakan email lain</Text>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  navHeader: {
    alignSelf: 'flex-start',
    fontSize: 14,
    color: colors.textGray,
    marginBottom: 20,
  },
  logoContainer: {
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  locationBadgeContainer: {
    marginBottom: 28,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  locationBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  formContainer: {
    width: '100%',
    marginBottom: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
    height: '100%',
  },
  eyeIcon: {
    padding: 6,
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  securityWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
  passwordStrengthContainer: {
    marginBottom: 12,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 11,
    color: colors.textGray,
  },
  forgotButton: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 14,
    color: colors.blueText,
    fontWeight: '500',
  },
  dividerContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 24,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: colors.textDark,
  },
  footerLink: {
    fontSize: 14,
    color: colors.blueText,
    fontWeight: 'bold',
  },

  // 🔑 MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textGray,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputWrapper: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 6,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: '#F8FAFC',
  },
  modalInputError: {
    borderColor: '#EF4444',
  },
  modalInputIcon: {
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
    height: '100%',
  },
  modalErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  modalStrengthContainer: {
    marginTop: 6,
  },
  modalStrengthBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  modalStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  modalStrengthText: {
    fontSize: 11,
    color: colors.textGray,
  },
  modalSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  modalSuccessText: {
    fontSize: 14,
    color: '#065F46',
    flex: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalBackStep: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalBackStepText: {
    fontSize: 14,
    color: colors.blueText,
    fontWeight: '500',
  },
});