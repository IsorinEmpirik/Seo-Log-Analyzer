import re
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from io import BytesIO


def detect_crawler(user_agent: str) -> str:
    """Detect crawler type from user agent string"""
    ua_lower = user_agent.lower()

    crawlers = {
        'Googlebot': ['googlebot', 'google-inspectiontool', 'storebot-google', 'google-site-verification'],
        'Bingbot': ['bingbot', 'msnbot', 'bingpreview'],
        'Yandexbot': ['yandex', 'yandexbot'],
        'Baiduspider': ['baiduspider', 'baidu'],
        'DuckDuckBot': ['duckduckbot'],
        'Slurp': ['slurp', 'yahoo'],
        'Applebot': ['applebot'],
        'Semrushbot': ['semrushbot'],
        'Ahrefsbot': ['ahrefsbot'],
        'MJ12bot': ['mj12bot'],
        'Screaming Frog': ['screaming frog'],
        'Facebookbot': ['facebookexternalhit', 'facebot'],
        'Twitterbot': ['twitterbot'],
        'LinkedInBot': ['linkedinbot'],
    }

    for crawler_name, patterns in crawlers.items():
        for pattern in patterns:
            if pattern in ua_lower:
                return crawler_name

    return 'Other'


def parse_log_line(line: str) -> Dict[str, Any]:
    """
    Parse Apache/Nginx log line.
    Format: IP - - [date] "METHOD URL HTTP/X.X" CODE SIZE "-" "USER_AGENT"
    """
    # Pattern to extract all parts including user agent
    pattern = r'^(\d+\.\d+\.\d+\.\d+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\w+)\s+([^\s]+)\s+HTTP/[\d.]+"\s+(\d+)\s+(\d+)\s+"[^"]*"\s+"([^"]*)"'

    match = re.match(pattern, line)
    if match:
        ip, date_str, method, url, code, size, user_agent = match.groups()

        # Parse date: 20/Jan/2026:22:59:38 +0000
        try:
            timestamp = datetime.strptime(date_str.split()[0], "%d/%b/%Y:%H:%M:%S")
        except ValueError:
            timestamp = None

        crawler = detect_crawler(user_agent)

        return {
            "ip": ip,
            "timestamp": timestamp,
            "url": url,
            "http_code": int(code),
            "response_size": int(size),
            "user_agent": user_agent,
            "crawler": crawler,
            "log_date": timestamp.date() if timestamp else None
        }

    # Fallback: try simpler pattern without user agent
    simple_pattern = r'^(\d+\.\d+\.\d+\.\d+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\w+)\s+([^\s]+)\s+HTTP/[\d.]+"\s+(\d+)\s+(\d+)'
    match = re.match(simple_pattern, line)
    if match:
        ip, date_str, method, url, code, size = match.groups()

        try:
            timestamp = datetime.strptime(date_str.split()[0], "%d/%b/%Y:%H:%M:%S")
        except ValueError:
            timestamp = None

        return {
            "ip": ip,
            "timestamp": timestamp,
            "url": url,
            "http_code": int(code),
            "response_size": int(size),
            "user_agent": None,
            "crawler": 'Unknown',
            "log_date": timestamp.date() if timestamp else None
        }

    return None


def parse_excel_logs(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parse Excel file with Googlebot logs.
    Expected format: One sheet per day, columns: Date, Time, Line
    """
    logs = []

    xl = pd.ExcelFile(BytesIO(file_content))

    for sheet_name in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet_name)

        if 'Line' not in df.columns:
            continue

        for _, row in df.iterrows():
            line = row.get('Line', '')
            if not line or pd.isna(line):
                continue

            parsed = parse_log_line(str(line))
            if parsed:
                # If timestamp not parsed from line, try Date column
                if not parsed['timestamp'] and 'Date' in df.columns:
                    try:
                        parsed['timestamp'] = pd.to_datetime(row['Date'])
                        parsed['log_date'] = parsed['timestamp'].date()
                    except:
                        pass

                logs.append(parsed)

    return logs


def parse_screaming_frog_csv(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Parse Screaming Frog CSV export.
    Key column: 'Adresse' (URL)
    """
    urls = []

    # Try different encodings
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            df = pd.read_csv(BytesIO(file_content), encoding=encoding)
            break
        except:
            continue
    else:
        return urls

    # Find URL column (might be 'Adresse', 'Address', or 'URL')
    url_col = None
    for col in ['Adresse', 'Address', 'URL', 'url']:
        if col in df.columns:
            url_col = col
            break

    if not url_col:
        return urls

    # Find HTTP code column
    code_col = None
    for col in ['Code HTTP', 'Status Code', 'HTTP Status', 'Status']:
        if col in df.columns:
            code_col = col
            break

    # Find indexability column
    index_col = None
    for col in ['Indexabilité', 'Indexability', 'Indexable']:
        if col in df.columns:
            index_col = col
            break

    for _, row in df.iterrows():
        url = row.get(url_col, '')
        if not url or pd.isna(url):
            continue

        urls.append({
            "url": str(url).strip(),
            "http_code": int(row[code_col]) if code_col and not pd.isna(row.get(code_col)) else None,
            "indexability": str(row[index_col]) if index_col and not pd.isna(row.get(index_col)) else None
        })

    return urls
