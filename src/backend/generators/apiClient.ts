/**
 * @file apiClient.ts
 * @description API client for making requests to Gemini/LLM services
 */

import { URL } from 'url';

// Use Electron's native fetch or Node.js https module
export const fetchFn = async (url: string, options: any) => {
  if (typeof fetch !== 'undefined') {
    return fetch(url, options);
  }
  
  // Fallback to https module for Node.js
  const https = require('https');
  const urlObj = new URL(url);
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          text: async () => data,
          json: async () => JSON.parse(data)
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
};

// Gemini API Configuration
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

export const GEMINI_API_KEY = getEnvVar('GEMINI_API_KEY', 'sk-lCIBt7FshrvP7ouF6rptGA');
export const GEMINI_API_URL = getEnvVar('GEMINI_API_URL', 'https://clear-llm-proxy.internal.cleartax.co/v1/chat/completions');
export const GEMINI_MODEL = getEnvVar('GEMINI_MODEL', 'gemini/gemini-3-pro-preview');
export const IS_PROXY_SERVICE = GEMINI_API_KEY?.startsWith('sk-') || false;

if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY not found in environment variables.');
}

if (IS_PROXY_SERVICE) {
  console.log('🔄 Detected proxy service API key format.');
}

/**
 * Call Gemini API with retry logic and exponential backoff
 */
export async function callGeminiWithRetry(
  messages: Array<{ role: string; content: string }>,
  retries: number = 5
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Calling API (attempt ${attempt}/${retries})...`);
      
      let response: any;
      let content: string;

      if (IS_PROXY_SERVICE) {
        response = await fetchFn(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
          },
          body: JSON.stringify({
            model: GEMINI_MODEL,
            messages: messages,
            temperature: 0.2,
            max_tokens: 8192
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`❌ API Error Response:`, text);
          
          if (response.status === 429) {
            const errorData = JSON.parse(text);
            const retryDelay = errorData?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
            const delaySeconds = retryDelay ? parseFloat(retryDelay.replace('s', '')) : Math.pow(2, attempt) * 2;
            console.warn(`⚠️ Quota exceeded. Waiting ${delaySeconds} seconds...`);
            await new Promise(res => setTimeout(res, delaySeconds * 1000));
            continue;
          }
          
          throw new Error(`API Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        content = data?.choices?.[0]?.message?.content?.trim() || '';
      } else {
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const userMessage = messages.find(m => m.role === 'user')?.content || '';
        const combinedPrompt = `${systemMessage}\n\n${userMessage}`;

        response = await fetchFn(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: combinedPrompt }]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192
            }
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`❌ Gemini API Error Response:`, text);
          
          if (response.status === 429) {
            const delaySeconds = Math.pow(2, attempt) * 3;
            console.warn(`⚠️ Rate limit. Waiting ${delaySeconds}s...`);
            await new Promise(res => setTimeout(res, delaySeconds * 1000));
            continue;
          }
          
          throw new Error(`Gemini API Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }

      if (!content) {
        throw new Error('API returned empty content');
      }

      console.log(`✅ API call successful (${content.length} characters)`);
      return content;
    } catch (err: any) {
      const isQuotaError = err.message?.includes('429') || err.message?.includes('quota');
      
      if (isQuotaError && attempt < retries) {
        const delaySeconds = Math.pow(2, attempt) * 3;
        console.warn(`⚠️ Quota error. Waiting ${delaySeconds}s...`);
        await new Promise(res => setTimeout(res, delaySeconds * 1000));
        continue;
      }
      
      console.warn(`⚠️ Call failed (attempt ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      
      const delaySeconds = Math.pow(2, attempt) * 1.5;
      await new Promise(res => setTimeout(res, delaySeconds * 1000));
    }
  }
  throw new Error('Failed to call Gemini API after retries');
}