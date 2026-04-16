// src/components/BottomTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

const TABS = [
  { key: 'Home', label: '首页', icon: '🏠' },
  { key: 'Album', label: '相册', icon: '📷' },
  { key: 'Letter', label: '情书', icon: '💌', fab: true },
  { key: 'Moments', label: '时光', icon: '✨' },
  { key: 'More', label: '更多', icon: '⋯' },
];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        if (tab.fab) {
          return (
            <TouchableOpacity key={tab.key} style={styles.fabWrap} onPress={() => navigation.navigate(tab.key)}>
              <View style={styles.fab}>
                <Text style={styles.fabIcon}>{tab.icon}</Text>
              </View>
              <Text style={[styles.fabLabel, { color: colors.green }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => navigation.navigate(tab.key)}>
            <Text style={[styles.icon, { opacity: focused ? 1 : 0.45 }]}>{tab.icon}</Text>
            <Text style={[styles.label, { color: focused ? colors.green : colors.whiteSecondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,20,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  icon: { fontSize: 20 },
  label: { fontSize: 10 },
  fabWrap: { flex: 1, alignItems: 'center', marginTop: -18 },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  fabIcon: { fontSize: 22 },
  fabLabel: { fontSize: 10, marginTop: 4 },
});
