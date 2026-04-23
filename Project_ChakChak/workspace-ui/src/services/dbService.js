// import { supabase } from './supabaseClient';

// // 회의록 한 줄을 저장하는 함수
// export const saveMeetingLog = async (speaker, content) => {
//   const { data, error } = await supabase
//     .from('meeting_logs') // 우리가 만든 테이블 이름
//     .insert([
//       { speaker: speaker, content: content } // 들어갈 데이터
//     ]);

//   if (error) {
//     console.error('데이터 저장 실패:', error.message);
//     return null;
//   }
//   console.log('저장 성공:', data);
//   return data;
// };