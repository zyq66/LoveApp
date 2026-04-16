// src/components/DatePicker.tsx
import React, { useState } from 'react';
import {
  Platform, Modal, View, TouchableOpacity, Text, StyleSheet,
} from 'react-native';
import RNDateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing } from '../theme';

interface Props {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
  onCancel: () => void;
}

export function DatePicker({ visible, value, maximumDate, minimumDate, onChange, onCancel }: Props) {
  const [tempDate, setTempDate] = useState(value);

  if (!visible) return null;

  // Android: native dialog pops up automatically
  if (Platform.OS === 'android') {
    return (
      <RNDateTimePicker
        value={value}
        mode="date"
        display="default"
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        onChange={(event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date) onChange(date);
          else onCancel();
        }}
      />
    );
  }

  // iOS: spinner inside a bottom sheet modal
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.toolbarCancel}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onChange(tempDate)}>
              <Text style={styles.toolbarConfirm}>确定</Text>
            </TouchableOpacity>
          </View>
          <RNDateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) setTempDate(date); }}
            locale="zh-CN"
            style={{ backgroundColor: colors.bgLight }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.bgLight,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: colors.whiteBorder,
    paddingBottom: 30,
  },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.whiteBorder,
  },
  toolbarCancel: { fontSize: 16, color: colors.whiteSecondary },
  toolbarConfirm: { fontSize: 16, color: colors.green, fontWeight: '700' },
});
