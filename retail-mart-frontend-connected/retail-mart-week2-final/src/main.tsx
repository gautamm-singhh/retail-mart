import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import "@/styles/index.css";
import { router } from "@/app/router";
import { initGA, setupRouterAnalytics } from "@/lib/analytics";

// Initialize Google Analytics 4 and subscribe to SPA route transitions
initGA();
setupRouterAnalytics(router);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
