import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Feather, Ionicons, FontAwesome5, Octicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function BottomTab({ activeTab, onTabPress }) {
  const tabs = [
    { id: 'home', label: 'Home', activeIcon: () => <Octicons name="home" size={24} color={colors.primary} />, inactiveIcon: () => <Octicons name="home" size={22} color={colors.textGray} /> },
    { id: 'peta', label: 'Peta', activeIcon: () => <Ionicons name="map" size={24} color={colors.primary} />, inactiveIcon: () => <Ionicons name="map-outline" size={22} color={colors.textGray} /> },
    { id: 'rute', label: 'Rute', activeIcon: () => <FontAwesome5 name="route" size={22} color={colors.primary} />, inactiveIcon: () => <FontAwesome5 name="route" size={20} color={colors.textGray} /> },
    { id: 'tren', label: 'Tren', activeIcon: () => <Feather name="trending-up" size={24} color={colors.primary} />, inactiveIcon: () => <Feather name="trending-up" size={22} color={colors.textGray} /> },
    { id: 'profil', label: 'Profil', activeIcon: () => <Feather name="user" size={24} color={colors.primary} />, inactiveIcon: () => <Feather name="user" size={22} color={colors.textGray} /> },
  ];

  return (
    <View style={styles.bottomTab}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={isActive ? styles.tabItemActive : styles.tabItem}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            {isActive ? (
              <>
                {tab.activeIcon()}
                <View style={styles.activeDot} />
              </>
            ) : (
              <>
                {tab.inactiveIcon()}
                <Text style={styles.tabLabel}>{tab.label}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingTop: 8,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textGray,
    marginTop: 4,
    fontWeight: '500',
  },
});
