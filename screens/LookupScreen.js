import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { ActivityIndicator } from 'react-native';
import { useApp } from '../AppContext';

export default function LookupScreen() {
  const { colors, openDetail } = useApp();
  const styles = makeStyles(colors);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  // Dexscreener-style live search: fires as you type (debounced), matches
  // by name/symbol/address across all pairs, not just an exact mint match.
  const onChangeQuery = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(text.trim())}`);
        const d = await r.json();
        const pairs = (d.pairs || []).filter(p => p.chainId === 'solana').slice(0, 12);
        setSuggestions(pairs);
      } catch (e) {
        setSuggestions([]);
      }
      setSearching(false);
    }, 350);
  };

  const selectPair = (pair) => {
    openDetail(pair);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Lookup</Text>
        <Text style={styles.sub}>Search by name, symbol, or address -- just like Dexscreener.</Text>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tokens..."
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={onChangeQuery}
            autoCapitalize="none"
          />
          {searching && <ActivityIndicator color={colors.coral} size="small" />}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestBox}>
            {suggestions.map((p, i) => (
              <TouchableOpacity key={i} style={styles.suggestRow} onPress={() => selectPair(p)}>
                <View style={styles.suggestIcon}>
                  <Text style={styles.suggestIconText}>{p.baseToken.symbol.slice(0, 2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestSym}>{p.baseToken.symbol}</Text>
                  <Text style={styles.suggestName}>{p.baseToken.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.suggestPrice}>${p.priceUsd}</Text>
                  <Text style={[styles.suggestChg, { color: ((p.priceChange && p.priceChange.h24) || 0) >= 0 ? colors.mint : colors.red }]}>
                    {((p.priceChange && p.priceChange.h24) || 0).toFixed(1)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {query.length >= 2 && !searching && suggestions.length === 0 && (
          <Text style={styles.empty}>No matches.</Text>
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
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14 },
    searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 14 },
    suggestBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginTop: 8, overflow: 'hidden' },
    suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    suggestIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
    suggestIconText: { color: colors.bg, fontWeight: '700', fontSize: 12 },
    suggestSym: { color: colors.text, fontWeight: '600', fontSize: 13.5 },
    suggestName: { color: colors.textFaint, fontSize: 11 },
    suggestPrice: { color: colors.text, fontSize: 12, fontWeight: '600' },
    suggestChg: { fontSize: 11, marginTop: 2 },
    empty: { textAlign: 'center', color: colors.textFaint, padding: 30, fontSize: 13 },
  });
}
