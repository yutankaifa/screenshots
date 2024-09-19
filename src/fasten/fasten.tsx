import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import {
  getCurrentWindow,
  PhysicalPosition,
  cursorPosition,
} from "@tauri-apps/api/window";
import "./fasten.css";
export default function FastenApp() {
  const fastenRef = useRef<HTMLImageElement>(null);
  const [imgData, setImgData] = useState<any>();
  const [isDragging, setIsDragging] = useState(false);
  const [currentWindow, setCurrentWindow] = useState<any>();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const currentWindow = getCurrentWindow();
    setCurrentWindow(currentWindow);
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

  const handleMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const cPos = await cursorPosition();
    setDragOffset({
      x: cPos.x - e.clientX,
      y: cPos.y - e.clientY
    });
  };

  const handleMouseMove = async (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const cPos = await cursorPosition();
    currentWindow.setPosition(
      new PhysicalPosition(cPos.x - dragOffset.x, cPos.y - dragOffset.y)
    );
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
