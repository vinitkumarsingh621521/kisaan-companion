import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.info("[KrishiMitra] App mounted v4");
createRoot(document.getElementById("root")!).render(<App />);
