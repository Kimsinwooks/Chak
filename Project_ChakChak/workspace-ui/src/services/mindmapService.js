const API_URL = "http://localhost:8000";

export async function generateMindmap(text) {
  const res = await fetch(`${API_URL}/mindmap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  return await res.json();
}