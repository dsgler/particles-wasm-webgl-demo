/**
 * 顶点着色器 (Vertex Shader)
 * 
 * 职责：处理每个顶点的位置变换
 * 这个着色器会为每个顶点运行一次
 */

// ============ 输入属性 (Attributes) ============
// attribute 是每个顶点独有的数据，从 JavaScript 通过 vertexAttribPointer 传入

attribute vec2 a_position;  // 顶点的屏幕坐标 (x, y)，单位：像素
attribute vec2 a_center;    // 粒子中心的屏幕坐标 (x, y)，单位：像素
attribute float a_radius;   // 粒子的半径，单位：像素

// ============ Uniform 变量 ============
// uniform 是所有顶点共享的全局变量，从 JavaScript 通过 uniform2f 传入

uniform vec2 u_resolution;  // 画布的分辨率 (宽度, 高度)，单位：像素

// ============ 输出变量 (Varyings) ============
// varying 变量会传递给片段着色器
// 在顶点之间会进行线性插值（光栅化过程）

varying vec2 v_position;    // 传递顶点位置给片段着色器
varying vec2 v_center;      // 传递粒子中心给片段着色器
varying float v_radius;     // 传递粒子半径给片段着色器

void main() {
    /**
     * 坐标系统转换：屏幕空间 -> 裁剪空间
     * 
     * WebGL 使用裁剪空间坐标系统：
     * - x 和 y 的范围都是 [-1, 1]
     * - 左下角是 (-1, -1)
     * - 右上角是 (1, 1)
     * - 中心是 (0, 0)
     * 
     * 我们的坐标是屏幕像素坐标：
     * - 左上角是 (0, 0)
     * - 右下角是 (width, height)
     * 
     * 转换步骤：
     * 1. a_position / u_resolution  → 归一化到 [0, 1]
     * 2. * 2.0                       → 缩放到 [0, 2]
     * 3. - 1.0                       → 平移到 [-1, 1]
     */
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;

    /**
     * 翻转 Y 轴
     * 
     * 因为屏幕坐标系 Y 轴向下，而 WebGL Y 轴向上
     * vec2(1, -1) 保持 X 不变，翻转 Y
     * 
     * gl_Position 是内置变量，表示顶点的最终位置
     * vec4(x, y, z, w) - z 用于深度测试，w 用于透视除法（这里都设为常量）
     */
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    /**
     * 将数据传递给片段着色器
     * 
     * 这些 varying 变量会在三角形内部进行插值
     * 例如：如果三角形的 3 个顶点 v_position 分别是 A, B, C
     *      那么三角形内部每个像素的 v_position 会是 A, B, C 的加权平均
     */
    v_position = a_position;
    v_center = a_center;
    v_radius = a_radius;
}