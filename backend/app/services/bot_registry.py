"""
Bot Registry - Single source of truth for bot detection and classification.

Two-level classification:
  - Family: "Google", "OpenAI", "Anthropic", etc.
  - Individual bot: "Googlebot", "GPTBot", "ClaudeBot", etc.

Only search engine bots and LLM/AI bots are included.
SEO tools, social media bots, and other crawlers are explicitly excluded.
"""

# Families ordered by importance. Within each family, more specific bots
# MUST be listed before generic ones (e.g. Googlebot-Image before Googlebot).
BOT_FAMILIES = {
    # --- Search Engines ---
    "Google": {
        "type": "search_engine",
        "color": "#4285F4",
        "bots": {
            "Googlebot-Image": ["googlebot-image/"],
            "Googlebot-Video": ["googlebot-video/"],
            "Googlebot-News": ["googlebot-news"],
            "Google-InspectionTool": ["google-inspectiontool"],
            "Storebot-Google": ["storebot-google"],
            "AdsBot-Google": ["adsbot-google"],
            "Googlebot": ["googlebot/", "compatible; googlebot"],
        }
    },
    "Microsoft": {
        "type": "search_engine",
        "color": "#00A4EF",
        "bots": {
            "BingPreview": ["bingpreview/"],
            "AdIdxBot": ["adidxbot"],
            "MSNBot": ["msnbot"],
            "Bingbot": ["bingbot/"],
        }
    },
    "Yandex": {
        "type": "search_engine",
        "color": "#FC3F1D",
        "bots": {
            "YandexImages": ["yandeximages", "yandeximageresizer"],
            "YandexBot": ["yandexbot/"],
        }
    },
    "Baidu": {
        "type": "search_engine",
        "color": "#2932E1",
        "bots": {
            "Baiduspider": ["baiduspider"],
        }
    },
    "DuckDuckGo": {
        "type": "search_engine",
        "color": "#DE5833",
        "bots": {
            "DuckAssistBot": ["duckassistbot"],
            "DuckDuckBot": ["duckduckbot"],
            "DuckDuckGo": ["duckduckgo/"],
        }
    },
    "Apple": {
        "type": "search_engine",
        "color": "#555555",
        "bots": {
            "Applebot": ["applebot"],
        }
    },
    "Yahoo": {
        "type": "search_engine",
        "color": "#720E9E",
        "bots": {
            "Slurp": ["slurp"],
        }
    },
    # --- LLM / AI ---
    "OpenAI": {
        "type": "llm",
        "color": "#10A37F",
        "bots": {
            "OAI-SearchBot": ["oai-searchbot"],
            "ChatGPT-User": ["chatgpt-user"],
            "GPTBot": ["gptbot"],
        }
    },
    "Anthropic": {
        "type": "llm",
        "color": "#D4A574",
        "bots": {
            "Claude-SearchBot": ["claude-searchbot"],
            "Claude-User": ["claude-user"],
            "Claude-Web": ["claude-web"],
            "ClaudeBot": ["claudebot"],
        }
    },
    "Google AI": {
        "type": "llm",
        "color": "#8E44AD",
        "bots": {
            "Gemini-Deep-Research": ["gemini-deep-research"],
            "GoogleAgent-Mariner": ["googleagent-mariner"],
            "Google-CloudVertexBot": ["google-cloudvertexbot"],
            "GoogleOther-Image": ["googleother-image"],
            "GoogleOther-Video": ["googleother-video"],
            "GoogleOther": ["googleother"],
        }
    },
    "Meta AI": {
        "type": "llm",
        "color": "#0668E1",
        "bots": {
            "Meta-ExternalFetcher": ["meta-externalfetcher"],
            "Meta-WebIndexer": ["meta-webindexer"],
            "Meta-ExternalAgent": ["meta-externalagent"],
        }
    },
    "Perplexity": {
        "type": "llm",
        "color": "#7C3AED",
        "bots": {
            "Perplexity-User": ["perplexity-user"],
            "PerplexityBot": ["perplexitybot"],
        }
    },
    "Bytedance": {
        "type": "llm",
        "color": "#010101",
        "bots": {
            "TikTokSpider": ["tiktokspider"],
            "Bytespider": ["bytespider"],
        }
    },
    "Amazon": {
        "type": "llm",
        "color": "#FF9900",
        "bots": {
            "AmazonBuyForMe": ["amazonbuyforme"],
            "Amazonbot": ["amazonbot"],
        }
    },
    "Cohere": {
        "type": "llm",
        "color": "#39594D",
        "bots": {
            "Cohere-Training": ["cohere-training-data-crawler"],
            "CohereBot": ["cohere-ai"],
        }
    },
    "Mistral": {
        "type": "llm",
        "color": "#F54E42",
        "bots": {
            "MistralAI-User": ["mistralai-user"],
        }
    },
    "DeepSeek": {
        "type": "llm",
        "color": "#4D6BFE",
        "bots": {
            "DeepSeekBot": ["deepseekbot"],
        }
    },
    "xAI": {
        "type": "llm",
        "color": "#1DA1F2",
        "bots": {
            "Grok-DeepSearch": ["grok-deepsearch"],
            "GrokBot": ["grokbot"],
            "xAI-Grok": ["xai-grok"],
        }
    },
    "CommonCrawl": {
        "type": "llm",
        "color": "#E74C3C",
        "bots": {
            "CCBot": ["ccbot"],
        }
    },
    "You.com": {
        "type": "llm",
        "color": "#6366F1",
        "bots": {
            "YouBot": ["youbot"],
        }
    },
    "Brave": {
        "type": "llm",
        "color": "#FB542B",
        "bots": {
            "BraveBot": ["bravebot"],
        }
    },
    "Diffbot": {
        "type": "llm",
        "color": "#1C7C54",
        "bots": {
            "Diffbot": ["diffbot"],
        }
    },
}

# Bots that should NEVER be imported
EXCLUDED_PATTERNS = [
    # SEO tools
    "ahrefsbot", "semrushbot", "semrushbot-si", "semrushbot-ocob",
    "dotbot", "mj12bot", "screaming frog", "seokicks", "sistrix",
    "rogerbot", "blexbot", "megaindex", "opensiteexplorer",
    "dataforseobot", "serpstatbot", "zoominfobot",
    # Social media
    "facebookexternalhit", "facebot", "twitterbot", "linkedinbot",
    "whatsapp", "slackbot", "telegrambot", "discordbot",
    "pinterest", "snapchat",
    # Monitoring / internal
    "wordpress", "wp-cron",
    "python-requests", "python-httpx", "python-urllib",
    "go-http-client", "java/", "okhttp",
    "curl/", "wget/", "postman", "insomnia", "httpie",
    "uptimerobot", "statuscake", "pingdom", "site24x7",
    "newrelicpinger", "datadog",
    # Other irrelevant bots
    "neevabot", "yahoo! slurp", "sogou",
    "archive.org_bot", "ia_archiver",
]


def _build_lookup():
    """Pre-build a flat lookup list: (pattern, bot_name, family_name) ordered
    so that more specific patterns are checked first."""
    lookup = []
    for family_name, family_data in BOT_FAMILIES.items():
        for bot_name, patterns in family_data["bots"].items():
            for pattern in patterns:
                lookup.append((pattern, bot_name, family_name))
    return lookup


_BOT_LOOKUP = _build_lookup()


def classify_bot(user_agent: str):
    """
    Classify a user agent string.

    Returns:
        (bot_name, family_name) if it's a relevant bot
        (None, None) if it's excluded or not a known bot
    """
    if not user_agent:
        return None, None

    ua_lower = user_agent.lower()

    # Check exclusion list first (fast reject)
    for excl in EXCLUDED_PATTERNS:
        if excl in ua_lower:
            return None, None

    # Match against known bots
    for pattern, bot_name, family_name in _BOT_LOOKUP:
        if pattern in ua_lower:
            return bot_name, family_name

    # Not a known bot -> filtered out (human or unknown crawler)
    return None, None


def get_all_families():
    """Return bot families with their bots for the frontend filter UI."""
    result = []
    for family_name, family_data in BOT_FAMILIES.items():
        result.append({
            "family": family_name,
            "type": family_data["type"],
            "color": family_data["color"],
            "bots": list(family_data["bots"].keys()),
        })
    return result
