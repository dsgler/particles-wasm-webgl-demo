import wasmUrl from "../build/release.wasm?url";
import type asModule from "../build/release.d";
// 顶点着色器
import vertexShaderSource from "./vertexShaderSource.glsl?raw";
// 片段着色器 - 绘制圆形粒子
import fragmentShaderSource from "./fragmentShaderSource.glsl?raw";

// WebGL 渲染器
class ParticleRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private vertexArray: Float32Array;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    // 创建着色器程序
    const vertexShader = this.createShader(
      gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = this.createShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Program link failed: " + gl.getProgramInfoLog(program));
    }

    this.program = program;

    // 创建缓冲区
    this.positionBuffer = gl.createBuffer()!;
    this.vertexArray = new Float32Array(0);

    // 启用混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Shader compile failed: " + info);
    }

    return shader;
  }

  render(
    particles: Float32Array,
    particleCount: number,
    width: number,
    height: number
  ) {
    const gl = this.gl;

    // 清空画布
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.05, 0.05, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // 设置分辨率
    const resolutionLocation = gl.getUniformLocation(
      this.program,
      "u_resolution"
    );
    gl.uniform2f(resolutionLocation, width, height);

    // 为每个粒子生成四边形
    const verticesPerParticle = 6; // 2 triangles = 6 vertices
    const floatsPerVertex = 5; // x, y, centerX, centerY, radius
    const totalFloats = particleCount * verticesPerParticle * floatsPerVertex;

    if (this.vertexArray.length !== totalFloats) {
      this.vertexArray = new Float32Array(totalFloats);
    }

    for (let i = 0; i < particleCount; i++) {
      const particleOffset = i * 6; // PARTICLE_SIZE from AssemblyScript
      const x = particles[particleOffset];
      const y = particles[particleOffset + 1];
      const radius = particles[particleOffset + 4];

      const arrayOffset = i * verticesPerParticle * floatsPerVertex;

      // 创建四边形的两个三角形
      // Triangle 1
      this.setVertex(arrayOffset + 0, x - radius, y - radius, x, y, radius);
      this.setVertex(arrayOffset + 5, x + radius, y - radius, x, y, radius);
      this.setVertex(arrayOffset + 10, x - radius, y + radius, x, y, radius);

      // Triangle 2
      this.setVertex(arrayOffset + 15, x - radius, y + radius, x, y, radius);
      this.setVertex(arrayOffset + 20, x + radius, y - radius, x, y, radius);
      this.setVertex(arrayOffset + 25, x + radius, y + radius, x, y, radius);
    }

    // 上传数据到GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.DYNAMIC_DRAW);

    // 设置属性
    const stride = floatsPerVertex * 4; // 4 bytes per float

    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

    const centerLocation = gl.getAttribLocation(this.program, "a_center");
    gl.enableVertexAttribArray(centerLocation);
    gl.vertexAttribPointer(centerLocation, 2, gl.FLOAT, false, stride, 8);

    const radiusLocation = gl.getAttribLocation(this.program, "a_radius");
    gl.enableVertexAttribArray(radiusLocation);
    gl.vertexAttribPointer(radiusLocation, 1, gl.FLOAT, false, stride, 16);

    // 绘制
    gl.drawArrays(gl.TRIANGLES, 0, particleCount * verticesPerParticle);
  }

  private setVertex(
    offset: number,
    x: number,
    y: number,
    cx: number,
    cy: number,
    r: number
  ) {
    this.vertexArray[offset] = x;
    this.vertexArray[offset + 1] = y;
    this.vertexArray[offset + 2] = cx;
    this.vertexArray[offset + 3] = cy;
    this.vertexArray[offset + 4] = r;
  }
}

// 主应用
async function main() {
  // 创建画布
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";
  canvas.style.backgroundColor = "#0a0a14";
  document.body.appendChild(canvas);

  // 样式
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  // 创建UI
  const ui = document.createElement("div");
  ui.style.position = "absolute";
  ui.style.top = "10px";
  ui.style.left = "10px";
  ui.style.color = "white";
  ui.style.fontFamily = "monospace";
  ui.style.fontSize = "14px";
  ui.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  ui.style.padding = "10px";
  ui.style.borderRadius = "5px";
  ui.style.userSelect = "none";
  document.body.appendChild(ui);

  // 加载 WebAssembly
  const response = await fetch(wasmUrl);
  const wasmBytes = await response.arrayBuffer();
  const wasmModule = await WebAssembly.instantiate(wasmBytes, {
    env: {
      abort: () => console.error("AssemblyScript abort"),
      seed: () => Math.random(),
    },
  });

  const wasm = wasmModule.instance.exports as typeof asModule;

  // 初始化粒子系统
  const PARTICLE_COUNT = 800; // 可以调整粒子数量
  const PARTICLE_SIZE = 8;

  wasm.initParticles(PARTICLE_COUNT, canvas.width, canvas.height, 0.95);

  // 创建渲染器
  const renderer = new ParticleRenderer(canvas);

  // 鼠标交互
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  canvas.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  canvas.addEventListener("mousedown", () => (mouseDown = true));
  canvas.addEventListener("mouseup", () => (mouseDown = false));
  canvas.addEventListener("mouseleave", () => (mouseDown = false));

  // 窗口大小调整
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // 动画循环
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;
  let fpsUpdateTime = lastTime;

  function animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // 转换为秒
    lastTime = currentTime;

    // 计算FPS
    frameCount++;
    if (currentTime - fpsUpdateTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      fpsUpdateTime = currentTime;
    }

    // 应用重力（向下）
    wasm.applyGravity(0, 10); // 第一个参数是水平重力，第二个是垂直重力

    // 鼠标交互
    if (mouseDown) {
      wasm.applyForce(mouseX, mouseY, 150, 150);
    }

    // 更新物理
    wasm.updateParticles(deltaTime, canvas.width, canvas.height);

    // 获取粒子数据
    const particlesPtr = wasm.getParticlesPtr();
    const memory = new Float32Array(
      wasm.memory.buffer,
      particlesPtr,
      PARTICLE_COUNT * PARTICLE_SIZE
    );

    // 渲染
    renderer.render(memory, PARTICLE_COUNT, canvas.width, canvas.height);

    // 更新UI
    ui.innerHTML = `
      粒子数量: ${PARTICLE_COUNT}<br>
      FPS: ${fps}<br>
      鼠标点击拖动以推动粒子<br>
      使用 WebAssembly + WebGL
    `;

    requestAnimationFrame(animate);
  }

  animate();
}

main().catch(console.error);
