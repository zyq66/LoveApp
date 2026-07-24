import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { colors } from '../theme';

const TABS = [
  { key: 'Today', label: '今天', icon: '⌂' },
  { key: 'Rolls', label: '胶卷', icon: '▦' },
  { key: 'Us', label: '我们', icon: '♡' },
];

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { chooseSource, uploading, progress } = usePhotoPicker();

  return (
    <View style={styles.shell}>
      <View style={styles.bar}>
        {TABS.map((tab, index) => {
          const focused = state.routes[state.index]?.name === tab.key;
          const item = (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(tab.key)}
            >
              <Text style={[styles.icon, focused && styles.iconActive]}>{tab.icon}</Text>
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );

          if (index !== 0) return item;
          return (
            <React.Fragment key={tab.key}>
              {item}
              <TouchableOpacity style={styles.addWrap} onPress={chooseSource} disabled={uploading}>
                <View style={styles.addButton}>
                  {uploading
                    ? <ActivityIndicator color={colors.bg} />
                    : <Text style={styles.addIcon}>＋</Text>}
                </View>
                <Text style={styles.addLabel}>
                  {uploading ? `${progress.completed}/${progress.total}` : '此刻'}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: 'transparent' },
  bar: {
    minHeight: 78, flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 9, paddingBottom: 13,
    backgroundColor: 'rgba(17,13,24,0.98)', borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50, gap: 4 },
  icon: { color: 'rgba(255,255,255,0.35)', fontSize: 22, fontWeight: '500' },
  iconActive: { color: colors.rose },
  label: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600' },
  labelActive: { color: colors.roseSoft },
  addWrap: { flex: 1, alignItems: 'center', marginTop: -29 },
  addButton: {
    width: 58, height: 58, borderRadius: 22, backgroundColor: colors.rose,
    alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: colors.bg,
    shadowColor: colors.rose, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  addIcon: { color: colors.bg, fontSize: 31, lineHeight: 34, fontWeight: '400' },
  addLabel: { color: colors.roseSoft, fontSize: 10, fontWeight: '700', marginTop: 2 },
});
