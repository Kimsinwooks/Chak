const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function parseResponse(res) {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const message = data?.detail || data?.message || '요청 처리 중 오류가 발생했습니다.'
    throw new Error(message)
  }

  return data
}

export async function fetchRooms() {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseResponse(res)
}

export async function createRoom(roomName) {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ roomName }),
  })

  return parseResponse(res)
}

export async function fetchRoomSessions(roomName) {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomName)}/sessions`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseResponse(res)
}

export async function fetchRoomMembers(roomName) {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomName)}/members`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseResponse(res)
}

export async function createInviteLink(roomName) {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(roomName)}/invite-link`, {
    method: 'POST',
    credentials: 'include',
  })

  return parseResponse(res)
}

export async function fetchInviteInfo(inviteCode) {
  const res = await fetch(`${API_BASE}/rooms/invite/${encodeURIComponent(inviteCode)}`, {
    method: 'GET',
    credentials: 'include',
  })

  return parseResponse(res)
}

export async function acceptInvite(inviteCode) {
  const res = await fetch(`${API_BASE}/rooms/invite/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ inviteCode }),
  })

  return parseResponse(res)
}

export { API_BASE }
