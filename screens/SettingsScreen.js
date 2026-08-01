import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Alert, Linking,
} from 'react-native';
import { useApp, PLATFORMS, LINKS } from '../AppContext';

export default function SettingsScreen() {
  const {
    colors, preferredPlatform, setPreferredPlatform,
    themeMode, setThemeMode,
    tgToken, setTgToken, tgChat, setTgChat,
  } = useApp();
  const styles = makeStyles(colors);

  const [viralAnim, setViralAnim] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [twitterKey, setTwitterKey] = useState('');
  const [twitterKeywords, setTwitterKeywords] = useState('');
  const [localTgToken, setLocalTgToken] = useState(tgToken);
  const [localTgChat, setLocalTgChat] = useState(tgChat);

  const saveTelegram = () => {
    setTgToken(localTgToken);
    setTgChat(localTgChat);
    Alert.alert('Saved', 'Telegram broadcast settings saved.');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Settings</Text>
        <Text style={styles.sub}>App preferences, Telegram broadcast, links.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme</Text>
          <View style={styles.platformRow}>
            <TouchableOpacity style={[styles.platformChip, themeMode === 'dark' && styles.platformChipActive]} onPress={() => setThemeMode('dark')}>
              <Text style={[styles.platformChipText, themeMode === 'dark' && styles.platformChipTextActive]}>Dark</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.platformChip, themeMode === 'light' && styles.platformChipActive]} onPress={() => setThemeMode('light')}>
              <Text style={[styles.platformChipText, themeMode === 'light' && styles.platformChipTextActive]}>Light</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferred Trading Platform</Text>
          <Text style={styles.note}>Shown as the highlighted button first on Scanner + Lookup.</Text>
          <View style={styles.platformRow}>
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <TouchableOpacity
                key={key}
                style={[styles.platformChip, preferredPlatform === key && styles.platformChipActive]}
                onPress={() => setPreferredPlatform(key)}
              >
                <Text style={[styles.platformChipText, preferredPlatform === key && styles.platformChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Viral animation</Text>
            <Switch value={viralAnim} onValueChange={setViralAnim} trackColor={{ true: colors.coral, false: colors.surface2 }} />
          </View>
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.toggleLabel}>Auto-refresh scanner</Text>
            <Switch value={autoRefresh} onValueChange={setAutoRefresh} trackColor={{ true: colors.coral, false: colors.surface2 }} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Twitter Tracker</Text>
          <Text style={styles.note}>
            X's API has no free reading tier -- this needs your own paid API key
            (X API or a third-party like Sorsa) to actually track tweets.
          </Text>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={twitterKey}
            onChangeText={setTwitterKey}
            secureTextEntry
            placeholder="paste your key"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.label}>Track keywords/handles</Text>
          <TextInput
            style={styles.input}
            value={twitterKeywords}
            onChangeText={setTwitterKeywords}
            placeholder="e.g. $HONK, @someaccount"
            placeholderTextColor={colors.textFaint}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Telegram Broadcast</Text>
          <Text style={styles.note}>
            Create a bot via @BotFather, add it to your group as admin, paste details below.
          </Text>
          <Text style={styles.label}>Bot Token</Text>
          <TextInput
            style={styles.input}
            value={localTgToken}
            onChangeText={setLocalTgToken}
            secureTextEntry
            placeholder="bot token"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.label}>Group/Channel Chat ID</Text>
          <TextInput
            style={styles.input}
            value={localTgChat}
            onChangeText={setLocalTgChat}
            placeholder="chat ID"
            placeholderTextColor={colors.textFaint}
          />
          <TouchableOpacity style={styles.ghostBtn} onPress={saveTelegram}>
            <Text style={styles.ghostBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About / Links</Text>
          <TouchableOpacity style={[styles.linkBtn, { marginBottom: 8 }]} onPress={() => Linking.openURL(LINKS.telegram)}>
            <Text style={styles.linkBtnText}>Telegram Group</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(LINKS.tiktok)}>
            <Text style={styles.linkBtnText}>TikTok</Text>
          </TouchableOpacity>
        </View>
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
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    toggleLabel: { color: colors.text, fontSize: 14 },
    cardTitle: { fontWeight: '600', color: colors.text, marginBottom: 4, fontSize: 15 },
    note: { color: colors.textFaint, fontSize: 11.5, marginBottom: 14, lineHeight: 16 },
    platformRow: { flexDirection: 'row', gap: 8 },
    platformChip: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    platformChipActive: { backgroundColor: 'rgba(255,138,101,0.15)', borderColor: colors.coral },
    platformChipText: { color: colors.textDim, fontSize: 12.5, fontWeight: '600' },
    platformChipTextActive: { color: colors.coral },
    label: { fontSize: 11, color: colors.textFaint, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, color: colors.text, fontSize: 14, marginBottom: 12 },
    ghostBtn: { backgroundColor: colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, alignItems: 'center' },
    ghostBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    linkBtn: { backgroundColor: colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 13, alignItems: 'center' },
    linkBtnText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  });
}
