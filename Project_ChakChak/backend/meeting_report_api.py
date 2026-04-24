import json
import re
import sqlite3
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from faster_whisper import WhisperModel

try:
    from chak_runtime_api import (
        transcribe_audio_file,
        call_ollama_chat,
        maybe_web_search,
        REALTIME_SLM_MODEL,
    )
except Exception:
    transcribe_audio_file = None
    call_ollama_chat = None
    maybe_web_search = None
    REALTIME_SLM_MODEL = "qwen2.5:3b"

router = APIRouter(prefix="/meeting-report", tags=["Meeting Report"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "meeting_app.sqlite3"


STT_MODEL_CACHE = {}

ALLOWED_STT_MODELS = {
    "tiny", "base", "small", "medium", "large-v3", "large-v3-turbo"
}

def get_selected_whisper_model(model_name: str):
    model_name = model_name or "medium"
    if model_name not in ALLOWED_STT_MODELS:
        model_name = "medium"

    if model_name in STT_MODEL_CACHE:
        return STT_MODEL_CACHE[model_name]

    try:
        model = WhisperModel(model_name, device="cuda", compute_type="float16")
    except Exception:
        model = WhisperModel(model_name, device="cpu", compute_type="int8")

    STT_MODEL_CACHE[model_name] = model
    return model


def transcribe_audio_with_selected_model(file_path: str, model_name: str = "medium", language: str = "ko") -> str:
    """
    회의 후 업로드 음성 전용 STT.
    chunk가 아니라 전체 파일 기준으로 Whisper segment timestamp를 그대로 사용한다.
    """
    import tempfile
    import os

    try:
        from chak_runtime_api import ffmpeg_to_wav_16k_mono
    except Exception as e:
        raise RuntimeError(f"ffmpeg 변환 함수 연결 실패: {e}")

    model = get_selected_whisper_model(model_name)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_wav:
        wav_path = tmp_wav.name

    try:
        ffmpeg_to_wav_16k_mono(file_path, wav_path)

        segments, info = model.transcribe(
            wav_path,
            language=language or "ko",
            vad_filter=True,
            beam_size=5,
            temperature=0.0,
            condition_on_previous_text=True,
            word_timestamps=False,
        )

        lines = []
        for seg in segments:
            text = (seg.text or "").strip()
            if not text:
                continue

            start_sec = int(float(seg.start))
            end_sec = int(float(seg.end))
            if end_sec <= start_sec:
                end_sec = start_sec + 1

            mm1, ss1 = divmod(start_sec, 60)
            mm2, ss2 = divmod(end_sec, 60)

            lines.append(f"[{mm1:02d}:{ss1:02d}~{mm2:02d}:{ss2:02d}] 익명1: {text}")

        return "\n".join(lines)
    finally:
        try:
            os.remove(wav_path)
        except Exception:
            pass



class AIEventCreate(BaseModel):
    question: str
    answer: str = ""
    askedAtSec: float = 0
    beforeContext: str = ""
    afterContext: str = ""


def get_conn():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_report_tables():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS meeting_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        meeting_time TEXT,
        keywords TEXT,
        meeting_type TEXT,
        realtime_recording_enabled INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        stopped_at TEXT,
        status TEXT DEFAULT 'live'
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS library_items (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        scope TEXT NOT NULL,
        bucket TEXT NOT NULL,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        text_content TEXT,
        preview_line TEXT,
        created_at TEXT NOT NULL
    )
    """)

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

    cur.execute("""
    CREATE TABLE IF NOT EXISTS meeting_report_cache (
        session_id TEXT PRIMARY KEY,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()


def parse_time_to_sec(time_text: str) -> int:
    parts = time_text.strip().split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
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
        "그리고", "그래서", "근데", "일단", "이제", "그냥", "저희", "우리", "제가",
        "있는", "없는", "하면", "해서", "되는", "같은", "회의", "내용", "부분",
        "the", "and", "for", "with", "this", "that", "you", "are",
    }
    tokens = re.findall(r"[가-힣A-Za-z0-9_]{2,}", text.lower())
    return [t for t in tokens if t not in stopwords]


def extract_transcript_lines(raw_text: str):
    lines = []
    pattern = re.compile(
        r"\[(?P<start>\d{1,2}:\d{2}(?::\d{2})?)\s*~\s*(?P<end>\d{1,2}:\d{2}(?::\d{2})?)\]\s*(?P<body>.*)"
    )

    for raw_line in raw_text.splitlines():
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        m = pattern.search(raw_line)
        if m:
            start_sec = parse_time_to_sec(m.group("start"))
            end_sec = parse_time_to_sec(m.group("end"))
            body = m.group("body").strip()

            speaker = "익명"
            text = body
            if ":" in body:
                left, right = body.split(":", 1)
                if len(left.strip()) <= 20:
                    speaker = left.strip()
                    text = right.strip()

            if end_sec <= start_sec:
                end_sec = start_sec + 1

            lines.append({
                "startSec": start_sec,
                "endSec": end_sec,
                "start": format_sec(start_sec),
                "end": format_sec(end_sec),
                "speaker": speaker,
                "text": text,
            })
        else:
            prev_end = lines[-1]["endSec"] if lines else 0
            lines.append({
                "startSec": prev_end,
                "endSec": prev_end + 5,
                "start": format_sec(prev_end),
                "end": format_sec(prev_end + 5),
                "speaker": "익명",
                "text": raw_line,
            })

    return lines


def fallback_topic_blocks(transcript_lines):
    if not transcript_lines:
        return []

    total_end = max(line["endSec"] for line in transcript_lines)
    block_size = 120
    blocks = []

    start = 0
    idx = 1
    while start < total_end:
        end = min(total_end, start + block_size)
        selected = [
            line for line in transcript_lines
            if line["startSec"] < end and line["endSec"] > start
        ]
        text = " ".join([line["text"] for line in selected])
        keywords = [w for w, _ in Counter(tokenize(text)).most_common(8)]
        topic = " · ".join(keywords[:3]) if keywords else f"주제 {idx}"

        blocks.append({
            "id": f"topic_{idx}",
            "topic": topic,
            "startSec": start,
            "endSec": end,
            "start": format_sec(start),
            "end": format_sec(end),
            "durationSec": max(1, end - start),
            "keywords": keywords,
            "summary": text[:260] if text else "해당 구간 발화 없음",
            "lineIndexes": [],
            "text": text,
        })
        start = end
        idx += 1

    return blocks


def read_session(session_id: str):
    conn = get_conn()
    row = conn.execute("SELECT * FROM meeting_sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return row


def read_transcript_text(session_id: str):
    conn = get_conn()
    rows = conn.execute("""
        SELECT text_content, preview_line
        FROM library_items
        WHERE session_id = ?
          AND bucket IN ('live_recordings', 'post_meeting_recordings')
        ORDER BY created_at ASC
    """, (session_id,)).fetchall()
    conn.close()

    texts = []
    for r in rows:
        t = r["text_content"] or r["preview_line"] or ""
        if t.strip():
            texts.append(t.strip())
    return "\n".join(texts)


def read_ai_events(session_id: str):
    ensure_report_tables()
    conn = get_conn()
    rows = conn.execute("""
        SELECT *
        FROM meeting_ai_events
        WHERE session_id = ?
        ORDER BY asked_at_sec ASC, created_at ASC
    """, (session_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_session(title: str, meeting_type: str = "uploaded_audio"):
    ensure_report_tables()
    session_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    conn = get_conn()
    conn.execute("""
        INSERT INTO meeting_sessions
        (id, title, meeting_time, keywords, meeting_type, realtime_recording_enabled, created_at, stopped_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        title,
        now,
        "",
        meeting_type,
        0,
        now,
        now,
        "stopped",
    ))
    conn.commit()
    conn.close()
    return session_id


def save_library_item(session_id: str, bucket: str, kind: str, name: str, file_path: str, text_content: str):
    ensure_report_tables()
    item_id = str(uuid.uuid4())
    preview = text_content.splitlines()[0][:220] if text_content else name

    conn = get_conn()
    conn.execute("""
        INSERT INTO library_items
        (id, session_id, scope, bucket, kind, name, file_path, text_content, preview_line, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id,
        session_id,
        "session",
        bucket,
        kind,
        name,
        file_path,
        text_content,
        preview,
        datetime.now().isoformat(),
    ))
    conn.commit()
    conn.close()
    return item_id


def extract_json_object(text: str):
    if not text:
        raise ValueError("empty SLM output")

    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("JSON object not found")

    return json.loads(cleaned[start:end + 1])


def normalize_slm_report(raw, session, transcript_lines, ai_events):
    total_sec = 0
    if transcript_lines:
        total_sec = max(line["endSec"] for line in transcript_lines)
    if ai_events:
        total_sec = max(total_sec, int(max(e["asked_at_sec"] for e in ai_events)) + 10)

    topic_blocks = raw.get("topicBlocks") or []
    normalized_blocks = []

    for i, block in enumerate(topic_blocks):
        start_sec = int(block.get("startSec", 0))
        end_sec = int(block.get("endSec", start_sec + 1))
        if end_sec <= start_sec:
            end_sec = start_sec + 1

        total_sec = max(total_sec, end_sec)

        normalized_blocks.append({
            "id": block.get("id") or f"topic_{i+1}",
            "topic": block.get("topic") or f"주제 {i+1}",
            "startSec": start_sec,
            "endSec": end_sec,
            "start": format_sec(start_sec),
            "end": format_sec(end_sec),
            "durationSec": max(1, end_sec - start_sec),
            "keywords": block.get("keywords") or [],
            "summary": block.get("summary") or "",
            "lineIndexes": block.get("lineIndexes") or [],
            "text": block.get("text") or "",
        })

    if not normalized_blocks:
        normalized_blocks = fallback_topic_blocks(transcript_lines)

    if normalized_blocks:
        total_sec = max(total_sec, max(b["endSec"] for b in normalized_blocks))

    minutes = raw.get("minutesMarkdown") or build_fallback_minutes(normalized_blocks, ai_events)
    mindmap_text = raw.get("mindmapText") or build_mindmap_text(normalized_blocks)

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
        "topicBlocks": normalized_blocks,
        "aiEvents": [
            {
                "id": e["id"],
                "question": e["question"],
                "answer": e["answer"],
                "askedAtSec": e["asked_at_sec"],
                "askedAt": format_sec(e["asked_at_sec"]),
                "beforeContext": e["before_context"],
                "afterContext": e["after_context"],
                "createdAt": e["created_at"],
            }
            for e in ai_events
        ],
        "minutesMarkdown": minutes,
        "mindmapText": mindmap_text,
        "webContext": raw.get("webContext", ""),
        "analysisModel": raw.get("analysisModel", REALTIME_SLM_MODEL),
        "analysisMode": "SLM_WITH_FORCED_WEB",
    }


def build_fallback_minutes(topic_blocks, ai_events):
    out = ["# 회의록 정리", "", "## 1. 주제별 진행"]
    for b in topic_blocks:
        out.append(f"- [{b['start']}~{b['end']}] {b['topic']}: {b['summary']}")

    out += ["", "## 2. 주제별 키워드"]
    for b in topic_blocks:
        out.append(f"- [{b['start']}~{b['end']}] {b['topic']} → {', '.join(b['keywords']) or '키워드 없음'}")

    out += ["", "## 3. AI 사용 시점"]
    if not ai_events:
        out.append("- 기록된 AI 질의가 없습니다.")
    else:
        for e in ai_events:
            out.append(f"- [{format_sec(e['asked_at_sec'])}] 질문: {e['question']}")

    return "\n".join(out)


def build_mindmap_text(topic_blocks):
    return " -> ".join([
        f"[{b['start']}~{b['end']}] {b['topic']} - {', '.join(b['keywords'][:5])}"
        for b in topic_blocks
    ])


def generate_slm_report(session, transcript_text, transcript_lines, ai_events):
    if call_ollama_chat is None:
        raise HTTPException(status_code=500, detail="SLM 호출 함수 연결 실패")

    web_query = f"{session['title']} {session['keywords']} 회의 주제 배경 키워드 참고자료"
    web_context = ""
    if maybe_web_search is not None:
        try:
            web_context = maybe_web_search(web_query, True)
        except Exception:
            web_context = ""

    transcript_for_prompt = transcript_text[:24000]

    ai_events_text = "\n".join([
        f"[{format_sec(e['asked_at_sec'])}] Q: {e['question']}\nA: {e['answer']}"
        for e in ai_events
    ]) or "(AI 사용 기록 없음)"

    system_prompt = """
너는 회의 후 분석 리포트 생성 AI다.
반드시 한국어로 답한다.
반드시 입력된 STT transcript와 웹검색 참고정보를 함께 사용한다.
반드시 유효한 JSON 하나만 출력한다. 설명문, markdown fence, 주석을 출력하지 마라.

해야 할 일:
1. 회의 transcript를 의미 있는 주제 블록으로 나눈다.
2. 각 주제 블록은 startSec, endSec를 가진다.
3. 각 블록에 topic, keywords, summary, text를 만든다.
4. 회의록 minutesMarkdown을 만든다.
5. 마인드맵용 흐름 mindmapText를 만든다.
6. AI 사용 시점이 있으면 해당 시점 전후 맥락을 고려해 minutesMarkdown에 반영한다.

JSON schema:
{
  "topicBlocks": [
    {
      "id": "topic_1",
      "topic": "주제명",
      "startSec": 0,
      "endSec": 60,
      "keywords": ["키워드1", "키워드2"],
      "summary": "해당 구간 요약",
      "text": "해당 구간 핵심 원문/요약"
    }
  ],
  "minutesMarkdown": "# 회의록 정리 ...",
  "mindmapText": "[00:00~01:00] 키워드 - [01:00~02:00] 키워드",
  "webContext": "사용한 웹검색 요약",
  "analysisModel": "model name"
}
""".strip()

    user_prompt = f"""
[회의 정보]
session_id: {session['id']}
title: {session['title']}
meeting_time: {session['meeting_time']}
keywords: {session['keywords']}
meeting_type: {session['meeting_type']}

[웹검색 참고정보 - 반드시 참고]
{web_context or "(웹검색 결과 없음)"}

[AI 사용 시점]
{ai_events_text}

[STT Transcript]
{transcript_for_prompt}
""".strip()

    slm_text = call_ollama_chat(
        REALTIME_SLM_MODEL,
        system_prompt,
        user_prompt,
    )

    try:
        raw = extract_json_object(slm_text)
    except Exception:
        raw = {
            "topicBlocks": fallback_topic_blocks(transcript_lines),
            "minutesMarkdown": "",
            "mindmapText": "",
            "webContext": web_context,
            "analysisModel": REALTIME_SLM_MODEL,
        }

    raw["webContext"] = web_context
    raw["analysisModel"] = REALTIME_SLM_MODEL

    return normalize_slm_report(raw, session, transcript_lines, ai_events)


def cache_report(session_id: str, report: dict):
    ensure_report_tables()
    now = datetime.now().isoformat()

    conn = get_conn()
    conn.execute("""
        INSERT INTO meeting_report_cache
        (session_id, report_json, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            report_json = excluded.report_json,
            updated_at = excluded.updated_at
    """, (
        session_id,
        json.dumps(report, ensure_ascii=False),
        now,
        now,
    ))
    conn.commit()
    conn.close()


def read_cached_report(session_id: str):
    ensure_report_tables()
    conn = get_conn()
    row = conn.execute(
        "SELECT report_json FROM meeting_report_cache WHERE session_id = ?",
        (session_id,),
    ).fetchone()
    conn.close()

    if not row:
        return None

    try:
        return json.loads(row["report_json"])
    except Exception:
        return None


@router.post("/upload-audio")
async def upload_audio_for_report(
    file: UploadFile = File(...),
    stt_model: str = Form("medium"),
    language: str = Form("ko"),
):
    ensure_report_tables()

    allowed = {".wav", ".mp3", ".m4a", ".webm", ".mp4", ".aac", ".ogg", ".flac"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="음성/영상 파일만 업로드할 수 있습니다.")

    if stt_model not in ALLOWED_STT_MODELS:
        stt_model = "medium"

    session_id = save_session(
        title=f"{Path(file.filename).stem} ({stt_model})",
        meeting_type="uploaded_audio",
    )

    upload_dir = DATA_DIR / "uploaded_audio" / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    dst = upload_dir / file.filename

    with open(dst, "wb") as f:
        f.write(await file.read())

    try:
        transcript = transcribe_audio_with_selected_model(
            str(dst),
            model_name=stt_model,
            language=language or "ko",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT 변환 실패: {str(e)}")

    save_library_item(
        session_id=session_id,
        bucket="post_meeting_recordings",
        kind=f"uploaded_audio_transcript_{stt_model}",
        name=file.filename,
        file_path=str(dst),
        text_content=transcript,
    )

    session = read_session(session_id)
    transcript_lines = extract_transcript_lines(transcript)
    ai_events = read_ai_events(session_id)

    report = generate_slm_report(session, transcript, transcript_lines, ai_events)
    report["sttModel"] = stt_model
    report["language"] = language or "ko"
    cache_report(session_id, report)

    return {
        "sessionId": session_id,
        "filename": file.filename,
        "sttModel": stt_model,
        "language": language or "ko",
        "transcriptPreview": transcript[:500],
        "report": report,
    }

@router.post("/{session_id}/ai-event")
def create_ai_event(session_id: str, payload: AIEventCreate):
    ensure_report_tables()

    if not read_session(session_id):
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    conn = get_conn()
    event_id = str(uuid.uuid4())
    conn.execute("""
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

    return {"id": event_id, "sessionId": session_id, "askedAtSec": payload.askedAtSec}


@router.post("/{session_id}/regenerate")
def regenerate_meeting_report(session_id: str):
    ensure_report_tables()

    session = read_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    transcript = read_transcript_text(session_id)
    transcript_lines = extract_transcript_lines(transcript)
    ai_events = read_ai_events(session_id)

    report = generate_slm_report(session, transcript, transcript_lines, ai_events)
    cache_report(session_id, report)

    return report


@router.get("/{session_id}")
def get_meeting_report(session_id: str):
    ensure_report_tables()

    session = read_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    cached = read_cached_report(session_id)
    if cached:
        return cached

    transcript = read_transcript_text(session_id)
    transcript_lines = extract_transcript_lines(transcript)
    ai_events = read_ai_events(session_id)

    report = generate_slm_report(session, transcript, transcript_lines, ai_events)
    cache_report(session_id, report)

    return report
