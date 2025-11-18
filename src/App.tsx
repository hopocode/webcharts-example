import React from "react";
import DefaultPage from "./pages/Default";
import { Graph1Page } from "./pages/Graph1";
import { Graph2Page } from "./pages/Graph2";

export default function App() {
  const path = window.location.pathname;
  if (path === "/default") return <DefaultPage />;
  if (path === "/graph1") return <Graph1Page />;
  if (path === "/graph2") return <Graph2Page />;

  return (
    <div style={{ padding: 20 }}>
      <h1>Webgraph</h1>
      <p>
        Otevřete <a href="/default">/default</a> pro demo stránky.
      </p>
    </div>
  );
}
