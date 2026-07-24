# CloudBase 数据兼容与迁移

## 已确认的线上数据

重构前只读核对结果：

- 2 个用户
- 2 条 couple 文档，其中 1 条被当前两个用户引用
- 53 张照片
- 41 张属于当前 coupleId
- 12 张属于早期遗留关系
- 26 条历史消息
- 2 条历史档案

重构不会删除或重写这些记录。

## 身份兼容

首次身份选择直接复用现有用户文档：

```text
身份卡 → 原 userId → 原 coupleId
```

已安装设备的 AsyncStorage 中如果仍有 `userId`，升级后直接进入 App。新安装或清除数据后才重新选择身份。

## 照片兼容

读取时执行以下兼容：

```text
originalUrl  = originalUrl  ?? url
thumbnailUrl = thumbnailUrl ?? originalUrl
shotAt       = shotAt       ?? date
dateKey      = dateKey       ?? 根据 shotAt 计算
monthDay     = monthDay      ?? 根据 shotAt 计算
```

为找回 12 张遗留照片，当前私有环境会读取 `photos` 全集合。这个决定仅适用于该 CloudBase 环境中始终只有两个人数据的前提。

## 新照片字段

```text
coupleId
rollId
url
originalUrl
thumbnailUrl
originalFileId
thumbnailFileId
caption
date
shotAt
uploadedAt
uploadedBy
width
height
dateKey
monthDay
hiddenUntil
reactions
```

胶卷数据写入当前 couple 文档的 `rolls` 字段，设备绑定写入 `devices` 字段，因此无需在 CloudBase 控制台新建集合。

## 历史功能

`messages`、`profiles` 以及 couple 文档中的旧 `careRecords` 仅停止在客户端展示，暂不删除。确认 V2 稳定使用后再决定是否导出和清理。
