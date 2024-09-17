import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "./selection.css";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

const ratio = window.devicePixelRatio;
const magnifierSize = 100; // Magnifying glass size
const zoomFactor = 1.2; // magnification
export default function SelectionApp() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const selectionConRef = useRef<HTMLDivElement>(null);
  const selectionBoxRef = useRef<HTMLDivElement>(null);
  const selectionActionRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null); // 放大镜的 canvas
  const imageRef = useRef<HTMLImageElement>(new Image());
  useEffect(() => {
    const init = async () => {
      await fetchImage();
    };
    init();
  }, []);
  const fetchImage = async () => {
    // Load image from file path
    imageRef.current.src = await invoke("take_screenshot");
  };
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const magnifierCanvas = magnifierRef.current;
      if (magnifierCanvas && imageRef.current.complete) {
        const ctx = magnifierCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, magnifierSize, magnifierSize);
          // Calculate the actual mouse position (considering device pixel ratio)
          const mouseX = e.clientX * ratio;
          const mouseY = e.clientY * ratio;
          // Calculate the capture area of the source image
          const sourceX = mouseX - magnifierSize / zoomFactor / 2;
          const sourceY = mouseY - magnifierSize / zoomFactor / 2;
          const sourceWidth = magnifierSize / zoomFactor;
          const sourceHeight = magnifierSize / zoomFactor;
          // Draw a screenshot to the magnifying glass
          ctx.drawImage(
            imageRef.current,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            magnifierSize,
            magnifierSize,
          );
          // Set the position of the magnifying glass
          magnifierCanvas.style.left = `${e.clientX + 20}px`;
          magnifierCanvas.style.top = `${e.clientY + 20}px`;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      setIsSelecting(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setEndPos({ x: e.clientX, y: e.clientY });
      if (selectionBoxRef.current) {
        selectionBoxRef.current.style.boxShadow =
          "0 0 0 9999px rgba(0, 0, 0, 0.3)";
      }
    };

    const handleMouseMove = async (e: MouseEvent) => {
      if (isSelecting) {
        setEndPos({ x: e.clientX, y: e.clientY });
      }
    };
    const handleMouseUp = (_e: MouseEvent) => {
      if (isSelecting) {
        setIsSelecting(false);
        if (selectionActionRef.current) {
          selectionActionRef.current.style.display = "block";
        }
      }
    };

    const removeAllEventListener = () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      removeAllEventListener();
    };
  }, [isSelecting]);

  const getSpace = useMemo(() => {
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    return { left, top, width, height };
  }, [startPos, endPos]);

  useEffect(() => {
    const selectionBox = selectionBoxRef.current;
    const { left, top, width, height } = getSpace;
    if (selectionBox) {
      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionBox.style.width = `${width}px`;
      selectionBox.style.height = `${height}px`;
      selectionBox.style.display = "block";
    }
    if (selectionActionRef.current) {
      selectionActionRef.current.style.top = endPos.y + "px";
      selectionActionRef.current.style.left = endPos.x + "px";
    }
  }, [startPos, endPos, isSelecting]);

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const filePath = await save({
      filters: [
        {
          name: "Image",
          extensions: ["png"],
        },
      ],
    });
    if (filePath) {
      if (selectionConRef.current) {
        selectionConRef.current.style.display = "none";
      }
      const { left, top, width, height } = getSpace;
      const x = Math.round(left * ratio);
      const y = Math.round(top * ratio);
      setTimeout(async () => {
        try {
          await invoke("take_screenshot", {
            x,
            y,
            width: Math.round(width * ratio),
            height: Math.round(height * ratio),
            filePath,
          });
          const webView = getCurrentWebviewWindow();
          await webView.close();
        } catch (error) {
          console.error("Screenshot failed:", error);
        }
      }, 100);
    }
  };

  return (
    <div id="selection-container" ref={selectionConRef}>
      <div id="selection-overlay"></div>

      <div style={{ color: "#fff" }}>
        <div style={{ display: "flex", gap: "5px" }}>
          <p>start</p>
          <p>{startPos.x}</p>
          <p>{startPos.y}</p>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <p>end</p>
          <p>{endPos.x}</p>
          <p>{endPos.y}</p>
        </div>
        <div id="selection-box" ref={selectionBoxRef}></div>
      </div>
      <div id="selection-action" ref={selectionActionRef}>
        <button
          id="save-btn"
          onClick={handleSave}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Save
        </button>
      </div>

      {/* 放大镜 canvas */}
      <canvas
        ref={magnifierRef}
        width={magnifierSize}
        height={magnifierSize}
        style={{
          position: "absolute",
          pointerEvents: "none",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.5)",
          border: "2px solid #fff",
          zIndex: 9999,
        }}
      />
    </div>
  );
}

const container = document.getElementById("selection-app");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

listen("reload-selection", () => {
  root.render(<SelectionApp key={1000 * Math.random()} />);
  // 重置状态
});
