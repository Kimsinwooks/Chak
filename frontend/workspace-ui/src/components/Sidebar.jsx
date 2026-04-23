import React, { useState } from 'react';
import { Hash, Settings, Sparkles, CheckSquare, FileText, Plus, ChevronLeft, ChevronRight } from 'lucide-react'; 
import clsx from 'clsx';

export default function Sidebar({ channels, activeChannelId, onSelectChannel, onSelectNote, onSelectMeetingPrep,  onSelectCalendar}) {
  // 💡 사이드바 열림/닫힘 상태 관리
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={clsx(
      "bg-white flex flex-col h-full flex-shrink-0 border-r border-gray-100 shadow-[1px_0_5px_0_rgba(0,0,0,0.02)] z-20 transition-all duration-300 ease-in-out relative",
      isOpen ? "w-64" : "w-[72px]" // 💡 상태에 따른 너비 변경
    )}>
      
      {/*  접기/펼치기 토글 버튼 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 hover:shadow-lg z-50 text-gray-500 transition-all hover:scale-110"
        title={isOpen ? "사이드바 숨기기" : "사이드바 열기"}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Logo/Header */}
      <div className={clsx(
        "h-16 border-b border-gray-100 flex items-center shadow-sm shrink-0 transition-all",
        isOpen ? "px-5 justify-between" : "justify-center"
      )}>
        <div className="flex items-center justify-center">
          <div className={clsx(
            "h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm border border-blue-400 shrink-0",
            isOpen ? "mr-3" : ""
          )}>
            <Hash className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          {/* 열려있을 때만 글씨 표시 */}
          {isOpen && <h1 className="text-[17px] font-extrabold text-gray-900 tracking-tight whitespace-nowrap">Workspace<span className="text-blue-600">.</span></h1>}
        </div>
      </div>

      {/* 실시간 회의방 버튼 */}
      <div className={clsx("pt-4 shrink-0 transition-all", isOpen ? "px-4" : "px-2")}>
        <button
          onClick={() => {
            console.log("실시간 회의 준비 버튼 클릭");
            onSelectMeetingPrep?.();
          }}
          className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 flex items-center justify-center shadow hover:bg-blue-700 transition"
          title="실시간 회의 준비"
        >
          {isOpen ? "🎤 실시간 회의 준비" : "🎤"}
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto py-5 custom-scrollbar bg-slate-50/30 flex flex-col space-y-8 overflow-x-hidden">
        
        {/* 1. Channels List */}
        <div className="flex flex-col space-y-1">
          {isOpen && <h2 className="px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 whitespace-nowrap">Channels</h2>}
          <nav className={clsx("space-y-1", isOpen ? "px-3" : "px-2")}>
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                title={channel.name}
                className={clsx(
                  "w-full flex items-center py-2 text-[14px] font-medium transition-all rounded-lg group",
                  isOpen ? "px-3" : "justify-center",
                  activeChannelId === channel.id
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-200/80'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                )}
              >
                {channel.icon === 'Sparkles' ? (
                  <Sparkles className={clsx("flex-shrink-0 h-4 w-4 transition-colors", isOpen ? "mr-2.5" : "", activeChannelId === channel.id ? "text-indigo-600" : "text-gray-400 group-hover:text-indigo-500")} aria-hidden="true" />
                ) : (
                  <Hash className={clsx("flex-shrink-0 h-4 w-4 transition-colors", isOpen ? "mr-2.5" : "", activeChannelId === channel.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500")} aria-hidden="true" />
                )}
                {isOpen && <span className="truncate">{channel.name}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* 캘린더 버튼 */}
        <div className="flex flex-col space-y-1">
          <nav className={clsx(isOpen ? "px-3" : "px-2")}>
            <button
              onClick={() => onSelectCalendar?.()} 
              title="캘린더"
              className={clsx(
                "w-full flex items-center py-2 text-[14px] font-medium text-gray-600 hover:bg-white hover:text-blue-700 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group",
                isOpen ? "px-3" : "justify-center"
              )}
            >
              <span className={clsx("flex-shrink-0", isOpen ? "mr-2.5" : "")}>📅</span>
              {isOpen && <span className="truncate">캘린더</span>}
            </button>
          </nav>
        </div> 

        {/* 회의록 버튼 */}
        <div className="flex flex-col space-y-1">
          <nav className={clsx(isOpen ? "px-3" : "px-2")}>
            <button
              onClick={() => onSelectCalendar?.()} 
              title="회의록"
              className={clsx(
                "w-full flex items-center py-2 text-[14px] font-medium text-gray-600 hover:bg-white hover:text-blue-700 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group",
                isOpen ? "px-3" : "justify-center"
              )}
            >
              <span className={clsx("flex-shrink-0", isOpen ? "mr-2.5" : "")}>📄</span>
              {isOpen && <span className="truncate">회의록</span>}
            </button>
          </nav>
        </div>

        {/* 2. MY TASKS (AI 추출) */}
        <div className="flex flex-col space-y-1">
          {isOpen ? (
            <div className="px-5 flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">My Tasks (AI)</h2>
              <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">2</span>
            </div>
          ) : (
            <div className="flex justify-center mb-2">
               <span className="bg-red-50 text-red-600 border border-red-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full">2</span>
            </div>
          )}
          
          <nav className={clsx("space-y-1", isOpen ? "px-3" : "px-2")}>
            <button title="논문 리뷰" className={clsx("w-full flex items-center py-2 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group", isOpen ? "px-3" : "justify-center")}>
              <CheckSquare className={clsx("flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors", isOpen ? "mr-2.5" : "")} />
              {isOpen && <span className="truncate">논문 리뷰</span>}
            </button>
            <button title="DB 스키마 설계" className={clsx("w-full flex items-center py-2 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group", isOpen ? "px-3" : "justify-center")}>
              <CheckSquare className={clsx("flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors", isOpen ? "mr-2.5" : "")} />
              {isOpen && <span className="truncate">DB 스키마 설계</span>}
            </button>
          </nav>
        </div>

        {/* 3. PRIVATE NOTES */}
        <div className="flex flex-col space-y-1">
          {isOpen && (
            <div className="px-5 flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Private Notes</h2>
              <button onClick={() => onSelectNote('new')} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          <nav className={clsx("space-y-1", isOpen ? "px-3" : "px-2")}>
            <button title="3/28 회의 요약본" onClick={() => onSelectNote('note_1')} className={clsx("w-full flex items-center py-2 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group", isOpen ? "px-3" : "justify-center")}>
              <FileText className={clsx("flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors", isOpen ? "mr-2.5" : "")} />
              {isOpen && <span className="truncate">3/28 회의 요약본</span>}
            </button>
            <button title="캡스톤 아이디어 스케치" onClick={() => onSelectNote('note_2')} className={clsx("w-full flex items-center py-2 text-[13px] font-medium text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200/80 border border-transparent rounded-lg transition-all group", isOpen ? "px-3" : "justify-center")}>
              <FileText className={clsx("flex-shrink-0 h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors", isOpen ? "mr-2.5" : "")} />
              {isOpen && <span className="truncate">캡스톤 아이디어 스케치</span>}
            </button>
          </nav>
        </div>

      </div>

      {/* User Profile Footer */}
      <div className={clsx(
        "p-4 border-t border-gray-100 bg-white flex items-center hover:bg-gray-50 cursor-pointer transition-colors shrink-0",
        isOpen ? "" : "justify-center"
      )}>
        <div className="flex-shrink-0 relative">
           <img className="h-9 w-9 rounded-full bg-blue-50 border border-gray-200 object-cover shadow-sm" src="https://ui-avatars.com/api/?name=나&background=0D8ABC&color=fff" alt="User Profile" />
           <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500"></div>
        </div>
        {isOpen && (
          <>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-[14px] font-bold text-gray-900 truncate">나 (User)</p>
              <p className="text-[12px] font-medium text-emerald-600 truncate">Online</p>
            </div>
            <button className="ml-auto p-2 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      
    </div>
  );
}