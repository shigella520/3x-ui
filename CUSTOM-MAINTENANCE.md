# 自用镜像维护

仓库：https://github.com/shigella520/3x-ui

维护分支：`custom`（fork 的默认分支）。`main` 保留上游基线；自己的修改都提交到 `custom`。

镜像：`ghcr.io/shigella520/3x-ui:custom`，支持 Linux AMD64 和 ARM64。

本分支已移除登录页和仪表盘广告、赞助商页面及导航入口、侧边栏捐赠按钮，以及后端赞助配置下载和图片代理接口。同步上游时请检查这些功能是否被重新引入。

## 日常修改和发布

```bash
cd /Users/jianyutan/GitLab/3x-ui
git switch custom
git pull --ff-only origin custom
# 修改代码后，明确选择要提交的文件：
git add <修改的文件>
git commit -m "说明修改内容"
git push origin custom
```

推送后，GitHub Actions 中的 **Custom image** 自动执行：

1. 前端 lint、格式、类型、单元/组件测试及生产构建。
2. Go 测试（不启动额外的 PostgreSQL 集成测试服务）。
3. 检查通过后，在 AMD64 和 ARM64 原生 runner 上使用原项目的 `Dockerfile` 构建。
4. 两个架构的二进制版本命令冒烟检查通过后，发布多架构镜像。

PR 到 `custom` 仅运行检查，不发布。也可以在 Actions → Custom image → Run workflow 中选择 `custom` 手动重新构建。其他分支不会发布镜像。

工作流使用 GitHub 自动提供的 `GITHUB_TOKEN`，无需 Docker Hub 账号或额外 Secrets。镜像包若为私有，服务器需要使用有 `read:packages` 权限的 GitHub Token 登录 GHCR；也可在 GitHub Packages 的包设置中将其设为公开，允许匿名拉取。

每次成功发布包含：

- `custom`：最近成功发布的版本；构建或检查失败不会推进此标签。
- `sha-<完整提交SHA>`：按代码提交定位的镜像。手动重跑同一提交会重新构建并更新此标签。
- Manifest digest：运行摘要中显示；用 `ghcr.io/shigella520/3x-ui@sha256:...` 精确锁定某次构建。

不自动操作服务器。确认 Actions 成功后，再在服务器拉取更新。

## 部署和更新

已有 Docker Compose 部署时，保留原来的数据库、证书挂载、端口、网络、权限和环境变量，将对应服务的镜像改成：

```yaml
image: ghcr.io/shigella520/3x-ui:custom
```

如该服务含 `build:`，将其移除以使用 CI 发布的镜像。之后在服务器现有 Compose 目录运行（`3xui` 替换成实际服务名）：

```bash
docker compose pull 3xui
docker compose up -d --no-build 3xui
docker compose logs --tail=100 3xui
```

首次切换和跨版本更新前备份数据库及配置；SQLite 备份应使用面板备份功能或停服后复制完整数据目录。不要执行 `docker compose down -v`。回滚时将 `image:` 改回之前记录的提交标签或 digest，再执行上述命令；如新版做了不兼容的数据库迁移，还需恢复配套备份。

## 同步上游

本地远程地址：

- `origin`：自己的 fork，https://github.com/shigella520/3x-ui.git
- `upstream`：原项目，https://github.com/MHSanaei/3x-ui.git

先提交自己的修改，确保 `git status` 干净，再执行：

```bash
git switch custom
git pull --ff-only origin custom
git fetch upstream --tags
git log --oneline HEAD..upstream/main
git merge upstream/main
```

也可以同步已发布的版本，例如把最后一条替换为 `git merge v3.11.0`（换成目标版本）。只想采用某个独立修复时，可以 `git cherry-pick <上游提交SHA>`，但需确认它没有依赖其他提交；常规更新优先采用完整 merge。

有冲突时，解决冲突后 `git add <冲突文件>`、`git commit`；想取消这次合并可运行 `git merge --abort`。不要用 reset 或强制覆盖来同步，否则会丢掉自定义修改。

检查合并结果，尤其是新引入的工作流、Dockerfile 和数据库迁移，然后发布：

```bash
git push origin custom
```

检查通过后会自动重新打包。不需要推送 `v*` 标签，也不要在 GitHub 的 Sync fork 操作中选择丢弃自己的提交。

## 工作流管理

原项目的工作流文件保留不变，方便合并上游；在这个 fork 的 Actions 设置中禁用，只使用 `docker-custom.yml`。基础检查已经包含在新工作流里，原来的完整 `ci.yml` 不必重复执行。

查看状态：

```bash
gh workflow list --all --repo shigella520/3x-ui
```

如果上游以后新增其他工作流，合并前先查看其触发条件，确认是否会在 fork 执行；不需要的工作流应禁用。已有工作流的禁用状态属于 GitHub 仓库设置，通常不会因普通代码合并而改变。

保留上游 GPLv3 许可证及版权说明，公开分发镜像时提供对应源码。`DockerInit.sh` 仍会下载上游的 Xray、mtg-multi 和规则资源；这是独立维护面板镜像，并非所有依赖都自行托管。相同源码重新构建时，这些外部资源可能已有更新，因此精确部署和回滚请使用镜像 digest。
