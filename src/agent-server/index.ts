import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-agent-sdk';

const app = express();
const PORT = 3213;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
  res.flushHeaders();

  console.log('[Agent Server] Received POST /diagnose request.', { textLength: text?.length, imageCount: images.length });

  // Optional mechanism to kill the stream early
  const abortController = new AbortController();

  req.on('close', () => {
    console.log('[Agent Server] Client closed connection. Aborting query...');
    abortController.abort();
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

    for await (const msg of q) {
      if (req.closed) break;

      // Extract text content from assistant messages
      if (msg.type === 'assistant') {
        const m = msg as any;
        let contentText = '';
        if (m.text) contentText += m.text;
        if (m.content) {
             const messageData = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
             contentText += messageData;
        }
        res.write(`data: ${JSON.stringify({ text: contentText })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
    console.log('[Agent Server] Stream completed naturally.');
  } catch (error: any) {
    console.error('[Agent Server] Error:', error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Unknown agent error' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[Agent Server] Running natively on port ${PORT}... (Fully inheriting local DPAPI tokens!)`);
});
