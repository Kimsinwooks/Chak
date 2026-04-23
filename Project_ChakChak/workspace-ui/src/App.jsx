import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AIPanel from './components/AIPanel';
import { Sparkles } from 'lucide-react';
import { mockChannels, mockMessages } from './data/mockData';
import { chatWithAI } from './services/aiService';
import NotionStyleEditor from './components/NotionStyleEditor'; 
import MeetingRoomPrep from './components/MeetingRoomPrep';
import MeetingLiveView from './components/MeetingLiveView'; 
import CalendarView from './components/CalendarView'; 

export default function App() {
  const userList = ['User','신우', '종범', '혜은', '민수', '지희', '영수'];
  const [currentUser, setCurrentUser] = useState(userList[0]);

  // 화면 전환용 스위치 상태
  const [activeView, setActiveView] = useState('channel'); 
  const [activeNoteId, setActiveNoteId] = useState(null); 

  const [activeChannelId, setActiveChannelId] = useState(mockChannels[0].id);
  const [messages, setMessages] = useState(mockMessages);
  const [isInsightOpen, setIsInsightOpen] = useState(false); 
  const [aiResult, setAiResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI 채팅 전용 상태
  const [aiChatMessages, setAiChatMessages] = useState([
    { id: 'init', sender: '✨ AI 어시스턴트', text: '안녕하세요! 회의 내용 요약이나 궁금한 점을 물어보세요.', timestamp: new Date().toISOString(), isAi: true }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // 현재 선택된 채널 정보를 찾음
  const activeChannel = mockChannels.find(c => c.id === activeChannelId);
  const currentMessages = messages.filter(m => m.channelId === activeChannelId);

  // 사이드바 클릭 핸들러
  const handleSelectChannel = (channelId) => {
    setActiveView('channel');
    setActiveChannelId(channelId);
  };

  const handleSelectNote = (noteId) => {
    setActiveView('note');
    setActiveNoteId(noteId);
  };

  const [activeMeetingPlan, setActiveMeetingPlan] = useState(null);

  const handleSelectMeetingPrep = () => {
    setActiveView('meeting_prep');
  };

  const handleStartMeeting = (planData) => {
    setActiveMeetingPlan(planData);
    setActiveView('meeting_live');
  };

  const handleSendMessage = (text) => { 
    const newMessage = {
      id: Date.now(),
      sender: currentUser,
      text: text,
      channelId: activeChannelId,
      timestamp: new Date().toISOString(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser)}&background=random`
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleAiChat = async (text) => {
    const userMsg = { id: Date.now().toString(), sender: currentUser, text: text, timestamp: new Date().toISOString(), isAi: false };
    setAiChatMessages(prev => [...prev, userMsg]);
    setIsAiTyping(true);

    try {
      const responseText = await chatWithAI(text);
      const aiMsg = { id: (Date.now() + 1).toString(), sender: '✨ AI 어시스턴트', text: responseText, timestamp: new Date().toISOString(), isAi: true };
      setAiChatMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      alert("AI 서버 연결 실패");
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans relative">
      <Sidebar 
        channels={mockChannels} 
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel} 
        onSelectNote={handleSelectNote}
        onSelectMeetingPrep={handleSelectMeetingPrep}
        onSelectCalendar={() => setActiveView('calendar')}   //캘린더
      />

      <div className="flex-1 flex overflow-hidden relative bg-white">
        {/* activeView 상태에 따라 화면 갈아끼우기 */}
        {activeView === 'channel' ? (

          <ChatArea
            currentUser={currentUser} 
            setCurrentUser={setCurrentUser} 
            userList={userList}
            activeChannel={activeChannel}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            onToggleInsight={() => setIsInsightOpen(!isInsightOpen)}
            isInsightOpen={isInsightOpen}
            setIsInsightOpen={setIsInsightOpen}
            aiResult={aiResult}
            setAiResult={setAiResult}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        ) : activeView === 'meeting_prep' ? (
          <MeetingRoomPrep onStartMeeting={handleStartMeeting} />
        ) : activeView === 'meeting_live' ? (
          <MeetingLiveView planData={activeMeetingPlan} />
        ) : activeView =="calendar"?(       //캘린더
          <CalendarView />
        ) : (
          <div className="flex-1 overflow-y-auto w-full flex justify-center bg-white">
            <div className="w-full max-w-4xl py-10 px-8">
               <NotionStyleEditor noteId={activeNoteId} />
            </div>
          </div>
        )}
      </div>

      <AIPanel 
        isOpen={isInsightOpen}
        onClose={() => setIsInsightOpen(false)}
        //aiResult={aiResult}
        //isAnalyzing={isAnalyzing}
        chatMessages={aiChatMessages}
        onSendMessage={handleAiChat}
        isTyping={isAiTyping}
        userName={currentUser}
      />

      {/* AI 패널 버튼  */}
     {!isInsightOpen && (
        <button 
          onClick={() => setIsInsightOpen(true)}
          className="fixed bottom-6 left-[280px] p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-40"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}