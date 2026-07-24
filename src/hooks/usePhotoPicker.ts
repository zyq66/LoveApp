import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../store/AuthContext';
import { uploadPhotoBatch } from '../services/album';
import { coupleRolls } from '../services/rolls';

export function usePhotoPicker(rollId?: string) {
  const { userId, coupleId, couple } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  async function upload(assets: ImagePicker.ImagePickerAsset[]) {
    if (!userId || !coupleId || assets.length === 0) return;
    setUploading(true);
    setProgress({ completed: 0, total: assets.length });
    try {
      const roll = rollId ? coupleRolls(couple).find(item => item.id === rollId) : undefined;
      const hiddenUntil = roll?.type === 'secret' ? roll.unlockAt : undefined;
      await uploadPhotoBatch(coupleId, userId, assets, rollId, hiddenUntil, (completed, total) => {
        setProgress({ completed, total });
      });
    } catch (e: any) {
      Alert.alert('照片没有放进去', e?.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  async function pickLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('需要相册权限', '允许访问相册后，才能把共同回忆放进来。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      orderedSelection: true,
      exif: true,
      quality: 1,
    });
    if (!result.canceled) await upload(result.assets);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('需要相机权限', '允许使用相机后，才能拍下此刻。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: true });
    if (!result.canceled) await upload(result.assets);
  }

  function chooseSource() {
    if (uploading) return;
    Alert.alert('留下此刻', '把今天的一小块放进我们的胶卷。', [
      { text: '拍一张', onPress: takePhoto },
      { text: '从相册选择', onPress: pickLibrary },
      { text: '取消', style: 'cancel' },
    ]);
  }

  return { chooseSource, pickLibrary, takePhoto, uploading, progress };
}
