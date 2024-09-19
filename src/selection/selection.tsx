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
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
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
    imageRef.current.src = await invoke("take_screenshot");
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      setIsSelecting(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setEndPos({ x: e.clientX, y: e.clientY });
      if (selectionAreaRef.current) {
        selectionAreaRef.current.style.boxShadow =
          "0 0 0 9999px rgba(0, 0, 0, 0.3)";
      }
    };

    const handleMouseMove = async (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (isSelecting) {
        setEndPos({ x: e.clientX, y: e.clientY });
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
      if (isSelecting) {
        setIsSelecting(false);
        if (selectionActionRef.current) {
          selectionActionRef.current.style.display = "flex";
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
      const { left: x, top: y, width, height } = getSpace(ratio);
      setTimeout(async () => {
        try {
          await invoke("take_screenshot", {
            x,
            y,
            width,
            height,
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
    if (selectionConRef.current) {
      selectionConRef.current.style.display = "none";
    }
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
      width: originW,
      height: originH,
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
  return (
    isShow && (
      <div id="selection-container" ref={selectionConRef}>
        <div id="selection-box" ref={selectionBoxRef}>
          <div
            id="selection-area"
            style={{ border: isSelecting ? "2px solid #007bff" : "" }}
            ref={selectionAreaRef}
          ></div>

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
