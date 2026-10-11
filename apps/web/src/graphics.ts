import type { DrawCommand } from "@isetl/runtime";
export function createGraphics(
  canvas: HTMLCanvasElement,
  onTitle: (title: string) => void,
) {
  const context = canvas.getContext("2d")!;
  let x = 0,
    y = 0,
    size = 1,
    xor = false;
  canvas.width = 960;
  canvas.height = 640;
  const ink = () => {
    context.globalCompositeOperation = xor ? "difference" : "source-over";
    context.strokeStyle = context.fillStyle = xor ? "#ffffff" : "#314d40";
    context.font = `${14 * size}px "SFMono-Regular", Consolas, monospace`;
    context.lineCap = "round";
  };
  const clear = () => {
    context.save();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  };
  clear();
  return {
    clear,
    draw(commands: DrawCommand[]) {
      for (const command of commands) {
        const { op, a = 0, b = 0, c = 0, d = 0, text = "" } = command;
        ink();
        switch (op) {
          case 0:
            clear();
            break;
          case 1:
            x = a;
            y = b;
            break;
          case 2:
            if (a === x && b === y)
              context.fillRect(x, y, context.lineWidth, context.lineWidth);
            else {
              context.beginPath();
              context.moveTo(x, y);
              context.lineTo(a, b);
              context.stroke();
            }
            x = a;
            y = b;
            break;
          case 3:
            context.strokeRect(a, b, c - a, d - b);
            break;
          case 4:
            context.fillRect(a, b, c - a, d - b);
            break;
          case 5:
            xor = a === 1;
            break;
          case 6:
            context.lineWidth = a;
            break;
          case 7:
            context.fillText(text, x, y);
            x += text.length * 8 * size;
            break;
          case 8:
            onTitle(text);
            break;
          case 9:
            size = a;
            break;
        }
      }
    },
  };
}
