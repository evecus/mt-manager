# MT管理器 (Windows)

一款为 Windows 设计的现代文件管理器，灵感来自安卓平台的 MT 管理器，采用 Tauri 2 + React 构建。

## 功能

| 功能 | 说明 |
|------|------|
| 双窗格 | 左右两栏独立浏览，方便文件复制/移动 |
| 文本编辑器 | Monaco Editor，支持 50+ 语言语法高亮 |
| HEX 查看器 | 十六进制查看 + 字节搜索 |
| 图片查看器 | PNG/JPG/GIF/WebP/SVG/BMP/ICO |
| 压缩包 | 预览/解压 ZIP · TAR · GZ · TGZ · BZ2 · XZ |
| 文件搜索 | 文件名（正则）+ 文件内容全文搜索 |
| 批量重命名 | 查找替换、正则、序号、前后缀、大小写转换 |
| 文件属性 | MD5 / SHA-256 校验值、元数据 |
| 快捷键 | Ctrl+C/X/V、Delete、F2、F5、方向键等 |

## 从 GitHub 自动编译（推荐）

1. Fork 本仓库到你的 GitHub
2. 打一个 tag（如 `v1.0.0`），或直接 push 到 `main`
3. GitHub Actions 自动在 Windows 环境编译
4. 在仓库 **Releases** 页下载 `.msi` 或 `.exe` 安装包

```bash
# 打 tag 触发 Release 构建
git tag v1.0.0
git push origin v1.0.0
```

## 本地编译

**前置要求：**
- [Rust](https://rustup.rs) (stable)
- [Node.js 20+](https://nodejs.org)
- Windows 10/11（或 Linux/macOS 用于开发）

```bash
git clone <your-repo>
cd mt-manager
npm install
npm run tauri build
```

输出在 `src-tauri/target/release/bundle/`

## 开发模式

```bash
npm install
npm run tauri dev
```

## 快捷键

| 按键 | 功能 |
|------|------|
| Enter | 打开/进入 |
| F2 | 重命名 |
| F5 | 刷新 |
| Delete | 删除 |
| Backspace | 返回上级 |
| Ctrl+A | 全选 |
| Ctrl+C/X/V | 复制/剪切/粘贴 |
| Ctrl+S | 编辑器保存 |
| ↑↓ + Shift | 移动/范围选择 |
| Ctrl+单击 | 多选 |

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **编辑器**: Monaco Editor (VS Code 同款内核)
- **后端**: Rust + Tauri 2
- **压缩库**: zip · tar · flate2 · bzip2 · xz2
- **哈希**: sha2 · md5
