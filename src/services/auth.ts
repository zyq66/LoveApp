// src/services/auth.ts
import { db, authReady } from '../config/cloudbase';

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function register(
  phone: string,
  password: string,
  gender: 'male' | 'female',
): Promise<{ userId: string; coupleCode: string }> {
  await authReady;

  const existing = await db.collection('users').where({ phone }).get();
  if (((existing.data as any[]) ?? []).length > 0) throw new Error('该手机号已注册，请直接登录');

  const code = generateCode();

  const coupleResult: any = await db.collection('couples').add({
    code, status: 'pending', user1: '', user2: '', startDate: Date.now(),
  });
  const coupleId: string = coupleResult.docId ?? coupleResult.id ?? coupleResult._id;

  const userResult: any = await db.collection('users').add({
    phone, password, nickname: '', avatarUrl: '', coupleId: '', code, gender, createdAt: Date.now(),
  });
  const userId: string = userResult.docId ?? userResult.id ?? userResult._id;

  await db.collection('couples').doc(coupleId).update({ user1: userId });

  return { userId, coupleCode: code };
}

export async function login(
  phone: string,
  password: string,
): Promise<{ userId: string; coupleId: string; gender: 'male' | 'female' }> {
  await authReady;

  const res = await db.collection('users').where({ phone }).get();
  const users = (res.data as any[]) ?? [];
  if (users.length === 0) throw new Error('手机号未注册');

  const user = users[0];
  if (!user.password) throw new Error('账号数据异常，请重新注册');
  if (user.password !== password) throw new Error('密码错误');

  return { userId: user._id, coupleId: user.coupleId ?? '', gender: user.gender ?? 'male' };
}

export async function unbindCouple(userId: string, coupleId: string): Promise<void> {
  await authReady;

  const res: any = await db.collection('couples').doc(coupleId).get();
  const coupleData = (res.data as any[])?.[0];
  if (coupleData) {
    if (coupleData.user1 === userId) {
      await db.collection('couples').doc(coupleId).update({ user1: '', status: 'pending' });
    } else {
      await db.collection('couples').doc(coupleId).update({ user2: '', status: 'pending' });
    }
  }

  const newCode = generateCode();
  const newCoupleResult: any = await db.collection('couples').add({
    code: newCode, status: 'pending', user1: userId, user2: '', startDate: Date.now(),
  });
  const newCoupleId: string = newCoupleResult.docId ?? newCoupleResult.id ?? newCoupleResult._id;

  await db.collection('users').doc(userId).update({ coupleId: newCoupleId, code: newCode });
}

export async function pairCouple(myUserId: string, partnerCode: string): Promise<string> {
  await authReady;

  const res = await db.collection('couples').where({ code: partnerCode, status: 'pending' }).get();
  const couples = (res.data as any[]) ?? [];
  if (couples.length === 0) throw new Error('配对码无效或已使用');

  const coupleDoc = couples[0];
  if (coupleDoc.user1 === myUserId) throw new Error('不能和自己配对');

  const coupleId = coupleDoc._id;
  await db.collection('couples').doc(coupleId).update({ user2: myUserId, status: 'active' });
  await db.collection('users').doc(myUserId).update({ coupleId });
  return coupleId;
}
