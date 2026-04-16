// src/services/auth.ts
import { db } from '../config/firebase';
import {
  collection, doc, setDoc, getDocs, getDoc,
  query, where, updateDoc
} from 'firebase/firestore';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function register(phone: string): Promise<{ userId: string; coupleCode: string }> {
  const q = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('该手机号已注册，请直接登录');

  const userId = generateId();
  const coupleId = generateId();
  const code = generateCode();

  await setDoc(doc(db, 'users', userId), {
    phone, nickname: '', avatarUrl: '', coupleId, createdAt: Date.now(),
  });
  await setDoc(doc(db, 'couples', coupleId), {
    code, status: 'pending', user1: userId, user2: '', startDate: Date.now(),
  });
  return { userId, coupleCode: code };
}

export async function login(phone: string, code: string): Promise<{ userId: string; coupleId: string }> {
  const q = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('手机号未注册');

  const userDoc = snap.docs[0];
  const { coupleId } = userDoc.data() as { coupleId: string };
  const coupleSnap = await getDoc(doc(db, 'couples', coupleId));

  if (!coupleSnap.exists()) throw new Error('账号数据异常');
  if (coupleSnap.data().code !== code) throw new Error('情侣码错误');

  return { userId: userDoc.id, coupleId };
}

export async function pairCouple(myUserId: string, partnerCode: string): Promise<string> {
  const q = query(
    collection(db, 'couples'),
    where('code', '==', partnerCode),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('情侣码无效或已使用');

  const coupleDoc = snap.docs[0];
  if (coupleDoc.data().user1 === myUserId) throw new Error('不能和自己配对');

  const coupleId = coupleDoc.id;
  await updateDoc(doc(db, 'couples', coupleId), { user2: myUserId, status: 'active' });
  await updateDoc(doc(db, 'users', myUserId), { coupleId });
  return coupleId;
}
