/**
 * 片段着色器 (Fragment Shader)
 * 
 * 职责：计算每个像素的颜色
 * 这个着色器会为三角形覆盖的每个像素运行一次
 * 
 * 对于 800 个粒子，假设每个粒子平均覆盖 100 个像素
 * 这个着色器每帧会运行约 80,000 次！
 */

// ============ 精度设置 ============
// mediump = 中等精度（16位浮点数），平衡性能和精度
// 其他选项：lowp (低精度), highp (高精度)

precision mediump float;

// ============ 输入变量 (Varyings) ============
// 这些值从顶点着色器传入，在三角形内部已经过插值

varying vec2 v_position;    // 当前像素的屏幕坐标 (已插值)
varying vec2 v_center;      // 粒子中心坐标 (已插值)
varying float v_radius;     // 粒子半径 (已插值)

void main() {
    /**
     * 计算当前像素到粒子中心的距离
     * 
     * distance(a, b) = sqrt((a.x - b.x)² + (a.y - b.y)²)
     * 这是欧几里得距离，用于判断像素是否在圆内
     */
    float dist = distance(v_position, v_center);

    /**
     * 剔除圆外的像素
     * 
     * discard 是 GLSL 关键字，会丢弃当前片段（像素）
     * 这样就能在矩形四边形上绘制出圆形
     */
    if(dist > v_radius) {
        discard;  // 不绘制这个像素
    }

    /**
     * 创建平滑的边缘效果
     * 
     * normalizedDist: 将距离归一化到 [0, 1] 范围
     * - 0 表示在圆心
     * - 1 表示在圆的边缘
     */
    float normalizedDist = dist / v_radius;

    /**
     * smoothstep 函数创建平滑过渡
     * 
     * smoothstep(edge0, edge1, x):
     * - 当 x < edge0 时返回 0
     * - 当 x > edge1 时返回 1
     * - 在 edge0 和 edge1 之间平滑插值
     * 
     * 这里：
     * - 当 normalizedDist < 0.8 时，alpha = 1.0 (完全不透明)
     * - 当 normalizedDist > 1.0 时，alpha = 0.0 (完全透明)
     * - 在 0.8 到 1.0 之间平滑过渡，创建柔和的边缘
     */
    float alpha = 1.0 - smoothstep(0.8, 1.0, normalizedDist);

    /**
     * 设置粒子的颜色
     * 
     * vec3 表示 RGB 颜色，每个分量范围 [0, 1]
     * vec3(0.4, 0.7, 1.0) = 浅蓝色
     * - 0.4 红色分量
     * - 0.7 绿色分量
     * - 1.0 蓝色分量
     */
    vec3 baseColor = vec3(0.4, 0.7, 1.0);

    /**
     * 输出最终颜色
     * 
     * gl_FragColor 是内置变量，表示当前像素的最终颜色
     * vec4(r, g, b, a):
     * - r, g, b: 红绿蓝颜色分量
     * - a: alpha 透明度 (0 = 完全透明, 1 = 完全不透明)
     * 
     * alpha * 0.9: 整体稍微透明一点，让粒子重叠时有更好的视觉效果
     */
    gl_FragColor = vec4(baseColor, alpha * 0.9);
}