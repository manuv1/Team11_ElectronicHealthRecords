import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "../pages/App";
import { AuthProvider } from "../providers/AuthProvider";
import "../styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
