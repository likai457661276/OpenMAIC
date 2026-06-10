# Auto Teacher 正式环境接入配置

本文说明 `/bingo-agent-class/auto-teacher` 被父系统通过 `iframe` 引用时，正式环境需要配置的地址、白名单和验证方式。

## 1. 地址关系

自动教案入口由两个系统共同完成：

- 父窗口系统：贵州教师端，例如 `https://qsh.example.com`
- OpenMAIC：自动教案 iframe 页面，例如 `https://openmaic.example.com/bingo-agent-class/auto-teacher`

如果两个系统不是完全同源，包含协议、域名、端口任意一项不同，都需要配置 iframe 与 postMessage 白名单。

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

## 4. 父窗口项目环境变量

父窗口项目需要配置 iframe 页面地址：

```env
VITE_AI_OPENMAIC_AUTO_TEACHER_URL=https://openmaic.example.com/bingo-agent-class/auto-teacher
```

如果未配置该变量，父项目会尝试用 `VITE_AI_OPENMAIC_URL` 自动拼接 `/auto-teacher`：

```env
VITE_AI_OPENMAIC_URL=https://openmaic.example.com/bingo-agent-class
```

推荐正式环境显式配置 `VITE_AI_OPENMAIC_AUTO_TEACHER_URL`，避免路径被反向代理或 basePath 影响。

## 5. 重启与构建

OpenMAIC 的 header 配置来自 Next.js `headers()`，修改环境变量后需要重新启动或重新部署 OpenMAIC 服务。

Docker 部署示例：

```bash
docker compose up --build -d
```

如果使用平台部署，请在平台环境变量中配置后重新构建并发布。

父窗口项目的 `VITE_` 环境变量会在构建时注入，正式环境修改后也需要重新构建父项目。

## 6. 验证方法

### 6.1 检查 iframe 地址

在父窗口页面打开浏览器 DevTools，选中自动教案 iframe，确认：

```html
<iframe src="https://openmaic.example.com/bingo-agent-class/auto-teacher?..."></iframe>
```

`src` 不能为空。

### 6.2 检查 CSP 响应头

请求 OpenMAIC 页面：

```bash
curl -I https://openmaic.example.com/bingo-agent-class/auto-teacher
```

响应头应包含父窗口 origin：

```text
Content-Security-Policy: frame-ancestors 'self' https://qsh.example.com
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

### 6.3 检查 postMessage

父窗口发送消息格式：

```ts
iframe.contentWindow?.postMessage(
  {
    type: "AUTO_TEACHER_GENERATE",
    file_url: "https://example.com/demo.pdf",
    model: "qwen:deepseek-v4-flash"
  },
  "https://openmaic.example.com"
);
```

OpenMAIC 会回传：

```ts
{ type: "AUTO_TEACHER_STATUS", stage: "received" }
{ type: "AUTO_TEACHER_STATUS", stage: "parsing_pdf" }
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

### PDF 无法解析

自动教案入口会由 OpenMAIC 服务端访问 `file_url` 并解析 PDF。

需要确认：

1. PDF URL 能被 OpenMAIC 服务器访问
2. PDF 响应类型是 `application/pdf`、`application/x-pdf` 或 `application/octet-stream`
3. PDF 文件大小不超过 50MB
4. 如需访问内网 PDF，必须由运维明确配置允许内网访问策略

