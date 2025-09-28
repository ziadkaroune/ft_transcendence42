import * as BABYLON from 'babylonjs';

export function startGame(
  onMatchEnd: (winner: string) => void,
  settings: {
    winScore: number;
    ballSpeed: number;
    paddleSpeed: number;
    map: string;
    powerUps: boolean;
  },
  p1: string,
  p2: string
) {
  const canvas = document.getElementById('pong') as HTMLCanvasElement;
  if (!canvas) return;

  const scoreDiv = document.getElementById('scoreDisplay');
  if (!scoreDiv) {
    const div = document.createElement('div');
    div.id = 'scoreDisplay';
    div.style.position = 'absolute';
    div.style.top = '10px';
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.color = 'white';
    div.style.fontSize = '24px';
    div.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(div);
  }

  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -100), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);

  new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

  const WIN_SCORE = settings.winScore;
  const BALL_SPEED = settings.ballSpeed;
  const PADDLE_SPEED = settings.paddleSpeed;

  const fieldWidth = 100;
  const fieldHeight = 60;
  const paddleSize = { width: 3, height: 14, depth: 2 };
  const ballSize = 4;

  const paddleMat = new BABYLON.StandardMaterial("paddleMat", scene);
  paddleMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 1);

  const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
  ballMat.diffuseColor = new BABYLON.Color3(1, 0.4, 0.4);

  // Background
  const ground = BABYLON.MeshBuilder.CreateGround("ground", {
    width: fieldWidth,
    height: fieldHeight
  }, scene);
  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
  groundMat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.1);

  const texture = new BABYLON.DynamicTexture("groundTexture", { width: 512, height: 256 }, scene);
  const ctx = texture.getContext();
  ctx.fillStyle = "#0A3";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 256);
  ctx.stroke();
  texture.update();
  groundMat.diffuseTexture = texture;
  ground.material = groundMat;

  let leftScore = 0;
  let rightScore = 0;
  let gameOver = false;

  const paddleLeft = BABYLON.MeshBuilder.CreateBox("paddleLeft", paddleSize, scene);
  paddleLeft.position.x = -fieldWidth / 2 + 5;
  paddleLeft.material = paddleMat;

  const paddleRight = paddleLeft.clone("paddleRight");
  paddleRight.position.x = fieldWidth / 2 - 5;

  const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: ballSize }, scene);
  ball.material = ballMat;

  const left = { x: paddleLeft.position.x, y: 0, dy: 0, mesh: paddleLeft };
  const right = { x: paddleRight.position.x, y: 0, dy: 0, mesh: paddleRight };
  const ballObj = {
    x: 0,
    y: 0,
    size: ballSize,
    dx: BALL_SPEED,
    dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
  };

  const keys: Record<string, boolean> = {};

  function updateScoreText() {
    const display = document.getElementById('scoreDisplay');
    if (display) {
      display.textContent = `${p1} ${leftScore} : ${rightScore} ${p2}`;
    }
  }

  function resetBall() {
    ballObj.x = 0;
    ballObj.y = 0;
    ballObj.dx = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    ballObj.dy = BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
  }

  function checkPaddleCollision(paddle: typeof left | typeof right, isLeft: boolean) {
    const ballHalf = ballObj.size / 2;
    const paddleHalfH = paddleSize.height / 2;
    const paddleHalfW = paddleSize.width / 2;

    const withinX = isLeft
      ? ballObj.x - ballHalf <= paddle.x + paddleHalfW && ballObj.x > paddle.x
      : ballObj.x + ballHalf >= paddle.x - paddleHalfW && ballObj.x < paddle.x;

    const withinY = ballObj.y + ballHalf >= paddle.y - paddleHalfH &&
                    ballObj.y - ballHalf <= paddle.y + paddleHalfH;

    if (withinX && withinY) {
      const relativeIntersectY = ballObj.y - paddle.y;
      const normalizedRelativeIntersectionY = relativeIntersectY / paddleHalfH;
      const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;
      const speed = Math.sqrt(ballObj.dx ** 2 + ballObj.dy ** 2);
      const direction = isLeft ? 1 : -1;

      ballObj.dx = speed * Math.cos(bounceAngle) * direction;
      ballObj.dy = speed * Math.sin(bounceAngle);
      ballObj.x = isLeft
        ? paddle.x + paddleHalfW + ballHalf
        : paddle.x - paddleHalfW - ballHalf;
    }
  }

  function update() {
    if (gameOver) return;

    left.y += left.dy;
    right.y += right.dy;

    const maxY = fieldHeight / 2 - paddleSize.height / 2;
    left.y = Math.max(-maxY, Math.min(maxY, left.y));
    right.y = Math.max(-maxY, Math.min(maxY, right.y));

    left.mesh.position.y = left.y;
    right.mesh.position.y = right.y;

    ballObj.x += ballObj.dx;
    ballObj.y += ballObj.dy;
    ball.position.x = ballObj.x;
    ball.position.y = ballObj.y;

    // Wall bounce
    if (ballObj.y <= -fieldHeight / 2 || ballObj.y >= fieldHeight / 2) {
      ballObj.dy *= -1;
    }

    // Paddle collisions
    checkPaddleCollision(left, true);
    checkPaddleCollision(right, false);

    // Scoring
    if (ballObj.x < -fieldWidth / 2) {
      rightScore++;
      updateScoreText();
      checkWinner();
      resetBall();
    }

    if (ballObj.x > fieldWidth / 2) {
      leftScore++;
      updateScoreText();
      checkWinner();
      resetBall();
    }
  }

  function checkWinner() {
    if (leftScore >= WIN_SCORE) {
      gameOver = true;
      onMatchEnd(p1);
    } else if (rightScore >= WIN_SCORE) {
      gameOver = true;
      onMatchEnd(p2);
    }
  }

  function loop() {
    update();
    scene.render();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (keys["w"]) left.dy = PADDLE_SPEED;
    if (keys["s"]) left.dy = -PADDLE_SPEED;
    if (keys["ArrowUp"]) right.dy = PADDLE_SPEED;
    if (keys["ArrowDown"]) right.dy = -PADDLE_SPEED;
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    if (!keys["w"] && !keys["s"]) left.dy = 0;
    if (!keys["ArrowUp"] && !keys["ArrowDown"]) right.dy = 0;
  });

  updateScoreText();
  resetBall();
  loop();
  window.addEventListener("resize", () => engine.resize());
}
