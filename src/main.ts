import { GameApp } from "./app/GameApp";

const root = document.getElementById("game-root");
if (!root) throw new Error("Missing #game-root element");

const app = new GameApp(root);
app.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => app.dispose());
}