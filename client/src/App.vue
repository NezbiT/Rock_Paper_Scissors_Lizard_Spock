<script setup>
import { ref, onMounted } from 'vue';
import LoginView from './components/LoginView.vue';
import GameView from './components/GameView.vue';
import { useGameSocket } from './composables/useGameSocket.js';

const screen = ref('login');
const username = ref(sessionStorage.getItem('rpsls_user') || '');
const game = useGameSocket();

onMounted(() => {
  if (username.value) {
    game.connect(username.value)
      .then(() => { screen.value = 'game'; })
      .catch(() => sessionStorage.removeItem('rpsls_user'));
  }
});

async function onLogin(name) {
  try {
    username.value = name;
    sessionStorage.setItem('rpsls_user', name);
    await game.connect(name);
    screen.value = 'game';
  } catch {
    sessionStorage.removeItem('rpsls_user');
  }
}

function onLeave() {
  game.disconnect();
  sessionStorage.removeItem('rpsls_user');
  username.value = '';
  screen.value = 'login';
}
</script>

<template>
  <LoginView
    v-if="screen === 'login'"
    :error="game.error"
    :connecting="game.connecting"
    :initial-name="username"
    @login="onLogin"
  />
  <GameView
    v-else
    :username="username"
    :game="game"
    @leave="onLeave"
  />
</template>