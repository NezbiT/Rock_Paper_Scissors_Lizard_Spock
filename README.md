# Rock Paper Scissors Lizard Spock

Juego clásico de **Piedra, Papel, Tijeras, Lagarto, Spock** con tres formas de jugar:

- **Consola** — Python 3 interactivo con bucle, puntuación y entrada por nombre o número
- **Web** — Interfaz moderna con modo vs CPU y multijugador en tiempo real
- **Chat** — Sala de chat integrada usando el módulo de [Chat-node](https://github.com/NezbiT/Chat-node)

## Requisitos

- **Node.js** 18+ (para la versión web)
- **Python 3** (para la versión consola)

## Versión web (juego + chat + multijugador)

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000). Comparte la URL de red que aparece en consola para que otros se unan desde otro dispositivo.

### Modos de juego

| Modo | Descripción |
|------|-------------|
| vs CPU | Juega rondas contra la máquina con marcador acumulado |
| Multijugador | Emparejamiento automático con otro jugador en línea |
| Chat | Mensajes en tiempo real con todos los conectados |

## Versión consola

```bash
python game.py
# o
npm run cli
```

Acepta números (`1`–`5`) o nombres (`rock`, `spock`, `piedra`, etc.). Escribe `q` para salir.

## Reglas

| Gana | Pierde contra |
|------|---------------|
| Piedra | Tijeras, Lagarto |
| Papel | Piedra, Spock |
| Tijeras | Papel, Lagarto |
| Lagarto | Spock, Papel |
| Spock | Tijeras, Piedra |

## Estructura del proyecto

```
├── game.py              # Juego en consola (Python 3)
├── server/
│   ├── index.js         # Servidor HTTP + WebSocket
│   ├── chatServer.js    # Chat (de Chat-node)
│   ├── gameServer.js    # Lógica multijugador y CPU
│   ├── rpsls.js         # Reglas del juego
│   └── websocket.js     # WebSocket sin dependencias
└── public/              # Interfaz web
```

## Créditos

- Chat basado en [NezbiT/Chat-node](https://github.com/NezbiT/Chat-node)
- Inspirado en [Rock Paper Scissors Lizard Spock](https://www.samkass.com/theories/RPSSL.html) (The Big Bang Theory)