import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, Linking, TextInput, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useApp, PLATFORMS } from '../AppContext';

function fmt(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Number(n).toFixed(0);
}
function shortAddr(a) { return a.slice(0, 6) + '...' + a.slice(-4); }

export default function DetailModal() {
  const { detailPair, closeDetail, preferredPlatform, tgToken, tgChat, colors } = useApp();
  const styles = makeStyles(colors);
  const [holders, setHolders] = useState(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [bundleResult, setBundleResult] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [note, setNote] = useState('');
  const [tgStatus, setTgStatus] = useState(null);
  const [sending, setSending] = useState(false);

  if (!detailPair) return null;
  const p = detailPair;
  const mint = p.baseToken.address;
  const image = (p.info && p.info.imageUrl) || null;
  const socials = (p.info && p.info.socials) || [];
  const platformOrder = [preferredPlatform, ...Object.keys(PLATFORMS).filter(k => k !== preferredPlatform)];

  const loadHolders = async () => {
    setHoldersLoading(true);
    try {
      const r = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenLargestAccounts', params: [mint] }),
      });
      const d = await r.json();
      const accounts = (d.result && d.result.value) || [];
      const total = accounts.reduce((s, a) => s + parseFloat(a.uiAmountString || 0), 0) || 1;
      setHolders(accounts.slice(0, 10).map(a => ({
        addr: a.address, pct: (parseFloat(a.uiAmountString || 0) / total) * 100,
      })));
    } catch (e) {
      setHolders([]);
    }
    setHoldersLoading(false);
  };

  const runBundleCheck = async () => {
    setBundleLoading(true);
    setBundleResult(null);
    try {
      const sigRes = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [mint, { limit: 1000 }] }),
      });
      const sigData = await sigRes.json();
      const sigs = sigData.result || [];
      if (sigs.length === 0) { setBundleResult({ error: 'No transaction history found.' }); setBundleLoading(false); return; }
      const earliest = [...sigs].sort((a, b) => (a.blockTime || 0) - (b.blockTime || 0)).slice(0, 15);

      const slotMap = {};
      for (const s of earliest) {
        try {
          const txRes = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [s.signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }] }),
          });
          const txData = await txRes.json();
          const tx = txData.result;
          if (!tx) continue;
          const signer = (tx.transaction.message.accountKeys || [])[0];
          if (!signer) continue;
          if (!slotMap[tx.slot]) slotMap[tx.slot] = new Set();
          slotMap[tx.slot].add(signer);
        } catch (e) {}
      }
      const maxInSlot = Math.max(0, ...Object.values(slotMap).map(s => s.size));
      setBundleResult({ maxInSlot, likelyBundled: maxInSlot > 2 });
    } catch (e) {
      setBundleResult({ error: e.message });
    }
    setBundleLoading(false);
  };

  const sendToTelegram = async () => {
    if (!tgToken || !tgChat) {
      setTgStatus({ ok: false, msg: 'Set your Telegram bot token + chat ID in Settings first.' });
      return;
    }
    setSending(true);
    const axiomUrl = PLATFORMS.axiom.urlFn(mint);
    const padreUrl = PLATFORMS.padre.urlFn(mint);
    const pumpUrl = PLATFORMS.pumpfun.urlFn(mint);
    let msg = `🎯 SIGNAL CALL\n$${p.baseToken.symbol}\n` +
      `Price: $${p.priceUsd} | Liq: ${fmt((p.liquidity && p.liquidity.usd) || 0)} | Vol 24h: ${fmt((p.volume && p.volume.h24) || 0)} | 24h: ${((p.priceChange && p.priceChange.h24) || 0).toFixed(1)}%\n` +
      `CA: ${mint}\n\n` +
      `Trade: [Pump.fun](${pumpUrl}) | [Axiom](${axiomUrl}) | [Padre](${padreUrl})`;
    if (note.trim()) msg += `\n\n${note.trim()}`;

    try {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text: msg, parse_mode: 'Markdown' }),
      });
      const d = await r.json();
      setTgStatus({ ok: d.ok, msg: d.ok ? 'Sent!' : (d.description || 'Failed to send.') });
    } catch (e) {
      setTgStatus({ ok: false, msg: e.message });
    }
    setSending(false);
  };

  const handleClose = () => {
    setHolders(null); setBundleResult(null); setNote(''); setTgStatus(null);
    closeDetail();
  };

  return (
    <Modal visible={!!detailPair} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <TouchableOpacity onPress={handleClose} style={styles.backRow}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><Text style={styles.heroIconText}>{p.baseToken.symbol.slice(0, 2)}</Text></View>
            <View>
              <Text style={styles.heroSym}>{p.baseToken.symbol}</Text>
              <Text style={styles.heroName}>{p.baseToken.name}</Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCard}><Text style={styles.k}>Price</Text><Text style={styles.v}>${p.priceUsd}</Text></View>
            <View style={styles.statCard}><Text style={styles.k}>Liquidity</Text><Text style={styles.v}>{fmt((p.liquidity && p.liquidity.usd) || 0)}</Text></View>
            <View style={styles.statCard}><Text style={styles.k}>Vol 24h</Text><Text style={styles.v}>{fmt((p.volume && p.volume.h24) || 0)}</Text></View>
            <View style={styles.statCard}>
              <Text style={styles.k}>24h Chg</Text>
              <Text style={[styles.v, { color: ((p.priceChange && p.priceChange.h24) || 0) >= 0 ? colors.mint : colors.red }]}>
                {((p.priceChange && p.priceChange.h24) || 0).toFixed(1)}%
              </Text>
            </View>
          </View>

          {socials.length > 0 && (
            <View style={styles.socialRow}>
              {socials.map((s, i) => (
                <TouchableOpacity key={i} style={styles.socialChip} onPress={() => Linking.openURL(s.url)}>
                  <Text style={styles.socialChipText}>{s.type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.chartBox}>
            <WebView
              source={{ uri: `https://dexscreener.com/solana/${p.pairAddress}?embed=1&theme=dark&trades=0&info=0` }}
              style={{ flex: 1, backgroundColor: colors.surface }}
            />
          </View>

          <View style={styles.row}>
            {platformOrder.map((key, i) => (
              <TouchableOpacity key={key} style={i === 0 ? styles.primaryBtn : styles.ghostBtn} onPress={() => Linking.openURL(PLATFORMS[key].urlFn(mint))}>
                <Text style={i === 0 ? styles.primaryBtnText : styles.ghostBtnText}>{PLATFORMS[key].label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Holders</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={loadHolders} disabled={holdersLoading}>
                {holdersLoading ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.smallBtnText}>Load</Text>}
              </TouchableOpacity>
            </View>
            {holders === null ? (
              <Text style={styles.note}>Not loaded yet.</Text>
            ) : holders.length === 0 ? (
              <Text style={styles.note}>No holder data found.</Text>
            ) : (
              holders.map((h, i) => (
                <View key={i} style={styles.holderRow}>
                  <Text style={styles.holderAddr}>{shortAddr(h.addr)}</Text>
                  <Text style={h.pct > 20 ? styles.holderRisk : styles.holderPct}>{h.pct.toFixed(1)}%</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Bundle Risk Check</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={runBundleCheck} disabled={bundleLoading}>
                {bundleLoading ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={styles.smallBtnText}>Check</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.note}>Checks if multiple wallets bought in the same block at launch. A red flag to investigate, not a guarantee.</Text>
            {bundleResult && (
              bundleResult.error ? (
                <Text style={[styles.status, styles.statusErr]}>{bundleResult.error}</Text>
              ) : bundleResult.likelyBundled ? (
                <Text style={[styles.status, styles.statusErr]}>Likely bundled -- {bundleResult.maxInSlot} different wallets bought in the same block at launch.</Text>
              ) : (
                <Text style={[styles.status, styles.statusOk]}>No strong bundling signal -- at most {bundleResult.maxInSlot} wallet(s) shared a block early on.</Text>
              )
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Send to Telegram</Text>
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={2}
              placeholder="Why you think it rises (optional)..."
              placeholderTextColor={colors.textFaint}
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity style={styles.btn} onPress={sendToTelegram} disabled={sending}>
              {sending ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnText}>Send</Text>}
            </TouchableOpacity>
            {tgStatus && <Text style={[styles.status, tgStatus.ok ? styles.statusOk : styles.statusErr]}>{tgStatus.msg}</Text>}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backRow: { padding: 20, paddingBottom: 6 },
  backText: { color: colors.coral, fontWeight: '600', fontSize: 14 },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 50 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  heroIconText: { color: colors.bg, fontWeight: '700', fontSize: 18 },
  heroSym: { color: colors.text, fontWeight: '700', fontSize: 20 },
  heroName: { color: colors.textFaint, fontSize: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginVertical: 12 },
  statCard: { flexBasis: '47%', backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  k: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase' },
  v: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 4, fontFamily: 'monospace' },
  socialRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  socialChip: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 13 },
  socialChipText: { color: colors.textDim, fontSize: 12 },
  chartBox: { height: 280, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginVertical: 10 },
  row: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  primaryBtn: { flex: 1, backgroundColor: colors.coral, borderRadius: 16, padding: 13, alignItems: 'center' },
  primaryBtnText: { color: colors.bg, fontWeight: '700', fontSize: 13 },
  ghostBtn: { flex: 1, backgroundColor: colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, alignItems: 'center' },
  ghostBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontWeight: '600', color: colors.text, fontSize: 14.5 },
  smallBtn: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  smallBtnText: { color: colors.text, fontSize: 11.5, fontWeight: '600' },
  note: { color: colors.textFaint, fontSize: 11.5, lineHeight: 16 },
  holderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  holderAddr: { color: colors.textDim, fontFamily: 'monospace', fontSize: 12 },
  holderPct: { color: colors.text, fontSize: 12 },
  holderRisk: { color: colors.red, fontWeight: '700', fontSize: 12 },
  textarea: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text, fontSize: 13, minHeight: 60, textAlignVertical: 'top', marginBottom: 10 },
  btn: { backgroundColor: colors.coral, borderRadius: 14, padding: 13, alignItems: 'center' },
  btnText: { color: colors.bg, fontWeight: '700', fontSize: 13.5 },
  status: { fontSize: 12.5, marginTop: 10, padding: 10, borderRadius: 10 },
  statusOk: { color: colors.mint, backgroundColor: 'rgba(126,232,193,0.1)' },
  statusErr: { color: colors.red, backgroundColor: 'rgba(255,107,107,0.1)' },
  });
}
