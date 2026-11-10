
/*
 DOG FIGHTER
 真正響應式網頁版本
*/

// ===============================
// 1. 基本設定
// ===============================

let dog1, dog2;
let groundY;
let gameOver = false;
let winner = "";

let sprites = {
  dog1: {},
  dog2: {}
};

// 動態尺寸倍率
let gameScale = 1;

const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;

const spriteConfig = {
  dog1: {
    stand: { frames: 2, speed: 10 },
    walk: { frames: 5, speed: 6 },
    jump: { frames: 4, speed: 8 },
    hit: { frames: 4, speed: 5 },
    happy: { frames: 4, speed: 8 }
  },
  dog2: {
    stand: { frames: 1, speed: 10 },
    walk: { frames: 4, speed: 6 },
    fly: { frames: 3, speed: 8 },
    hit: { frames: 2, speed: 5 }
  }
};

const SPRITE_FACING = {
  dog1: 1,
  dog2: -1
};

const controls = {
  p1left: false,
  p1right: false,
  p1jump: false,
  p1attack: false,
  p2left: false,
  p2right: false,
  p2jump: false,
  p2attack: false
};

// ===============================
// 2. 載入素材
// ===============================

function preload() {
  for (let name of ["dog1", "dog2"]) {
    for (let action in spriteConfig[name]) {

      const path =
        `${name}/${action}/${action}${name}.png`;

      sprites[name][action] = loadImage(
        path,
        () => console.log("Loaded:", path),
        () => console.error("Failed:", path)
      );
    }
  }
}

// ===============================
// 3. 建立遊戲
// ===============================

function setup() {
  const container =
    document.getElementById("game-container");

  const canvas = createCanvas(
    container.clientWidth,
    container.clientHeight
  );

  canvas.parent("game-container");

  pixelDensity(1);
  noSmooth();

  updateLayout();
  setupTouchControls();
  resetGame();

  // 監控容器大小變化
  const observer = new ResizeObserver(() => {
    updateLayout();
  });

  observer.observe(container);
}

// ===============================
// 4. 響應式排版
// ===============================

function updateLayout() {
  const container =
    document.getElementById("game-container");

  const newW = Math.max(1, container.clientWidth);
  const newH = Math.max(1, container.clientHeight);

  // 遊戲尺寸隨容器改變
  resizeCanvas(newW, newH);
  noSmooth();

  // 根據高度及寬度決定角色倍率
  gameScale = Math.max(
    0.35,
    Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)
  );

  groundY = height * 0.80;

  if (dog1 && dog2) {
    for (const fighter of [dog1, dog2]) {
      fighter.x = constrain(
        fighter.x / (fighter.layoutWidth || width) * width,
        25 * gameScale,
        width - 25 * gameScale
      );

      // 保留角色相對地面的跳躍高度
      const oldGround =
        fighter.layoutGround ?? groundY;

      const oldScale =
        fighter.layoutScale || gameScale;

      const airborneHeight =
        (oldGround - fighter.y) / oldScale;

      fighter.y =
        groundY - airborneHeight * gameScale;

      fighter.layoutWidth = width;
      fighter.layoutGround = groundY;
      fighter.layoutScale = gameScale;
    }
  }
}

function windowResized() {
  updateLayout();
}

// ===============================
// 5. 初始化角色
// ===============================

function resetGame() {
  dog1 = createFighter("dog1", width * 0.25, 1);
  dog2 = createFighter("dog2", width * 0.75, -1);

  gameOver = false;
  winner = "";
}

function createFighter(name, x, direction) {
  return {
    name,
    x,
    y: groundY,
    vx: 0,
    vy: 0,
    hp: 100,
    direction,
    action: "stand",
    frame: 0,
    animationTimer: 0,
    attacking: false,
    attackTimer: 0,
    cooldown: 0,
    hasHit: false,
    onGround: true,
    moving: false,
    layoutWidth: width,
    layoutGround: groundY,
    layoutScale: gameScale
  };
}

// ===============================
// 6. 主迴圈
// ===============================

function draw() {
  drawBackground();

  if (!gameOver) {
    updateFighter(dog1);
    updateFighter(dog2);

    checkAttack(dog1, dog2);
    checkAttack(dog2, dog1);

    checkWinner();
  }

  drawFighter(dog1);
  drawFighter(dog2);

  drawUI();

  if (gameOver) {
    drawGameOver();
  }
}

// ===============================
// 7. 響應式背景
// ===============================

function drawBackground() {
  background("#caf0f8");
  noStroke();

  // 遠方山丘隨螢幕寬高調整
  fill("#ade8f4");

  ellipse(
    width * 0.18,
    groundY,
    width * 0.38,
    height * 0.32
  );

  ellipse(
    width * 0.82,
    groundY,
    width * 0.43,
    height * 0.40
  );

  // 地面
  fill("#90be6d");
  rect(
    0,
    groundY,
    width,
    height - groundY
  );

  stroke("#588157");
  strokeWeight(Math.max(2, 4 * gameScale));
  line(0, groundY, width, groundY);
  noStroke();
}

// ===============================
// 8. 移動操作
// ===============================

function getMovement(fighter) {
  let left, right;

  if (fighter.name === "dog1") {
    left = keyIsDown(65) || controls.p1left;
    right = keyIsDown(68) || controls.p1right;
  } else {
    left = keyIsDown(LEFT_ARROW) || controls.p2left;
    right = keyIsDown(RIGHT_ARROW) || controls.p2right;
  }

  if (left && !right) return -1;
  if (right && !left) return 1;

  return 0;
}

// ===============================
// 9. 更新角色
// ===============================

function updateFighter(fighter) {
  if (fighter.cooldown > 0) {
    fighter.cooldown--;
  }

  if (fighter.attacking) {
    fighter.attackTimer--;

    if (fighter.attackTimer <= 0) {
      fighter.attacking = false;
    }
  }

  let movement = 0;

  if (!fighter.attacking) {
    movement = getMovement(fighter);
  }

  fighter.moving = movement !== 0;

  if (movement !== 0) {
    fighter.direction = movement;
  }

  fighter.vx = movement * 5 * gameScale;

  fighter.x += fighter.vx;

  const margin = 45 * gameScale;

  fighter.x = constrain(
    fighter.x,
    margin,
    Math.max(margin, width - margin)
  );

  // 重力
  fighter.vy += 0.65 * gameScale;
  fighter.y += fighter.vy;

  if (fighter.y >= groundY) {
    fighter.y = groundY;
    fighter.vy = 0;
    fighter.onGround = true;
  } else {
    fighter.onGround = false;
  }

  // 動畫切換
  let action = "stand";

  if (fighter.attacking) {
    action = "hit";
  } else if (!fighter.onGround) {
    action = fighter.name === "dog1"
      ? "jump"
      : "fly";
  } else if (fighter.moving) {
    action = "walk";
  }

  setAction(fighter, action);
  updateAnimation(fighter);
}

function setAction(fighter, action) {
  if (fighter.action !== action) {
    fighter.action = action;
    fighter.frame = 0;
    fighter.animationTimer = 0;
  }
}

function updateAnimation(fighter) {
  const config =
    spriteConfig[fighter.name][fighter.action];

  fighter.animationTimer++;

  if (fighter.animationTimer >= config.speed) {
    fighter.animationTimer = 0;
    fighter.frame =
      (fighter.frame + 1) % config.frames;
  }
}

// ===============================
// 10. 響應式角色顯示
// ===============================

function drawFighter(fighter) {
  const img =
    sprites[fighter.name][fighter.action];

  const config =
    spriteConfig[fighter.name][fighter.action];

  if (!img || !config) return;
  if (!img.width || !img.height) return;

  const frameW = img.width / config.frames;
  const frameH = img.height;

  const sx = fighter.frame * frameW;

  // 根據螢幕自動縮放角色
  const maxW = 90 * gameScale;
  const maxH = 110 * gameScale;

  const ratio = Math.min(
    maxW / frameW,
    maxH / frameH
  );

  const drawW = frameW * ratio;
  const drawH = frameH * ratio;

  push();

  translate(fighter.x, fighter.y);

  scale(
    fighter.direction *
    SPRITE_FACING[fighter.name],
    1
  );

  imageMode(CORNER);

  image(
    img,
    -drawW / 2,
    -drawH,
    drawW,
    drawH,
    sx,
    0,
    frameW,
    frameH
  );

  pop();
}

// ===============================
// 11. 跳躍與攻擊
// ===============================

function jumpFighter(fighter) {
  if (gameOver || !fighter.onGround) return;

  fighter.vy = -13 * gameScale;
  fighter.onGround = false;
}

function startAttack(fighter) {
  if (gameOver) return;

  if (fighter.cooldown > 0 ||
      fighter.attacking) return;

  fighter.attacking = true;
  fighter.attackTimer = 24;
  fighter.cooldown = 35;
  fighter.hasHit = false;

  setAction(fighter, "hit");
}

function checkAttack(attacker, defender) {
  if (!attacker.attacking ||
      attacker.hasHit ||
      attacker.attackTimer > 15) return;

  const dx = abs(attacker.x - defender.x);
  const dy = abs(attacker.y - defender.y);

  const facing =
    (defender.x - attacker.x) *
    attacker.direction >= 0;

  if (
    dx < 105 * gameScale &&
    dy < 90 * gameScale &&
    facing
  ) {
    defender.hp = max(0, defender.hp - 10);
    attacker.hasHit = true;
  }
}

// ===============================
// 12. 鍵盤操作
// ===============================

function keyPressed() {
  if (key === "r" || key === "R") {
    resetGame();
    return false;
  }

  if (gameOver) return false;

  if (key === "w" || key === "W") {
    jumpFighter(dog1);
  }

  if (key === "j" || key === "J") {
    startAttack(dog1);
  }

  if (keyCode === UP_ARROW) {
    jumpFighter(dog2);
  }

  if (key === "1" || keyCode === 97) {
    startAttack(dog2);
  }

  return false;
}

// ===============================
// 13. 手機觸控
// ===============================

function setupTouchControls() {
  const buttons =
    document.querySelectorAll("[data-control]");

  buttons.forEach(button => {
    const name = button.dataset.control;
    const pointers = new Set();

    button.addEventListener("pointerdown", e => {
      e.preventDefault();

      button.setPointerCapture(e.pointerId);
      pointers.add(e.pointerId);

      controls[name] = true;
      button.classList.add("pressed");

      if (name === "p1jump") jumpFighter(dog1);
      if (name === "p2jump") jumpFighter(dog2);
      if (name === "p1attack") startAttack(dog1);
      if (name === "p2attack") startAttack(dog2);
    });

    function release(e) {
      pointers.delete(e.pointerId);

      if (pointers.size === 0) {
        controls[name] = false;
        button.classList.remove("pressed");
      }
    }

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });
}

// ===============================
// 14. 響應式血條
// ===============================

function drawUI() {
  const padding = Math.max(12, width * 0.035);
  const barW = width * 0.35;
  const barH = Math.max(8, 24 * gameScale);
  const top = Math.max(14, 50 * gameScale);
  const fontSize = Math.max(11, 20 * gameScale);

  noStroke();
  textSize(fontSize);
  fill(30);

  textAlign(LEFT);
  text("DOG 1", padding, top - 10 * gameScale);

  textAlign(RIGHT);
  text("DOG 2", width - padding, top - 10 * gameScale);

  // Dog1
  fill("#dddddd");
  rect(padding, top, barW, barH, 5);

  fill("#38b000");
  rect(
    padding,
    top,
    barW * dog1.hp / 100,
    barH,
    5
  );

  // Dog2
  const rightX = width - padding - barW;

  fill("#dddddd");
  rect(rightX, top, barW, barH, 5);

  fill("#4361ee");
  rect(
    rightX + barW * (1 - dog2.hp / 100),
    top,
    barW * dog2.hp / 100,
    barH,
    5
  );

  // VS
  fill(30);
  textAlign(CENTER);
  textSize(Math.max(14, 28 * gameScale));
  text("VS", width / 2, top + barH);

  // 操作提示：寬螢幕顯示
  if (width >= 750 && height >= 350) {
    textSize(Math.max(12, 14 * gameScale));

    text(
      "DOG1: A/D 移動 W 跳躍 J 攻擊",
      width * 0.25,
      height - 18
    );

    text(
      "DOG2: ←/→ 移動 ↑ 跳躍 1 攻擊",
      width * 0.75,
      height - 18
    );
  }
}

// ===============================
// 15. 勝負判定
// ===============================

function checkWinner() {
  if (dog1.hp > 0 && dog2.hp > 0) return;

  gameOver = true;

  if (dog1.hp <= 0 && dog2.hp <= 0) {
    winner = "DRAW!";
  } else if (dog1.hp <= 0) {
    winner = "DOG 2 WINS!";
  } else {
    winner = "DOG 1 WINS!";
    setAction(dog1, "happy");
  }
}

// ===============================
// 16. 遊戲結束畫面
// ===============================

function getRestartRect() {
  return {
    x: width * 0.5 - Math.min(100, width * 0.18),
    y: height * 0.59,
    w: Math.min(200, width * 0.36),
    h: Math.min(55, height * 0.13)
  };
}

function drawGameOver() {
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER);
  textSize(Math.max(22, 50 * gameScale));
  text(winner, width / 2, height * 0.46);

  const b = getRestartRect();

  fill("#38b000");
  rect(b.x, b.y, b.w, b.h, 10);

  fill(255);
  textSize(Math.max(12, 20 * gameScale));
  textAlign(CENTER, CENTER);
  text("RESTART", width / 2, b.y + b.h / 2);
  textAlign(CENTER, BASELINE);
}

function mousePressed() {
  if (!gameOver) return;

  const b = getRestartRect();

  if (
    mouseX >= b.x &&
    mouseX <= b.x + b.w &&
    mouseY >= b.y &&
    mouseY <= b.y + b.h
  ) {
    resetGame();
  }
}
