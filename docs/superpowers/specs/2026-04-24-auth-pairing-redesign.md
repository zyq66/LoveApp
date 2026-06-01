# Auth & Pairing Redesign

## Goal

将登录身份验证与情侣配对解耦：登录改为手机号+密码，配对码简化为 4 位数字，未配对用户可以直接进入 App 并在首页完成配对。

## Problem

当前实现中，情侣码同时充当「登录凭据」和「配对令牌」，导致两个问题：

1. **登录问题**：登录需要输入 6 位字母数字混合码，容易忘记或输错；解绑后码变更，旧设备无法登录。
2. **配对问题**：6 位字母数字码口头传达容易出错，且配对前被强制锁在 CoupleCodeScreen，无法使用 App。

## Architecture

### 数据模型变更

`users` 集合新增字段：
- `password: string` — 注册时由用户设置，明文存储（与现有 `code` 字段一致）

`code` 字段保留但仅用于配对，不再用于登录验证。

### 认证流程

**注册：** 手机号 + 密码 + 性别 → 生成 4 位数字配对码 → 直接进入主 App（无需先配对）

**登录：** 手机号 + 密码 → 进入主 App（有 coupleId 则正常使用，无则显示配对卡片）

**配对：** 在首页配对卡片中完成，双方交换 4 位码

### 导航变更

**旧逻辑（App.tsx）：**
```
userId && coupleId  → MainTabs
userId && !coupleId → CoupleCodeScreen（阻塞）
neither             → Login / Register
```

**新逻辑：**
```
userId              → MainTabs（无论是否配对）
neither             → Login / Register
```

`CoupleCodeScreen` 整个删除，其功能移入 `HomeScreen`。

### HomeScreen 未配对状态

当 `coupleId` 为空时，首页顶部显示配对卡片（取代正常内容区域）：

```
┌─────────────────────────────────────┐
│  💑 还未配对                         │
│                                     │
│  你的配对码                          │
│  ┌─────────────────────────────┐    │
│  │         2 8 4 7             │    │
│  │       点击复制               │    │
│  └─────────────────────────────────┘│
│                                     │
│  输入对方的 4 位配对码               │
│  [ _ _ _ _ ]  [配对]                │
└─────────────────────────────────────┘
```

配对成功后调用 `setAuth(userId, newCoupleId, gender)`，卡片自动消失，正常首页渲染。

### 配对码生成

```typescript
function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
```

4 位纯数字，范围 1000–9999，口头告知或截图都方便。

## Files Changed

| 文件 | 变更 |
|------|------|
| `src/services/auth.ts` | `generateCode` 改 4 位数字；`register` 加 `password` 参数；`login` 改用 password 验证 |
| `src/screens/auth/RegisterScreen.tsx` | 新增密码输入框 |
| `src/screens/auth/LoginScreen.tsx` | 「情侣码」字段改为「密码」 |
| `src/screens/auth/CoupleCodeScreen.tsx` | **删除** |
| `App.tsx` | 移除 `userId && !coupleId` 分支，删除 CoupleCodeScreen 导入 |
| `src/screens/HomeScreen.tsx` | 新增未配对状态渲染（配对卡片） |

## Edge Cases

- **旧账号兼容**：旧账号 `users` 文档无 `password` 字段，`login()` 查到后若 `!user.password` 则提示「请重新注册」（旧数据量极少，两人 App）
- **自我配对防护**：`pairCouple()` 已有 `coupleDoc.user1 === myUserId` 检测，保持不变
- **码冲突极小概率**：4 位数字 9000 种可能，同时存在 pending 状态的用户极少，不做额外处理
- **配对码输入**：限制 4 位数字键盘（`keyboardType="number-pad"`），不少于 4 位才允许提交

## Out of Scope

- 短信验证码登录（成本高，后续可加）
- 二维码配对
- 忘记密码流程（两人 App，可通过重新注册解决）
