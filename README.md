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

- **查看留言**：进入页面自动从 Supabase 云端加载全部留言；
- **发表留言**：填写昵称与内容即可发布（邮箱选填），发布后实时出现在列表顶部；
- **实时更新**：其他访客的新留言无需刷新页面即可显示（Realtime 推送）。

### 数据库（已连接）

`js/config.js` 已配置真实的 Supabase 项目，所有留言都保存在云端的 `messages` 表中，
任何访客都能读取和发表留言。更换 Supabase 项目时：新建项目 → 在 SQL Editor 运行
`supabase/schema.sql` → 把新的 **Project URL** 与 **anon public key** 填入 `js/config.js`
即可。若配置留空，留言板会自动使用浏览器本地存储兜底，便于离线预览。

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
