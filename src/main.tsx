import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import esriConfig from "@arcgis/core/config.js";
import { ARCGIS_API_KEY } from "./shared/config";
import { App } from "./App";
import "./index.css";

// la api key tiene que estar seteada antes del primer request
if (ARCGIS_API_KEY) esriConfig.apiKey = ARCGIS_API_KEY;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
