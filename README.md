# 高中刷题小程序（high-school-practice）

面向高中学生的「学科 / 知识点 / 难度分类练习题」小程序。支持选择题（单选/多选）、填空题、解答题，提交后给出**解题思路 + 循序渐进的分布式解析**（可逐步查看、可先思考再看下一步），并提供**错题本**与**知识点掌握度统计**，帮助学生针对薄弱环节巩固练习。

技术栈：**原生微信小程序 + 微信云开发**（云函数 / 云数据库 / 云存储），无需自建后端。

## 功能一览

- 📚 **三级分类**：学科 → 知识点 → 难度（简单/中等/困难），按需随机组卷
- ✍️ **四种题型**：单选、多选、填空、解答题
- 🧭 **分步解析**（核心）：判题后展示「解题思路」总述，解题过程拆成循序渐进步骤，可逐步揭示 / 先思考再看下一步
- 📕 **错题本**：答错自动收录、重复错题计数、重做、标记已掌握、笔记
- 📊 **掌握度统计**：按知识点计算掌握率，识别薄弱点，一键生成巩固练习

## 目录结构

```
├── miniprogram/                 # 小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── utils/                   # 配置 + 工具函数
│   └── pages/
│       ├── index/               # 首页（概览 + 快捷入口 + 薄弱点推荐）
│       ├── subject/             # 学科选择
│       ├── knowledge/           # 知识点 + 难度 + 题量选择
│       ├── practice/            # 答题（四题型）
│       ├── result/              # 判题结果 + 分步解析
│       ├── mistakes/            # 错题本
│       ├── stats/               # 掌握度统计
│       └── mine/                # 我的
├── cloudfunctions/              # 云函数
│   ├── login/                   # 获取 openid
│   ├── initData/                # 建集合 + 写入种子题库（含 seed.js）
│   ├── getSubjects/             # 学科列表
│   ├── getKnowledgePoints/      # 知识点 + 掌握度
│   ├── getQuestions/            # 随机抽题（不下发答案）
│   ├── getQuestionDetail/       # 单题详情
│   ├── submitAnswer/            # 判题 + 写记录/错题/掌握度
│   ├── getMistakes/             # 错题本（分页 + 联表）
│   ├── getStats/                # 掌握度聚合 + 薄弱点
│   ├── updateStepRevealed/      # 记录分步解析查看进度
│   └── updateMistake/           # 错题状态更新/移除
├── database/README.md           # 数据库集合与索引说明
├── DESIGN.md                    # 详细设计文档
└── project.config.json
```

## 快速开始

### 1. 准备环境

- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（建议 Nightly 版 ≥ 2.02.2608312）
- 注册一个**正式的小程序账号**并获取 AppID（注意：微信测试号不支持云开发）

### 2. 导入项目

1. 打开微信开发者工具 →「导入项目」，选择本项目根目录
2. 填写你的 AppID（或在 `project.config.json` 中把 `appid` 改为你的 AppID）

### 3. 开通云开发环境

1. 在开发者工具中点击「云开发」按钮开通环境（登录时选择「微信公众平台登录」）
2. 记录你的**环境 ID**（形如 `cloud1-xxxxxx`）
3. 打开 `miniprogram/utils/config.js`，把 `envId` 改为你的环境 ID

### 4. 部署云函数

在开发者工具中，对 `cloudfunctions` 下的**每个**函数目录右键 →「上传并部署：云端安装依赖」。共 11 个函数：

```
login, initData, getSubjects, getKnowledgePoints, getQuestions,
getQuestionDetail, submitAnswer, getMistakes, getStats,
updateStepRevealed, updateMistake
```

### 5. 初始化数据

部署完成后，在开发者工具的「云开发」控制台 →「云函数」中找到 `initData`，点击「云端测试」运行一次（参数可留空）。

它会自动：
- 创建 6 个集合（subjects / knowledge_points / questions / answer_records / mistake_book / mastery）
- 写入 2 门学科、5 个知识点、7 道示例题（覆盖四种题型，均带分步解析）

> 如需批量导入自己的题库，可参照 `cloudfunctions/initData/seed.js` 的数据结构，通过控制台导入 JSON 或编写脚本。

### 6. 编译运行

点击「编译」即可在模拟器中使用。真机体验需在「详情 → 本地设置」勾选「不校验合法域名」。

## 数据库集合

| 集合 | 说明 |
|---|---|
| `subjects` | 学科 |
| `knowledge_points` | 知识点（关联学科） |
| `questions` | 题目（内嵌 options / answer / steps） |
| `answer_records` | 答题记录 |
| `mistake_book` | 错题本 |
| `mastery` | 知识点掌握度 |

字段定义、索引建议与关系图详见 `DESIGN.md` 与 `database/README.md`。

## 判题规则

- 单选/多选：选项集合精确匹配
- 填空：忽略大小写与首尾空格，支持多空、每空多个等价答案
- 解答题：关键词命中给分；无关键词时标记为「待批改」（由教师/管理员补判）

## 说明

- AppID / EnvId 均以占位符形式存在，首次使用请按上述步骤替换
- 本项目为教学/起步参考实现，生产环境建议为 `mastery`、`mistake_book` 补充唯一索引，并对高频写操作引入事务与限流
