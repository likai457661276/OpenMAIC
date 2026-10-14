# Auto Teacher 正式环境接入配置

本文说明 `/bingo-agent-class/auto-teacher` 被父系统通过 `iframe` 引用时，正式环境需要配置的地址和验证方式。当前集成采用宽松 iframe 模式，不校验父窗口来源。

## 1. 地址关系

自动教案入口由两个系统共同完成：

- 父窗口系统：贵州教师端，例如 `https://qsh.example.com`
- OpenMAIC：自动教案 iframe 页面，例如 `https://openmaic.example.com/bingo-agent-class/auto-teacher`

两个系统可以不同源，无需为 iframe 或 `postMessage` 配置父窗口白名单。

注意：OpenMAIC 页面地址可以带 basePath，例如：

```text
https://bingo-teaching.app.bin-go.cc/bingo-agent-class/auto-teacher
```

iframe 地址必须保留完整 basePath：

```text
https://bingo-teaching.app.bin-go.cc/bingo-agent-class/auto-teacher
```

不要误写成缺少入口路径的地址：

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

## 2. OpenMAIC iframe 策略

OpenMAIC 固定返回以下响应头，并且不返回 `X-Frame-Options`：

```text
Content-Security-Policy: frame-ancestors *
```

`/auto-teacher` 和 `/auto-import-teacher` 只按消息类型和 payload 结构判断是否处理，不再校验 `event.origin`。因此无需配置 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS` 来启用新的父站点。

该宽松策略意味着任何站点都可以嵌入 OpenMAIC 并向入口发送格式正确的消息。部署方应确认这是所需的信任边界，并继续通过访问码、API 鉴权和下载 URL 校验保护后端资源。

## 3. 旧白名单变量

`ALLOWED_FRAME_ANCESTORS` 和 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS` 不再收紧 iframe 嵌入或 `postMessage`。其中 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS` 仍兼容作为服务端可信 ZIP/PDF 下载来源的一部分；下载防护如需额外来源，优先使用对应的专用变量。

## 4. 教案内容传入方式

自动教案入口兼容两种方式：父系统可以直接传入 `pdf_text`/`pdfText`，也可以只传 `file_url`。两者同时存在时优先使用已经解析的文本；只有 `file_url` 时，OpenMAIC 会下载并解析 PDF。

远程 PDF 解析仍会检查 HTTP(S) 协议、SSRF、响应类型和 50MB 大小上限，并把父消息携带的 token 作为 `Authorization` 转发给 PDF 地址。若 PDF 只在特殊浏览器网络中可见，建议父系统直接传入文本，避免 OpenMAIC 服务端无法访问该地址。

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

iframe 宽松策略由应用代码固定控制，不依赖构建期或运行时白名单环境变量。若当前镜像仍包含旧的来源校验代码，需要重新构建并发布。

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

响应头应为：

```text
Content-Security-Policy: frame-ancestors *
```

同时不应返回：

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
    file_url: "https://qsh.example.com/files/lesson.pdf",
    courseware_name: "认识平面图形",
    token: "parent-issued-upload-token",
    upload_url: "https://qsh.example.com/api/upload"
  },
  "https://openmaic.example.com"
);
```

自动教师链路的模型只由 OpenMAIC 服务端 env 决定，例如 `DEFAULT_MODEL=qwen:qwen3.7-flash`。父系统无需传 `model`；历史父页面即使传入旧模型，该字段也会被忽略。客户端自动生成请求使用 `x-use-server-model=true`，服务端据此忽略浏览器的模型、密钥、base URL、协议和 thinking 设置，按 `MODEL_ROUTES`（如配置）或 `DEFAULT_MODEL` 解析模型。该规则延续到大纲、首屏内容、动作及后续页面生成；普通手动课堂仍使用用户选择的模型。

升级后必须重新构建并部署包含改动的镜像，并刷新父页面及 iframe。仅修改正式环境 env 或重启旧镜像，无法替换旧的 iframe 模型规则或大纲错误处理代码。大纲上游失败应返回带 HTTP 状态、供应商错误码与原始消息的错误 SSE；如果不存在的模型仍返回 `LLM returned empty response`，应检查部署版本、Nginx 路由及多实例是否一致。

OpenMAIC 会回传：

```ts
{ type: "AUTO_TEACHER_STATUS", stage: "received" }
{ type: "AUTO_TEACHER_STATUS", stage: "preparing_session" }
{ type: "AUTO_TEACHER_READY", nextPath: "/bingo-agent-class/generation-preview" }
```

## 8. 常见问题

### Framing violates Content Security Policy

浏览器控制台报错：

```text
Framing 'https://openmaic.example.com/...' violates the following Content Security Policy directive: "frame-ancestors 'self'"
```

处理方式：

1. 确认已经重新构建并部署包含宽松策略的 OpenMAIC 镜像
2. 用 `curl -I` 确认响应头为 `Content-Security-Policy: frame-ancestors *`
3. 确认 Nginx、网关或 CDN 没有覆盖 CSP，也没有额外添加 `X-Frame-Options`

### postMessage target origin 不匹配

浏览器控制台报错：

```text
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided does not match the recipient window's origin
```

处理方式：

1. 确认父项目 `VITE_AI_OPENMAIC_AUTO_TEACHER_URL` 指向真实 OpenMAIC 自动教案页面
2. 不要让 iframe `src` 为空
3. 如果经过反向代理，确认最终 iframe URL 的协议、域名、端口与 postMessage targetOrigin 一致

### 教案内容未传入

自动教案入口要求父窗口传入 `pdf_text`/`pdfText` 或 `file_url`。两者都缺少时，OpenMAIC 会返回 `AUTO_TEACHER_ERROR`。

需要确认：

1. 优先确认 postMessage payload 中包含非空 `pdf_text` 或 `pdfText`
2. 如果只传 `file_url`，确认地址为 HTTP(S) PDF 且 OpenMAIC 服务端可访问
3. 私有 PDF 地址需要正确配置可信来源，并确认 token 可用于下载
