/**
 * 控制面板类
 *
 * 提供图形化界面来调整粒子系统的参数
 */
export class ControlPanel {
  private panel: HTMLDivElement;

  // 当前设置值
  public settings = {
    gravity: 10,
    damping: 0.995,
    particleCount: 800,
    minRadius: 3,
    maxRadius: 8,
  };

  // 回调函数
  public onSettingsChange?: () => void;

  constructor() {
    // 创建主面板
    this.panel = document.createElement("div");
    this.panel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      padding: 15px;
      border-radius: 8px;
      min-width: 280px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      user-select: none;
      backdrop-filter: blur(10px);
    `;

    // 标题
    const title = document.createElement("div");
    title.textContent = "⚙️ 粒子系统控制";
    title.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      border-bottom: 2px solid rgba(100, 150, 255, 0.5);
      padding-bottom: 8px;
    `;
    this.panel.appendChild(title);

    // 创建控制项
    this.createSlider("重力", 0, 50, this.settings.gravity, 0.5, "gravity");
    this.createSlider(
      "阻尼",
      0.95,
      1.0,
      this.settings.damping,
      0.001,
      "damping"
    );
    this.createSlider(
      "粒子数量",
      100,
      2000,
      this.settings.particleCount,
      50,
      "particleCount"
    );
    this.createSlider(
      "粒子半径",
      2,
      15,
      this.settings.maxRadius,
      0.5,
      "maxRadius"
    );

    // 重置按钮
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "🔄 重置粒子";
    resetBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      margin-top: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: transform 0.1s;
    `;
    resetBtn.onmouseenter = () => (resetBtn.style.transform = "scale(1.05)");
    resetBtn.onmouseleave = () => (resetBtn.style.transform = "scale(1)");
    resetBtn.onclick = () => {
      if (this.onSettingsChange) {
        this.onSettingsChange();
      }
    };
    this.panel.appendChild(resetBtn);

    // 使用说明
    const hint = document.createElement("div");
    hint.innerHTML = `
      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: rgba(255,255,255,0.6);">
        💡 提示：<br>
        • 鼠标拖动推动粒子<br>
        • 修改参数后点击重置<br>
        • 按 H 键隐藏/显示面板
      </div>
    `;
    this.panel.appendChild(hint);

    document.body.appendChild(this.panel);
  }

  /**
   * 创建滑块控制
   */
  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    key: keyof typeof this.settings
  ): HTMLInputElement {
    const container = document.createElement("div");
    container.style.marginBottom = "15px";

    // 标签和值显示
    const labelDiv = document.createElement("div");
    labelDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 12px;
    `;

    const labelText = document.createElement("span");
    labelText.textContent = label;
    labelText.style.color = "rgba(255, 255, 255, 0.9)";

    const valueText = document.createElement("span");
    valueText.textContent = this.formatValue(key, value);
    valueText.style.cssText = `
      color: #667eea;
      font-weight: bold;
      min-width: 60px;
      text-align: right;
    `;

    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueText);

    // 滑块
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = step.toString();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(to right, 
        rgba(100, 150, 255, 0.3) 0%, 
        rgba(100, 150, 255, 0.6) ${((value - min) / (max - min)) * 100}%, 
        rgba(255, 255, 255, 0.1) ${((value - min) / (max - min)) * 100}%);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;

    // 滑块样式
    const style = document.createElement("style");
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);

    // 更新事件
    slider.oninput = () => {
      const newValue = parseFloat(slider.value);
      (this.settings as any)[key] = newValue;
      valueText.textContent = this.formatValue(key, newValue);

      // 更新滑块渐变
      const percent = ((newValue - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(to right, 
        rgba(100, 150, 255, 0.3) 0%, 
        rgba(100, 150, 255, 0.6) ${percent}%, 
        rgba(255, 255, 255, 0.1) ${percent}%)`;
    };

    container.appendChild(labelDiv);
    container.appendChild(slider);
    this.panel.appendChild(container);

    return slider;
  }

  /**
   * 格式化显示值
   */
  private formatValue(key: keyof typeof this.settings, value: number): string {
    switch (key) {
      case "gravity":
        return value.toFixed(1);
      case "damping":
        return value.toFixed(3);
      case "particleCount":
        return Math.round(value).toString();
      case "minRadius":
      case "maxRadius":
        return value.toFixed(1) + " px";
      default:
        return value.toString();
    }
  }

  /**
   * 隐藏/显示面板
   */
  toggle() {
    this.panel.style.display =
      this.panel.style.display === "none" ? "block" : "none";
  }
}
