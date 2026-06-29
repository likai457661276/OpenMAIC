# Auto Teacher 正式环境接入配置

本文说明 `/bingo-agent-class/auto-teacher` 被父系统通过 `iframe` 引用时，正式环境需要配置的地址、白名单和验证方式。

## 1. 地址关系

自动教案入口由两个系统共同完成：

- 父窗口系统：贵州教师端，例如 `https://qsh.example.com`
- OpenMAIC：自动教案 iframe 页面，例如 `https://openmaic.example.com/bingo-agent-class/auto-teacher`

如果两个系统不是完全同源，包含协议、域名、端口任意一项不同，都需要配置 iframe 与 postMessage 白名单。

当前内置支持的正式父窗口 origin：

```text
https://bingo-teaching.app.bin-go.cc
http://bingo-teaching.app.bin-go.cc
```

注意：OpenMAIC 页面地址可以带 basePath，例如：

```text
https://bingo-teaching.app.bin-go.cc/bingo-agent-class/auto-teacher
```

但白名单配置只写 origin：

```text
https://bingo-teaching.app.bin-go.cc
```

不要写成：

```text
https://bingo-teaching.app.bin-go.cc/bingo-agent-class
```

同源示例：

```text
父窗口：https://openmaic.example.com
iframe：https://openmaic.example.com/bingo-agent-class/auto-teacher
```

跨源示例：

```text
父窗口：https://qsh.example.com
iframe：https://openmaic.example.com/bingo-agent-class/auto-teacher
```

不同端口也属于跨源：

```text
父窗口：https://qsh.example.com:8443
iframe：https://openmaic.example.com:9443/bingo-agent-class/auto-teacher
```

## 2. OpenMAIC 环境变量

在 OpenMAIC 正式环境中配置父窗口 origin：

```env
NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS=https://qsh.example.com
```

如果父窗口带端口，必须写完整端口：

```env
NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS=https://qsh.example.com:8443
```

如果有多个父窗口地址，用英文逗号分隔：

```env
NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS=https://qsh.example.com,https://qsh-admin.example.com:8443
```

也支持空格分隔，Docker Compose 中建议仍使用逗号，避免 YAML/平台变量处理差异：

```env
NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS=https://qsh.example.com,https://school.example.com,https://admin.example.com:8443
```

注意：这里配置的是 origin，只包含协议、域名、端口，不要带路径。

正确：

```env
NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS=https://qsh.example.com:8443
```

错误：

```env
NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS=https://qsh.example.com:8443/course-detail
```

该变量同时用于：

- `Content-Security-Policy: frame-ancestors`，允许父窗口 iframe 嵌入 OpenMAIC
- 自动教案入口的 `postMessage` 来源校验

## 3. 可选：通用 iframe 白名单

如果还有其他页面也需要 iframe 嵌入 OpenMAIC，可以继续使用通用配置：

```env
ALLOWED_FRAME_ANCESTORS=https://partner.example.com https://dashboard.example.com:8443
```

`ALLOWED_FRAME_ANCESTORS` 使用空格或逗号分隔均可。OpenMAIC 会把它和 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS` 合并去重后写入 CSP。

通常只接入自动教案入口时，配置 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS` 即可。

## 4. 父系统文档解析

自动教案入口不再由 OpenMAIC 服务端请求 `file_url` 或解析 PDF。父系统必须先在自身网络上下文中完成 Word/PDF 解析，并在 `AUTO_TEACHER_GENERATE` 消息里传入 `pdf_text` 或 `pdfText`。

`file_url` 可以作为可选来源字段保留，但 OpenMAIC 不会用它下载文件。这样可以避免测试域名、fake-ip DNS、浏览器代理或父系统内网文件只对父系统可读时，OpenMAIC 服务端二次抓取失败。

## 5. 父窗口项目环境变量

父窗口项目需要配置 iframe 页面地址：

```env
VITE_AI_OPENMAIC_AUTO_TEACHER_URL=https://openmaic.example.com/bingo-agent-class/auto-teacher
```

如果未配置该变量，父项目会尝试用 `VITE_AI_OPENMAIC_URL` 自动拼接 `/auto-teacher`：

```env
VITE_AI_OPENMAIC_URL=https://openmaic.example.com/bingo-agent-class
```

推荐正式环境显式配置 `VITE_AI_OPENMAIC_AUTO_TEACHER_URL`，避免路径被反向代理或 basePath 影响。

## 6. 重启与构建

OpenMAIC 的自动教案白名单同时用于服务端响应头和客户端 `postMessage` 校验。

Docker 生产部署中，客户端不能依赖构建期固化的 `NEXT_PUBLIC_*` 值。当前实现会在请求 `/auto-teacher`、`/auto-import-teacher` 时由服务端读取运行时环境变量并注入页面，因此修改白名单后至少需要重启容器；如果镜像中还包含旧代码，则需要重新构建并发布。

Docker 部署示例：

```bash
docker compose up --build -d
```

如果只改环境变量且镜像代码已经是新版本，可以重启容器：

```bash
docker compose up -d
```

如果使用平台部署，请在平台环境变量中配置后重新发布。为避免平台缓存旧镜像，推荐确认发布后的响应头和页面构建版本。

父窗口项目的 `VITE_` 环境变量会在构建时注入，正式环境修改后也需要重新构建父项目。

## 7. 验证方法

### 7.1 检查 iframe 地址

在父窗口页面打开浏览器 DevTools，选中自动教案 iframe，确认：

```html
<iframe src="https://openmaic.example.com/bingo-agent-class/auto-teacher?..."></iframe>
```

`src` 不能为空。

### 7.2 检查 CSP 响应头

请求 OpenMAIC 页面：

```bash
curl -I https://openmaic.example.com/bingo-agent-class/auto-teacher
```

响应头应包含父窗口 origin：

```text
Content-Security-Policy: frame-ancestors 'self' https://qsh.example.com
```

当前正式域名至少应看到：

```text
Content-Security-Policy: frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc
```

如果父窗口带端口，响应头也要带相同端口：

```text
Content-Security-Policy: frame-ancestors 'self' https://qsh.example.com:8443
```

配置跨源嵌入后，不应再返回：

```text
X-Frame-Options: SAMEORIGIN
```

否则浏览器仍可能阻止 iframe。

### 7.3 检查 postMessage

父窗口发送消息格式：

```ts
iframe.contentWindow?.postMessage(
  {
    type: "AUTO_TEACHER_GENERATE",
    pdf_text: "# 第一课时\n\n教学目标：...",
    courseware_name: "认识平面图形",
    model: "qwen:deepseek-v4-flash"
  },
  "https://openmaic.example.com"
);
```

OpenMAIC 会回传：

```ts
{ type: "AUTO_TEACHER_STATUS", stage: "received" }
{ type: "AUTO_TEACHER_STATUS", stage: "preparing_session" }
{ type: "AUTO_TEACHER_READY", nextPath: "/bingo-agent-class/generation-preview" }
```

## 7. 常见问题

### Framing violates Content Security Policy

浏览器控制台报错：

```text
Framing 'https://openmaic.example.com/...' violates the following Content Security Policy directive: "frame-ancestors 'self'"
```

处理方式：

1. 确认 OpenMAIC 配置了 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS`
2. 确认值是父窗口 origin，不是 iframe 地址
3. 确认协议和端口完全一致
4. 重启或重新部署 OpenMAIC
5. 用 `curl -I` 检查响应头是否已更新

### postMessage target origin 不匹配

浏览器控制台报错：

```text
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided does not match the recipient window's origin
```

处理方式：

1. 确认父项目 `VITE_AI_OPENMAIC_AUTO_TEACHER_URL` 指向真实 OpenMAIC 自动教案页面
2. 不要让 iframe `src` 为空
3. 如果经过反向代理，确认最终 iframe URL 的协议、域名、端口与 postMessage targetOrigin 一致

### 教案文本未传入

自动教案入口要求父窗口传入 `pdf_text` 或 `pdfText`。如果缺少该字段，OpenMAIC 会返回 `AUTO_TEACHER_ERROR`。

需要确认：

1. 父系统已调用自身文档解析接口并拿到 markdown/text
2. postMessage payload 中包含非空 `pdf_text` 或 `pdfText`
3. 不要依赖 `file_url` 让 OpenMAIC 二次读取 PDF
