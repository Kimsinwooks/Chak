import re
import sqlite3
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/meeting-report", tags=["Meeting Report"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


class AIEventCreate(BaseModel):
    question: str
    answer: str = ""
    askedAtSec: float = 0
    beforeContext: str = ""
    afterContext: str = ""


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_report_tables():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS meeting_ai_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        asked_at_sec REAL DEFAULT 0,
        before_context TEXT,
        after_context TEXT,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()


def parse_time_to_sec(time_text: str) -> int:
    parts = time_text.strip().split(":")
    if len(parts) == 2:
        mm, ss = parts
        return int(mm) * 60 + int(ss)
    if len(parts) == 3:
        hh, mm, ss = parts
        return int(hh) * 3600 + int(mm) * 60 + int(ss)
    return 0


def format_sec(sec: float) -> str:
    sec = max(0, int(sec))
    hh = sec // 3600
    mm = (sec % 3600) // 60
    ss = sec % 60
    if hh > 0:
        return f"{hh:02d}:{mm:02d}:{ss:02d}"
    return f"{mm:02d}:{ss:02d}"


def tokenize(text: str) -> List[str]:
    stopwords = {
        "그리고", "그래서", "근데", "일단", "이제", "그냥", "저희", "우리", "제가", "너무",
        "있는", "없는", "하면", "해서", "되는", "같은", "회의", "내용", "부분", "진짜",
        "the", "and", "for", "with", "this", "that", "you", "are", "was", "were",
    }
    tokens = re.findall(r"[가-힣A-Za-z0-9_]{2,}", text.lower())
    return [t for t in tokens if t not in stopwords]


def extract_transcript_lines(raw_text: str):
    """
    Expected:
    [00:00~00:05] 익명1: 내용
    [00:00~00:05] 내용
    """
    lines = []
    pattern = re.compile(
        r"\[(?P<start>\d{1,2}:\d{2}(?::\d{2})?)\s*~\s*(?P<end>\d{1,2}:\d{2}(?::\d{2})?)\]\s*(?P<body>.*)"
    )

    for raw_line in raw_text.splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        match = pattern.search(raw_line)
        if match:
            start_sec = parse_time_to_sec(match.group("start"))
            end_sec = parse_time_to_sec(match.group("end"))
            body = match.group("body").strip()
            speaker = "익명"
            text = body

            if ":" in body:
                left, right = body.split(":", 1)
                if len(left.strip()) <= 20:
                    speaker = left.strip()
                    text = right.strip()

            if end_sec <= start_sec:
                end_sec = start_sec + 5

            lines.append({
                "startSec": start_sec,
                "endSec": end_sec,
                "start": format_sec(start_sec),
                "end": format_sec(end_sec),
                "speaker": speaker,
                "text": text,
                "keywords": Counter(tokenize(text)).most_common(5),
            })
        else:
            # timestamp 없는 줄은 직전 이후 5초짜리로 붙임
            prev_end = lines[-1]["endSec"] if lines else 0
            lines.append({
                "startSec": prev_end,
                "endSec": prev_end + 5,
                "start": format_sec(prev_end),
                "end": format_sec(prev_end + 5),
                "speaker": "익명",
                "text": raw_line,
                "keywords": Counter(tokenize(raw_line)).most_common(5),
            })

    return lines


def build_topic_label(text: str) -> str:
    tokens = tokenize(text)
    common = [w for w, _ in Counter(tokens).most_common(3)]
    if not common:
        return "기타 논의"
    return " · ".join(common)


def segment_by_topic(lines):
    if not lines:
        return []

    blocks = []
    current = {
        "startSec": lines[0]["startSec"],
        "endSec": lines[0]["endSec"],
        "texts": [lines[0]["text"]],
        "lineIndexes": [0],
    }

    def top_set(texts):
        return set([w for w, _ in Counter(tokenize(" ".join(texts))).most_common(8)])

    for idx, line in enumerate(lines[1:], start=1):
        current_tokens = top_set(current["texts"])
        line_tokens = set(tokenize(line["text"]))
        overlap = len(current_tokens & line_tokens)
        current_duration = current["endSec"] - current["startSec"]
        gap = line["startSec"] - current["endSec"]

        should_split = False
        if gap >= 30 and current_duration >= 20:
            should_split = True
        elif current_duration >= 90 and overlap <= 1:
            should_split = True
        elif current_duration >= 180:
            should_split = True

        if should_split:
            blocks.append(current)
            current = {
                "startSec": line["startSec"],
                "endSec": line["endSec"],
                "texts": [line["text"]],
                "lineIndexes": [idx],
            }
        else:
            current["endSec"] = max(current["endSec"], line["endSec"])
            current["texts"].append(line["text"])
            current["lineIndexes"].append(idx)

    blocks.append(current)

    result = []
    for i, block in enumerate(blocks):
        full_text = " ".join(block["texts"])
        keywords = [w for w, _ in Counter(tokenize(full_text)).most_common(8)]
        topic = build_topic_label(full_text)

        result.append({
            "id": f"topic_{i+1}",
            "topic": topic,
            "startSec": block["startSec"],
            "endSec": block["endSec"],
            "start": format_sec(block["startSec"]),
            "end": format_sec(block["endSec"]),
            "durationSec": max(1, block["endSec"] - block["startSec"]),
            "keywords": keywords,
            "summary": summarize_block_text(full_text),
            "lineIndexes": block["lineIndexes"],
            "text": full_text,
        })

    return result


def summarize_block_text(text: str) -> str:
    sentences = re.split(r"(?<=[.!?。！？])\s+|(?<=다\.)\s+", text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return text[:160]
    return " ".join(sentences[:2])[:240]


def build_minutes(topic_blocks, ai_events):
    lines = []
    lines.append("# 회의록 정리")
    lines.append("")
    lines.append("## 1. 주제별 진행")
    for block in topic_blocks:
        lines.append(
            f"- [{block['start']}~{block['end']}] {block['topic']}: {block['summary']}"
        )

    lines.append("")
    lines.append("## 2. 주제별 키워드")
    for block in topic_blocks:
        keyword_text = ", ".join(block["keywords"]) if block["keywords"] else "키워드 없음"
        lines.append(f"- [{block['start']}~{block['end']}] {block['topic']} → {keyword_text}")

    lines.append("")
    lines.append("## 3. AI 사용 시점")
    if not ai_events:
        lines.append("- 기록된 AI 질의가 없습니다.")
    else:
        for event in ai_events:
            lines.append(
                f"- [{format_sec(event['asked_at_sec'])}] 질문: {event['question']}"
            )

    return "\n".join(lines)


def build_mindmap_text(topic_blocks):
    parts = []
    for block in topic_blocks:
        kw = ", ".join(block["keywords"][:5]) if block["keywords"] else block["topic"]
        parts.append(f"[{block['start']}~{block['end']}] {block['topic']} - {kw}")
    return " -> ".join(parts)


def read_session(session_id: str):
    conn = get_conn()
    cur = conn.cursor()
    session = cur.execute(
        "SELECT * FROM meeting_sessions WHERE id = ?",
        (session_id,),
    ).fetchone()
    conn.close()
    return session


def read_transcript_text(session_id: str):
    conn = get_conn()
    cur = conn.cursor()

    rows = cur.execute("""
        SELECT text_content, preview_line, created_at
        FROM library_items
        WHERE session_id = ?
          AND bucket IN ('live_recordings', 'post_meeting_recordings')
        ORDER BY created_at ASC
    """, (session_id,)).fetchall()

    conn.close()

    chunks = []
    for row in rows:
        text = row["text_content"] or row["preview_line"] or ""
        if text.strip():
            chunks.append(text.strip())

    return "\n".join(chunks)


def read_ai_events(session_id: str):
    ensure_report_tables()
    conn = get_conn()
    cur = conn.cursor()
    rows = cur.execute("""
        SELECT *
        FROM meeting_ai_events
        WHERE session_id = ?
        ORDER BY asked_at_sec ASC, created_at ASC
    """, (session_id,)).fetchall()
    conn.close()

    return [dict(row) for row in rows]


@router.post("/{session_id}/ai-event")
def create_ai_event(session_id: str, payload: AIEventCreate):
    ensure_report_tables()

    if not read_session(session_id):
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    conn = get_conn()
    cur = conn.cursor()
    event_id = str(uuid.uuid4())

    cur.execute("""
        INSERT INTO meeting_ai_events
        (id, session_id, question, answer, asked_at_sec, before_context, after_context, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        session_id,
        payload.question,
        payload.answer,
        payload.askedAtSec,
        payload.beforeContext,
        payload.afterContext,
        datetime.now().isoformat(),
    ))

    conn.commit()
    conn.close()

    return {
        "id": event_id,
        "sessionId": session_id,
        "askedAtSec": payload.askedAtSec,
    }


@router.get("/{session_id}")
def get_meeting_report(session_id: str):
    ensure_report_tables()

    session = read_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    raw_text = read_transcript_text(session_id)
    transcript_lines = extract_transcript_lines(raw_text)
    topic_blocks = segment_by_topic(transcript_lines)
    ai_events = read_ai_events(session_id)

    total_sec = 0
    if transcript_lines:
        total_sec = max(line["endSec"] for line in transcript_lines)
    if topic_blocks:
        total_sec = max(total_sec, max(block["endSec"] for block in topic_blocks))
    if ai_events:
        total_sec = max(total_sec, int(max(event["asked_at_sec"] for event in ai_events)) + 10)

    minutes = build_minutes(topic_blocks, ai_events)
    mindmap_text = build_mindmap_text(topic_blocks)

    return {
        "session": {
            "id": session["id"],
            "title": session["title"],
            "meetingTime": session["meeting_time"],
            "keywords": session["keywords"],
            "meetingType": session["meeting_type"],
            "status": session["status"],
        },
        "totalSec": total_sec,
        "transcriptLines": transcript_lines,
        "topicBlocks": topic_blocks,
        "aiEvents": [
            {
                "id": event["id"],
                "question": event["question"],
                "answer": event["answer"],
                "askedAtSec": event["asked_at_sec"],
                "askedAt": format_sec(event["asked_at_sec"]),
                "beforeContext": event["before_context"],
                "afterContext": event["after_context"],
                "createdAt": event["created_at"],
            }
            for event in ai_events
        ],
        "minutesMarkdown": minutes,
        "mindmapText": mindmap_text,
    }
