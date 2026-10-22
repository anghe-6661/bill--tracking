const DEFAULT_MODEL = 'deepseek-flash';
const DEFAULT_BASE_URL = 'https://api.deepseek.com';

export function getDeepSeekConfig() {
  return {
    apiKey: localStorage.getItem('deepseek_api_key') || '',
    model: localStorage.getItem('deepseek_model') || DEFAULT_MODEL,
    baseUrl: (localStorage.getItem('deepseek_base_url') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
  };
}

function getChatUrl(baseUrl) {
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
}

function isOfficialDeepSeek(baseUrl) {
  return /deepseek\.com/i.test(baseUrl);
}

function extractMessageText(data) {
  const message = data?.choices?.[0]?.message || {};
  const content = message.content;

  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => part?.text || part?.content || '')
      .join('\n')
      .trim();
    if (joined) return joined;
  }

  if (typeof message.reasoning_content === 'string' && message.reasoning_content.trim()) {
    return message.reasoning_content;
  }

  return '';
}

function extractJsonObject(text) {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export async function recognizeJsonFromImage(dataUrl, apiKey, prompt, maxTokens = 1024) {
  const { model, baseUrl } = getDeepSeekConfig();
  const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
  const payload = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: dataUrl.startsWith('data:') ? dataUrl : `data:${mimeType};base64,${dataUrl}`,
              detail: 'high',
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: maxTokens,
  };

  // Official DeepSeek-flash now thinks by default; thinking tokens would
  // otherwise exhaust a small max_tokens budget and leave content empty.
  if (isOfficialDeepSeek(baseUrl)) {
    payload.thinking = { type: 'disabled' };
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(getChatUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `识别接口返回 HTTP ${response.status}`);
  }

  const text = extractMessageText(data);
  const parsed = extractJsonObject(text);
  if (!parsed) {
    throw new Error('模型没有返回可识别的账单信息，请重试，或改用手动填写。');
  }
  return parsed;
}
