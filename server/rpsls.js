/** Lógica compartida del juego RPSLS. */

export const OPTIONS = ['rock', 'paper', 'scissors', 'lizard', 'spock'];

export const LABELS = {
  rock: 'Piedra',
  paper: 'Papel',
  scissors: 'Tijeras',
  lizard: 'Lagarto',
  spock: 'Spock',
};

export const EMOJI = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
  lizard: '🦎',
  spock: '🖖',
};

const WINS_AGAINST = {
  rock: ['scissors', 'lizard'],
  paper: ['rock', 'spock'],
  scissors: ['paper', 'lizard'],
  lizard: ['spock', 'paper'],
  spock: ['scissors', 'rock'],
};

export function isValidChoice(choice) {
  return OPTIONS.includes(choice);
}

export function randomChoice() {
  return OPTIONS[Math.floor(Math.random() * OPTIONS.length)];
}

export function determineWinner(player, opponent) {
  if (player === opponent) return 'draw';
  if (WINS_AGAINST[player].includes(opponent)) return 'win';
  return 'lose';
}

export function emptyScore() {
  return { wins: 0, losses: 0, draws: 0 };
}

export function applyResult(score, result) {
  if (result === 'win') score.wins += 1;
  else if (result === 'lose') score.losses += 1;
  else score.draws += 1;
  return score;
}