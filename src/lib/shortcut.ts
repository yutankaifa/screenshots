import {
  isRegistered,
  register,
  unregister,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";
import { shortcuts } from "../common/data";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";

export const registerShortcut = async (shortcut: string) => {
  try {
    let selectionWindow: WebviewWindow;
    const flag = await invoke("is_created_selection");
    if (!flag) {
      selectionWindow = new WebviewWindow("selection", {
        url: "src/selection/index.html",
        decorations: false,
        fullscreen: true,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        visible: false,
      });
      await selectionWindow.once("tauri://created", () => {
        console.log("The selection window has been created");
        // selectionWindow.show();
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
          await selectionWindow.show();
        } else if (shortcut == shortcuts[1].name) {
          console.log("Cancel screenshot");
          if (selectionWindow) await selectionWindow.hide();
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
