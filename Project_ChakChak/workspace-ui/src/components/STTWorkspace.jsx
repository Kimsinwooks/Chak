import React, { useEffect, useMemo, useState } from 'react';
import {
  uploadTranscription,
  fetchTranscriptionSessions,
  fetchTranscriptionDetail,
} from '../services/sttService';
import { Upload, Clock3, Mic, PauseCircle, FileAudio } from 'lucide-react';

function formatDateTime(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatSec(sec) {
  const total = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function silenceLabel(state) {
  switch (state) {
    case 'micro_pause':
      return '미세 정적';
    case 'short_pause':
      return '짧은 정적';
    case 'extended_pause':
      return '긴 정적';
    case 'stagnation':
      return '정체 가능';
    default:
      return state;
  }
}

export default function STTWorkspace() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedUploadModel, setSelectedUploadModel] = useState('medium');

  const loadSessions = async () => {
    try {
      const data = await fetchTranscriptionSessions();
      setSessions(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (e) {
      console.error(e);
      setError('세션 목록을 불러오지 못했습니다.');
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }

    const loadDetail = async () => {
      try {
        const detail = await fetchTranscriptionDetail(selectedId);
        setSelectedDetail(detail);
      } catch (e) {
        console.error(e);
        setError('세션 상세를 불러오지 못했습니다.');
      }
    };

    loadDetail();
  }, [selectedId]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError('');

      const result = await uploadTranscription(selectedFile, selectedUploadModel);
      console.log("upload result:", result);

      await loadSessions();

      const newId = result.session_id ?? result.id;
    if (!newId) {
      throw new Error("업로드 응답에 session_id 또는 id가 없습니다.");
    }

    setSelectedId(newId);

    const detail = await fetchTranscriptionDetail(newId);
    console.log("new detail:", detail);
    setSelectedDetail(detail);

    setSelectedFile(null);
  } catch (e) {
    console.error(e);
    setError(`음성 업로드 또는 변환 중 오류가 발생했습니다: ${e.message}`);
  } finally {
    setIsUploading(false);
  }
};

  const summary = useMemo(() => {
    if (!selectedDetail) return null;
    return {
      duration: formatSec(selectedDetail.total_duration),
      silence: formatSec(selectedDetail.total_silence),
      silenceEvents: selectedDetail.silence_events,
      segmentCount: selectedDetail.segments?.length || 0,
    };
  }, [selectedDetail]);

  return (
    <div className="w-full flex-1 min-h-0 bg-transparent flex flex-col overflow-hidden">
      <div className="flex-1 p-6 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 grid grid-cols-[340px_minmax(0,1fr)] gap-6">
          <div className="flex flex-col gap-4 h-full min-h-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">STT 업로드</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                업로드 음성과 아이디어 채널의 실시간 회의 STT가 같은 DB에 저장됩니다.
              </p>

              <div className="space-y-3">
                <label className="block">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 cursor-pointer hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3">
                      <FileAudio className="w-5 h-5 text-gray-500" />
                      <div className="text-sm">
                        {selectedFile ? selectedFile.name : '음성 파일 선택'}
                      </div>
                    </div>
                  </div>
                </label>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">파일 변환 모델</label>
                  <select
                    value={selectedUploadModel}
                    onChange={(e) => setSelectedUploadModel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-sm"
                  >
                    <option value="small">small</option>
                    <option value="medium">medium</option>
                    <option value="large-v3">large-v3</option>
                    <option value="large-v3-turbo">large-v3-turbo</option>
                  </select>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white font-medium disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? '변환 및 저장 중...' : '업로드 후 저장'}
                </button>

                {error && (
                  <div className="text-sm text-red-500">{error}</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 min-h-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold">업로드 기록</h3>
                <p className="text-xs text-gray-500 mt-1">
                  실시간 회의 내용과 파일 업로드 결과가 함께 쌓입니다.
                </p>
              </div>

              <div className="overflow-y-auto h-full">
                {sessions.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    아직 저장된 STT 기록이 없습니다.
                  </div>
                ) : (
                  sessions.map((item) => {
                    const active = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full text-left px-4 py-4 border-b border-gray-100 transition ${
                          active ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {item.filename}
                          </div>
                          <div className="text-[11px] text-gray-500 shrink-0">
                            {formatDateTime(item.created_at)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                            {item.source_type === 'realtime' ? '실시간 회의' : '파일 업로드'}
                          </span>
                          {item.channel_name && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                              {item.channel_name}
                            </span>
                          )}
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                            {item.status}
                          </span>
                          {item.realtime_model_name && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                              RT {item.realtime_model_name}
                            </span>
                          )}
                          {item.final_model_name && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                              Final {item.final_model_name}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 mb-2">
                          길이 {formatSec(item.total_duration)} · 정적 {formatSec(item.total_silence)} · 이벤트 {item.silence_events}개
                        </div>

                        <div className="text-sm text-gray-600 line-clamp-2 whitespace-pre-line">
                          {item.preview || '변환 텍스트 미리보기 없음'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="h-full min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {!selectedDetail ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                왼쪽에서 업로드 기록을 선택하세요.
              </div>
            ) : (
              <>
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedDetail.filename}</h2>
                      <div className="text-sm text-gray-500 mt-1">
                        생성 시각: {formatDateTime(selectedDetail.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedDetail.realtime_model_name && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        RT {selectedDetail.realtime_model_name}
                      </span>
                    )}
                    {selectedDetail.final_model_name && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        Final {selectedDetail.final_model_name}
                      </span>
                    )}
                  </div>

                  {summary && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      <div className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-sm inline-flex items-center gap-2">
                        <Clock3 className="w-4 h-4" />
                        전체 길이 {summary.duration}
                      </div>
                      <div className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-sm inline-flex items-center gap-2">
                        <PauseCircle className="w-4 h-4" />
                        정적 {summary.silence}
                      </div>
                      <div className="rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm">
                        정적 이벤트 {summary.silenceEvents}개
                      </div>
                      <div className="rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm">
                        세그먼트 {summary.segmentCount}개
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    <section>
                      <h3 className="font-semibold mb-3">전체 변환본</h3>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
                        {selectedDetail.merged_timeline?.length ? (
                          selectedDetail.merged_timeline.map((item, idx) => (
                            <div
                              key={`${item.kind}-${idx}-${item.start_sec}`}
                              className={`rounded-xl px-3 py-3 ${
                                item.kind === 'speech'
                                  ? 'bg-white border border-gray-200'
                                  : 'bg-amber-50 border border-amber-200 text-amber-800'
                              }`}
                            >
                              {item.kind === 'speech' ? (
                                <div className="leading-6">
                                  <span className="font-medium text-blue-700">
                                    [{formatSec(item.start_sec)}~{formatSec(item.end_sec)}] {item.speaker}
                                  </span>
                                  <span>: </span>
                                  <span className="text-gray-800">{item.text}</span>
                                </div>
                              ) : (
                                <div className="leading-6">
                                  <span className="font-medium">
                                    [{formatSec(item.start_sec)}~{formatSec(item.end_sec)}] 발화 X
                                  </span>
                                  {item.state && (
                                    <span className="ml-2 text-xs opacity-80">
                                      ({silenceLabel(item.state)})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">
                            표시할 전체 타임라인이 없습니다.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}