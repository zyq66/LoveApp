// src/services/auth.ts
import { db, authReady } from '../config/cloudbase';

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// 注册时生成的配对码会存到 user.code，永久不变。
// 不再预创建 couple 文档 —— 只在 pairCouple 成功时创建，避免 garbage 残留。
export async function register(
  phone: string,
  password: string,
  gender: 'male' | 'female',
): Promise<{ userId: string }> {
  await authReady;

  const existing = await db.collection('users').where({ phone }).get();
  if (((existing.data as any[]) ?? []).length > 0) throw new Error('该手机号已注册，请直接登录');

  // 生成不冲突的配对码（best-effort，最多重试 5 次）
  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    const dup = await db.collection('users').where({ code }).get();
    if (((dup.data as any[]) ?? []).length === 0) break;
    code = generateCode();
  }

  const userResult: any = await db.collection('users').add({
    phone, password, nickname: '', avatarUrl: '',
    coupleId: '', code, gender, createdAt: Date.now(),
  });
  const userId: string = userResult.docId ?? userResult.id ?? userResult._id;

  return { userId };
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

  return {
    userId: user._id,
    coupleId: user.coupleId ?? '',
    gender: user.gender ?? 'male',
  };
}

// 解绑：清空双方 user.coupleId，删除 couple 文档；user.code 保留不变。
export async function unbindCouple(userId: string, coupleId: string): Promise<void> {
  await authReady;

  const res: any = await db.collection('couples').doc(coupleId).get();
  const couple = ((res.data as any[]) ?? [])[0];

  if (couple) {
    if (couple.user1) {
      await db.collection('users').doc(couple.user1).update({ coupleId: '' });
    }
    if (couple.user2 && couple.user2 !== couple.user1) {
      await db.collection('users').doc(couple.user2).update({ coupleId: '' });
    }
    await db.collection('couples').doc(coupleId).remove();
  } else {
    // couple 文档已不存在但 user.coupleId 还有值，保险清掉自己
    await db.collection('users').doc(userId).update({ coupleId: '' });
  }
}

// 配对：通过 partnerCode 找到对方 user，校验状态，创建 couple，双方写 coupleId。
export async function pairCouple(myUserId: string, partnerCode: string): Promise<string> {
  await authReady;

  const res = await db.collection('users').where({ code: partnerCode }).get();
  const partner = ((res.data as any[]) ?? [])[0];
  if (!partner) throw new Error('配对码无效');
  if (partner._id === myUserId) throw new Error('不能和自己配对');
  if (partner.coupleId) throw new Error('对方已经被配对');

  const myRes: any = await db.collection('users').doc(myUserId).get();
  const me = ((myRes.data as any[]) ?? [])[0];
  if (me?.coupleId) throw new Error('你已经在配对中');

  const coupleResult: any = await db.collection('couples').add({
    user1: partner._id,
    user2: myUserId,
    status: 'active',
    startDate: Date.now(),
  });
  const coupleId: string = coupleResult.docId ?? coupleResult.id ?? coupleResult._id;

  await db.collection('users').doc(myUserId).update({ coupleId });
  await db.collection('users').doc(partner._id).update({ coupleId });

  return coupleId;
}
