// This prototype simulates how a game engine loads terrain chunks around a player.
// The world is a 10x10 grid. As the player moves (WASD), nearby chunks are added
// to a Priority Queue sorted by distance so the closest chunks always load first.
// Each keypress ticks the engine, pulling one chunk off the queue and marking it loaded.
// Chunks that fall out of range get unloaded automatically.
// The map renders three states in real time: loaded (#), waiting in queue (.), and unloaded (_),
// making the queue's behavior visible as you move around.

import * as readline from "readline";

// --- Types ---
type Chunk = {
  x: number;
  y: number;
  priority: number;
};

class PriorityQueue {
  private items: Chunk[] = [];

  enqueue(chunk: Chunk) {
    this.items.push(chunk);
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): Chunk | undefined {
    return this.items.shift();
  }

  has(x: number, y: number): boolean {
    return this.items.some((c) => c.x === x && c.y === y);
  }

  size(): number {
    return this.items.length;
  }

  getItems(): Chunk[] {
    return this.items;
  }

  clear() {
    this.items = [];
  }
}

// --- Game State ---
const WORLD_SIZE = 10;
const VIEW_RANGE = 2;

let playerX = 5;
let playerY = 5;

const loadedChunks = new Set<string>();
const loadQueue = new PriorityQueue();

// --- Helpers ---
function chunkKey(x: number, y: number): string {
  return `${x},${y}`;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < WORLD_SIZE && y >= 0 && y < WORLD_SIZE;
}

// --- Core Logic ---
function updateQueue() {
  loadQueue.clear();

  for (let dx = -VIEW_RANGE; dx <= VIEW_RANGE; dx++) {
    for (let dy = -VIEW_RANGE; dy <= VIEW_RANGE; dy++) {
      const cx = playerX + dx;
      const cy = playerY + dy;
      if (inBounds(cx, cy) && !loadedChunks.has(chunkKey(cx, cy))) {
        loadQueue.enqueue({
          x: cx,
          y: cy,
          priority: distance(playerX, playerY, cx, cy),
        });
      }
    }
  }

  for (const key of loadedChunks) {
    const [x, y] = key.split(",").map(Number);
    if (distance(playerX, playerY, x, y) > VIEW_RANGE) {
      loadedChunks.delete(key);
    }
  }
}

function processQueue() {
  const next = loadQueue.dequeue();
  if (next) {
    loadedChunks.add(chunkKey(next.x, next.y));
  }
}

// --- Render ---
function render() {
  console.clear();
  console.log("=== TERRAIN LOADING DEMO (Queue Visualization) ===");
  console.log("Move: W/A/S/D   Quit: Q\n");

  // Draw the world grid
  for (let y = 0; y < WORLD_SIZE; y++) {
    let row = "";
    for (let x = 0; x < WORLD_SIZE; x++) {
      if (x === playerX && y === playerY) {
        row += " P ";
      } else if (loadedChunks.has(chunkKey(x, y))) {
        row += " # ";
      } else if (loadQueue.has(x, y)) {
        row += " . ";
      } else {
        row += " _ ";
      }
    }
    console.log(row);
  }

  console.log(
    "\nLegend:  P = Player   # = Loaded   . = In Queue   _ = Unloaded",
  );
  console.log(`\nPlayer position: (${playerX}, ${playerY})`);
  console.log(`Loaded chunks:   ${loadedChunks.size}`);
  console.log(`Queue size:      ${loadQueue.size()}`);

  if (loadQueue.size() > 0) {
    const queueDisplay = loadQueue
      .getItems()
      .map((c) => `(${c.x},${c.y}) dist:${c.priority}`)
      .join("  →  ");
    console.log(`\nQueue (front → back): ${queueDisplay}`);
  } else {
    console.log("\nQueue is empty — all nearby chunks loaded!");
  }
}

// --- Input ---
function move(dir: string) {
  const prev = { x: playerX, y: playerY };

  if (dir === "w" && playerY > 0) playerY--;
  if (dir === "s" && playerY < WORLD_SIZE - 1) playerY++;
  if (dir === "a" && playerX > 0) playerX--;
  if (dir === "d" && playerX < WORLD_SIZE - 1) playerX++;

  if (playerX !== prev.x || playerY !== prev.y) {
    updateQueue();
  }
}

// --- Main Loop ---
async function main() {
  const rl = readline.createInterface({ input: process.stdin });
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  // Initial load
  updateQueue();
  render();

  process.stdin.on("keypress", (_str, key) => {
    if (!key) return;

    const k = key.name?.toLowerCase();

    if (k === "q" || (key.ctrl && k === "c")) {
      console.log("\nGoodbye!");
      process.exit(0);
    }

    if (["w", "a", "s", "d"].includes(k ?? "")) {
      move(k!);
    }

    processQueue();
    render();
  });
}

main();
