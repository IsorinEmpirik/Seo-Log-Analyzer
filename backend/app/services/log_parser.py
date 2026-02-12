import re
import csv
import os
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional, Generator, Tuple
from io import BytesIO
from app.services.bot_registry import classify_bot


# --- Page type classification ---

_PAGE_EXTENSIONS = {'.html', '.htm', '.php', '.asp', '.aspx', '.jsp', '.shtml'}
_JS_EXTENSIONS = {'.js', '.mjs', '.jsx', '.ts', '.tsx'}
_CSS_EXTENSIONS = {'.css', '.scss', '.less'}
_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff', '.avif'}
_FONT_EXTENSIONS = {'.woff', '.woff2', '.ttf', '.eot', '.otf'}
_XML_EXTENSIONS = {'.xml', '.rss', '.atom', '.xsl'}


def classify_page_type(url: str) -> str:
    """
    Classify a URL into a page type based on its extension.
    Returns: 'page', 'javascript', 'css', 'image', 'font', 'xml', 'other'
    """
    # Remove query string and fragment
    clean = url.split('?')[0].split('#')[0]
    # Get extension
    _, ext = os.path.splitext(clean.lower())

    if not ext or ext in _PAGE_EXTENSIONS:
        return 'page'
    if ext in _JS_EXTENSIONS:
        return 'javascript'
    if ext in _CSS_EXTENSIONS:
        return 'css'
    if ext in _IMAGE_EXTENSIONS:
        return 'image'
    if ext in _FONT_EXTENSIONS:
        return 'font'
    if ext in _XML_EXTENSIONS:
        return 'xml'
    if ext == '.json':
        return 'json'
    if ext == '.pdf':
        return 'pdf'
    return 'other'


# Pre-compiled Apache Combined Log regex
# Handles any ident/user fields (not just "- -")
# Optional response time at the end (microseconds)
APACHE_LOG_PATTERN = re.compile(
    r'^(\S+)\s+\S+\s+\S+\s+'           # IP ident user
    r'\[([^\]]+)\]\s+'                   # [datetime +timezone]
    r'"(\S+)\s+(\S+)\s+\S+"\s+'         # "METHOD URL PROTOCOL"
    r'(\d+)\s+'                          # HTTP status code
    r'(\d+|-)\s+'                        # Response size (or "-")
    r'"[^"]*"\s+'                        # Referer (ignored)
    r'"([^"]*)"'                         # User-Agent
    r'(?:\s+(\d+))?'                     # Optional response time
)


def parse_log_line_v2(line: str) -> Optional[Dict[str, Any]]:
    """
    Parse a single Apache Combined Log line.
    Returns None if unparseable or not a relevant bot.
    """
    match = APACHE_LOG_PATTERN.match(line)
    if not match:
        return None

    ip, date_str, method, url, code, size, user_agent, response_time = match.groups()

    # Classify bot first (fast reject for non-bots)
    bot_name, bot_family = classify_bot(user_agent)
    if bot_name is None:
        return None

    # Parse timestamp
    try:
        timestamp = datetime.strptime(date_str.split()[0], "%d/%b/%Y:%H:%M:%S")
    except ValueError:
        return None

    return {
        "ip": ip,
        "timestamp": timestamp,
        "url": url,
        "http_code": int(code),
        "response_size": int(size) if size != "-" else 0,
        "user_agent": user_agent,
        "crawler": bot_name,
        "bot_family": bot_family,
        "response_time": int(response_time) if response_time else None,
        "log_date": timestamp.date(),
        "page_type": classify_page_type(url),
    }


def stream_log_file(file_path: str) -> Generator[Tuple[int, Optional[Dict]], None, None]:
    """
    Stream-parse a .log file line by line.
    Yields (line_number, parsed_data_or_None) for each line.
    """
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        for line_number, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                yield line_number, None
                continue
            yield line_number, parse_log_line_v2(line)


def count_lines(file_path: str) -> int:
    """Fast line count using binary read in large chunks."""
    count = 0
    with open(file_path, "rb") as f:
        buf_size = 1024 * 1024  # 1MB chunks
        while True:
            buf = f.read(buf_size)
            if not buf:
                break
            count += buf.count(b"\n")
    return count


# --- CSV log parser (structured CSV with columns like host, ip, url, user_agent) ---

# Possible column names mapped to our internal fields
_CSV_COL_MAP = {
    "ip": ["ip", "client_ip", "remote_addr", "remote_host"],
    "datetime": ["datetime", "date_time", "timestamp", "time", "date"],
    "url": ["url", "request_uri", "uri", "path", "request_url", "request"],
    "method": ["method", "request_method", "http_method"],
    "status": ["status", "status_code", "http_status", "response_code", "code"],
    "size": ["size", "bytes", "body_bytes_sent", "response_size", "bytes_sent"],
    "user_agent": ["user_agent", "useragent", "http_user_agent", "ua"],
    "referer": ["referer", "referrer", "http_referer"],
    "host": ["host", "server_name", "hostname", "vhost"],
    "protocol": ["protocol", "http_protocol", "server_protocol"],
}


def _find_csv_column(headers: list, field: str) -> Optional[str]:
    """Find the actual CSV column name matching a logical field."""
    candidates = _CSV_COL_MAP.get(field, [field])
    headers_lower = {h.lower().strip(): h for h in headers}
    for candidate in candidates:
        if candidate.lower() in headers_lower:
            return headers_lower[candidate.lower()]
    return None


def detect_file_format(file_path: str) -> str:
    """
    Detect whether a file is a raw Apache log or a structured CSV log.
    Returns 'csv_log' or 'raw_log'.
    """
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        first_line = f.readline().strip()

    # If first line looks like a CSV header (contains commas and known column names)
    if "," in first_line:
        lower = first_line.lower().replace('"', '').replace("'", "")
        csv_indicators = ["user_agent", "useragent", "http_user_agent", "status", "url", "ip", "datetime"]
        matches = sum(1 for ind in csv_indicators if ind in lower)
        if matches >= 3:
            return "csv_log"

    return "raw_log"


def _parse_csv_status_size(raw_value: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Parse a status field that may contain both status code and size merged.
    Handles: "200", " 200 541 ", "200 541", "404", etc.
    """
    parts = raw_value.strip().split()
    status = None
    size = None
    if len(parts) >= 1:
        try:
            status = int(parts[0])
        except ValueError:
            pass
    if len(parts) >= 2:
        try:
            size = int(parts[1])
        except ValueError:
            pass
    return status, size


def parse_csv_log_line(row: dict, col_map: dict) -> Optional[Dict[str, Any]]:
    """
    Parse a single CSV row into a log dict.
    Returns None if unparseable or not a relevant bot.
    col_map: {field_name: actual_csv_column_name}

    Handles shifted columns: when status+size are merged into one field,
    the CSV has fewer data columns than headers, causing DictReader to shift
    referer->user_agent and user_agent->None.
    """
    user_agent = (row.get(col_map.get("user_agent", "")) or "").strip()

    # Handle shifted columns: if user_agent is empty, the referer column
    # may actually contain the user_agent (status+size merged = 1 fewer col)
    if not user_agent:
        referer_col = col_map.get("referer", "")
        candidate = (row.get(referer_col) or "").strip()
        if candidate and ("Mozilla" in candidate or "bot" in candidate.lower()
                          or "spider" in candidate.lower() or "http" not in candidate.lower()):
            user_agent = candidate

    if not user_agent:
        return None

    # Classify bot first (fast reject for non-bots)
    bot_name, bot_family = classify_bot(user_agent)
    if bot_name is None:
        return None

    # URL
    url = (row.get(col_map.get("url", "")) or "").strip()
    if not url:
        return None

    # IP
    ip = (row.get(col_map.get("ip", "")) or "").strip()

    # Timestamp
    datetime_str = (row.get(col_map.get("datetime", "")) or "").strip()
    timestamp = None
    if datetime_str:
        for fmt in [
            "%d/%b/%Y:%H:%M:%S %z",    # 01/Jan/2026:00:00:02 +0000
            "%d/%b/%Y:%H:%M:%S",        # 01/Jan/2026:00:00:02
            "%Y-%m-%d %H:%M:%S",        # 2026-01-01 00:00:02
            "%Y-%m-%dT%H:%M:%S",        # 2026-01-01T00:00:02
            "%d/%m/%Y %H:%M:%S",        # 01/01/2026 00:00:02
        ]:
            try:
                timestamp = datetime.strptime(datetime_str, fmt)
                break
            except ValueError:
                continue
        if timestamp is None:
            # Try stripping timezone offset manually
            try:
                timestamp = datetime.strptime(datetime_str.split()[0], "%d/%b/%Y:%H:%M:%S")
            except ValueError:
                return None
    else:
        return None

    # HTTP status and size - handle merged or separate columns
    status_col = col_map.get("status", "")
    size_col = col_map.get("size", "")
    raw_status = (row.get(status_col) or "").strip()
    raw_size = (row.get(size_col) or "").strip()

    http_code = None
    response_size = 0

    if raw_status:
        http_code, merged_size = _parse_csv_status_size(raw_status)
        if merged_size is not None:
            response_size = merged_size

    # If we have a separate valid size column, use it
    if raw_size:
        try:
            response_size = int(raw_size.strip())
        except ValueError:
            pass

    return {
        "ip": ip,
        "timestamp": timestamp.replace(tzinfo=None) if timestamp.tzinfo else timestamp,
        "url": url,
        "http_code": http_code,
        "response_size": response_size,
        "user_agent": user_agent,
        "crawler": bot_name,
        "bot_family": bot_family,
        "response_time": None,
        "log_date": timestamp.date(),
        "page_type": classify_page_type(url),
    }


def stream_csv_log_file(file_path: str) -> Generator[Tuple[int, Optional[Dict]], None, None]:
    """
    Stream-parse a CSV log file line by line.
    Auto-detects column mapping from header row.
    Yields (line_number, parsed_data_or_None) for each line.
    """
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return

        # Build column mapping
        col_map = {}
        for field in _CSV_COL_MAP:
            found = _find_csv_column(list(reader.fieldnames), field)
            if found:
                col_map[field] = found

        # Check we have minimum required columns
        if "user_agent" not in col_map or "url" not in col_map:
            return

        for line_number, row in enumerate(reader, 2):  # line 2 = first data row
            yield line_number, parse_csv_log_line(row, col_map)


# --- Legacy parsers for Excel/CSV (kept for backward compatibility) ---


def detect_crawler(user_agent: str) -> str:
    """Legacy crawler detection. Prefer classify_bot() for new code."""
    bot_name, _ = classify_bot(user_agent)
    return bot_name or "Other"


def parse_log_line(line: str) -> Optional[Dict[str, Any]]:
    """
    Legacy parser for Apache log lines (used by Excel import).
    Does NOT filter bots - returns all parseable lines.
    """
    match = APACHE_LOG_PATTERN.match(line)
    if not match:
        return None

    ip, date_str, method, url, code, size, user_agent, response_time = match.groups()

    try:
        timestamp = datetime.strptime(date_str.split()[0], "%d/%b/%Y:%H:%M:%S")
    except ValueError:
        timestamp = None

    bot_name, bot_family = classify_bot(user_agent)

    return {
        "ip": ip,
        "timestamp": timestamp,
        "url": url,
        "http_code": int(code),
        "response_size": int(size) if size != "-" else 0,
        "user_agent": user_agent,
        "crawler": bot_name or detect_crawler(user_agent),
        "bot_family": bot_family,
        "response_time": int(response_time) if response_time else None,
        "log_date": timestamp.date() if timestamp else None,
        "page_type": classify_page_type(url),
    }


def parse_excel_logs(file_content: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Parse Excel file with bot logs.
    Expected format: One sheet per day, columns: Date, Time, Line
    """
    logs = []

    xl = pd.ExcelFile(BytesIO(file_content))

    for sheet_name in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet_name)

        if "Line" not in df.columns:
            continue

        for _, row in df.iterrows():
            line = row.get("Line", "")
            if not line or pd.isna(line):
                continue

            parsed = parse_log_line(str(line))
            if parsed:
                # If timestamp not parsed from line, try Date column
                if not parsed["timestamp"] and "Date" in df.columns:
                    try:
                        parsed["timestamp"] = pd.to_datetime(row["Date"])
                        parsed["log_date"] = parsed["timestamp"].date()
                    except Exception:
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
    df = None
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            df = pd.read_csv(BytesIO(file_content), encoding=encoding)
            break
        except Exception:
            continue

    if df is None:
        return urls

    # Find URL column (might be 'Adresse', 'Address', or 'URL')
    url_col = None
    for col in ["Adresse", "Address", "URL", "url"]:
        if col in df.columns:
            url_col = col
            break

    if not url_col:
        return urls

    # Find HTTP code column
    code_col = None
    for col in ["Code HTTP", "Status Code", "HTTP Status", "Status"]:
        if col in df.columns:
            code_col = col
            break

    # Find indexability column
    index_col = None
    for col in ["Indexabilité", "Indexability", "Indexable"]:
        if col in df.columns:
            index_col = col
            break

    for _, row in df.iterrows():
        url = row.get(url_col, "")
        if not url or pd.isna(url):
            continue

        urls.append({
            "url": str(url).strip(),
            "http_code": int(row[code_col]) if code_col and not pd.isna(row.get(code_col)) else None,
            "indexability": str(row[index_col]) if index_col and not pd.isna(row.get(index_col)) else None,
        })

    return urls
