# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Claude Pet 是一个像素风格的 Electron 桌面宠物浮窗，悬浮在屏幕上实时显示 Claude Code 的工作状态。监听 `~/.claude/projects/` 下的 JSONL 会话文件，解析状态后通过 IPC 驱动 Canvas 2D 像素动画。版本 3.1.0。License: AGPL-3.0。

## 常用命令

```bash
npm install          # 安装依赖
npm start            # 启动应用
npm run dev          # 开发模式启动
npm run build:win    # 打包 Windows x64
npm run build:mac    # 打包 macOS Intel
npm run build:mac-arm  # 打包 macOS Apple Silicon
```

依赖: Node.js >= 18, Electron 33, pngjs。无测试框架、无 linter 配置。打包产物输出到 `dist/`。

## 架构

### 进程模型

- **主进程** (`src/main/index.js`): 应用入口 + 业务逻辑编排。模块化拆分为 behavior/main/ipc/monitor/nurture/sprite/decoration 子目录。
- **预加载脚本** (`src/ipc/preload.js`): `contextBridge` 暴露 `electronAPI`，提供 IPC 通道。
- **渲染进程** (`assets/pet.html`): Canvas 2D 像素动画渲染，精灵图帧提取和绘制。

### 状态系统

**Claude 状态**（来自 JSONL 监听）：`tool_use` → CODING，`end_turn` → DONE，`user` → THINKING。

**行为状态**（state-machine.js）：IDLE, WALKING, SLEEPING, EATING, PLAYING, DRAGGED, GREETING。

**8方向朝向**：facingDir 为 down/up/left/right/left_down/right_down/left_up/right_up，通过 `resolveDirectionalAnim` 解析为带方向的动画名（如 `sit_right_down`）。

### 皮肤系统

皮肤使用 PNG 精灵图 + `skin.json` 配置。`src/sprite/sprite-extractor.js` 从精灵图按行列提取帧。`ANIM_DIRS` 定义每个动画支持的方向变体。

添加新皮肤：在 `assets/skins/` 新建目录，放入 `skin.json` + `sprite.png`，系统自动发现。

### 设置持久化

设置存储在 `~/.claude-tool-electron/pet-cache/settings.json`，字段包括 `skin`、`showBubble`、`autoWalk`、`animSpeeds`、`behaviorAnimMap` 等。

### 养成系统

- **食物** (`src/nurture/foods.js`): 胡萝卜/小鱼干/牛奶，每30分钟自动补充
- **成长** (`src/nurture/growth.js`): 经验阈值解锁成长阶段和配饰
- **随机事件** (`src/nurture/random-events.js`): 离开30分钟后触发

### 行为系统

- **自主行走** (`auto-walk.js`): 随机8方向走动，100ms/帧
- **空闲行为** (`idle-behavior.js`): 随机播放 wash/yawn/meow 或观察周围
- **问候** (`greeting.js`): 启动时播放问候动画
- **跟随鼠标** (`follow-mouse.js`): 宠物跟随光标移动
