import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerSW } from "./lib/registerSW";

console.info("[KrishiMitra] App mounted v5");
createRoot(document.getElementById("root")!).render(<App />);
registerSW();
