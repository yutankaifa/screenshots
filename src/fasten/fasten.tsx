import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import "./fasten.css";
export default function FastenApp() {
  const fastenRef = useRef<HTMLImageElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [conPos, setConPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    console.log("currentWindow", currentWindow);
    const unlisten = currentWindow.once<ImageData>("show-image", (event) => {
      console.log("Received show-image event:", event);
      // @ts-ignore
      setConPos({ x: event.payload.x, y: event.payload.y });
      // @ts-ignore
      imgRef.current!.src = event.payload.base64;
      imgRef.current!.width = event.payload.width;
      imgRef.current!.height = event.payload.height;
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
        new PhysicalPosition(conPos.x + deltaX, conPos.y + deltaY),
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  return (
    <div
      id="fasten-container"
      style={{ cursor: isDragging ? "grabbing" : "default" }}
      ref={fastenRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img ref={imgRef} alt="fasten-img" />
    </div>
  );
}

const container = document.getElementById("fasten-app");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);
root.render(<FastenApp />);
