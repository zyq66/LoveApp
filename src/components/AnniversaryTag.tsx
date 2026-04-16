// src/components/AnniversaryTag.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  name: string;
  date: number; // timestamp ms of the next occurrence
}

export function AnniversaryTag({ name, date }: Props) {
  const daysLeft = Math.ceil((date - Date.now()) / 86400000);
  const soon = daysLeft >= 0 && daysLeft <= 7;

  return (
    <View style={[styles.tag, soon ? styles.green : styles.gray]}>
      <Text style={[styles.text, { color: soon ? colors.green : colors.whiteSecondary }]}>
        {name}
        {'  '}
        {daysLeft > 0
          ? `${daysLeft} 天后`
          : daysLeft === 0
          ? '就是今天 🎉'
          : `${Math.abs(daysLeft)} 天前`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  green: { backgroundColor: colors.greenDim, borderColor: colors.greenBorder },
  gray: { backgroundColor: colors.whiteDim, borderColor: colors.whiteBorder },
  text: { fontSize: 12 },
});
