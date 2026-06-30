<script setup>
import { ref, onMounted } from 'vue';
import { apiBase } from '../constants.js';

const props = defineProps({
  error: String,
  connecting: Boolean,
  initialName: String,
});

const emit = defineEmits(['login']);
const name = ref(props.initialName || '');
const shareUrl = ref('…');
const health = ref('Comprobando…');

onMounted(async () => {
  try {
    const res = await fetch(`${apiBase()}/api/health`);
    const data = await res.json();
    health.value = `● ${data.online?.length || 0} jugadores en línea`;
    shareUrl.value = data.recommendedUrl || location.origin;
  } catch {
    health.value = '● Backend no disponible';
  }
  try {
    const info = await fetch(`${apiBase()}/api/info`).then((r) => r.json());
    if (info.recommendedUrl) shareUrl.value = info.recommendedUrl;
  } catch { /* ignore */ }
});

function submit() {
  const n = name.value.trim();
  if (n) emit('login', n);
}

function copy() {
  navigator.clipboard?.writeText(shareUrl.value);
}
</script>

<template>
  <div class="login-page">
    <header class="topbar">
      <span class="logo">🖖 RPSLS</span>
      <span class="pill">{{ health }}</span>
    </header>

    <main class="login-grid">
      <article class="card">
        <h1>Piedra · Papel · Tijeras · Lagarto · Spock</h1>
        <p class="muted">Vue 3 reactivo · Backend Node en Render/Railway</p>

        <form class="form" @submit.prevent="submit">
          <label>Tu nombre</label>
          <input v-model="name" placeholder="Ej: Mario" maxlength="24" required autocomplete="nickname">
          <button type="submit" :disabled="connecting">
            {{ connecting ? 'Conectando…' : 'Entrar a la sala' }}
          </button>
          <p v-if="error" class="error">{{ error }}</p>
        </form>

        <div class="share">
          <label>URL del backend / compartir</label>
          <div class="share-row">
            <code>{{ shareUrl }}</code>
            <button type="button" class="btn-sm" @click="copy">Copiar</button>
          </div>
        </div>
      </article>

      <article class="card">
        <h2>Reglas del juego</h2>
        <p class="muted">Cada opción vence a dos otras:</p>
        <figure class="rules-fig">
          <img src="/images/rpsls-rules.svg" alt="Diagrama RPSLS" loading="lazy">
        </figure>
        <ul class="rules-ul">
          <li>🪨 Piedra → ✂️ Tijeras, 🦎 Lagarto</li>
          <li>📄 Papel → 🪨 Piedra, 🖖 Spock</li>
          <li>✂️ Tijeras → 📄 Papel, 🦎 Lagarto</li>
          <li>🦎 Lagarto → 🖖 Spock, 📄 Papel</li>
          <li>🖖 Spock → ✂️ Tijeras, 🪨 Piedra</li>
        </ul>
      </article>
    </main>
  </div>
</template>