# 仲子龙 · 个人主页

一个基于个人简历制作的静态自我介绍网站，包含个人简介、技能、教育与工作经历、项目经历、荣誉证书、联系方式等板块。

## 文件结构

```
personal-website/
├── index.html        # 页面结构（含留言板）
├── css/
│   └── style.css     # 样式（深蓝主色调，响应式）
├── js/
│   ├── main.js       # 交互（导航高亮、打字机、滚动动画等）
│   ├── config.js     # 站点配置（Supabase 连接信息）
│   └── guestbook.js  # 留言板逻辑（读写数据库 / 演示模式）
└── supabase/
    └── schema.sql    # 留言板建表脚本（含 RLS 与测试数据）
```

## 本地预览

直接用浏览器打开 `index.html` 即可，无需安装任何依赖。

## 留言板功能

页面新增了「留言板」板块，任何访问网站的游客都可以：

- **查看留言**：进入页面自动加载全部留言；
- **发表留言**：填写昵称与内容即可发布（邮箱选填），发布后实时出现在列表顶部；
- **实时更新**：接入 Supabase 后，其他访客的新留言无需刷新页面即可显示。

### 默认模式：本地演示

`js/config.js` 中的 Supabase 配置留空时，留言板自动进入**演示模式**：
留言保存在浏览器本地存储（localStorage）中，内置了 3 条测试数据，
无需任何后端即可体验完整的留言、读取与持久化流程。

### 接入 Supabase（正式数据库）

1. 到 [supabase.com](https://supabase.com/dashboard) 注册并创建一个项目（免费）；
2. 打开项目 **SQL Editor**，粘贴并运行 `supabase/schema.sql`（自动完成建表、权限与测试数据）；
3. 打开项目 **Settings → API**，复制 **Project URL** 与 **anon public key**；
4. 将两个值填入 `js/config.js` 保存，刷新页面即可。

配置完成后，右上角徽标会从「演示模式（本地存储）」变为「已连接云端数据库」，
留言将真正保存到 Supabase 的 `messages` 表中，任何访客都能看到。

### 数据库说明（supabase/schema.sql）

| 项 | 说明 |
| --- | --- |
| 表 `messages` | 字段：`id`、`name`、`content`、`email`（选填）、`created_at` |
| 行级安全 RLS | 仅开放 `select`（游客可看）与 `insert`（游客可留言），不开放改删 |
| 实时推送 | 已把表加入 `supabase_realtime` 发布，新留言自动同步到页面 |
| 测试数据 | 脚本末尾插入了 3 条测试留言，正式上线前可删除 |

## 部署建议

- **GitHub Pages**：将本目录内容推送到仓库，在仓库设置中开启 Pages 即可。
- **Netlify / Vercel**：把本目录作为站点目录上传或连接仓库部署。

## 自定义

- 修改个人信息：编辑 `index.html` 中对应内容。
- 调整配色：修改 `css/style.css` 顶部的 `:root` 变量。
- 修改打字机文案：编辑 `js/main.js` 中的 `roles` 数组。
