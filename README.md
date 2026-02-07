# English Learning Chrome Extension

一个帮助英语学习的Chrome浏览器扩展。

## 功能特点

- **一键查词**: 点击网页上的任意英文单词即可查询
- **即时发音**: 自动朗读单词（TTS）
- **双语释义**: 提供中英文双语解释
- **生词本管理**: 自动保存查询的单词，支持搜索、删除
- **原文跳转**: 点击例句可直接跳转到原文页面
- **视觉反馈**: 黄色高亮显示选中的单词

## 安装方法

1. 打开 Chrome 浏览器，访问 `chrome://extensions`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目文件夹

## 使用说明

1. 在任意英文网页上点击单词
2. 扩展会自动：
   - 朗读单词
   - 显示黄色高亮
   - 弹出中英文释义
   - 保存到生词本
3. 右键点击扩展图标 → 选项，打开生词本管理页面

## 技术栈

- Manifest V3
- Chrome Extension APIs (storage, tts, runtime)
- Vanilla JavaScript
- Dictionary API & Youdao API

## 文件结构

```
├── manifest.json          # 扩展配置文件
├── background.js          # 后台脚本（API调用、存储）
├── content.js            # 内容脚本（页面交互）
├── icons/                # 图标文件
├── popup/                # 弹窗页面
└── manager/              # 生词本管理页面
```

## 开发说明

- 图标使用 Python PIL 生成标准 PNG 格式
- 支持无限存储（unlimitedStorage 权限）
- 使用 capture phase 事件监听确保兼容性

## License

MIT
