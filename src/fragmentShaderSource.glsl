precision mediump float;

varying vec2 v_position;
varying vec2 v_center;
varying float v_radius;

void main() {
    float dist = distance(v_position, v_center);
    if(dist > v_radius) {
        discard;
    }

        // 平滑边缘
    float normalizedDist = dist / v_radius;
    float alpha = 1.0 - smoothstep(0.8, 1.0, normalizedDist);

        // 纯色，不同粒子使用基于位置的颜色
    vec3 baseColor = vec3(0.4, 0.7, 1.0);

    gl_FragColor = vec4(baseColor, alpha * 0.9);
}