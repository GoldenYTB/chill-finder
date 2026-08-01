import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Linking, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp, PLATFORMS } from '../AppContext';

function fmt(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Number(n || 0).toFixed(0);
}

function ageStr(createdAtMs) {
  if (!createdAtMs) return '?';
  const mins = (Date.now() - createdAtMs) / 60000;
  if (mins < 60) return `${Math.floor(mins)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

function ViralWave({ visible, coral }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      scale.setValue(0);
      opacity.setValue(0.9);
      Animated.parallel([
        Animated.timing(scale, { toValue: 12, duration: 1400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: '45%', left: '50%', width: 40, height: 40,
          marginLeft: -20, marginTop: -20, borderRadius: 20, borderWidth: 2,
          borderColor: coral, zIndex: 10 },
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

export default function ScannerScreen() {
  const { preferredPlatform, openDetail, colors } = useApp();
  const styles = makeStyles(colors);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minLiq, setMinLiq] = useState('5000');
  const [minVol, setMinVol] = useState('10000');
  const [minChg, setMinChg] = useState('5');
  const [viralChg, setViralChg] = useState('80');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showWave, setShowWave] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const boostRes = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
      const boosts = await boostRes.json();
      const addrs = [...new Set(
        boosts.filter(b => b.chainId === 'solana').map(b => b.tokenAddress)
      )].slice(0, 25);

      const liqFloor = parseFloat(minLiq) || 0;
      const volFloor = parseFloat(minVol) || 0;
      const chgFloor = parseFloat(minChg) || 0;
      const viralFloor = parseFloat(viralChg) || 80;

      let rows = [];
      for (const addr of addrs) {
        try {
          const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
          const d = await r.json();
          const pairs = (d.pairs || []).filter(p => p.chainId === 'solana');
          for (const p of pairs) {
            const liq = (p.liquidity && p.liquidity.usd) || 0;
            const vol = (p.volume && p.volume.h24) || 0;
            const chg = (p.priceChange && p.priceChange.h6) || 0;
            if (liq >= liqFloor && vol >= volFloor && chg >= chgFloor) {
              const txns24 = (p.txns && p.txns.h24) || {};
              rows.push({
                symbol: p.baseToken.symbol, name: p.baseToken.name,
                mint: p.baseToken.address, liq, vol, chg,
                mcap: p.fdv || p.marketCap || 0,
                txnsCount: (txns24.buys || 0) + (txns24.sells || 0),
                age: ageStr(p.pairCreatedAt),
                url: p.url,
                viral: chg >= viralFloor,
                fullPair: p,
              });
            }
          }
        } catch (e) {}
      }
      rows.sort((a, b) => b.chg - a.chg);
      setResults(rows);

      const viralOnes = rows.filter(r => r.viral);
      if (viralOnes.length > 0) {
        setShowWave(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => setShowWave(false), 1500);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ViralWave visible={showWave} coral={colors.coral} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <View style={styles.headRow}>
          <View>
            <Text style={styles.h1}>Scanner</Text>
            <Text style={styles.sub}>Live Solana pairs. Viral ones get a wave.</Text>
          </View>
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setFiltersOpen(v => !v)}>
            <Text style={styles.filterIcon}>⚗</Text>
          </TouchableOpacity>
        </View>

        {filtersOpen && (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Min Liq $</Text>
                <TextInput style={styles.input} value={minLiq} onChangeText={setMinLiq} keyboardType="numeric" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Min Vol $</Text>
                <TextInput style={styles.input} value={minVol} onChangeText={setMinVol} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>Min Chg %</Text>
                <TextInput style={styles.input} value={minChg} onChangeText={setMinChg} keyboardType="numeric" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Viral Trigger %</Text>
                <TextInput style={styles.input} value={viralChg} onChangeText={setViralChg} keyboardType="numeric" />
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.scanBtn} onPress={runScan} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnText}>Scan now</Text>}
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {results.length === 0 && !loading && !error && (
          <Text style={styles.empty}>Hit Scan now to pull live pairs.</Text>
        )}

        {results.length > 0 && (
          <View style={styles.headerRow}>
            <Text style={[styles.colHeader, { flex: 1.6 }]}>Token</Text>
            <Text style={styles.colHeader}>MC</Text>
            <Text style={styles.colHeader}>24h</Text>
            <Text style={styles.colHeader}>Vol</Text>
            <Text style={styles.colHeader}>Txns</Text>
            <Text style={styles.colHeader}>Age</Text>
          </View>
        )}

        {results.map((r, i) => (
          <TouchableOpacity key={i} style={[styles.row2, r.viral && styles.row2Viral]} onPress={() => openDetail(r.fullPair)}>
            <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={styles.coinIcon}><Text style={styles.coinIconText}>{r.symbol.slice(0, 2)}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.coinSym}>{r.symbol}</Text>
                  {r.viral && <View style={styles.viralDot} />}
                </View>
                <Text style={styles.coinName} numberOfLines={1}>{r.name}</Text>
              </View>
            </View>
            <Text style={styles.cell}>{fmt(r.mcap)}</Text>
            <Text style={[styles.cell, { color: r.chg >= 0 ? colors.mint : colors.red }]}>{r.chg >= 0 ? '+' : ''}{r.chg.toFixed(0)}%</Text>
            <Text style={styles.cell}>{fmt(r.vol)}</Text>
            <Text style={styles.cell}>{r.txnsCount}</Text>
            <Text style={styles.cell}>{r.age}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 16, paddingBottom: 40 },
    headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    h1: { fontSize: 22, fontWeight: '700', color: colors.text },
    sub: { fontSize: 12, color: colors.textDim, marginTop: 3 },
    filterIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    filterIcon: { fontSize: 17, color: colors.coral },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    field: { flex: 1 },
    label: { fontSize: 10.5, color: colors.textFaint, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase' },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, color: colors.text, fontSize: 13 },
    scanBtn: { backgroundColor: colors.coral, borderRadius: 14, padding: 12, alignItems: 'center', marginBottom: 12 },
    btnText: { color: colors.bg, fontWeight: '700', fontSize: 13.5 },
    errorText: { color: colors.red, fontSize: 13, marginBottom: 10 },
    empty: { textAlign: 'center', color: colors.textFaint, padding: 40, fontSize: 13.5 },
    headerRow: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 },
    colHeader: { flex: 1, fontSize: 9.5, color: colors.textFaint, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' },
    row2: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
    row2Viral: { backgroundColor: 'rgba(255,138,101,0.06)' },
    coinIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
    coinIconText: { color: colors.bg, fontWeight: '700', fontSize: 10 },
    coinSym: { fontWeight: '700', fontSize: 12, color: colors.text },
    coinName: { color: colors.textFaint, fontSize: 9.5, maxWidth: 100 },
    viralDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.coral },
    cell: { flex: 1, fontSize: 10.5, color: colors.text, textAlign: 'right', fontFamily: 'monospace' },
  });
}
