import {
  isRegistered,
  register,
  unregister,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { shortcuts } from "./common/data.ts";
import {
  getAllWebviewWindows,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

export const registerShortcut = async (shortcut: string) => {
  try {
    const flag = await invoke("is_created_selection");
    let selectionWindow: WebviewWindow;
    if (!flag) {
      selectionWindow = new WebviewWindow("selection", {
        url: "../selection.html",
        decorations: false,
        fullscreen: true,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        visible: false,
        shadow: false,
        theme: "dark",
        skipTaskbar: true,
      });
      await selectionWindow.once("tauri://created", () => {
        console.log("The selection window has been created");
      });
      await selectionWindow.once("tauri://error", (e) => {
        console.error("Error creating selection window:", e);
      });
    }
    const res = await isRegistered(shortcut);
    console.log("shortcut", res, shortcut);
    if (!res) {
      await register(shortcut, async () => {
        if (shortcut == shortcuts[0].name) {
          // let selectionWindow = new WebviewWindow("selection", {
          //   url: "../selection.html",
          //   decorations: false,
          //   fullscreen: true,
          //   resizable: false,
          //   transparent: true,
          //   alwaysOnTop: true,
          //   visible: true,
          //   shadow: false,
          //   theme: "dark",
          //   skipTaskbar: true,
          // });
          // await selectionWindow.once("tauri://created", () => {
          //   console.log("The selection window has been created");
          // });
          // await selectionWindow.once("tauri://error", (e) => {
          //   console.error("Error creating selection window:", e);
          // });
          await selectionWindow.show();
          await emit("reload-selection");
        } else if (shortcut == shortcuts[1].name) {
          // await selectionWindow.close();
          const all = await getAllWebviewWindows();
          const selectionWindow = all.find((item) => item.label == "selection");
          if (selectionWindow) await selectionWindow.close();
        }
      });
    }
  } catch (e) {
    console.log("e", e);
  }
};

export const unregisterShortcut = async (shortcut: string) => {
  await unregister(shortcut);
};
export const unregisterAllShortcut = async () => {
  await unregisterAll();
};
