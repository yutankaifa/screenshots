import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import "./fasten.css";
export default function FastenApp() {
  const fastenRef = useRef<HTMLImageElement>(null);
  const [imgData, setImgData] = useState<any>();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    console.log("currentWindow", currentWindow);
    const unlisten = currentWindow.once<ImageData>("show-image", (event) => {
      console.log("Received show-image event:", event);
      setImgData(event.payload);
    });

    // 清理函数
    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const appWindow = getCurrentWindow();
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      appWindow.setPosition(
        new PhysicalPosition(imgData.x + deltaX, imgData.y + deltaY),
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  return (
    imgData?.base64 && (
      <div
        id="fasten-container"
        style={{ cursor: isDragging ? "grabbing" : "default" }}
        ref={fastenRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imgData.base64}
          style={{ width: imgData.width, height: imgData.height }}
          alt="fasten-img"
        />
      </div>
    )
  );
}

const container = document.getElementById("fasten-app");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);
root.render(<FastenApp />);
