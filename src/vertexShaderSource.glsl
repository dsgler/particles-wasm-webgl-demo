attribute vec2 a_position;
attribute vec2 a_center;
attribute float a_radius;

uniform vec2 u_resolution;

varying vec2 v_position;
varying vec2 v_center;
varying float v_radius;

void main() {
        // 转换到裁剪空间
    vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    v_position = a_position;
    v_center = a_center;
    v_radius = a_radius;
}