export const mockChannels = [
  { id: '1', name: '메인' },

];

export const mockMessages = [
  {
    id: 'm1',
    channelId: '1',
    text: '안녕하세요! 새로운 워크스페이스에 오신 것을 환영합니다.',
    sender: '시스템 관리자',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    isAiSummary: false,
  },

];

