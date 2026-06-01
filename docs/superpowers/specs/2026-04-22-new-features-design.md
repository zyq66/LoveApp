# LoveLetter App 新功能设计文档

**日期：** 2026-04-22  
**功能：** 相册点赞+角标、今日小任务、语音消息  
**实现顺序：** D1 相册 → A1 任务 → B1 语音（按复杂度）

---

## D1 · 相册点赞 + 上传者角标

### 目标
相册照片展示上传者身份，支持多 emoji 反应，增加双人协作感。

### 数据模型
`photos` 集合新增字段（无需控制台操作，代码写入自动生成）：
```
reactions: Record<userId, emoji>   // 每人一个反应，覆盖式更新
```
`uploadedBy` 字段已存在，用于渲染头像颜色区分。

### 交互
- 头像角标：每张照片右下角显示上传者头像圆圈。绿色 = 我，粉色 = TA（用 userId 和当前登录用户对比决定颜色）。
- 反应显示：有反应时左下角显示 `emoji + 数量`。
- 长按触发：弹出半透明浮层 + 6 个 emoji 选择器（❤️😂😮😢👍🌸，与情书一致）。
- 再次选同一 emoji = 取消反应（从 reactions 删除该 userId）。
- 快速 fetch 刷新：反应后调用 `loadPhotos()` 更新本地状态。

### 涉及文件
| 文件 | 操作 |
|------|------|
| `src/services/album.ts` | 新增 `addPhotoReaction(photoId, userId, emoji)`，传入 userId 给 fetchPhotos |
| `src/screens/AlbumScreen.tsx` | 传 userId 给 PhotoGrid / PhotoTimeline |
| `src/components/PhotoGrid.tsx` | 头像角标、反应计数、长按浮层 |
| `src/components/PhotoTimeline.tsx` | 同上 |

---

## A1 · 今日小任务

### 目标
首页每天展示一个情侣小任务，AI 生成，当天缓存，无刷新，无打卡。

### 位置
HomeScreen 天数大字下方、纪念日列表上方，独立 Widget 组件。

### 内容分级（写入 AI prompt）
- **温馨日常（~40%）**：夸对方一个从没说过的优点、发一首今天想到的歌等
- **甜蜜撒娇（~35%）**：今晚语音通话至少 10 分钟、发今天的自拍等
- **亲密挑逗（~25%）**：发一张腿照/自己觉得好看的照片、描述一个最近想和 TA 做的事等

AI prompt 明确告知这是情侣私密 App，内容可以亲密挑逗，一句话，不超过 25 字。

### 缓存逻辑
```
key: `daily_task_YYYY-MM-DD`
流程: 读 AsyncStorage → 有则直接用 → 没有则调 AI → 写缓存 → 失败则用固定题库兜底
```
两人看到同一任务（日期相同，题库索引一致）。AI 生成结果只缓存在本地，两人可能略有不同，可接受（任务是建议性质）。

### 固定题库兜底
内置约 40 条，覆盖三个分级，按 `dayIndex % length` 取模循环。

### 涉及文件
| 文件 | 操作 |
|------|------|
| `src/services/ai.ts` | 新增 `generateDailyTask()`，含分级 prompt，temperature 0.95 |
| `src/components/DailyTaskWidget.tsx` | 新建，含题库、缓存读写、渲染 |
| `src/screens/HomeScreen.tsx` | 引入 DailyTaskWidget，放在天数下方 |
| `functions/ai-proxy/index.js` | 新增 `type === 'task'` 分支 |

无需新建数据库集合。

---

## B1 · 语音消息

### 目标
情书页支持按住录音、松开发送，气泡展示时长和静态波形，点击播放。

### 依赖
```bash
npx expo install expo-av
```

### 数据模型
`messages` 集合新增字段（代码写入自动生成）：
```
type: 'voice'          // 已有 'text' | 'image'，扩展为 'text' | 'image' | 'voice'
voiceUrl: string       // TCB 云存储 URL，路径 voice/
duration: number       // 秒数，整数
```

### 交互流程
1. 输入栏新增 🎙 按钮（✨ 和 🖼 右侧）
2. **按住**：申请麦克风权限（首次）→ 开始录音 → 显示录音浮层（波形动画 + 计时）
3. **松开**：停止录音 → 上传 TCB → 发送消息
4. **上滑取消**：滑动距离 > 50px 时取消录音，不发送，浮层提示"已取消"
5. **20 秒倒计时**：到时自动停止并发送

### 气泡渲染
- `type === 'voice'` 时渲染语音气泡：▶ 按钮 + 静态波形条 + 时长
- 我发的：绿底深色文字（与文字气泡一致）
- TA 发的：深蓝底白色（与文字气泡一致）
- 点击 ▶ 播放，再次点击停止

### 涉及文件
| 文件 | 操作 |
|------|------|
| `src/services/letters.ts` | 新增 `sendVoice(coupleId, userId, voiceUrl, duration, mood)` |
| `src/screens/LetterScreen.tsx` | 麦克风按钮、录音 Hook 逻辑、上滑取消手势、语音气泡渲染 |

---

## 不涉及的改动
- 导航结构不变（底部 Tab 不改）
- 情书轮询逻辑不变
- 已读未读已移除（之前已改）
- 不新建任何数据库集合
