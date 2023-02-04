import { Global, css } from "@emotion/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
  <>
    <Global
      styles={css`
        body {
          margin: 0;
        }
      `}
    />
    <App />
  </>
  // </React.StrictMode>
);
