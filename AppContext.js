import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from './theme';

const AppContext = createContext(null);

const STORAGE_KEY = 'chillfinder_settings_v2';

export const PLATFORMS = {
  pumpfun: { label: 'Pump.fun', urlFn: (mint) => `https://pump.fun/coin/${mint}` },
  axiom: { label: 'Axiom', urlFn: (mint) => `https://axiom.trade/meme/${mint}` },
  padre: { label: 'Padre', urlFn: (mint) => `https://trade.padre.gg/trade/solana/${mint}` },
};

export const LINKS = {
  telegram: 'https://t.me/chillfinder',
  tiktok: 'https://www.tiktok.com/@anonym.coin?_r=1&_t=ZN-98UqAarkZZm',
};

export function AppProvider({ children }) {
  const [preferredPlatform, setPreferredPlatform] = useState('pumpfun');
  const [themeMode, setThemeMode] = useState('dark');
  const [trackedWallets, setTrackedWallets] = useState([]); // [{id, label, address, logo, alertsOn, lastSeenTokens}]
  const [tgToken, setTgToken] = useState('');
  const [tgChat, setTgChat] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Detail modal state -- shared so any screen can open the same detail view
  const [detailPair, setDetailPair] = useState(null);
  const openDetail = (pair) => setDetailPair(pair);
  const closeDetail = () => setDetailPair(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.preferredPlatform) setPreferredPlatform(parsed.preferredPlatform);
          if (parsed.themeMode) setThemeMode(parsed.themeMode);
          if (parsed.trackedWallets) setTrackedWallets(parsed.trackedWallets);
          if (parsed.tgToken) setTgToken(parsed.tgToken);
          if (parsed.tgChat) setTgChat(parsed.tgChat);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ preferredPlatform, themeMode, trackedWallets, tgToken, tgChat })).catch(() => {});
  }, [preferredPlatform, themeMode, trackedWallets, tgToken, tgChat, loaded]);

  const addTrackedWallet = (label, address, logo) => {
    const id = String(Date.now());
    setTrackedWallets(prev => [...prev, {
      id, label: label || address.slice(0, 6), address, logo: logo || null,
      alertsOn: false, lastSeenTokens: [],
    }]);
    return id;
  };

  const removeTrackedWallet = (id) => {
    setTrackedWallets(prev => prev.filter(w => w.id !== id));
  };

  const toggleWalletAlerts = (id) => {
    setTrackedWallets(prev => prev.map(w => w.id === id ? { ...w, alertsOn: !w.alertsOn } : w));
  };

  const updateWalletSeenTokens = (id, mints) => {
    setTrackedWallets(prev => prev.map(w => w.id === id ? { ...w, lastSeenTokens: mints } : w));
  };

  return (
    <AppContext.Provider value={{
      preferredPlatform, setPreferredPlatform,
      themeMode, setThemeMode, colors: themes[themeMode],
      trackedWallets, addTrackedWallet, removeTrackedWallet, toggleWalletAlerts, updateWalletSeenTokens,
      tgToken, setTgToken, tgChat, setTgChat,
      detailPair, openDetail, closeDetail,
      loaded,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
