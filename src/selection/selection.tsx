import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "./selection.css";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";

const ratio = window.devicePixelRatio;
const originSize = 50; // Original image size
const magnifierSize = 100; // Magnifying glass size
const zoomFactor = 2; // magnification
export default function SelectionApp() {
  const [isShow, setIsShow] = useState(false);
  const [onceSelection, setOnceSelection] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const selectionConRef = useRef<HTMLDivElement>(null);
  const selectionBoxRef = useRef<HTMLDivElement>(null);
  const selectionActionRef = useRef<HTMLDivElement>(null);
  const magnifierConRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const selectionAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const init = async () => {
      await fetchImage();
    };
    init().then((_r) => setIsShow(true));
  }, []);
  const fetchImage = async () => {
    // Load image from file path
    imageRef.current.src = await invoke("take_screenshot", {
      x: 0,
      y: 0,
      width: screen.width,
      height: screen.height,
      actionType: "Init",
    });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeHandle(handle);
  };
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (onceSelection) {
        if (
          selectionAreaRef.current &&
          selectionAreaRef.current.contains(e.target as Node)
        ) {
          setIsDragging(true);
          setDragStartPos({
            x: e.clientX - startPos.x,
            y: e.clientY - startPos.y,
          });
        }
        return;
      }
      setIsSelecting(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setEndPos({ x: e.clientX, y: e.clientY });
      if (selectionActionRef.current) {
        selectionActionRef.current.style.display = "none";
      }
    };

    const handleMouseMove = async (e: MouseEvent) => {
      const mouseX = e.screenX; // 使用 screenX 获取全局鼠标位置
      const mouseY = e.screenY; // 使用 screenY 获取全局鼠标位置
      setMousePos({ x: mouseX, y: mouseY });
      if (isSelecting) {
        setEndPos({ x: mouseX, y: mouseY });
      }

      if (isDragging) {
        const newStartX = Math.max(0, mouseX - dragStartPos.x);
        const newStartY = Math.max(0, mouseY - dragStartPos.y);
        const width = endPos.x - startPos.x;
        const height = endPos.y - startPos.y;

        // 限制选中区域不超出窗口边界
        const maxX = window.innerWidth - width;
        const maxY = window.innerHeight - height;

        setStartPos({
          x: Math.min(newStartX, maxX),
          y: Math.min(newStartY, maxY),
        });
        setEndPos({
          x: Math.min(newStartX + width, maxX + width),
          y: Math.min(newStartY + height, maxY + height),
        });
        return;
      }
      const magnifierCanvas = magnifierRef.current;

      if (magnifierCanvas && imageRef.current.complete) {
        const ctx = magnifierCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, magnifierSize, magnifierSize);
          // Calculate the actual mouse position (considering device pixel ratio)
          const mouseX = e.clientX * ratio;
          const mouseY = e.clientY * ratio;
          // Calculate the capture area of the source image
          const sourceX = mouseX - originSize / zoomFactor / 2;
          const sourceY = mouseY - originSize / zoomFactor / 2;
          const sourceWidth = originSize / zoomFactor;
          const sourceHeight = originSize / zoomFactor;
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
        }
      }
      if (magnifierConRef.current) {
        magnifierConRef.current.style.left = `${e.clientX + 20}px`;
        magnifierConRef.current.style.top = `${e.clientY + 20}px`;
      }
    };
    const handleMouseUp = (_e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
      }
      if (isSelecting) {
        setOnceSelection(true);
        setIsSelecting(false);
        if (selectionActionRef.current) {
          selectionActionRef.current.style.display = "flex";
        }
      }
    };

    const handleResize = (e: MouseEvent) => {
      if (!isResizing) return;

      let newStartPos = { ...startPos };
      let newEndPos = { ...endPos };

      switch (resizeHandle) {
        case "top":
          newStartPos.y = e.clientY;
          break;
        case "bottom":
          newEndPos.y = e.clientY;
          break;
        case "left":
          newStartPos.x = e.clientX;
          break;
        case "right":
          newEndPos.x = e.clientX;
          break;
        case "top-left":
          newStartPos = {
            x: e.clientX,
            y: e.clientY,
          };
          break;
        case "top-right":
          newStartPos.y = e.clientY;
          newEndPos.x = e.clientX;
          break;
        case "bottom-left":
          newStartPos.x = e.clientX;
          newEndPos.y = e.clientY;
          break;
        case "bottom-right":
          newEndPos = {
            x: e.clientX,
            y: e.clientY,
          };
          break;
      }

      setStartPos(newStartPos);
      setEndPos(newEndPos);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeHandle("");
    };

    const removeAllEventListener = () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", handleResizeEnd);
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      removeAllEventListener();
    };
  }, [isSelecting, isResizing, isDragging, onceSelection]);

  const getSpace = (ratio?: number) => {
    let _ratio = ratio ? ratio : 1;
    const left = Math.min(startPos.x, endPos.x);
    const top = Math.min(startPos.y, endPos.y);
    const width = Math.abs(endPos.x - startPos.x);
    const height = Math.abs(endPos.y - startPos.y);
    return {
      left: Math.round(left * _ratio),
      top: Math.round(top * _ratio),
      width: Math.round(width * _ratio),
      height: Math.round(height * _ratio),
    };
  };

  useEffect(() => {
    const selectionBox = selectionBoxRef.current;
    const selectionArea = selectionAreaRef.current;
    const { left, top, width, height } = getSpace();
    if (selectionBox && selectionArea) {
      selectionBox.style.left = `${left}px`;
      selectionBox.style.top = `${top}px`;
      selectionArea.style.width = `${width}px`;
      selectionArea.style.height = `${height}px`;
      selectionBox.style.display = "flex";
    }
    // if (selectionActionRef.current) {
    //   selectionActionRef.current.style.top = endPos.y + "px";
    //   selectionActionRef.current.style.left = endPos.x + "px";
    // }
  }, [startPos, endPos]);

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
      const { left: x, top: y, width, height } = getSpace(ratio);
      setTimeout(async () => {
        try {
          await invoke("take_screenshot", {
            x,
            y,
            width,
            height,
            actionType: "Save",
            filePath,
          });
          await invoke("close_selection_app");
        } catch (error) {
          console.error("Screenshot failed:", error);
        }
      }, 200);
    }
  };
  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const { left: x, top: y, width, height } = getSpace(ratio);
    try {
      const buffer: Uint8Array = await invoke("copy_screenshot", {
        x,
        y,
        width,
        height,
      });
      await writeImage(buffer);
      await invoke("close_selection_app");
      // const webView = getCurrentWebviewWindow();
      // await webView.close();
    } catch (error) {
      console.error("Screenshot failed:", error);
    }
  };
  const handleFasten = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionAreaRef.current)
      selectionAreaRef.current.style.display = "none";
    const {
      left: originL,
      top: originT,
      width: originW,
      height: originH,
    } = getSpace();
    const { left: x, top: y, width, height } = getSpace(ratio);
    const base64 = await invoke("take_screenshot", {
      x,
      y,
      width,
      height,
      actionType: "Fasten",
    });
    const obj = {
      x: originL,
      y: originT,
      width: originW,
      height: originH,
      base64,
    };
    const webview = new WebviewWindow(Date.now() + "", {
      url: "../fasten.html",
      x: originL,
      y: originT,
      width: originW + 20,
      height: originH + 20,
      decorations: false,
      fullscreen: false,
      resizable: false,
      transparent: true,
      alwaysOnTop: true,
      visible: true,
      shadow: false,
    });
    await webview.once("tauri://created", async function () {
      console.log("创建置顶成功");
    });
    await webview.once("tauri://error", function (e) {
      console.log("创建置顶错误", e);
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await webview.emit("show-image", obj);
    await invoke("close_selection_app");
  };

  const getCursorStyle = () => {
    if (onceSelection) {
      return "move";
    } else {
      return "default";
    }
  };

  return (
    isShow && (
      <div
        id="selection-container"
        style={{ cursor: onceSelection ? "default" : "crosshair" }}
        ref={selectionConRef}
      >
        <div id="selection-box" ref={selectionBoxRef}>
          <div style={{ position: "relative" }}>
            <div
              id="selection-area"
              style={{
                border: "2px solid #007bff",
                cursor: getCursorStyle(),
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
              }}
              ref={selectionAreaRef}
            >
              <div
                className="resize-handle top"
                onMouseDown={(e) => handleResizeStart(e, "top")}
              ></div>
              <div
                className="resize-handle bottom"
                onMouseDown={(e) => handleResizeStart(e, "bottom")}
              ></div>
              <div
                className="resize-handle left"
                onMouseDown={(e) => handleResizeStart(e, "left")}
              ></div>
              <div
                className="resize-handle right"
                onMouseDown={(e) => handleResizeStart(e, "right")}
              ></div>
              <div
                className="resize-handle top-left"
                onMouseDown={(e) => handleResizeStart(e, "top-left")}
              ></div>
              <div
                className="resize-handle top-right"
                onMouseDown={(e) => handleResizeStart(e, "top-right")}
              ></div>
              <div
                className="resize-handle bottom-left"
                onMouseDown={(e) => handleResizeStart(e, "bottom-left")}
              ></div>
              <div
                className="resize-handle bottom-right"
                onMouseDown={(e) => handleResizeStart(e, "bottom-right")}
              ></div>
            </div>

            <div id="selection-action" ref={selectionActionRef}>
              <button
                id="fasten-btn btn"
                onClick={handleFasten}
                onMouseDown={(e) => e.stopPropagation()}
              >
                Fasten
              </button>
              <button
                id="copy-btn btn"
                onClick={handleCopy}
                onMouseDown={(e) => e.stopPropagation()}
              >
                Copy
              </button>
              <button
                id="save-btn btn"
                onClick={handleSave}
                onMouseDown={(e) => e.stopPropagation()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        {!isDragging && (
          <div id="magnifier-container" ref={magnifierConRef}>
            <div id="magnifier-canvas">
              <canvas
                ref={magnifierRef}
                width={magnifierSize}
                height={magnifierSize}
                style={{
                  border: "2px solid #fff",
                }}
              />
              <div id="magnifier-line-x"></div>
              <div id="magnifier-line-y"></div>
            </div>
            <div style={{ color: "#fff" }}>
              <div style={{ display: "flex", gap: "5px" }}>
                <p>{mousePos.x}</p>
                <p>{mousePos.y}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );
}

const container = document.getElementById("selection-app");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

listen("reload-selection", () => {
  root.render(<SelectionApp key={1000 * Math.random()} />);
});
