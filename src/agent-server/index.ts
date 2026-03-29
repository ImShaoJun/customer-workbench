import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-agent-sdk';

const app = express();
const PORT = 3213;

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
  const imageBlocks = images.map((dataUrl: string) => {
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid image format. Expected base64 data URL.')
    }
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: matches[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: matches[2]
      }
    }
  });

  const textBlock = {
    type: "text" as const,
    text: text || "请诊断此问题"
  };

  yield {
    role: "user" as const,
    content: [...imageBlocks, textBlock]
  } as any;
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

  req.on('close', () => {
    console.log('[Agent Server] Client connection closed signal. (Continuing execution to debug...)');
    // WE DO NOT ABORT HERE TO ENSURE STABILITY IN DEV
  });

  try {
    const prompt = images.length > 0 ? buildPrompt(text, images) : (text || "请诊断此问题");

    const q = query({
      prompt: prompt,
      options: {
        abortController,
        systemPrompt: SYSTEM_PROMPT,
        allowedTools: ['Read', 'WebSearch', 'WebFetch', 'Glob', 'Grep'],
        permissionMode: 'acceptEdits'
      }
    });

    console.log('[Agent Server] Query started...');

    for await (const msg of q) {
      // Extract text content from assistant messages
      if (msg.type === 'assistant') {
        const m = msg as any;
        let contentText = '';
        if (m.text) contentText += m.text;
        if (m.content) {
             const messageData = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
             contentText += messageData;
        }
        
        console.log('[Agent Server] Claude says:', contentText.substring(0, 50) + '...');

        if (!req.closed && res.writable) {
          try {
            res.write(`data: ${JSON.stringify({ text: contentText })}\n\n`);
          } catch (e) {
            console.error('[Agent Server] Error writing to socket:', e);
          }
        }
      }
    }

    if (!req.closed && res.writable) {
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
    console.log('[Agent Server] Query processing finished.');
  } catch (error: any) {
    console.error('[Agent Server] Error during diagnosis:', error);
    if (!req.closed && res.writable) {
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Unknown agent error' })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`[Agent Server] Running natively on port ${PORT}...`);
});
