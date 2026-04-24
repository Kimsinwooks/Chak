import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import AIPanel from './components/AIPanel'
import { Sparkles } from 'lucide-react'
import { mockChannels, mockMessages } from './data/mockData'
import { chatWithAI } from './services/aiService'
import NotionStyleEditor from './components/NotionStyleEditor'
import MeetingRoomPrep from './components/MeetingRoomPrep'
import MeetingLiveView from './components/MeetingLiveView'
import STTWorkspace from './components/STTWorkspace'
import CalendarView from './components/CalendarView'
import Mindmap from './components/Mindmap'
import MeetingReportView from './components/MeetingReportView'

export default function App() {
  const userList = ['User', '신우', '종범', '혜은', '민수', '지희', '영수']

  const [currentUser, setCurrentUser] = useState(userList[0])
  const [activeView, setActiveView] = useState('channel')
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [activeChannelId, setActiveChannelId] = useState(mockChannels[0]?.id || '1')
  const [messages, setMessages] = useState(mockMessages)

  const [isInsightOpen, setIsInsightOpen] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [activeMeetingPlan, setActiveMeetingPlan] = useState(null)
  const [reportSessionId, setReportSessionId] = useState(null)
  const [useWebSearch, setUseWebSearch] = useState(false)

  const [aiChatMessages, setAiChatMessages] = useState([
    {
      id: 'init',
      sender: '✨ AI 어시스턴트',
      text: '안녕하세요! 회의 내용 요약이나 궁금한 점을 물어보세요.',
      timestamp: new Date().toISOString(),
      isAi: true,
    },
  ])
  const [isAiTyping, setIsAiTyping] = useState(false)

  const activeChannel = mockChannels.find((c) => c.id === activeChannelId) || mockChannels[0]
  const currentMessages = messages.filter((m) => m.channelId === activeChannelId)

  const handleSelectChannel = (channelId) => {
    setActiveView('channel')
    setActiveChannelId(channelId)
  }

  const handleSelectNote = (noteId) => {
    setActiveView('note')
    setActiveNoteId(noteId)
  }

  const handleSelectCalendar = () => {
    setActiveView('calendar')
  }

  const handleSelectMindmap = () => {
    setActiveView('mindmap')
  }

  const handleSelectMeetingPrep = () => {
    setActiveView('meeting_prep')
  }

  const handleSelectMeetingArchive = () => {
    setActiveView('meeting_archive')
  }

  const handleSelectMeetingReport = () => {
    setActiveView('meeting_report')
  }

  const handleOpenMeetingReport = (sessionId) => {
    setReportSessionId(sessionId)
    setActiveView('meeting_report')
  }

  const handleStartMeeting = (planDataWithSession) => {
    setActiveMeetingPlan(planDataWithSession)
    setActiveView('meeting_live')
  }

  const handleSendMessage = (text) => {
    const newMessage = {
      id: Date.now(),
      sender: currentUser,
      text,
      channelId: activeChannelId,
      timestamp: new Date().toISOString(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser)}&background=random`,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleAiChat = async (text) => {
    const userMsg = {
      id: Date.now().toString(),
      sender: currentUser,
      text,
      timestamp: new Date().toISOString(),
      isAi: false,
    }

    setAiChatMessages((prev) => [...prev, userMsg])
    setIsAiTyping(true)

    try {
      const responseText = await chatWithAI(
        text,
        '',
        'general',
        {
          purpose: 'global_ai_panel_chat',
          useWeb: useWebSearch,
        }
      )

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: '✨ AI 어시스턴트',
        text: responseText,
        timestamp: new Date().toISOString(),
        isAi: true,
      }
      setAiChatMessages((prev) => [...prev, aiMsg])
    } catch (error) {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: '✨ AI 어시스턴트',
        text: `AI 응답 오류: ${error.message}`,
        timestamp: new Date().toISOString(),
        isAi: true,
      }
      setAiChatMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsAiTyping(false)
    }
  }

  const renderMainView = () => {
    if (activeView === 'channel') {
      return (
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
      )
    }

    if (activeView === 'note') {
      return (
        <div className="flex-1 overflow-y-auto w-full flex justify-center bg-white">
          <div className="w-full max-w-4xl py-10 px-8">
            <NotionStyleEditor noteId={activeNoteId} />
          </div>
        </div>
      )
    }

    if (activeView === 'calendar') {
      return <CalendarView />
    }

    if (activeView === 'mindmap') {
      return (
        <div className="flex-1 overflow-hidden bg-white">
          <div className="h-16 border-b border-gray-200 flex items-center px-8">
            <h2 className="text-xl font-bold text-gray-900">마인드맵</h2>
          </div>
          <div className="h-[calc(100vh-4rem)]">
            <Mindmap />
          </div>
        </div>
      )
    }

    if (activeView === 'meeting_prep') {
      return <MeetingRoomPrep onStartMeeting={handleStartMeeting} />
    }

    if (activeView === 'meeting_live') {
      return (
        <MeetingLiveView
          planData={activeMeetingPlan}
          useWebSearch={useWebSearch}
          setUseWebSearch={setUseWebSearch}
        />
      )
    }

    if (activeView === 'meeting_archive') {
      return <STTWorkspace onOpenMeetingReport={handleOpenMeetingReport} />
    }

    if (activeView === 'meeting_report') {
      return <MeetingReportView sessionId={reportSessionId || activeMeetingPlan?.sessionId} />
    }

    return (
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
    )
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans relative">
      <Sidebar
        channels={mockChannels}
        activeChannelId={activeChannelId}
        activeView={activeView}
        onSelectChannel={handleSelectChannel}
        onSelectNote={handleSelectNote}
        onSelectCalendar={handleSelectCalendar}
        onSelectMindmap={handleSelectMindmap}
        onSelectMeetingPrep={handleSelectMeetingPrep}
        onSelectMeetingArchive={handleSelectMeetingArchive}
        onSelectMeetingReport={handleSelectMeetingReport}
      />

      <div className="flex-1 flex overflow-hidden relative bg-white">
        {renderMainView()}
      </div>

      <AIPanel
        isOpen={isInsightOpen}
        onClose={() => setIsInsightOpen(false)}
        aiResult={aiResult}
        isAnalyzing={isAnalyzing}
        chatMessages={aiChatMessages}
        onSendMessage={handleAiChat}
        isTyping={isAiTyping}
        userName={currentUser}
        useWebSearch={useWebSearch}
        setUseWebSearch={setUseWebSearch}
      />

      {!isInsightOpen && (
        <button
          onClick={() => setIsInsightOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-40"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
