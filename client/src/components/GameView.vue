<script setup>
import { ref, computed } from 'vue';
import { CHOICES, choiceLabel } from '../constants.js';

const props = defineProps({
  username: String,
  game: Object,
});

defineEmits(['leave']);

const chatInput = ref('');
const showRules = ref(false);

const g = computed(() => props.game);
const statusClass = computed(() => `pill pill--${g.value.status.variant || 'default'}`);

function sendChat() {
  const t = chatInput.value.trim();
  if (t) {
    g.value.sendChat(t);
    chatInput.value = '';
  }
}
</script>

<template>
  <div class="game-layout">
    <aside class="side">
      <div class="side-head">🖖 RPSLS</div>
      <div class="scores">
        <div class="score score--w"><b>{{ g.scores.wins }}</b><small>V</small></div>
        <div class="score score--l"><b>{{ g.scores.losses }}</b><small>D</small></div>
        <div class="score score--d"><b>{{ g.scores.draws }}</b><small>E</small></div>
      </div>
      <h3>En línea <span class="badge">{{ g.users.length }}</span></h3>
      <ul class="users">
        <li v-for="u in g.users" :key="u" :class="{ 'is-me': u === username }">
          <span class="dot"></span>{{ u }}{{ u === username ? ' (tú)' : '' }}
        </li>
      </ul>
      <button class="btn-leave" type="button" @click="$emit('leave')">Salir</button>
    </aside>

    <main class="arena">
      <header class="arena-head">
        <div>
          <h2>Jugando como <strong>{{ username }}</strong></h2>
          <button type="button" class="btn-link" @click="showRules = true">Ver reglas</button>
        </div>
        <div :class="statusClass">{{ g.status.text }}</div>
      </header>

      <div class="modes">
        <button type="button" class="mode-btn" :class="{ active: g.activeMode === 'cpu' }" @click="g.startCpu()">🤖 vs CPU</button>
        <button type="button" class="mode-btn" :class="{ active: g.activeMode === 'pvp' }" @click="g.startPvp()">👥 Multijugador</button>
        <button type="button" class="mode-btn ghost" @click="g.cancelPvp()">Cancelar</button>
      </div>

      <div class="choices">
        <button
          v-for="c in CHOICES"
          :key="c.id"
          type="button"
          class="choice-btn"
          :class="{ off: !g.canChoose }"
          :disabled="!g.canChoose"
          @click="g.pick(c.id)"
        >
          <span class="choice-e">{{ c.emoji }}</span>
          <span>{{ c.label }}</span>
        </button>
      </div>

      <div v-if="g.round" class="result">
        <div class="result-box">
          <small>Tú</small>
          <span>{{ choiceLabel(g.round.playerChoice) }}</span>
        </div>
        <span class="result-vs">VS</span>
        <div class="result-box">
          <small>Rival</small>
          <span>{{ choiceLabel(g.round.opponentChoice) }}</span>
        </div>
      </div>
      <p v-if="g.round" class="result-msg" :data-result="g.round.result">{{ g.round.message }}</p>
    </main>

    <aside class="chat">
      <h3>Chat</h3>
      <div class="chat-box">
        <p v-if="!g.messages.length" class="muted">Sin mensajes aún.</p>
        <div
          v-for="m in g.messages"
          :key="m.id || m.timestamp"
          class="chat-bubble"
          :class="{ own: m.username === username }"
        >
          <strong>{{ m.username }}</strong> {{ m.text }}
        </div>
      </div>
      <form class="chat-form" @submit.prevent="sendChat">
        <input v-model="chatInput" placeholder="Mensaje…" maxlength="500" autocomplete="off">
        <button type="submit">➤</button>
      </form>
    </aside>

    <div v-if="showRules" class="modal-overlay" @click.self="showRules = false">
      <div class="modal">
        <button type="button" class="modal-x" @click="showRules = false">✕</button>
        <h2>¿Quién gana a quién?</h2>
        <img src="/images/rpsls-rules.svg" alt="Reglas RPSLS">
      </div>
    </div>
  </div>
</template>