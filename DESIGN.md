# 高中练习题小程序 · 设计文档

> 面向高中学生的「学科/知识点/难度分类练习题 + 分步解析 + 错题本 + 知识点掌握度统计」小程序。
> 技术栈：原生微信小程序 + 微信云开发（云函数 / 云数据库 / 云存储）。

---

## 一、产品定位与差异化

| 能力 | 同类项目现状 | 本项目 |
|---|---|---|
| 题目分类 | 多数仅按「题库/试卷」 | 按 **学科 → 知识点 → 难度** 三级分类 |
| 题型 | 单选/判断为主 | 单选 / 多选 / 填空 / 解答题 |
| 解析 | 一段式「解析」文本 | **分步解析**：解题思路总述 + 循序渐进的步骤，可逐条揭示、可先思考再看 |
| 错题 | 简单列表 | 错题本 + 重复错题计数 + 笔记 + 已掌握标记 |
| 统计 | 总分/正确率 | **按知识点** 计算掌握度，识别薄弱点并一键巩固练习 |

---

## 二、页面结构与跳转关系

共 8 个页面，其中 4 个为 TabBar 页面。

```
TabBar（底部导航）
├─ 首页 pages/index         学科入口 + 学习概览 + 快捷入口（去刷题/去错题/去巩固）
├─ 错题本 pages/mistakes     错题列表（可按学科筛选、重做、标记掌握）
├─ 统计 pages/stats          知识点掌握度总览 + 薄弱点推荐
└─ 我的 pages/mine           个人信息、学习数据、关于

非 Tab 页面
├─ 学科选择 pages/subject     学科九宫格选择
├─ 选题页 pages/knowledge     选定学科下的知识点 + 难度选择，发起练习
├─ 答题页 pages/practice      逐题作答（单选/多选/填空/解答）
└─ 解析页 pages/result        判题结果 + 解题思路 + 分步引导（核心页面）
```

### 跳转关系（导航图）

```
[首页] --点学科--> [学科选择] --选学科--> [选题页(知识点+难度)]
                                            │ 开始练习
                                            ▼
                                       [答题页] --提交--> [解析页(分步讲解)]
                                            ▲                    │
                                            │                    ├─ 下一题 ──→ 回到[答题页]
                                            │                    ├─ 加入错题(自动) 
                                            │                    ├─ 重做本题 ──→ [答题页]
                                            │                    └─ 返回 ──→ [首页]
[首页] --快捷入口--> [错题本] / [统计]
[错题本] --点某错题--> [解析页]（可重做）
[统计]   --点薄弱知识点--> [选题页]（自动带入该知识点，一键巩固）
```

### 各页面职责

| 页面 | 主要功能 | 关键交互 |
|---|---|---|
| 首页 index | 学科入口、今日已练/正确率、快捷按钮 | 点学科 → 学科选择；点卡片 → 错题/统计 |
| 学科选择 subject | 展示全部学科 | 选学科 → 选题页 |
| 选题页 knowledge | 展示该学科知识点（含各自掌握度）、难度选择、题量 | 勾选知识点 + 难度 + 题量 → 开始练习 |
| 答题页 practice | 逐题展示、答案输入/选择、进度条 | 选择/填写 → 下一题；全部完成后提交 |
| 解析页 result | 判题结果、解题思路总述、分步引导 | **逐步揭示**：查看下一步 / 先思考；下一题 / 重做 / 返回 |
| 错题本 mistakes | 错题列表、按学科筛选、重做、标记已掌握、写笔记 | 点题目 → 解析页 |
| 统计 stats | 各学科/知识点掌握度列表或柱状展示、薄弱点榜单 | 点薄弱点 → 一键巩固练习 |
| 我的 mine | 学习总量、正确率、清缓存等 | — |

---

## 三、核心功能流程

### 1. 选题 → 组卷
```
进入首页 → 选择学科 → 进入选题页
  → 展示该学科知识点（带各自掌握度小标签）
  → 勾选一个或多个知识点、选择难度(简单/中等/困难/不限)、选择题量(如 5/10/20)
  → 点击「开始练习」
  → 云函数 getQuestions 按条件随机抽取已发布题目（剔除最近做过的可选）
  → 进入答题页
```

### 2. 答题
```
答题页逐题展示（题干 + 选项/填空输入/解答输入）
  ├─ 单选：点选项选中
  ├─ 多选：点选项多选（可取消）
  ├─ 填空：输入框（支持多空）
  └─ 解答：多行文本框 / 可选拍照上传
  → 记录每题用时 → 全部答完点「提交」
```

### 3. 提交判题（云函数 submitAnswer，事务处理）
```
前端提交 { questionId, userAnswer, timeSpent }
  → 云函数加载题目标准答案，客观题自动判分：
      · 单选/多选：比较选项 key 集合
      · 填空：忽略大小写/首尾空格后比对（支持多空、多个等价答案）
      · 解答题：关键词命中给分；无关键词时标记「待批改」由教师/管理员补判
  → 写入三类数据（顺序执行；生产环境高并发场景可升级为事务）：
      1) answer_records 答题记录（含得分、是否答对、查看到第几步）
      2) mistake_book  错题本：答错则 upsert（wrongCount+1，状态 open）
                         答对且有 open 记录则标记 resolved
      3) mastery       知识点掌握度：totalCount+1，correctCount 累加，重算掌握率
  → 返回 { isCorrect, score, correctAnswer, analysis, steps, mastery }
```

### 4. 查看分步讲解（核心体验）
```
解析页首先展示：
  · 对错结果 + 得分
  · 「解题思路」总述（整体讲解）
  · 分步引导列表：步骤1/步骤2/…/步骤N
交互模式（两种，可切换）：
  · 逐步模式：默认只显示第 1 步，点「查看下一步」逐条展开
  · 思考模式：先只看题目/自己思考，点「我思考好了」再展开下一步
  每展开一步，记录 stepRevealed 到答题记录（用于统计学生是否真的看了讲解）
  → 全部展开后可「下一题 / 重做本题 / 返回首页」
```

### 5. 错题本
```
答错自动进入错题本（记录 wrongCount）
  → 错题本列表可按学科筛选、按状态(未掌握/已掌握)过滤
  → 点某错题 → 解析页查看讲解，可「重做本题」
  → 重做答对 → 错题状态标记为 resolved（可手动取消）
  → 支持写笔记、手动移除
```

### 6. 掌握度统计与薄弱点巩固
```
统计页读取 mastery 集合：
  → 按学科聚合：总练习数、正确数、平均掌握率
  → 按知识点列出掌握率，标注「薄弱」(掌握率 < 60% 或 练习数过少)
  → 点某个薄弱知识点 → 跳转选题页并自动带入该知识点 → 一键生成巩固练习
```

---

## 四、数据结构设计（云数据库集合）

### 1. `subjects` 学科
| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 主键（自动） |
| name | string | 学科名，如「数学」 |
| icon | string | 图标（emoji 或图片路径） |
| color | string | 主题色 |
| order | number | 排序 |

### 2. `knowledge_points` 知识点
| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 主键 |
| subjectId | string | 所属学科 _id |
| name | string | 知识点名，如「二次函数」 |
| parentId | string | 父知识点 _id（支持层级，顶级为空串） |
| order | number | 排序 |

### 3. `questions` 题目（核心）
| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 主键 |
| subjectId | string | 学科 |
| knowledgePointId | string | 知识点 |
| difficulty | number | 难度 1=简单 2=中等 3=困难 |
| type | string | 题型 `single`/`multiple`/`fill`/`solution` |
| stem | string | 题干（文本，可含富文本/图片 url） |
| stemImage | string | 题干配图 url（可选） |
| options | array | 选择题选项 `[{key:"A", text:"…"}]`（单选/多选） |
| answer | object | 标准答案（见下） |
| analysis | string | 解题思路总述 |
| steps | array | 分步解析（见下，核心） |
| tags | array | 标签 |
| source | string | 来源/年份 |
| status | string | `published`/`draft` |
| createdBy / createdAt | — | 创建信息 |

`answer` 结构（按题型）：
```jsonc
{
  // 单选/多选
  "keys": ["A", "C"],
  // 填空（支持多空、每空多个等价答案）
  "blanks": [["答案1", "等价答案"], ["答案2"]],
  // 解答题
  "reference": "参考答案与评分要点…",
  "keywords": ["关键词A", "关键词B"]   // 辅助关键词判分，空则标记待批改
}
```

`steps` 结构（分步解析，核心差异点）：
```jsonc
[
  { "order": 1, "title": "第一步：审题转化", "content": "把…条件转化为…" },
  { "order": 2, "title": "第二步：建立方程", "content": "由…得…" },
  { "order": 3, "title": "第三步：求解",      "content": "解得 x=…" }
]
```

### 4. `answer_records` 答题记录
| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 主键 |
| userId | string | 学生 openid |
| questionId | string | 题目 _id |
| subjectId / knowledgePointId | string | 冗余，便于统计 |
| difficulty / type | — | 冗余 |
| userAnswer | object | 结构化用户答案 `{keys:[]}` / `{blanks:[]}` / `{text:""}` |
| isCorrect | boolean | 是否答对 |
| score | number | 得分 0-100 |
| timeSpent | number | 用时（秒） |
| stepRevealed | number | 查看到第几步（0=没看讲解） |
| answeredAt | Date | 作答时间 |

### 5. `mistake_book` 错题本
| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 主键 |
| userId | string | 学生 openid |
| questionId | string | 题目 _id |
| subjectId / knowledgePointId | string | 冗余 |
| wrongCount | number | 累计答错次数 |
| lastWrongAt | Date | 最近一次答错时间 |
| status | string | `open` 未掌握 / `resolved` 已掌握 |
| note | string | 学生笔记 |

### 6. `mastery` 知识点掌握度
| 字段 | 类型 | 说明 |
|---|---|---|
| _id | string | 主键 |
| userId | string | 学生 openid |
| subjectId | string | 学科 |
| knowledgePointId | string | 知识点 |
| totalCount | number | 累计练习数 |
| correctCount | number | 累计答对数 |
| masteryRate | number | 掌握率 correctCount/totalCount |
| lastPracticedAt | Date | 最近练习时间 |
| updatedAt | Date | 更新时间 |

### 7. `users` 用户（微信授权登录）
以 **openid 作为文档主键 `_id`**，与业务表 `userId` 对齐。

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 主键 = openid（唯一） |
| `openid` | string | 微信 openid（冗余存储便于查询） |
| `unionid` | string | 微信 unionid（跨应用统一身份，非必填） |
| `appid` | string | 当前小程序 AppID |
| `nickname` | string | 昵称（用户主动填写，可为空） |
| `avatarUrl` | string | 头像（云存储 `cloud://` fileID，可为空） |
| `role` | string | 身份 `student` / `teacher` / `admin` |
| `status` | string | `active` / `banned` |
| `loginCount` | number | 累计登录次数 |
| `firstLoginAt` | Date | 首次登录时间 |
| `lastLoginAt` | Date | 最近登录时间 |
| `createdAt` / `updatedAt` | Date | 创建 / 更新时间 |

### 关系说明
```
users(openid) 1 ──── N answer_records N ──── 1 questions
users(openid) 1 ──── N mistake_book    N ──── 1 questions
users(openid) 1 ──── N mastery         N ──── 1 knowledge_points
subjects 1 ──── N knowledge_points 1 ──── N questions
                                   (question 内嵌 options / answer / steps)
```
> 业务表通过 `userId = openid = users._id` 关联用户，云函数统一从 `getWXContext()` 取 `OPENID` 作为 `userId` 读写，保证数据隔离与可追溯。

### 推荐索引
- `questions`: `subjectId + knowledgePointId + difficulty + status`
- `users`: `openid`（唯一，主键保证）、`unionid`
- `answer_records`: `userId + answeredAt`、`userId + questionId`
- `mistake_book`: `userId + status`、`userId + questionId`（唯一）
- `mastery`: `userId + knowledgePointId`（唯一）、`userId + subjectId`

---

## 五、云函数清单

| 云函数 | 触发 | 职责 |
|---|---|---|
| login | 启动时 | 静默登录：获取 openid/unionid，users 集合首次建号 / 重复更新，返回用户信息 |
| updateProfile | 完善资料 | 保存昵称、头像（云存储 fileID）到 users |
| initData | 手动执行一次 | 建集合 + 写入种子数据 |
| getSubjects | 首页/学科页 | 返回全部学科 |
| getKnowledgePoints | 选题页 | 返回某学科知识点 + 当前用户掌握度 |
| getQuestions | 选题 | 按学科/知识点/难度随机抽题（不返回答案） |
| getQuestionDetail | 解析页/错题重看 | 返回单题详情（`withAnswer` 控制是否含答案与分步解析） |
| submitAnswer | 提交 | 判题 + 写答题记录/错题本/掌握度 |
| getMistakes | 错题本 | 分页查错题（联表补全题目/学科/知识点名称） |
| getStats | 统计 | 聚合掌握度 + 薄弱点 |
| updateStepRevealed | 解析页切题/退出 | 记录学生查看分步解析的进度 |
| updateMistake | 错题本 | 错题状态更新 / 移除 |

> 登录流程、users 表字段、异常处理详见 `docs/微信授权登录设计说明.md`。

---

## 六、部署步骤（简述）

1. 在微信开发者工具中导入本项目，填写 AppID。
2. 开通云开发环境，将 `utils/config.js` 的 `envId` 换成你的环境 ID。
3. 右键 `cloudfunctions` 下每个函数 → 上传并部署（云端安装依赖）。
4. 运行一次 `initData` 云函数（在控制台或工具中调用），初始化集合与种子题库。
5. 编译预览，开始使用。

（完整步骤见 `README.md`。）
