import wasmUrl from "../build/release.wasm?url";
import type asModule from "../build/release.d";
// 顶点着色器
import vertexShaderSource from "./vertexShaderSource.glsl?raw";
// 片段着色器 - 绘制圆形粒子
import fragmentShaderSource from "./fragmentShaderSource.glsl?raw";

/**
 * WebGL 粒子渲染器类
 *
 * 职责：使用 WebGL 在 GPU 上高效渲染大量粒子
 * WebGL 是一种基于 OpenGL ES 的 JavaScript API，可以在浏览器中进行硬件加速的 3D/2D 图形渲染
 */
class ParticleRenderer {
  // WebGL 渲染上下文 - 所有 WebGL 操作的入口点
  private gl: WebGLRenderingContext;

  // 着色器程序 - 包含在 GPU 上运行的顶点着色器和片段着色器
  private program: WebGLProgram;

  // 顶点缓冲区 - 在 GPU 显存中存储顶点数据的对象
  private positionBuffer: WebGLBuffer;

  // 顶点数组 - CPU 端的临时数据存储，用于组装顶点数据后传输到 GPU
  private vertexArray: Float32Array;

  /**
   * 构造函数 - 初始化 WebGL 环境和着色器程序
   * @param canvas HTML Canvas 元素，WebGL 将在其上绘制
   */
  constructor(canvas: HTMLCanvasElement) {
    // 获取 WebGL 渲染上下文（类似于 2D canvas 的 getContext('2d')）
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    /**
     * 创建着色器程序
     *
     * 着色器是在 GPU 上运行的小程序，用 GLSL 语言编写
     * - 顶点着色器：处理每个顶点的位置变换
     * - 片段着色器：处理每个像素的颜色计算
     */
    const vertexShader = this.createShader(
      gl.VERTEX_SHADER,
      vertexShaderSource
    );
    const fragmentShader = this.createShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    // 创建着色器程序并链接顶点着色器和片段着色器
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program); // 链接着色器，类似于编译链接 C++ 程序

    // 检查程序是否成功链接
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Program link failed: " + gl.getProgramInfoLog(program));
    }

    this.program = program;

    // 创建顶点缓冲区对象（VBO - Vertex Buffer Object）
    // 这是在 GPU 显存中分配的一块内存，用于存储顶点数据
    this.positionBuffer = gl.createBuffer()!;

    // 初始化一个空的 Float32Array，后续会根据粒子数量调整大小
    this.vertexArray = new Float32Array(0);

    /**
     * 启用混合模式
     *
     * 混合允许透明效果，使粒子可以有半透明的边缘
     * gl.SRC_ALPHA：源颜色的 alpha 值
     * gl.ONE_MINUS_SRC_ALPHA：1 - 源颜色的 alpha 值
     * 最终颜色 = 源颜色 * alpha + 目标颜色 * (1 - alpha)
     */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /**
   * 创建并编译着色器
   * @param type 着色器类型（VERTEX_SHADER 或 FRAGMENT_SHADER）
   * @param source GLSL 源代码字符串
   * @returns 编译好的着色器对象
   */
  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;

    // 创建着色器对象
    const shader = gl.createShader(type)!;

    // 设置着色器源代码
    gl.shaderSource(shader, source);

    // 编译着色器（类似于编译 C++ 代码）
    gl.compileShader(shader);

    // 检查编译是否成功
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error("Shader compile failed: " + info);
    }

    return shader;
  }

  /**
   * 渲染粒子
   *
   * 这是核心渲染函数，每帧调用一次
   * 流程：
   * 1. 清空画布
   * 2. 为每个粒子生成 6 个顶点（2 个三角形组成 1 个四边形）
   * 3. 将顶点数据上传到 GPU
   * 4. 配置着色器属性
   * 5. 执行绘制
   *
   * @param particles 从 WebAssembly 内存中读取的粒子数据数组
   * @param particleCount 粒子数量
   * @param width 画布宽度
   * @param height 画布高度
   */
  render(
    particles: Float32Array,
    particleCount: number,
    width: number,
    height: number
  ) {
    const gl = this.gl;

    /**
     * 步骤 1: 清空画布
     */
    // 设置视口（渲染区域）
    gl.viewport(0, 0, width, height);

    // 设置清空颜色（深蓝色背景）
    gl.clearColor(0.05, 0.05, 0.1, 1);

    // 清空颜色缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT);

    /**
     * 步骤 2: 激活着色器程序
     */
    gl.useProgram(this.program);

    // 设置 uniform 变量（传递画布分辨率给着色器）
    // uniform 是所有顶点/片段共享的全局变量
    const resolutionLocation = gl.getUniformLocation(
      this.program,
      "u_resolution"
    );
    gl.uniform2f(resolutionLocation, width, height);

    /**
     * 步骤 3: 为每个粒子生成顶点数据
     *
     * WebGL 只能绘制三角形，所以我们用 2 个三角形组成 1 个四边形来表示圆形粒子
     * 每个粒子需要 6 个顶点（每个三角形 3 个顶点）
     */
    const verticesPerParticle = 6; // 2 个三角形 = 6 个顶点
    const floatsPerVertex = 5; // 每个顶点 5 个浮点数：x, y, centerX, centerY, radius
    const totalFloats = particleCount * verticesPerParticle * floatsPerVertex;

    // 如果数组大小不匹配，重新分配内存
    if (this.vertexArray.length !== totalFloats) {
      this.vertexArray = new Float32Array(totalFloats);
    }

    // 遍历每个粒子，生成其顶点数据
    for (let i = 0; i < particleCount; i++) {
      // 从 particles 数组中读取粒子数据
      const particleOffset = i * 6; // PARTICLE_SIZE from AssemblyScript
      const x = particles[particleOffset]; // 粒子中心 x 坐标
      const y = particles[particleOffset + 1]; // 粒子中心 y 坐标
      const radius = particles[particleOffset + 4]; // 粒子半径

      const arrayOffset = i * verticesPerParticle * floatsPerVertex;

      /**
       * 创建四边形的两个三角形
       *
       * 四边形的 4 个角：
       * (x-r, y-r) ---- (x+r, y-r)
       *     |               |
       *     |     (x,y)     |
       *     |               |
       * (x-r, y+r) ---- (x+r, y+r)
       *
       * 三角形 1: 左上、右上、左下
       * 三角形 2: 左下、右上、右下
       */

      // Triangle 1
      this.setVertex(arrayOffset + 0, x - radius, y - radius, x, y, radius); // 左上
      this.setVertex(arrayOffset + 5, x + radius, y - radius, x, y, radius); // 右上
      this.setVertex(arrayOffset + 10, x - radius, y + radius, x, y, radius); // 左下

      // Triangle 2
      this.setVertex(arrayOffset + 15, x - radius, y + radius, x, y, radius); // 左下
      this.setVertex(arrayOffset + 20, x + radius, y - radius, x, y, radius); // 右上
      this.setVertex(arrayOffset + 25, x + radius, y + radius, x, y, radius); // 右下
    }

    /**
     * 步骤 4: 上传数据到 GPU
     */
    // 绑定缓冲区（告诉 WebGL 我们要操作这个缓冲区）
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

    // 将 CPU 端的数据上传到 GPU 显存
    // DYNAMIC_DRAW 表示这些数据会频繁更新（每帧都更新）
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.DYNAMIC_DRAW);

    /**
     * 步骤 5: 配置顶点属性
     *
     * 告诉 WebGL 如何从缓冲区中读取数据并传递给着色器
     */
    const stride = floatsPerVertex * 4; // 每个顶点的字节大小（4 字节 = 1 个 float）

    // 配置 a_position 属性（顶点位置）
    const positionLocation = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(positionLocation); // 启用属性
    // 参数：(属性位置, 分量数量, 数据类型, 是否归一化, 步长, 偏移量)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

    // 配置 a_center 属性（粒子中心坐标）
    const centerLocation = gl.getAttribLocation(this.program, "a_center");
    gl.enableVertexAttribArray(centerLocation);
    gl.vertexAttribPointer(centerLocation, 2, gl.FLOAT, false, stride, 8); // 偏移 8 字节

    // 配置 a_radius 属性（粒子半径）
    const radiusLocation = gl.getAttribLocation(this.program, "a_radius");
    gl.enableVertexAttribArray(radiusLocation);
    gl.vertexAttribPointer(radiusLocation, 1, gl.FLOAT, false, stride, 16); // 偏移 16 字节

    /**
     * 步骤 6: 执行绘制
     *
     * TRIANGLES 模式：每 3 个顶点组成一个三角形
     * 从第 0 个顶点开始，绘制 particleCount * 6 个顶点
     */
    gl.drawArrays(gl.TRIANGLES, 0, particleCount * verticesPerParticle);
  }

  /**
   * 设置单个顶点的数据
   *
   * 将顶点的位置、粒子中心、半径信息写入顶点数组
   *
   * @param offset 在 vertexArray 中的起始位置
   * @param x 顶点 x 坐标
   * @param y 顶点 y 坐标
   * @param cx 粒子中心 x 坐标
   * @param cy 粒子中心 y 坐标
   * @param r 粒子半径
   */
  private setVertex(
    offset: number,
    x: number,
    y: number,
    cx: number,
    cy: number,
    r: number
  ) {
    // 在片段着色器中，我们需要知道：
    // 1. 当前像素的坐标 (x, y) - 用于判断是否在圆内
    // 2. 粒子的中心坐标 (cx, cy) - 用于计算距离
    // 3. 粒子的半径 (r) - 用于判断边界
    this.vertexArray[offset] = x; // 顶点 x 坐标
    this.vertexArray[offset + 1] = y; // 顶点 y 坐标
    this.vertexArray[offset + 2] = cx; // 粒子中心 x
    this.vertexArray[offset + 3] = cy; // 粒子中心 y
    this.vertexArray[offset + 4] = r; // 粒子半径
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
