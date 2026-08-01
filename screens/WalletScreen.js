import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Switch,
} from 'react-native';
import { useApp } from '../AppContext';

export default function WalletScreen() {
  const { colors, trackedWallets, addTrackedWallet, removeTrackedWallet, toggleWalletAlerts, updateWalletSeenTokens } = useApp();
  const styles = makeStyles(colors);

  const [newLabel, setNewLabel] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedWallet = trackedWallets.find(w => w.id === selectedId);

  const handleAdd = () => {
    if (!newAddr.trim()) return;
    addTrackedWallet(newLabel.trim(), newAddr.trim(), newLogo.trim());
    setNewLabel(''); setNewAddr(''); setNewLogo('');
  };

  const loadDetail = async (wallet) => {
    setSelectedId(wallet.id);
    setDetail(null);
    setError(null);
    setLoading(true);
    try {
      const balRes = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [wallet.address] }),
      });
      const balData = await balRes.json();
      const solBalance = balData.result && balData.result.value ? balData.result.value / 1e9 : 0;

      const tokenRes = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
          params: [wallet.address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }],
        }),
      });
      const tokenData = await tokenRes.json();
      const accounts = (tokenData.result && tokenData.result.value) || [];
      const nonZero = accounts.filter(t => t.account.data.parsed.info.tokenAmount.uiAmount > 0);

      const sigRes = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [wallet.address, { limit: 15 }] }),
      });
      const sigData = await sigRes.json();
      const activity = (sigData.result || []).map(s => ({
        signature: s.signature,
        time: s.blockTime ? new Date(s.blockTime * 1000) : null,
        err: s.err !== null,
      }));

      setDetail({ sol: solBalance, tokens: nonZero, activity });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const timeAgo = (date) => {
    if (!date) return '?';
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  // Buy-alert polling: only while this screen/app is mounted, every 60s,
  // checks tracked wallets with alerts on for NEW token accounts appearing.
  // Real background push (app closed) would need a persistent backend --
  // not something this client-only app can do.
  useEffect(() => {
    const interval = setInterval(async () => {
      for (const w of trackedWallets) {
        if (!w.alertsOn) continue;
        try {
          const r = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
              params: [w.address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }],
            }),
          });
          const d = await r.json();
          const mints = ((d.result && d.result.value) || []).map(t => t.account.data.parsed.info.mint);
          updateWalletSeenTokens(w.id, mints);
        } catch (e) {}
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [trackedWallets]);

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Wallet Tracker</Text>
        <Text style={styles.sub}>Save multiple wallets, name them, get buy alerts while the app's open.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={newLabel} onChangeText={setNewLabel} placeholder="e.g. dev wallet #1" placeholderTextColor={colors.textFaint} />
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={newAddr} onChangeText={setNewAddr} placeholder="wallet address" placeholderTextColor={colors.textFaint} autoCapitalize="none" />
          <Text style={styles.label}>Logo URL (optional)</Text>
          <TextInput style={styles.input} value={newLogo} onChangeText={setNewLogo} placeholder="https://..." placeholderTextColor={colors.textFaint} autoCapitalize="none" />
          <TouchableOpacity style={styles.btn} onPress={handleAdd}>
            <Text style={styles.btnText}>Add wallet</Text>
          </TouchableOpacity>
        </View>

        {trackedWallets.length === 0 ? (
          <Text style={styles.empty}>No wallets tracked yet. Add one above.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tracked Wallets ({trackedWallets.length})</Text>
            {trackedWallets.map(w => (
              <View key={w.id} style={styles.walletRow}>
                <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => loadDetail(w)}>
                  <View style={styles.walletLogo} />
                  <View>
                    <Text style={[styles.walletLabel, selectedId === w.id && { color: colors.coral }]}>{w.label}</Text>
                    <Text style={styles.walletAddr}>{w.address.slice(0, 10)}...{w.address.slice(-6)}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ alignItems: 'center', marginRight: 8 }}>
                  <Switch value={w.alertsOn} onValueChange={() => toggleWalletAlerts(w.id)} trackColor={{ true: colors.coral, false: colors.surface2 }} />
                  <Text style={styles.alertLabel}>Alerts</Text>
                </View>
                <TouchableOpacity onPress={() => removeTrackedWallet(w.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {loading && <ActivityIndicator color={colors.coral} style={{ marginTop: 10 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {detail && selectedWallet && (
          <>
            <View style={styles.card}>
              <Text style={styles.statK}>{selectedWallet.label} -- SOL Balance</Text>
              <Text style={styles.bigStat}>{detail.sol.toFixed(4)} SOL</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Token Holdings ({detail.tokens.length})</Text>
              {detail.tokens.length === 0 ? (
                <Text style={styles.empty}>No SPL tokens found.</Text>
              ) : (
                detail.tokens.map((t, i) => (
                  <View key={i} style={styles.tokenRow}>
                    <Text style={styles.tokenMint}>{t.account.data.parsed.info.mint.slice(0, 8)}...</Text>
                    <Text style={styles.tokenAmount}>{t.account.data.parsed.info.tokenAmount.uiAmount}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Activity</Text>
              {detail.activity.length === 0 ? (
                <Text style={styles.empty}>No recent transactions found.</Text>
              ) : (
                detail.activity.map((a, i) => (
                  <View key={i} style={styles.activityRow}>
                    <Text style={styles.activitySig}>{a.signature.slice(0, 10)}...</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {a.err && <Text style={styles.failedTag}>failed</Text>}
                      <Text style={styles.activityTime}>{timeAgo(a.time)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: 20, paddingBottom: 40 },
    h1: { fontSize: 24, fontWeight: '700', color: colors.text },
    sub: { fontSize: 13, color: colors.textDim, marginTop: 4, marginBottom: 16 },
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
    label: { fontSize: 11, color: colors.textFaint, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, color: colors.text, fontSize: 14, marginBottom: 12 },
    btn: { backgroundColor: colors.coral, borderRadius: 16, padding: 14, alignItems: 'center' },
    btnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },
    errorText: { color: colors.red, fontSize: 13, marginBottom: 10 },
    empty: { textAlign: 'center', color: colors.textFaint, padding: 20, fontSize: 13 },
    cardTitle: { fontWeight: '600', color: colors.text, marginBottom: 8, fontSize: 14 },
    walletRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    walletLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface2 },
    walletLabel: { color: colors.text, fontWeight: '600', fontSize: 14 },
    walletAddr: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
    alertLabel: { color: colors.textFaint, fontSize: 8, marginTop: 2 },
    removeText: { color: colors.red, fontSize: 12, fontWeight: '600' },
    statK: { fontSize: 10.5, color: colors.textFaint, textTransform: 'uppercase' },
    bigStat: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 6 },
    tokenRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    tokenMint: { color: colors.textFaint, fontSize: 12 },
    tokenAmount: { color: colors.text, fontSize: 12, fontWeight: '600' },
    activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    activitySig: { color: colors.textDim, fontSize: 12, fontFamily: 'monospace' },
    activityTime: { color: colors.textFaint, fontSize: 11 },
    failedTag: { color: colors.red, fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(255,107,107,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  });
}
