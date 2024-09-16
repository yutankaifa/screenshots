import { useEffect } from "react";
import { shortcuts } from "./common/data";
import { registerShortcut } from "./shortcut.ts";
import { unregister } from "@tauri-apps/plugin-global-shortcut";

export default function App() {
  useEffect(() => {
    init();
  }, []);
  const init = async () => {
    shortcuts.forEach((shortcut) => {
      registerShortcut(shortcut.name);
    });
  };

  return (
    <div className="container">
      <h1>Screenshot tool</h1>
      <p>Press Shift+Q to start taking screenshots</p>
      <p>Press Esc to cancel</p>
      <button onClick={() => unregister(["Shift+Q", "esc"])}>
        unRegisterAll shortcut
      </button>
    </div>
  );
}
