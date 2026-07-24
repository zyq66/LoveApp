# 常用命令

```bash
# Metro 开发服务器
npm start

# 连接 Android 手机或模拟器
npm run android

# TypeScript 检查
npm run typecheck

# 依赖或 app.json 变化后重新生成 Android 工程
npm run prebuild:android

# 完全本地构建 Release APK
npm run build

# Expo 项目健康检查
npx expo-doctor
```

APK 输出：`android/app/build/outputs/apk/release/app-release.apk`

本项目不再使用 EAS Build。原生工程由 Expo Prebuild 生成，后台照片同步权限由 `plugins/withBackgroundPhotoSync.js` 自动写入。
