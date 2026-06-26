import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/fira-sans/300.css";
import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/fira-sans/700.css";
import "./index.css";
import "./i18n";
import { registerSW } from "./lib/registerSW";

console.info("[KrishiMitra] App mounted v6");
createRoot(document.getElementById("root")!).render(<App />);
registerSW();
