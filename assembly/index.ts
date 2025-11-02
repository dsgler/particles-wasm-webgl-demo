// 粒子数据结构
// 使用平坦数组存储粒子数据以提高性能
// 每个粒子: [x, y, vx, vy, radius, mass]

const PARTICLE_SIZE = 6; // 每个粒子的属性数量
let particleCount: i32 = 0;
let particles: Float32Array = new Float32Array(0);
let damping: f32 = 0.999; // 阻尼系数

// 初始化粒子系统
export function initParticles(
  count: i32,
  width: f32,
  height: f32,
  _damping: f32
): void {
  particleCount = count;
  particles = new Float32Array(count * PARTICLE_SIZE);
  damping = _damping;

  for (let i = 0; i < count; i++) {
    const offset = i * PARTICLE_SIZE;

    // 随机位置
    particles[offset] = <f32>(Math.random() * width); // x
    particles[offset + 1] = <f32>(Math.random() * height); // y

    // 随机速度（降低初始速度）
    particles[offset + 2] = <f32>((Math.random() - 0.5) * 50); // vx
    particles[offset + 3] = <f32>((Math.random() - 0.5) * 50); // vy

    // 半径
    particles[offset + 4] = <f32>(3 + Math.random() * 5); // radius

    // 质量 (与半径成正比)
    const radius = particles[offset + 4];
    particles[offset + 5] = radius * radius; // mass
  }
}

// 获取粒子数据指针
export function getParticlesPtr(): usize {
  return particles.dataStart;
}

// 更新粒子物理
export function updateParticles(deltaTime: f32, width: f32, height: f32): void {
  const dt = deltaTime;

  // 更新位置和速度
  for (let i = 0; i < particleCount; i++) {
    const offset = i * PARTICLE_SIZE;

    let x = particles[offset];
    let y = particles[offset + 1];
    let vx = particles[offset + 2];
    let vy = particles[offset + 3];
    const radius = particles[offset + 4];

    // 应用速度
    x += vx * dt;
    y += vy * dt;

    // 应用阻尼
    vx *= damping;
    vy *= damping;

    // 边界碰撞检测
    if (x - radius < 0) {
      x = radius;
      vx = <f32>(Math.abs(vx) * 0.8);
    } else if (x + radius > width) {
      x = width - radius;
      vx = <f32>(-Math.abs(vx) * 0.8);
    }

    if (y - radius < 0) {
      y = radius;
      vy = <f32>(Math.abs(vy) * 0.8);
    } else if (y + radius > height) {
      y = height - radius;
      vy = <f32>(-Math.abs(vy) * 0.8);
    }

    // 更新数据
    particles[offset] = x;
    particles[offset + 1] = y;
    particles[offset + 2] = vx;
    particles[offset + 3] = vy;
  }

  // 粒子间碰撞检测
  for (let i = 0; i < particleCount - 1; i++) {
    const offset1 = i * PARTICLE_SIZE;
    const x1 = particles[offset1];
    const y1 = particles[offset1 + 1];
    const vx1 = particles[offset1 + 2];
    const vy1 = particles[offset1 + 3];
    const r1 = particles[offset1 + 4];
    const m1 = particles[offset1 + 5];

    for (let j = i + 1; j < particleCount; j++) {
      const offset2 = j * PARTICLE_SIZE;
      const x2 = particles[offset2];
      const y2 = particles[offset2 + 1];
      const vx2 = particles[offset2 + 2];
      const vy2 = particles[offset2 + 3];
      const r2 = particles[offset2 + 4];
      const m2 = particles[offset2 + 5];

      // 计算距离
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distSq = dx * dx + dy * dy;
      const minDist = r1 + r2;
      const minDistSq = minDist * minDist;

      // 检测碰撞
      if (distSq < minDistSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);

        // 归一化碰撞向量
        const nx = dx / dist;
        const ny = dy / dist;

        // 相对速度
        const dvx = vx2 - vx1;
        const dvy = vy2 - vy1;

        // 碰撞法线方向的相对速度
        const dvn = dvx * nx + dvy * ny;

        // 如果粒子正在分离，忽略碰撞
        if (dvn < 0) continue;

        // 弹性碰撞响应 (动量守恒)
        const restitution: f32 = 0.9; // 恢复系数
        const impulse = ((2 * dvn) / (m1 + m2)) * restitution;

        // 更新速度
        particles[offset1 + 2] += <f32>(impulse * m2 * nx);
        particles[offset1 + 3] += <f32>(impulse * m2 * ny);
        particles[offset2 + 2] -= <f32>(impulse * m1 * nx);
        particles[offset2 + 3] -= <f32>(impulse * m1 * ny);

        // 分离重叠的粒子
        const overlap = minDist - dist;
        const separationRatio = overlap / (m1 + m2);

        particles[offset1] -= <f32>(nx * separationRatio * m2);
        particles[offset1 + 1] -= <f32>(ny * separationRatio * m2);
        particles[offset2] += <f32>(nx * separationRatio * m1);
        particles[offset2 + 1] += <f32>(ny * separationRatio * m1);
      }
    }
  }
}

// 应用重力
export function applyGravity(gravityX: f32, gravityY: f32): void {
  for (let i = 0; i < particleCount; i++) {
    const offset = i * PARTICLE_SIZE;
    particles[offset + 2] += gravityX;
    particles[offset + 3] += gravityY;
  }
}

// 在鼠标位置添加推力
export function applyForce(
  mouseX: f32,
  mouseY: f32,
  forceRadius: f32,
  strength: f32
): void {
  const radiusSq = forceRadius * forceRadius;

  for (let i = 0; i < particleCount; i++) {
    const offset = i * PARTICLE_SIZE;
    const x = particles[offset];
    const y = particles[offset + 1];

    const dx = x - mouseX;
    const dy = y - mouseY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radiusSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = strength * (1 - dist / forceRadius);

      particles[offset + 2] += <f32>((dx / dist) * force);
      particles[offset + 3] += <f32>((dy / dist) * force);
    }
  }
}
