import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save } from "@tauri-apps/plugin-dialog";

const ratio = window.devicePixelRatio;

export default function SelectionApp() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const selectionConRef = useRef<HTMLDivElement>(null);
  const selectionAreaRef = useRef<HTMLDivElement>(null);
  const selectionBoxRef = useRef<HTMLDivElement>(null);
  const selectionActionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      setIsSelecting(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setEndPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isSelecting) {
        setEndPos({ x: e.clientX, y: e.clientY });
        if (selectionAreaRef.current) {
          const { left, top, width, height } = getSpace();
          selectionAreaRef.current.style.clipPath = `inset(${top}px ${
            window.innerWidth - (left + width)
          }px ${window.innerHeight - (top + height)}px ${left}px)`;
        }
      }
    };
    const handleMouseUp = (_e: MouseEvent) => {
      if (isSelecting) {
        setIsSelecting(false);
        console.log("Selection ended"); // 用于调试
        // 在这里处理选择完成后的逻辑
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
  const getSpace = () => {
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    return { left, top, width, height };
  };
  useEffect(() => {
    const selectionBox = selectionBoxRef.current;
    const { left, top, width, height } = getSpace();
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
    if (selectionConRef.current) {
      selectionConRef.current.style.display = "none";
    }
    const { left, top, width, height } = getSpace();
    const x = Math.round(left * ratio);
    const y = Math.round(top * ratio);

    const filePath = await save({
      filters: [
        {
          name: "Image",
          extensions: ["png"],
        },
      ],
    });
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
  };

  return (
    <div id="selection-container" ref={selectionConRef}>
      <div id="selection-area" ref={selectionAreaRef}></div>
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
    </div>
  );
}

const container = document.getElementById("selection-app");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

root.render(<SelectionApp />);
