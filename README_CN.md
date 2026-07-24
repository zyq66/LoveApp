# LoveLetter · 双人记忆胶卷

只属于两个人的 Android 私人相册。它不再是一套情侣工具箱，而是围绕一个简单循环设计：

> 留下瞬间 → 对方回应 → 以后重新遇见

## 当前产品

- **今天**：一人一张组成“今天的我们”，并重新遇见一张旧照片。
- **胶卷**：现有照片按月份形成旧胶卷，也可以创建普通胶卷和定时揭晓的秘密胶卷。
- **我们**：两人的资料、在一起日期、照片统计、提醒和设备身份。
- **无登录**：首次安装只选择“我是谁”，继续复用原来的 userId 和 coupleId。
- **国内服务**：数据库、实时同步和图片存储全部使用腾讯云 CloudBase。
- **免费即时提醒**：Android 前台同步服务监听 CloudBase，不依赖 TPNS、FCM 或 Expo Push。

## 数据兼容

旧照片无需迁移或重新上传：

- `url` 自动兼容为 `originalUrl`
- `date` 自动兼容为 `shotAt`
- 没有 `rollId` 的照片按拍摄月份组成“旧时光”
- 当前数据库的 53 张照片都会读取，其中包括 12 张早期关系残留照片

新上传照片会同时保存原图与 720px 缩略图，列表优先加载缩略图。

## 开发与构建

```bash
npm install
npm start                 # Metro 开发服务器
npm run typecheck         # TypeScript 检查
npm run prebuild:android  # 生成 Android 原生工程
npm run build             # 本地构建 Release APK
```

Release APK 输出位置：

```text
android/app/build/outputs/apk/release/app-release.apk
```

项目不依赖 EAS Build。APK 使用本地 Gradle 构建后，可上传到 CloudBase 云存储供两台手机安装。

## vivo / 小米提醒设置

为了让侧载 App 的后台照片提醒更可靠，两台手机安装后都需要：

1. 允许通知。
2. 允许自启动。
3. 允许后台运行或后台高耗电。
4. 电池策略设为“不限制”。
5. 不要在系统设置中“强行停止”LoveLetter。

即时提醒开启时，通知栏会保留一条低优先级状态：“LoveLetter 正在守护我们的回忆”。

## 重要文件

- `src/store/AuthContext.tsx`：本机身份与双人空间实时状态
- `src/services/album.ts`：新旧照片兼容、批量上传、缩略图、实时同步
- `src/services/backgroundPhotoSync.ts`：零新增付费的 Android 后台提醒
- `src/services/rolls.ts`：胶卷数据保存在现有 couple 文档中
- `plugins/withBackgroundPhotoSync.js`：前台同步服务的 Android 原生配置
- `docs/PRODUCT_V2.md`：产品设计与范围
- `docs/CLOUDBASE_MIGRATION.md`：现有数据兼容策略
