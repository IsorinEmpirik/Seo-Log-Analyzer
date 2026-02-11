import re
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional, Generator, Tuple
from io import BytesIO
from app.services.bot_registry import classify_bot


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
