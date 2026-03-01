import { useState } from 'react';

const BOT_FAMILY_DOMAIN: Record<string, string> = {
  Google: 'google.com',
  Microsoft: 'bing.com',
  Yandex: 'yandex.com',
  Baidu: 'baidu.com',
  DuckDuckGo: 'duckduckgo.com',
  Apple: 'apple.com',
  Yahoo: 'yahoo.com',
  OpenAI: 'openai.com',
  Anthropic: 'anthropic.com',
  'Google AI': 'deepmind.google',
  'Meta AI': 'meta.com',
  Perplexity: 'perplexity.ai',
  Bytedance: 'bytedance.com',
  Amazon: 'amazon.com',
  Mistral: 'mistral.ai',
  DeepSeek: 'deepseek.com',
  xAI: 'x.ai',
  CommonCrawl: 'commoncrawl.org',
  Brave: 'brave.com',
};

// Brand colors matching bot_registry.py
const BOT_FAMILY_COLOR: Record<string, string> = {
  Google: '#4285F4',
  Microsoft: '#00A4EF',
  Yandex: '#FC3F1D',
  Baidu: '#2932E1',
  DuckDuckGo: '#DE5833',
  Apple: '#555555',
  Yahoo: '#720E9E',
  OpenAI: '#10A37F',
  Anthropic: '#D4A574',
  'Google AI': '#8E44AD',
  'Meta AI': '#0668E1',
  Perplexity: '#7C3AED',
  Bytedance: '#333333',
  Amazon: '#FF9900',
  Mistral: '#F54E42',
  DeepSeek: '#4D6BFE',
  xAI: '#1DA1F2',
  CommonCrawl: '#E74C3C',
  Brave: '#FB542B',
};

interface BotLogoProps {
  family: string;
  size?: number;
  className?: string;
}

export function BotLogo({ family, size = 20, className = '' }: BotLogoProps) {
  const [error, setError] = useState(false);
  const domain = BOT_FAMILY_DOMAIN[family];
  const color = BOT_FAMILY_COLOR[family] ?? '#64748B';

  if (!domain || error) {
    return (
      <span
        className={`flex items-center justify-center rounded font-bold text-white flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: Math.round(size * 0.45),
        }}
      >
        {family.charAt(0)}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
      alt={family}
      width={size}
      height={size}
      className={`rounded object-contain flex-shrink-0 ${className}`}
      onError={() => setError(true)}
    />
  );
}

export { BOT_FAMILY_COLOR };
