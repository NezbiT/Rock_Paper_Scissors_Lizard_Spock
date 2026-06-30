#!/usr/bin/env python3
"""Rock, Paper, Scissors, Lizard, Spock — consola interactiva."""

from __future__ import annotations

import random
import sys
import time

OPTIONS = ("rock", "paper", "scissors", "lizard", "spock")
ALIASES = {
    "1": "rock", "r": "rock", "rock": "rock", "piedra": "rock",
    "2": "paper", "p": "paper", "paper": "paper", "papel": "paper",
    "3": "scissors", "s": "scissors", "scissors": "scissors", "tijeras": "scissors",
    "4": "lizard", "l": "lizard", "lizard": "lizard", "lagarto": "lizard",
    "5": "spock", "sp": "spock", "spock": "spock",
}
WINS_AGAINST = {
    "rock": ("scissors", "lizard"),
    "paper": ("rock", "spock"),
    "scissors": ("paper", "lizard"),
    "lizard": ("spock", "paper"),
    "spock": ("scissors", "rock"),
}
LABELS = {
    "rock": "Piedra",
    "paper": "Papel",
    "scissors": "Tijeras",
    "lizard": "Lagarto",
    "spock": "Spock",
}


def parse_choice(raw: str) -> str | None:
    key = raw.strip().lower()
    return ALIASES.get(key)


def determine_winner(player: str, opponent: str) -> str:
    if player == opponent:
        return "draw"
    if opponent in WINS_AGAINST[player]:
        return "win"
    return "lose"


def show_menu() -> None:
    print("\n" + "=" * 44)
    print("  Rock · Paper · Scissors · Lizard · Spock")
    print("=" * 44)
    for index, option in enumerate(OPTIONS, start=1):
        print(f"  {index}. {LABELS[option]:<8} ({option})")
    print("\n  Escribe el número o el nombre. 'q' para salir.\n")


def ask_choice() -> str | None:
    while True:
        raw = input("Tu elección: ").strip()
        if raw.lower() in {"q", "quit", "salir", "exit"}:
            return None
        choice = parse_choice(raw)
        if choice:
            return choice
        print("Opción inválida. Usa 1-5 o el nombre (ej: rock, spock).")


def play_round(scores: dict[str, int]) -> bool:
    player = ask_choice()
    if player is None:
        return False

    cpu = random.choice(OPTIONS)
    result = determine_winner(player, cpu)

    print(f"\n  Tú: {LABELS[player]}  vs  CPU: {LABELS[cpu]}")

    if result == "win":
        scores["wins"] += 1
        print("  Resultado: ¡Ganaste!")
    elif result == "lose":
        scores["losses"] += 1
        print("  Resultado: Perdiste.")
    else:
        scores["draws"] += 1
        print("  Resultado: Empate.")

    print(f"  Marcador — Victorias: {scores['wins']} | Derrotas: {scores['losses']} | Empates: {scores['draws']}")
    return True


def main() -> None:
    scores = {"wins": 0, "losses": 0, "draws": 0}
    show_menu()

    while True:
        if not play_round(scores):
            print("\n¡Hasta luego!\n")
            break

        again = input("\n¿Jugar otra ronda? (s/n): ").strip().lower()
        if again not in {"s", "si", "sí", "y", "yes"}:
            print("\n¡Hasta luego!\n")
            break
        time.sleep(0.3)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n¡Hasta luego!\n")
        sys.exit(0)