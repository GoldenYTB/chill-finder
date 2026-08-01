import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import ScannerScreen from './screens/ScannerScreen';
import LookupScreen from './screens/LookupScreen';
import WalletScreen from './screens/WalletScreen';
import SettingsScreen from './screens/SettingsScreen';
import { AppProvider, useApp } from './AppContext';
import DetailModal from './DetailModal';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Scanner: '◎',
  Lookup: '◈',
  Wallet: '◐',
  Settings: '⚙',
};

function AppInner() {
  const { colors, themeMode } = useApp();

  return (
    <NavigationContainer
      theme={{
        dark: themeMode === 'dark',
        colors: {
          primary: colors.coral,
          background: colors.bg,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.coral,
        },
      }}
    >
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 84,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.coral,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, color: focused ? colors.coral : colors.textFaint }}>
              {TAB_ICONS[route.name]}
            </Text>
          ),
        })}
      >
        <Tab.Screen name="Scanner" component={ScannerScreen} />
        <Tab.Screen name="Lookup" component={LookupScreen} />
        <Tab.Screen name="Wallet" component={WalletScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <DetailModal />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
