import React from "react";
import DefaultPage from "./pages/Default";
import { Graph1Page } from "./pages/Graph1";

export default function App() {
  const path = window.location.pathname;
  if (path === "/default") return <DefaultPage />;
  if (path === "/graph1") return <Graph1Page />;

  return (
    <div style={{ padding: 20 }}>
      <h1>Webgraph</h1>
      <p>
        Otevřete <a href="/default">/default</a> pro demo stránky.
      </p>
    </div>
  );
}
