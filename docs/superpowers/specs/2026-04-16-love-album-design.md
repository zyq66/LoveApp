# 恋爱纪念册 App — 设计规格

> 创建日期：2026-04-16
> 状态：待实现

---

## 项目概览

两人私用的情侣纪念册 Android App，不上架，APK 直接安装。两人各自安装，数据实时同步。

| 项目 | 内容 |
|------|------|
| 平台 | Android（APK 直接安装，不上架） |
| 使用人 | 情侣两人各自安装 |
| 框架 | React Native + Expo SDK (Managed Workflow) |
| 后端 | Firebase（Firestore + Storage） |
| 打包 | Expo EAS Build → APK |

---

## 视觉风格

- **主色调**：深蓝星空（`#1a1a2e` → `#16213e` 渐变）
- **点缀色**：抹茶绿（`#4ade80`），仅用于：心形图标、即将到来的纪念日标签、未读消息小圆点、情书悬浮按钮
- **卡片**：半透明深色背景 + 低透明度白色边框
- **字体**：白色主文字，`rgba(255,255,255,0.4)` 次要文字

---

## 架构

```
前端：React Native + Expo SDK
后端：Firebase Firestore（实时同步）+ Firebase Storage（照片）
打包：Expo EAS Build → APK
状态管理：React Context
导航：React Navigation
地图：react-native-amap3d（高德地图）
推送：Expo Notifications
```

---

## 登录 & 配对

### 注册
1. 输入手机号 → 写入 Firestore `users` 集合
2. 自动生成 6 位情侣码，存入 `couples` 集合，状态 `pending`
3. 展示情侣码页面，可复制/分享给对方

### 登录
1. 输入手机号 + 情侣码
2. Firestore 查询，两者都匹配才放行
3. 情侣码同时作为"密码"使用，需妥善保管

### 配对完成
- 第二人输入情侣码后，`couples` 状态改为 `active`，双方绑定
- 情侣码一次性，配对后失效
- 换手机：用原手机号 + 情侣码重新登录，自动恢复

### 解绑
- 入口在"更多"页，需二次确认
- 解绑后双方数据保留但不再同步

---

## 导航结构

```
底部 Tab Bar：
  [首页]  [相册]  [● 情书]  [足迹]  [更多]
                    ↑
             抹茶绿悬浮按钮（凸起）
```

---

## 功能页面

### 首页
- 两侧头像 + 中间抹茶绿心形
- 天数大字居中（`在一起 N 天`）
- 下方纪念日标签列表：7天内绿色高亮，其余灰色
- 支持添加多个纪念日，长按删除

### 相册页
- 顶部切换按钮：**时间轴** ↔ **瀑布流**
  - 时间轴：按月分组，绿点标记最新，缩略图 + 标注谁上传
  - 瀑布流：两列不等高，适配竖/横版照片
- 右下角 `+` 按钮上传照片
- 点击照片全屏查看，支持添加/编辑文字注释
- 两人照片合并展示，每张标注上传者

### 足迹页
- 地图默认定位到最近标记地点
- 地图标记：抹茶绿心形图标
- 点击标记：弹出卡片（地点名 + 照片缩略图 + 备注）
- 右下角 `+` 按钮添加足迹（搜索地址 / 长按地图选点）

### 情书页（悬浮按钮进入）
- 聊天气泡样式，区分我发 / 对方发
- 每条消息可附带心情表情
- 顶部展示对方今日心情（若已设置）
- 悬浮按钮点击弹出输入框，发送后收起

### 更多页
- 修改昵称 / 头像
- 纪念日管理
- 解绑情侣（二次确认）
- 关于

---

## 数据结构

```
users/{userId}
  phone: string
  nickname: string
  avatarUrl: string
  coupleId: string
  createdAt: timestamp

couples/{coupleId}
  code: string          ← 情侣码（登录密码）
  status: "pending" | "active"
  user1: userId
  user2: userId
  startDate: timestamp

anniversaries/{coupleId}/items/{itemId}
  name: string
  date: timestamp
  createdBy: userId

albums/{coupleId}/photos/{photoId}
  url: string
  caption: string
  date: timestamp
  uploadedBy: userId

places/{coupleId}/locations/{placeId}
  name: string
  lat: number
  lng: number
  date: timestamp
  photoUrl: string
  note: string
  addedBy: userId

letters/{coupleId}/messages/{msgId}
  from: userId
  content: string
  mood: string
  createdAt: timestamp
  read: boolean
```

---

## 开发顺序（MVP 优先）

### 阶段一：MVP
1. 搭建 Expo 项目 + Firestore 连接
2. 注册 / 登录 / 情侣码配对
3. 首页倒计时 + 纪念日
4. EAS Build 打包 → 安装到手机验证

### 阶段二：核心功能
5. 共同相册（时间轴 + 瀑布流切换）
6. 足迹地图（高德）

### 阶段三：互动功能
7. 情书 & 心情
8. 推送通知 + 更多页

---

## 技术约束

- Firebase 免费套餐：Firestore 50万读/20万写/天，Storage 5GB
- 登录无短信验证码，情侣码即密码
- 地图使用 react-native-amap3d，需在高德开放平台申请 Android API Key（免费）
- Expo Managed Workflow，如需原生模块可 eject
