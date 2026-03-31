import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { randomUUID } from 'node:crypto';

const app = express();
const PORT = 3213;
const QUERY_TIMEOUT_MS = 60000;
const DEFAULT_DIAGNOSIS_TEXT = '请诊断此问题';
const EMPTY_RESULT_FALLBACK = '本次诊断未返回可显示内容，请重试一次或补充更具体的问题描述。';

function extractAssistantText(msg: any): string {
  const blocks = msg?.message?.content;
  if (!Array.isArray(blocks)) return '';

  return blocks
    .filter((b: any) => b?.type === 'text' && typeof b?.text === 'string')
    .map((b: any) => b.text)
    .join('')
    .trim();
}

function getClaudeProcessEnv(): Record<string, string | undefined> {
  const home = process.env.HOME || process.env.USERPROFILE;

  // Keep CLI-equivalent auth/runtime context when the SDK process is spawned from Electron.
  return {
    ...process.env,
    HOME: home,
    USERPROFILE: process.env.USERPROFILE || home,
    APPDATA: process.env.APPDATA,
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    PATH: process.env.PATH
  };
}

function isResponseWritable(res: express.Response): boolean {
  return !res.writableEnded && !res.destroyed;
}

function writeSse(res: express.Response, payload: unknown): void {
  if (!isResponseWritable(res)) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function parseImageDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image format. Expected base64 data URL.');
  }

  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: matches[2]
    }
  };
}

// FIX: Ensure Windows environment variables are correctly mapped for the SDK
if (process.platform === 'win32') {
  if (!process.env.HOME && process.env.USERPROFILE) {
    process.env.HOME = process.env.USERPROFILE;
  }
}

// Log environment status for debugging auth
console.log('[Agent Server] Environment Check:', {
  platform: process.platform,
  USERPROFILE: process.env.USERPROFILE,
  HOME: process.env.HOME,
  nodeVersion: process.version
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));

// The exact prompt builder logic from previous agent.ts
async function* buildPrompt(text: string, images: string[]) {
  const imageBlocks = images.map(parseImageDataUrl);

  const textBlock = {
    type: 'text' as const,
    text: text || DEFAULT_DIAGNOSIS_TEXT
  };

  // Streaming mode expects SDKUserMessage envelope rather than raw role/content payload.
  yield {
    type: 'user' as const,
    session_id: randomUUID(),
    parent_tool_use_id: null,
    message: {
      role: 'user' as const,
      content: [...imageBlocks, textBlock]
    }
  };
}

const SYSTEM_PROMPT = `
你是一个专为大型数据平台定制的资深二线技术支持专家。你的唯一目标是：通过精准的诊断，帮助一线人员快速定位并修复客户工单问题。

当前工作流：用户可能提供截图或文本。你需要通过截图识别系统的出错区域，通过文本了解症状，进而给出精确的诊断建议。如果不够，你可以使用你的内置终端工具（如 grep 源码，查找日志等）进行查证。

请严格以结构化 Markdown 响应。请展示专业、克制的技术态度。如果没有明确结论，请直接给出排查步骤。
`;

app.post('/diagnose', async (req, res) => {
  const { text, images = [] } = req.body;
  
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.flushHeaders();

  console.log('[Agent Server] Received POST /diagnose request.', { textLength: text?.length, imageCount: images.length });

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    console.warn(`[Agent Server] Query timeout after ${QUERY_TIMEOUT_MS}ms, aborting...`);
    abortController.abort();
  }, QUERY_TIMEOUT_MS);

  req.on('close', () => {
    console.log('[Agent Server] Request stream closed.');
  });

  try {
    const prompt = images.length > 0 ? buildPrompt(text, images) : (text || DEFAULT_DIAGNOSIS_TEXT);
    let streamedAnyText = false;

    const q = query({
      prompt: prompt,
      options: {
        abortController,
        systemPrompt: SYSTEM_PROMPT,
        allowedTools: ['Read', 'WebSearch', 'WebFetch', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits',
        settingSources: ['user', 'project', 'local'],
        env: getClaudeProcessEnv()
      }
    });

    console.log('[Agent Server] Query started...');

    for await (const msg of q) {
      let contentText = '';

      // Primary display text comes from assistant message content blocks.
      if (msg.type === 'assistant') {
        if (msg.error) {
          console.warn('[Agent Server] Assistant message reported error:', msg.error);
        }
        contentText = extractAssistantText(msg);
      // Some runs only emit final text in result.success.
      } else if (!streamedAnyText && msg.type === 'result' && msg.subtype === 'success') {
        contentText = typeof msg.result === 'string' ? msg.result.trim() : '';
      } else if (msg.type === 'result' && msg.subtype !== 'success') {
        const detail = Array.isArray((msg as any).errors) ? (msg as any).errors.join(' | ') : '';
        console.warn('[Agent Server] Result ended with error subtype:', msg.subtype, detail);
      }

      if (!contentText) continue;

      console.log('[Agent Server] Claude says:', contentText.substring(0, 50) + '...');
      streamedAnyText = true;

      try {
        writeSse(res, { text: contentText });
      } catch (e) {
        console.error('[Agent Server] Error writing to socket:', e);
      }
    }

    // Final fallback avoids blank chat bubbles when upstream returns no printable text.
    if (!streamedAnyText) {
      writeSse(res, { text: EMPTY_RESULT_FALLBACK });
    }

    if (isResponseWritable(res)) {
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
    console.log('[Agent Server] Query processing finished.');
  } catch (error: any) {
    console.error('[Agent Server] Error during diagnosis:', error);
    if (isResponseWritable(res)) {
      const errorMessage = error?.name === 'AbortError'
        ? `诊断超时（>${QUERY_TIMEOUT_MS / 1000}s），请重试或缩小问题范围。`
        : (error?.message || 'Unknown agent error');
      writeSse(res, { error: errorMessage });
      res.end();
    }
  } finally {
    clearTimeout(timeoutHandle);
  }
});

app.listen(PORT, () => {
  console.log(`[Agent Server] Running natively on port ${PORT}...`);
});
