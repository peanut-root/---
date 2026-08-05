# Admin Console Guide

## 中文说明

`admin.html` 是研究者/管理员端，不给被试看。它的作用是配置实验、管理文本与 AI 生成、发布被试链接、回收和导出数据。

### 1. 实验参数配置

- 设置正式实验文本数量，建议 8 到 12 段。
- 固定体裁为 Narrative，避免不同体裁混入造成额外变量。
- 设置 Human-written、AI-generated、Human-AI hybrid 三类条件的数量。
- 选择是否启用 filler task，也就是元音/辅音按键判断任务。
- 查看核心按键映射，例如来源判断、记忆任务和 filler 任务。
- 设置目标被试数量，例如 100 人。

### 2. AI 文本后台生成

- 通过服务器端 `/api/generate-text` 调用 OpenAI-compatible API，不在被试页面暴露 key。
- 当前默认配置适配 ChatAnywhere：
  - Base URL: `https://api.chatanywhere.tech/v1`
  - Model: `gpt-4o-mini`
  - Temperature: `0.2`
- 可以编辑 `System instruction / AI role`，告诉模型它的前置身份，例如“你是一个受控文本生成器，需要生成与人工文本长度、难度、风格匹配的记叙文刺激材料”。
- 可以一次生成 1、2、3 或 5 篇候选文本，再由研究者人工筛选并保存到语料库。
- 结构化提示词预览会显示 Role、Task、配置、约束、few-shot 风格目标和人类参考文本。

### 3. 语料库管理

### 3. 正式配对刺激池

- `Matched Stimulus Pool` 会读取固定的 20 段 Human base passages。
- 点击 `Generate + Lock 20 Matched Sets` 后，后台会为每个 base passage 生成 1 个 AI-generated 版本和 1 个 Human-AI hybrid 版本。
- 生成完成后，服务器会保存 `stimuli/stimulus-pool.json`，共 60 条正式刺激：20 Human、20 AI、20 Hybrid。
- 正式被试端会读取这个锁定后的刺激池，并随机抽取 9-12 个 trial；同一位被试不会看到同一个 base passage 的多个版本。
- CSV 会记录 `text_base_id`、`text_pair_id`、真实文本类型、被试判断、生成模型、temperature 和 prompt version，方便后续分析。

### 4. 语料库管理

- 粘贴或保存 Human-written、AI-generated、Human-AI hybrid 文本。
- 给每段文本记录 ID、来源条件、题材、体裁、词汇难度、配对 ID。
- 可以手动记录 Hybrid 文本的拼接说明。
- 可以导出语料库 JSON，方便备份或后续整理正式材料。

### 5. 被试端发布控制

- Demo link 指向 demo 被试版，只用于演示，不会写入 admin 端 master CSV。
- Full participant link 指向正式实验版，正式完成后会自动提交到服务器 master CSV。
- 实际收数据时，只给被试正式被试端链接，不给 admin 链接。

### 6. 数据回收与导出

- 正式实验完成后，数据会提交到服务器端 `data/master-results.csv`。
- 被试中途刷新、关闭或退出页面时，该 session 会被视为未完成，不会写入正式 master CSV。
- 后端会拒绝 trial 数量不足或缺少关键答案/RT 的正式提交。
- 可以点击刷新服务器 Master CSV 摘要。
- 可以下载服务器 Master CSV 用于 SPSS、R、Python 或 Excel 分析。
- 如果有单独下载的 CSV，也可以粘贴或上传到 admin 端合并。

### 7. 进度监控

- 显示当前被试人数、总试次数、目标 N 和完成度。
- 按条件汇总行数、平均反应时 RT 和平均正确率。
- 被试编号由服务器按提交顺序生成，便于后续区分第 1 人、第 2 人等。

### 8. 中英切换

- 页面右上角可以切换 English / 中文。
- 语言切换只改变管理员界面显示，不改变内部数据字段。
- CSV 中的条件值仍保持英文，如 `Human-written`、`AI-generated`、`Human-AI hybrid`，方便统计分析。

## English Summary

`admin.html` is the researcher-only console. It configures the experiment, manages corpus materials and AI generation, publishes participant links, and monitors/export data.

- **Parameters**: text count, genre, condition allocation, filler task, key mappings, target sample size.
- **AI generation**: server-side OpenAI-compatible call with editable model, base URL, temperature, candidate count, system instruction, and structured prompt preview.
- **Matched stimulus pool**: one-click generation and locking of 20 matched Human / AI / Hybrid stimulus sets, saved to `stimuli/stimulus-pool.json`.
- **Corpus**: store human, AI, and hybrid passages with labels such as condition, topic, genre, difficulty, and pair ID.
- **Publishing**: copy demo and full participant links. Demo data is not added to the server master CSV; full experiment data is.
- **Data**: refresh/download server master CSV or manually merge CSV files.
- **Monitor**: track participant count, trial rows, target completion, mean RT, and mean accuracy by condition.
- **Language switch**: English/Chinese UI switching affects display only; data labels remain analysis-friendly English values.
