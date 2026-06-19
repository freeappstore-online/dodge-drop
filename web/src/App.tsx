import { useEffect, useRef, useState } from "react";
import { GameShell, GameTopbar, GameAuth } from "@freegamestore/games";

type FallingObject = {
  x: number;
  y: number;
  size: number;
  speed: number;
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const keysRef = useRef({
    left: false,
    right: false,
  });

  const playerRef = useRef({
    x: 220,
    y: 360,
    width: 48,
    height: 22,
  });

  const objectsRef = useRef<FallingObject[]>([]);
  const scoreRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem("dodge-drop-high-score") || 0);
  });

  function restartGame() {
    objectsRef.current = [];
    scoreRef.current = 0;
    spawnTimerRef.current = 0;
    lastTimeRef.current = 0;
    setScore(0);
    setGameOver(false);
    setRunning(true);
  }

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    function resizeCanvas() {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = Math.min(parent.clientWidth, 720);
      const height = Math.min(window.innerHeight * 0.62, 520);

      canvas.width = width;
      canvas.height = height;

      playerRef.current.y = height - 48;
      playerRef.current.x = Math.min(playerRef.current.x, width - playerRef.current.width);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keysRef.current.left = true;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keysRef.current.right = true;
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keysRef.current.left = false;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keysRef.current.right = false;
      }
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      playerRef.current.x = pointerX - playerRef.current.width / 2;
    }

    function spawnObject() {
      const size = 18 + Math.random() * 22;

      objectsRef.current.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size,
        speed: 140 + Math.random() * 120 + scoreRef.current * 0.08,
      });
    }

    function isColliding(object: FallingObject) {
      const player = playerRef.current;

      return (
        object.x < player.x + player.width &&
        object.x + object.size > player.x &&
        object.y < player.y + player.height &&
        object.y + object.size > player.y
      );
    }

    function endGame() {
      setRunning(false);
      setGameOver(true);

      const finalScore = Math.floor(scoreRef.current);

      if (finalScore > highScore) {
        localStorage.setItem("dodge-drop-high-score", String(finalScore));
        setHighScore(finalScore);
      }
    }

    function drawBackground() {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      for (let i = 0; i < 35; i++) {
        const x = (i * 97) % canvas.width;
        const y = (i * 53 + scoreRef.current * 0.4) % canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPlayer() {
      const player = playerRef.current;

      ctx.fillStyle = "#34d399";
      ctx.beginPath();
      ctx.roundRect(player.x, player.y, player.width, player.height, 8);
      ctx.fill();

      ctx.fillStyle = "#ecfeff";
      ctx.fillRect(player.x + 10, player.y + 6, player.width - 20, 4);
    }

    function drawObjects() {
      for (const object of objectsRef.current) {
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.arc(
          object.x + object.size / 2,
          object.y + object.size / 2,
          object.size / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    function gameLoop(time: number) {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.04);
      lastTimeRef.current = time;

      const player = playerRef.current;
      const playerSpeed = 380;

      if (keysRef.current.left) {
        player.x -= playerSpeed * deltaTime;
      }

      if (keysRef.current.right) {
        player.x += playerSpeed * deltaTime;
      }

      player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

      spawnTimerRef.current += deltaTime;
      const spawnRate = Math.max(0.35, 0.9 - scoreRef.current / 600);

      if (spawnTimerRef.current > spawnRate) {
        spawnObject();
        spawnTimerRef.current = 0;
      }

      objectsRef.current = objectsRef.current
        .map((object) => ({
          ...object,
          y: object.y + object.speed * deltaTime,
        }))
        .filter((object) => object.y < canvas.height + object.size);

      for (const object of objectsRef.current) {
        if (isColliding(object)) {
          endGame();
          return;
        }
      }

      scoreRef.current += deltaTime * 12;
      setScore(Math.floor(scoreRef.current));

      drawBackground();
      drawObjects();
      drawPlayer();

      animationRef.current = requestAnimationFrame(gameLoop);
    }

    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointermove", handlePointerMove);

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointermove", handlePointerMove);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [running, highScore]);

  return (
    <GameShell topbar={<GameTopbar title="Dodge Drop" score={score} />}>
      <GameAuth />

      <main className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6 text-center">
        <div>
          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Dodge Drop
          </h1>

          <p className="mt-2 max-w-xl" style={{ color: "var(--muted)" }}>
            Move left and right to dodge the falling objects. Use arrow keys, A/D,
            or drag on mobile.
          </p>
        </div>

        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-black/20 p-3 shadow-xl">
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl"
            aria-label="Dodge Drop game canvas"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="rounded-full border border-white/10 px-4 py-2">
            Score: <strong>{score}</strong>
          </div>

          <div className="rounded-full border border-white/10 px-4 py-2">
            High score: <strong>{highScore}</strong>
          </div>

          <button
            onClick={restartGame}
            className="rounded-full bg-emerald-400 px-5 py-2 font-semibold text-slate-950 hover:bg-emerald-300"
          >
            Restart
          </button>
        </div>

        <a
        href="https://freegamestore.online/"
        target="_blank"
        rel="noreferrer"
        className="text-sm underline"
        style={{ color: "var(--muted)" }}
        >
          Built for freegamestore.online
        </a>

        {gameOver && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-4">
            <h2 className="text-2xl font-bold">Game over!</h2>
            <p style={{ color: "var(--muted)" }}>
              You got hit. Press Restart to try again.
            </p>
          </div>
        )}
      </main>
    </GameShell>
  );
}