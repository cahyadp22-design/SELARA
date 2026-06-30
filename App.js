import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/config/supabase';
import { LanguageProvider, useLanguage } from './src/i18n/i18n';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import RouteScreen from './src/screens/RouteScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import AddReportScreen from './src/screens/AddReportScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import DetailReportScreen from './src/screens/DetailReportScreen'; // 🔑 TAMBAHKAN INI


function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [history, setHistory] = useState(['home']);
  const [session, setSession] = useState(null);
  const [routeParams, setRouteParams] = useState({});


  // State data profil global
  const [profileData, setProfileData] = useState({
    fullName: 'Sentry Sky',
    displayName: 'Sentry',
    birthday: '',
    email: 's.sentry@gmail.com',
    phone: '',
    photoUri: null,
    badZoneAlert: true,
    morningSummary: true,
    widgetEnabled: false,
    daysMonitored: 0,
  });

  const fetchProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfileData({
          fullName: data.full_name || 'Sentry Sky',
          displayName: data.display_name || 'Sentry',
          birthday: data.birthday || '',
          email: userEmail || data.email || 's.sentry@gmail.com',
          phone: data.phone || '',
          photoUri: data.avatar_url || null,
          badZoneAlert: data.bad_zone_alert ?? true,
          morningSummary: data.morning_summary ?? true,
          widgetEnabled: data.widget_enabled ?? false,
          daysMonitored: data.days_monitored ?? 0,
        });
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
        id,
        category,
        severity,
        location_name,
        description,
        upvotes_count,
        created_at,
        user_id,
        profiles (
          display_name,
          avatar_url
        )
      `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const mappedReports = data.map((item) => {
          const displayName = item.profiles?.display_name || 'User';
          const initials = displayName.substring(0, 2).toUpperCase();
          // 🔑 Ambil avatar_url dari profiles
          const avatarUrl = item.profiles?.avatar_url || null;

          const date = new Date(item.created_at);
          const timeAgo = formatTimeAgo(date);

          return {
            id: item.id,
            initials: initials,
            title: item.description || `${item.category} di ${item.location_name}`,
            location: item.location_name,
            time: timeAgo,
            category: item.category,
            severity: item.severity,
            upvotes: item.upvotes_count,
            avatar_url: avatarUrl, // 🔑 Tambahkan ini
            profiles: item.profiles, // 🔑 Simpan juga profiles
          };
        });
        setReportsList(mappedReports);
      }
    } catch (error) {
      console.log('Error fetching reports:', error);
    }
  };

  const handleRefreshReports = async () => {
    await fetchReports();
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);

    if (interval >= 1) return `${interval}y ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    return 'just now';
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session.user.email);
        fetchReports();
        setCurrentScreen('home');
      } else {
        setCurrentScreen('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session.user.email);
        fetchReports();
        setCurrentScreen('home');
      } else {
        setCurrentScreen('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Data laporan awal dari Figma
  const [reportsList, setReportsList] = useState([
    {
      id: '1',
      initials: 'AR',
      title: 'Asap pabrik tebal',
      location: 'Kws. EJIP',
      time: '23 mnt lalu',
      category: 'Asap pabrik',
      severity: 'Parah',
      upvotes: 12
    },
    {
      id: '2',
      initials: 'DN',
      title: 'Pembakaran sampah',
      location: 'Tangerang',
      time: '23 mnt lalu',
      category: 'Pembakaran',
      severity: 'Sedang',
      upvotes: 10
    },
    {
      id: '3',
      initials: 'CH',
      title: 'Kebakaran perusahaan',
      location: 'Kws. MM2100',
      time: '2 jam lalu',
      category: 'Pembakaran',
      severity: 'Sedang',
      upvotes: 9
    },
    {
      id: '4',
      initials: 'YB',
      title: 'Asap knalpot truk',
      location: 'Tol Cikampek',
      time: '3 jam lalu',
      category: 'Knalpot',
      severity: 'Ringan',
      upvotes: 7
    }
  ]);

  const navigateTo = (screen, params = {}) => {
    setHistory((prev) => [...prev, currentScreen]);
    setCurrentScreen(screen);
    setRouteParams(params);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((prevStack) => prevStack.slice(0, -1));
      setCurrentScreen(prev);
      setRouteParams({});
    } else {
      setCurrentScreen('home');
      setRouteParams({});
    }
  };

  const handleLoginSuccess = () => {
    setHistory(['home']);
    setCurrentScreen('home');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setHistory([]);
    setCurrentScreen('login');
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedData.fullName,
          display_name: updatedData.displayName,
          birthday: updatedData.birthday || null,
          phone: updatedData.phone || null,
          avatar_url: updatedData.photoUri,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfileData((prev) => ({
        ...prev,
        ...updatedData,
      }));
    } catch (error) {
      console.log('Error updating profile in Supabase:', error);
      Alert.alert('Error', 'Gagal memperbarui profil di server.');
    }
  };

  const handleTabPress = (tabId) => {
    if (tabId === 'tren') {
      fetchReports();
    }
    if (tabId === 'tren' && currentScreen === 'tambah-laporan') {
      navigateTo('tren');
    } else if (tabId === 'tren') {
      navigateTo('tren');
    } else if (tabId === 'peta') {
      navigateTo('peta');
    } else if (tabId === 'rute') {
      navigateTo('rute');
    } else if (tabId === 'profil') {
      navigateTo('profil');
    } else {
      navigateTo(tabId);
    }
  };

  // Fungsi menambah upvote interaktif
  const handleUpvote = async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Info', 'Anda harus masuk untuk memberikan upvote.');
        return;
      }

      // Check if already upvoted
      const { data: existingUpvote, error: checkError } = await supabase
        .from('upvotes')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_id', id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUpvote) {
        Alert.alert('Info', 'Anda sudah memberikan upvote untuk laporan ini.');
        return;
      }

      // Insert upvote
      const { error: insertError } = await supabase
        .from('upvotes')
        .insert({ user_id: user.id, report_id: id });

      if (insertError) throw insertError;

      // Fetch current count to increment
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('upvotes_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newCount = (report.upvotes_count || 0) + 1;

      // Update count
      const { error: updateError } = await supabase
        .from('reports')
        .update({ upvotes_count: newCount })
        .eq('id', id);

      if (updateError) throw updateError;

      // Refresh reports locally
      fetchReports();
    } catch (error) {
      console.log('Error upvoting report:', error);
    }
  };

  // Fungsi menambahkan laporan baru dari Form
  const handleAddReport = async (newReportData) => {
    try {

      fetchReports();
    } catch (error) {
      console.log('Error adding report:', error);
      Alert.alert('Error', 'Gagal mengirim laporan.');
    }
  };



  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Screens yang sudah ada */}
      {currentScreen === 'login' && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      {currentScreen === 'home' && (
        <HomeScreen
          profileData={profileData}
          onLogout={handleLogout}
          onTabPress={handleTabPress}
        />
      )}
      {currentScreen === 'peta' && (
        <MapScreen onTabPress={handleTabPress} onBack={handleBack} />
      )}
      {currentScreen === 'rute' && (
        <RouteScreen onTabPress={handleTabPress} onBack={handleBack} />
      )}
      {currentScreen === 'tren' && (
        <CommunityScreen
          reports={reportsList}
          onUpvote={handleUpvote}
          onAddReportPress={() => navigateTo('tambah-laporan')}
          onTabPress={handleTabPress}
          navigation={{ navigate: navigateTo }}
          onRefresh={handleRefreshReports}
        />
      )}
      {currentScreen === 'tambah-laporan' && (
        <AddReportScreen onSubmit={handleAddReport} onBack={handleBack} />
      )}

      {currentScreen === 'detail-laporan' && (
        <DetailReportScreen
          route={{ params: routeParams }}
          onUpvote={handleUpvote}
          onAddComment={() => { }}
          onBack={handleBack}
          navigation={{
            navigate: navigateTo,
            goBack: handleBack
          }}
        />
      )}

      {currentScreen === 'profil' && (
        <ProfileScreen
          profileData={profileData}
          onEditPress={() => navigateTo('edit-profil')}
          onTabPress={handleTabPress}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'edit-profil' && (
        <EditProfileScreen
          profileData={profileData}
          onSubmit={handleUpdateProfile}
          onBack={handleBack}
          onTabPress={handleTabPress}
        />
      )}
    </View>
  );
}

// 🔑 WRAP DENGAN LANGUAGE PROVIDER
export default function App() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </LanguageProvider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6F8',
  },
});

