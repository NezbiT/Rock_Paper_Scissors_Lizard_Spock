export const MSG = {
  JOIN: 'join',
  JOINED: 'joined',
  MESSAGE: 'message',
  HISTORY: 'history',
  USERS: 'users',
  ERROR: 'error',
  GAME_CPU: 'game_cpu',
  GAME_PVP_QUEUE: 'game_pvp_queue',
  GAME_PVP_CANCEL: 'game_pvp_cancel',
  GAME_MATCHED: 'game_matched',
  GAME_CHOICE: 'game_choice',
  GAME_ROUND: 'game_round',
  GAME_SCORES: 'game_scores',
};

export const CHOICES = [
  { id: 'rock', label: 'Piedra', emoji: '🪨' },
  { id: 'paper', label: 'Papel', emoji: '📄' },
  { id: 'scissors', label: 'Tijeras', emoji: '✂️' },
  { id: 'lizard', label: 'Lagarto', emoji: '🦎' },
  { id: 'spock', label: 'Spock', emoji: '🖖' },
];

export function choiceLabel(id) {
  const c = CHOICES.find((x) => x.id === id);
  return c ? `${c.emoji} ${c.label}` : id;
}

export function apiBase() {
  return import.meta.env.VITE_API_URL || '';
}

export function wsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}