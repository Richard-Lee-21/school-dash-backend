# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers backend for a Kindle Dashboard system that transforms jailbroken Kindles into customizable dashboard displays. The system generates PNG images containing weather, public transport, and timetable information that are periodically fetched by Kindle devices.

## Common Commands

### Development
```bash
# Install dependencies
bun install

# Start local development server
bun run dev
# or
npx wrangler dev --remote

# Deploy to Cloudflare
bun run deploy
# or
npx wrangler deploy --minify
```

### Cloudflare Setup
```bash
# Install Wrangler CLI
npm install wrangler@latest

# Login to Cloudflare
npx wrangler login

# Create KV namespaces (update IDs in wrangler.jsonc after creation)
npx wrangler kv namespace create SCHOOL_DASH_KV
npx wrangler kv namespace create SCHOOL_DASH_KV --preview
```

## Architecture

### Core Components
- **Main Entry Point**: `src/index.ts` - Hono web server with two main endpoints
  - `/api/dashboard` - Returns grayscale PNG image of dashboard
  - `/api/internal/dashboard` - Returns HTML version of dashboard
- **Dashboard Rendering**: `src/dashboard.ts` - HTML template generation and styling
- **Utilities**: `src/util.ts` - Date/time utilities for Shanghai timezone

### Data Modules
- **Weather**: `src/weather/weatherTypes.ts` - Weather data fetching from 和风天气API
- **Public Transport**: `src/public-transport/bvg.ts` - Berlin transport (BVG) departure data
- **Timetable**: `src/timetable/timetable.ts` - School timetable data

### Key Technical Details
- **Framework**: Hono.js for HTTP routing with JSX support
- **Rendering**: Uses Cloudflare Puppeteer for HTML→PNG conversion
- **Image Processing**: Converts color PNG to grayscale using @cf-wasm/png
- **Storage**: Cloudflare KV namespace for caching (SCHOOL_DASH_KV)
- **Deployment**: Cloudflare Workers with Browser binding for Puppeteer
- **Target**: 600x800px grayscale images optimized for Kindle e-ink displays

### Data Flow
1. Kindle requests `/api/dashboard` with battery level header
2. Server fetches weather, transport, and timetable data
3. Generates HTML dashboard using inline CSS
4. Uses Puppeteer to render HTML→PNG
5. Converts PNG to grayscale for Kindle display
6. Returns optimized PNG image

### Configuration
- **Dashboard Size**: 600x800px (defined in index.ts)
- **Timezone**: Asia/Shanghai (hardcoded throughout)
- **Cache Control**: No-cache headers for fresh data
- **Browser**: Cloudflare Puppeteer binding (MYBROWSER)
- **Weather Location**: Beijing, China (39.9042, 116.4074)

### Dependencies
- **Runtime**: Cloudflare Workers with Node.js compatibility
- **HTTP**: Hono.js
- **Date Handling**: date-fns-tz for timezone support
- **Image Processing**: @cf-wasm/png for grayscale conversion
- **Browser Automation**: @cloudflare/puppeteer

### Environment Variables
- Cloudflare KV namespace binding: `SCHOOL_DASH_KV`
- Cloudflare Browser binding: `MYBROWSER`
- 和风天气API密钥: `QWEATHER_API_KEY`
- Optional D1 database binding: `DB` (currently commented out)

## Development Notes

- The project uses Bun as the primary package manager but npm works as well
- All date/time operations use Shanghai timezone (Asia/Shanghai)
- The dashboard is designed specifically for grayscale e-ink displays
- Battery level is passed via X-Battery-Level header from Kindle client
- Images are optimized for Kindle's 600x800 resolution with 1-bit grayscale

## 中国部署配置

### 环境变量设置
1. 在Cloudflare Workers中设置环境变量：
   - `QWEATHER_API_KEY`: 和风天气API密钥
   - `SCHOOL_DASH_KV`: KV存储绑定
   - `MYBROWSER`: Puppeteer浏览器绑定

### 自定义域名配置
1. 在wrangler.jsonc中修改routes配置：
   ```json
   "routes": [
     { "pattern": "your-domain.com/*", "zone_id": "your-zone-id" }
   ]
   ```

2. 支持HTTP和HTTPS访问（Cloudflare Workers默认支持）

### 天气API配置
- 使用和风天气开发版API
- 默认位置：北京 (39.9042, 116.4074)
- 可在weatherTypes.ts中修改LATITUDE和LONGITUDE常量