# 内容（Gerdr 面板）

给做自媒体的人管内容：每条内容是一个文件夹，稿子、文案、图、视频都在里面；交给 AI 在这个文件夹里做，做完在旁边的对话里接着改；发出去以后记下发到哪。照 Annulo「自媒体工作台」模板的内容模型做（`annulo-template-public/creator/docs/content-model.md`），去掉了选题、社媒发布和数据采集。

## 页面

- **内容**（`/`、`/c/<id>`）：宽屏上左边一列是所有内容，右边是打开的那条；手机上首页是列表。列表按状态（草稿 / 待发 / 已发）筛、按名字搜；「新建内容」写下要做什么（第一行是名字，整段存成 `稿子.md`），自己写或让 AI 做。
- **一条内容**（`/c/<id>`）：左边是它的文件夹（Gerdr 的 `ArtifactsFolder`：文件树、预览、Markdown 直接改、拖文件进来），右边是做它的 AI 对话（`SessionChat`）；「交给 AI」带预设，可以在这条上接着做，也可以「另写一篇」；「发布记录」手动记，或 AI 用工具记。
- **资料库**（`/library`）：几条内容共用的素材，一个共用文件夹。
- **写法**（`/writing`）：通用偏好和每个平台怎么写（小红书、抖音、公众号……），用户自己的话。就是 `skills/content-studio/` 里的 `写作偏好.md` 和 `platforms/<平台>.md`：面板带默认的，用户改的、加的平台存在 `user/skills/` 盖过默认（Gerdr 给对话的是合起来的 skill）。AI 在对话里听到长期偏好时用 `writing_update` 记进去。
- **我的定位**（`/profile`）：AI 写每条内容都照它。

## 面板 agent（页面右边那一栏）

管整个面板的 AI：用户在这里说「做一条讲 xx 的」「把待发的列出来」「定位改成……」，它用这个面板的函数去做（`gerdr panel run <函数> '<json>'`，`gerdr panel functions` 列全）：

- 新建：`contents.create {"text":"名字\n要做什么","ai":true}` —— 建好文件夹和 `稿子.md`，`ai` 为真就交给一个做内容的 AI 在那个文件夹里做（每条内容自己的对话，在内容页右边）。
- 接着做 / 另写一篇：`contents.handoff {"id","note"}`、`contents.derive {"id","note"}`。
- 查和改：`contents.list`、`contents.get {"id"}`、`contents.edit {"id","title?","status?"}`（status 是 draft / ready / published）、`contents.addPost`。
- 定位：`profile.get`、`profile.save {"profile"}`；写法就是 `skills/content-studio/` 下的文件（用户改的存 `user/skills/`）。

具体某一条的稿子由那条内容自己的 AI 写；面板 agent 负责分派、整理、跨几条内容的事（比如一个主题拆成几个平台各一条）。

## 数据和文件

- 文件夹在 `~/Gerdr/<项目>/内容/<名字>/`（`ctx.artifacts.folder`，按 id 认，在 Finder 里改名挪位置也找得到），资料库在 `~/Gerdr/<项目>/资料库/`。
- 列表、定位、预设在 `user/data/`（`contents.json`、`profile.json`、`presets.json`），只属于这个人，不进仓库。
- 一条内容一段 AI 对话（`contents.handoff`，cwd 是它的文件夹，标签 `content=<id>`）；再交给 AI 默认接着那段说。
- AI 拿到的工具（`local/agent.ts`）：`content_info`、`content_list`、`content_update`、`content_add_post`、`writing_read`、`writing_update`；怎么做内容写在 `skills/content-studio/SKILL.md`。
- `triggers/workers.json`：AI 做完一轮（不是用户自己在对话里说的那轮），这条内容标「AI 做完了」，面板按钮上加一个点。

## 没做的

- 选题（用户不要：新建就直接开始做）。
- 发到社媒、排期、数据采集（Annulo 的社媒插件那一套）。
