import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { db } from '../config/cloudbase';
import { uploadImage } from '../services/storage';
import { Photo, watchPhotos } from '../services/album';
import { coupleRolls } from '../services/rolls';
import { ensurePhotoNotificationPermission, PHOTO_NOTIFICATIONS_KEY } from '../services/notifications';
import { startPhotoBackgroundSync, stopPhotoBackgroundSync } from '../services/backgroundPhotoSync';
import { DatePicker } from '../components/DatePicker';
import { colors, spacing } from '../theme';

function formatDate(ms?: number): string {
  if (!ms) return '还没有设置';
  return new Date(ms).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function UsScreen() {
  const { userId, coupleId, user, partner, couple, resetIdentity } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [nicknameVisible, setNicknameVisible] = useState(false);
  const [nickname, setNickname] = useState('');
  const [datePicker, setDatePicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PHOTO_NOTIFICATIONS_KEY).then(value => setNotifications(value !== 'false'));
  }, []);

  useEffect(() => {
    if (!coupleId) return;
    return watchPhotos(coupleId, setPhotos);
  }, [coupleId]);

  async function toggleNotifications(value: boolean) {
    if (value) {
      const granted = await ensurePhotoNotificationPermission();
      if (!granted) {
        Alert.alert('通知没有开启', '请在系统设置中允许 LoveLetter 发送通知。');
        return;
      }
    }
    setNotifications(value);
    await AsyncStorage.setItem(PHOTO_NOTIFICATIONS_KEY, value ? 'true' : 'false');
    if (value && userId && coupleId) {
      await startPhotoBackgroundSync({
        userId,
        coupleId,
        partnerName: partner?.nickname || 'TA',
      }).catch(() => false);
    } else if (!value) {
      await stopPhotoBackgroundSync();
    }
  }

  async function pickAvatar() {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled) return;
    setAvatarUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri, 'avatars');
      await db.collection('users').doc(userId).update({ avatarUrl: url });
    } catch (e: any) {
      Alert.alert('头像没有更新', e?.message || String(e));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveNickname() {
    if (!userId || !nickname.trim()) return;
    await db.collection('users').doc(userId).update({ nickname: nickname.trim() });
    setNicknameVisible(false);
  }

  async function saveStartDate(date: Date) {
    setDatePicker(false);
    if (!coupleId) return;
    await db.collection('couples').doc(coupleId).update({ startDate: date.getTime() });
  }

  function confirmReset() {
    Alert.alert('重新选择身份？', '照片和云端数据都不会删除，只会清除这台手机记住的身份。', [
      { text: '取消', style: 'cancel' },
      { text: '重新选择', style: 'destructive', onPress: resetIdentity },
    ]);
  }

  function showBackgroundGuide() {
    Alert.alert(
      '让照片提醒更可靠',
      '请在手机系统设置中允许 LoveLetter 自启动、后台运行，并把电池策略设为“不限制”。vivo 和小米都只需要设置一次。',
      [{ text: '知道了' }],
    );
  }

  const mine = photos.filter(photo => photo.uploadedBy === userId).length;
  const theirs = photos.filter(photo => photo.uploadedBy === partner?._id).length;
  const legacy = photos.length - mine - theirs;
  const rolls = coupleRolls(couple).length + new Set(photos.filter(photo => !photo.rollId).map(photo => photo.dateKey.slice(0, 7))).size;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>JUST THE TWO OF US</Text>
        <Text style={styles.pageTitle}>我们</Text>

        <View style={styles.pairCard}>
          <ProfileAvatar uri={user?.avatarUrl} fallback="🌙" label={user?.nickname || '我'} />
          <View style={styles.heartLine}>
            <View style={styles.line} />
            <Text style={styles.heart}>♥</Text>
            <View style={styles.line} />
          </View>
          <ProfileAvatar uri={partner?.avatarUrl} fallback="🌷" label={partner?.nickname || 'TA'} />
        </View>

        <View style={styles.stats}>
          <Stat value={photos.length} label="照片" />
          <Stat value={rolls} label="胶卷" />
          <Stat value={mine} label="我留下的" />
          <Stat value={legacy || theirs} label={legacy ? '旧时光' : 'TA 留下的'} />
        </View>

        <Text style={styles.sectionTitle}>我们的资料</Text>
        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={pickAvatar} disabled={avatarUploading}>
            <Text style={styles.rowLabel}>我的头像</Text>
            {avatarUploading ? <ActivityIndicator color={colors.rose} /> : <Text style={styles.rowValue}>更换  ›</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => { setNickname(user?.nickname || ''); setNicknameVisible(true); }}>
            <Text style={styles.rowLabel}>我的昵称</Text>
            <Text style={styles.rowValue}>{user?.nickname || '设置昵称'}  ›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={() => setDatePicker(true)}>
            <Text style={styles.rowLabel}>在一起的日子</Text>
            <Text style={styles.rowValue}>{formatDate(couple?.startDate)}  ›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>提醒</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>新照片即时提醒</Text>
              <Text style={styles.rowHint}>只提醒对方上传的照片和秘密胶卷</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#342d40', true: 'rgba(255,143,171,0.5)' }}
              thumbColor={notifications ? colors.rose : '#8a8195'}
            />
          </View>
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={showBackgroundGuide}>
            <Text style={styles.rowLabel}>vivo / 小米后台设置</Text>
            <Text style={styles.rowValue}>查看  ›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>这台设备</Text>
        <View style={styles.group}>
          <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={confirmReset}>
            <Text style={[styles.rowLabel, styles.danger]}>重新选择身份</Text>
            <Text style={styles.rowValue}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>LoveLetter {Constants.expoConfig?.version || '1.0.0'} · 只属于我们</Text>
      </ScrollView>

      <Modal visible={nicknameVisible} transparent animationType="fade" onRequestClose={() => setNicknameVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>我希望你怎么叫我？</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="输入昵称"
              placeholderTextColor={colors.whiteSecondary}
              autoFocus
              maxLength={20}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setNicknameVisible(false)}><Text style={styles.cancel}>取消</Text></TouchableOpacity>
              <TouchableOpacity style={styles.save} onPress={saveNickname}><Text style={styles.saveText}>保存</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePicker
        visible={datePicker}
        value={couple?.startDate ? new Date(couple.startDate) : new Date()}
        maximumDate={new Date()}
        onChange={saveStartDate}
        onCancel={() => setDatePicker(false)}
      />
    </SafeAreaView>
  );
}

function ProfileAvatar({ uri, fallback, label }: { uri?: string; fallback: string; label: string }) {
  return (
    <View style={styles.profile}>
      {uri ? <Image source={{ uri }} style={styles.avatar} /> : (
        <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarEmoji}>{fallback}</Text></View>
      )}
      <Text style={styles.profileName} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 42 },
  eyebrow: { color: colors.rose, fontSize: 10, fontWeight: '800', letterSpacing: 2.5 },
  pageTitle: { color: colors.white, fontSize: 29, fontWeight: '800', marginTop: 6 },
  pairCard: { marginTop: 26, borderRadius: 28, paddingVertical: 24, paddingHorizontal: 18, backgroundColor: colors.roseDim, borderWidth: 1, borderColor: colors.roseBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  profile: { width: 92, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 27 },
  avatarFallback: { backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 31 },
  profileName: { color: colors.white, fontSize: 13, fontWeight: '700', marginTop: 9, maxWidth: 88 },
  heartLine: { flexDirection: 'row', alignItems: 'center', width: 94, marginHorizontal: -4 },
  line: { flex: 1, height: 1, backgroundColor: colors.roseBorder },
  heart: { color: colors.rose, fontSize: 18, marginHorizontal: 8 },
  stats: { marginTop: 14, paddingVertical: 17, flexDirection: 'row', backgroundColor: colors.bgLight, borderRadius: 22, borderWidth: 1, borderColor: colors.whiteBorder },
  stat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.whiteBorder },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.whiteSecondary, fontSize: 9, marginTop: 5 },
  sectionTitle: { color: colors.whiteSecondary, fontSize: 11, fontWeight: '700', marginTop: 30, marginBottom: 10, marginLeft: 5 },
  group: { backgroundColor: colors.bgLight, borderRadius: 22, borderWidth: 1, borderColor: colors.whiteBorder, overflow: 'hidden' },
  row: { minHeight: 61, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.whiteBorder },
  rowLast: { borderBottomWidth: 0 },
  rowCopy: { flex: 1, paddingVertical: 13 },
  rowLabel: { color: colors.white, fontSize: 13, fontWeight: '600' },
  rowHint: { color: colors.whiteSecondary, fontSize: 9, marginTop: 5 },
  rowValue: { color: colors.whiteSecondary, fontSize: 11, maxWidth: 190 },
  danger: { color: '#fda4af' },
  version: { color: 'rgba(255,255,255,0.22)', fontSize: 10, textAlign: 'center', marginTop: 28 },
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.58)' },
  modal: { backgroundColor: colors.bgLight, borderRadius: 26, padding: spacing.lg, borderWidth: 1, borderColor: colors.whiteBorder },
  modalTitle: { color: colors.white, fontSize: 19, fontWeight: '700' },
  input: { height: 52, borderRadius: 16, backgroundColor: colors.whiteDim, borderWidth: 1, borderColor: colors.whiteBorder, marginTop: 19, paddingHorizontal: 15, color: colors.white, fontSize: 15 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 22, marginTop: 20 },
  cancel: { color: colors.whiteSecondary, fontSize: 13 },
  save: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 15, backgroundColor: colors.rose },
  saveText: { color: colors.bg, fontSize: 13, fontWeight: '800' },
});
