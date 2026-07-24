# LoveLetter · A private film roll for two

[中文说明](./README_CN.md)

LoveLetter is a private Android photo space built for exactly two people. Its core loop is simple: capture a moment, let the other person respond, and rediscover it later.

The app uses React Native + Expo SDK 54 and Tencent CloudBase for database, realtime sync, storage, and anonymous infrastructure auth. There is no visible account login. Existing photos remain compatible without re-uploading.

## Commands

```bash
npm install
npm start
npm run typecheck
npm run prebuild:android
npm run build
```

The release APK is built locally at `android/app/build/outputs/apk/release/app-release.apk`; EAS Build and foreign runtime push services are not required.
