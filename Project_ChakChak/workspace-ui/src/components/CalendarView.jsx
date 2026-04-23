import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Clock, MapPin, CheckCircle2, User, Bell, Paperclip, Repeat, Plus, Pin, ArrowRight } from 'lucide-react';


//회의 시간 30분 단위로 선택가능
const generateTimeOptions = () => {
  const options = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      const ampm = i < 12 ? '오전' : '오후';
      const hour = i % 12 === 0 ? 12 : i % 12;
      const minute = j === 0 ? '00' : j;
      options.push(`${ampm} ${hour}:${minute}`);
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();

const CalendarView = () => {
  const [events, setEvents] = useState([
    { id: '1', title: 'Q1 전략회의', date: '2026-03-03', backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    { id: '2', title: '디자인 리뷰', date: '2026-03-05', backgroundColor: '#10b981', borderColor: '#10b981' },
    { id: '4', title: '신제품 런칭 미팅', date: '2026-03-26', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  ]);
  
  const [pinnedEvents, setPinnedEvents] = useState([]); 
  const [selectedDate, setSelectedDate] = useState('2026-03-26');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  
  const [startTime, setStartTime] = useState('오전 9:00');
  const [endTime, setEndTime] = useState('오전 10:00');
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const sidebarRef = useRef(null);
  const clickRef = useRef(null);

  const handleDeletePinnedEvent = (id) => {
    setPinnedEvents(pinnedEvents.filter(ev => ev.id !== id));
  };

  const handleEventDragStop = (info) => {
    if (!sidebarRef.current) return;
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const { clientX, clientY } = info.jsEvent;

    const isInsideSidebar = 
      clientX >= sidebarRect.left && clientX <= sidebarRect.right &&
      clientY >= sidebarRect.top && clientY <= sidebarRect.bottom;

    if (isInsideSidebar) {
      const draggedEvent = info.event;
      if (!pinnedEvents.find(e => e.id === draggedEvent.id)) {
        setPinnedEvents([...pinnedEvents, {
          id: draggedEvent.id,
          title: draggedEvent.title,
          date: draggedEvent.startStr
        }]);
      }
    }
  };

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    if (clickRef.current) {
      clearTimeout(clickRef.current);
      clickRef.current = null;
      setIsModalOpen(true);
    } else {
      clickRef.current = setTimeout(() => {
        clickRef.current = null;
      }, 300);
    }
  };

  const handleSaveEvent = () => {
    if (!newEventTitle.trim()) return;
    const newEvent = {
      id: Date.now().toString(),
      title: newEventTitle, 
      date: selectedDate,
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6'
    };
    setEvents([...events, newEvent]);
    setIsModalOpen(false);
    setNewEventTitle('');
    setStartTime('오전 9:00');
    setEndTime('오전 10:00');
  };

  //년-월-날
  const selYear = selectedDate.split('-')[0];
  const selMonth = parseInt(selectedDate.split('-')[1], 10);
  const selDay = parseInt(selectedDate.split('-')[2], 10);

  return (
    <div className="w-full h-full bg-[#1E212E] p-8 font-sans flex gap-6 overflow-hidden relative text-slate-900">
      <style>{`
        .fc { font-family: inherit; }
        .fc-toolbar-title { font-size: 1.5rem !important; font-weight: 900 !important; color: #1e293b; }
        .fc-button-primary { background-color: #ffffff !important; color: #3b82f6 !important; border: 1px solid #e2e8f0 !important; border-radius: 0.5rem !important; font-weight: bold !important; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
        .fc-button-primary:hover { background-color: #f8fafc !important; }
        .fc-col-header-cell { padding: 12px 0 !important; background-color: white; border-bottom: 1px solid #f1f5f9; }
        .fc-daygrid-day-number { color: #64748b; font-weight: 600; font-size: 0.875rem; padding: 8px !important; }
        .fc-event { border-radius: 6px; padding: 2px 4px; font-size: 0.7rem; font-weight: bold; cursor: grab; border: none; margin-bottom: 2px; }
        .fc-event:active { cursor: grabbing; }
        .fc-scrollgrid { border: none !important; }
        td, th { border-color: #f1f5f9 !important; }
        .selected-date-highlight { background-color: #f1f5f9 !important; transition: background-color 0.2s; }
      `}</style>

      {/* --- 메인 캘린더 --- */}
      <div className="flex-1 bg-white rounded-[24px] shadow-2xl p-8 flex flex-col h-full overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate="2026-03-01"
          events={events}
          editable={true} 
          eventDragStop={handleEventDragStop}
          dateClick={handleDateClick}
          dayCellClassNames={(arg) => {
            const dateStr = new Date(arg.date.getTime() - (arg.date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            return dateStr === selectedDate ? 'selected-date-highlight' : '';
          }}
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
          height="100%"
        />
      </div>

      {/* --- 오른쪽 사이드바 --- */}
      <div ref={sidebarRef} className="w-[340px] flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto pb-4 custom-scrollbar">
        
        {/* 오늘 일정 */}
        <div className="bg-white rounded-[24px] shadow-xl p-6 flex-shrink-0">
          <h3 className="text-lg font-extrabold text-slate-800 mb-1">오늘 일정</h3>
          <p className="text-sm text-slate-400 font-medium mb-4">{selectedDate}</p>
          <div className="bg-red-50 rounded-2xl p-4 shadow-sm relative">
            <h4 className="font-bold text-red-500 text-sm mb-2 font-sans">신제품 런칭 미팅</h4>
            <div className="space-y-1 text-xs text-slate-500 font-medium font-sans">
              <div className="flex items-center gap-1.5"><Clock size={12} /> 10:00 - 11:30</div>
              <div className="flex items-center gap-1.5"><MapPin size={12} /> 회의실 A</div>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="w-full mt-6 text-slate-400 text-xs font-bold hover:text-slate-600 transition">일정을 추가해보세요!</button>
        </div>

        {/* 이번 주 회의 */}
        <div className="bg-white rounded-[24px] shadow-xl p-6 flex-shrink-0">
          <h3 className="text-lg font-extrabold text-slate-800 mb-6">이번 주 회의</h3>
          <div className="space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 mt-0.5" size={16} />
                <div>
                  <p className="font-bold text-slate-800 text-sm">KPI 중간 점검</p>
                  <p className="text-xs text-slate-400 mt-1">3월 24일 (화) 09:00</p>
                </div>
              </div>
              <button className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1.5 rounded-md hover:bg-emerald-200 transition">회의록 보기</button>
            </div>
          </div>
        </div>

        {/* 중요 일정 고정 */}
        <div className="bg-white rounded-[24px] shadow-xl p-6 flex-shrink-0 min-h-[160px] flex flex-col justify-center">
          {pinnedEvents.length === 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1.5">
                <Pin className="text-rose-500 fill-rose-500 -rotate-45" size={18} />
                <Pin className="text-rose-500 fill-rose-500 -rotate-45" size={18} />
                <Pin className="text-rose-500 fill-rose-500 -rotate-45" size={18} />
              </div>
              <p className="text-slate-400 font-medium text-xs leading-relaxed pl-4 border-l border-slate-100">일정을 드래그해서 <br/> 이곳에 고정하세요</p>
            </div>
          ) : (
            <div className="w-full flex flex-col h-full justify-start">
              <p className="text-slate-800 font-extrabold text-sm mb-4">중요 일정 고정</p>
              <div className="space-y-3">
                {pinnedEvents.map((ev) => {
                  const dateObj = new Date(ev.date);
                  return (
                    <div key={ev.id} className="group flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-rose-100 rounded-2xl shadow-sm transition-all animate-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-4 truncate">
                        <div className="w-12 h-12 bg-rose-50 rounded-xl flex flex-col items-center justify-center text-rose-600 flex-shrink-0 border border-rose-100/50">
                          <span className="text-[10px] font-bold tracking-wider">{dateObj.getMonth() + 1}월</span>
                          <span className="text-[15px] font-black leading-tight">{dateObj.getDate()}일</span>
                        </div>
                        <div className="truncate">
                          <p className="text-[13px] font-bold text-slate-800 truncate">{ev.title}</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">14:00 - 15:30</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeletePinnedEvent(ev.id)} className="p-2 hover:bg-rose-50 rounded-full transition-colors group/del">
                        <Pin size={16} className="text-rose-400 fill-rose-400 group-hover/del:text-rose-600 group-hover/del:fill-rose-600 transition-colors" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- 일정 추가 모달 --- */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[850px] h-[650px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex-1 overflow-y-auto">
              
              {/*selYear, selMonth 사용 */}
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <button className="hover:text-slate-800" onClick={() => setIsModalOpen(false)}>&lt;</button>
                <h2 className="text-xl font-bold text-slate-800 tracking-tighter">
                  {selYear}년 {selMonth}월
                </h2>
              </div>
              
              {/* selDay 사용*/}
              <h3 className="text-2xl font-bold text-slate-800 mb-6">{selDay}일(선택됨)</h3>

              <div className="flex gap-8 h-full">
                <div className="flex-1 border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm overflow-visible">
                  <div className="border-b border-slate-100 pb-2">
                    <input 
                      type="text" placeholder="회의 제목을 입력하세요" 
                      className="w-full text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none"
                      value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} autoFocus
                    />
                  </div>
                  
                  <div className="space-y-5 text-sm text-slate-600 font-medium">
                    <div className="flex items-center gap-4"><MapPin className="text-pink-500 w-4 h-4"/> 안건 추가</div>
                    <div className="flex items-center gap-4"><User className="text-indigo-800 w-4 h-4"/> 참여자</div>
                    
                    <div className="flex items-start gap-4">
                      <Clock className="text-slate-400 w-4 h-4 mt-1.5"/> 
                      <div className="flex-1">
                        <p className="text-slate-800 font-bold mb-3">회의 시간</p>
                        <div className="flex items-center justify-between px-8 relative">
                          <div className="relative">
                            <button onClick={() => { setIsStartOpen(!isStartOpen); setIsEndOpen(false); }} className="text-blue-600 text-lg font-medium hover:bg-blue-50 px-4 py-1.5 rounded-lg transition">{startTime}</button>
                            {isStartOpen && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-32 h-40 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl z-50 custom-scrollbar">
                                {timeOptions.map((t, idx) => <div key={idx} onClick={() => {setStartTime(t); setIsStartOpen(false);}} className="py-2 hover:bg-blue-50 cursor-pointer text-center">{t}</div>)}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="text-blue-300 w-6 h-6" />
                          <div className="relative">
                            <button onClick={() => { setIsEndOpen(!isEndOpen); setIsStartOpen(false); }} className="text-blue-600 text-lg font-medium hover:bg-blue-50 px-4 py-1.5 rounded-lg transition">{endTime}</button>
                            {isEndOpen && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-32 h-40 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl z-50 custom-scrollbar">
                                {timeOptions.map((t, idx) => <div key={idx} onClick={() => {setEndTime(t); setIsEndOpen(false);}} className="py-2 hover:bg-blue-50 cursor-pointer text-center">{t}</div>)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t border-slate-100 pt-5"><Bell className="text-yellow-500 w-4 h-4"/> 리마인드 10분전</div>
                    <div className="flex items-center gap-4"><Paperclip className="text-yellow-500 w-4 h-4"/> 첨부파일</div>
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-5"><Repeat className="text-blue-500 w-4 h-4"/> 반복 해제</div>
                  </div>
                </div>

                <div className="w-48 flex flex-col gap-4">
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 p-4 text-center">
                    <button className="bg-purple-400 text-white px-4 py-2 rounded-full font-bold text-sm mb-2 shadow-md">파일 선택</button>
                    <p className="text-xs text-slate-500 tracking-tighter">회의계획서를 <br/> 업로드하세요</p>
                  </div>
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center text-slate-300 text-xs text-center">
                    메모를 <br/> 추가할 수 있어요
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-4 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition">취소</button>
              <button onClick={handleSaveEvent} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;