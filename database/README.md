# 数据库集合与索引

本项目使用微信云开发数据库，共 7 个集合。可通过 `initData` 云函数一键创建并写入种子数据，也可在云开发控制台手动创建。

## 集合清单

| 集合名 | 用途 |
|---|---|
| `subjects` | 学科 |
| `knowledge_points` | 知识点 |
| `questions` | 题目（含选项、答案、分步解析） |
| `users` | 用户（openid/unionid/昵称/头像/身份，主键 = openid） |
| `answer_records` | 用户答题记录 |
| `mistake_book` | 错题本 |
| `mastery` | 知识点掌握度 |

## 推荐索引

| 集合 | 索引字段 | 类型 |
|---|---|---|
| `questions` | `knowledgePointId` + `difficulty` + `status` | 组合索引 |
| `users` | `openid` | 唯一索引（主键已保证） |
| `users` | `unionid` | 普通索引（跨应用身份查询） |
| `answer_records` | `userId` + `answeredAt`（降序） | 组合索引 |
| `answer_records` | `userId` + `questionId` | 组合索引 |
| `mistake_book` | `userId` + `status` | 组合索引 |
| `mistake_book` | `userId` + `questionId` | 唯一索引 |
| `mastery` | `userId` + `knowledgePointId` | 唯一索引 |
| `mastery` | `userId` + `subjectId` | 组合索引 |

## 权限建议

所有读写均通过云函数完成，客户端不直接访问数据库，因此各集合权限可统一设置为「仅创建者可读写」或「所有用户不可读写（仅管理端可读写）」。

## 字段定义

完整字段说明与实体关系详见根目录 `DESIGN.md` 第四章「数据结构设计」。
