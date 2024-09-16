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

export const registerShortcut = async (shortcut: string) => {
  try {
    const res = await isRegistered(shortcut);
    console.log("shortcut", res, shortcut);
    if (!res) {
      await register(shortcut, async () => {
        if (shortcut == shortcuts[0].name) {
          let selectionWindow = new WebviewWindow("selection", {
            // url: "src/selection/selection.html",
            url: "../selection.html",
            decorations: false,
            fullscreen: true,
            resizable: false,
            transparent: true,
            alwaysOnTop: true,
            visible: true,
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
        } else if (shortcut == shortcuts[1].name) {
          const webViews = await getAllWebviewWindows();
          const selectionWindow = webViews.find(
            (item) => item.label == "selection",
          );
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
