# Claude Pet 🐱

一个像素风格的 Electron 桌面宠物浮窗，悬浮在屏幕上实时显示 Claude Code 的工作状态。

## 功能

- 实时监控 Claude Code 会话状态（思考/编码/执行/完成）
- 像素精灵图动画系统，8方向朝向
- 3 款猫咪皮肤（灰猫、白猫、橘猫），支持自定义皮肤
- 自主行为系统：走动、小憩、洗脸、伸懒腰、观察周围
- 养成系统：喂食（胡萝卜/小鱼干/牛奶）、经验成长、随机事件
- 装饰系统：可放置、拖拽的桌面装饰物
- 系统托盘驻留，双击托盘图标显示/隐藏
- 设置持久化，支持自定义动画速度和行为映射
- 配置窗口：皮肤切换、动画预览、行为调整

## 下载安装

前往 [Releases](https://github.com/Carliber/claude-pet/releases/latest) 下载最新版本：

1. 下载对应平台的压缩包
2. 解压到任意目录
3. 运行可执行文件启动

## 从源码运行

需要 Node.js >= 18：

```bash
npm install
npm start
```

Windows 开发快捷方式：双击 `start.bat`。

## 打包

```bash
npm run build:win      # Windows x64
npm run build:mac      # macOS Intel
npm run build:mac-arm  # macOS Apple Silicon
```

打包产物输出到 `dist/` 目录。

## 工作原理

1. 启动后监听 `~/.claude/projects/` 目录下所有 JSONL 会话文件
2. 解析 JSONL 条目中的 `type`（assistant/user）和 `stop_reason`（tool_use/end_turn）
3. 聚合多个并发会话的状态，按优先级：编码 > 思考 > 完成 > 空闲
4. 将状态通过 IPC 推送到渲染进程，Canvas 2D 实时绘制像素动画

## 项目结构

```
claude-pet/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.js    # 应用入口 + 业务逻辑
│   │   ├── pet-window.js
│   │   ├── config-window.js
│   │   ├── settings.js
│   │   └── tray-manager.js
│   ├── behavior/       # 行为系统
│   │   ├── state-machine.js   # 状态机 + 方向解析
│   │   ├── auto-walk.js       # 自主行走
│   │   ├── idle-behavior.js   # 空闲动画
│   │   ├── follow-mouse.js    # 跟随鼠标
│   │   └── greeting.js        # 问候系统
│   ├── sprite/         # 精灵图系统
│   │   ├── sprite-extractor.js
│   │   └── skin-discovery.js
│   ├── nurture/        # 养成系统
│   │   ├── foods.js
│   │   ├── growth.js
│   │   ├── pet-state.js
│   │   └── random-events.js
│   ├── ipc/            # IPC 通信
│   ├── monitor/        # JSONL 监听
│   ├── decoration/     # 装饰系统
│   └── utils/          # 工具函数
├── assets/
│   ├── pet.html        # 渲染器 + Canvas 动画
│   ├── config.html     # 设置界面
│   ├── skins/          # 皮肤精灵图
│   └── decorations/    # 装饰物资源
└── package.json
```

## 自定义皮肤

皮肤使用精灵图（PNG）+ 配置文件（JSON）格式。在 `assets/skins/` 下新建目录：

```
assets/skins/my_skin/
├── skin.json    # 皮肤配置
└── sprite.png   # 精灵图
```

`skin.json` 定义动画行列、帧数、速度。参考已有皮肤目录结构。

## 技术栈

- Electron 33
- Canvas 2D 像素渲染
- PNG 精灵图提取（pngjs）
- 原生 fs.watch 文件监听

## 致谢

灵感来源：[Joe-fly/claude-pet](https://github.com/Joe-fly/claude-pet)

## License

[AGPL-3.0](LICENSE)
