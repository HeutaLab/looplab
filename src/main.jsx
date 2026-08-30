import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CodeBeat from "../codebeat-club.jsx";

/* A crash inside the component would otherwise leave a blank page with the
   reason only in the console — show it on screen instead. */
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("CodeBeat crashed:", err, info);
  }
  render() {
    if (this.state.err)
      return (
        <pre style={{ padding: 16, color: "#FF6B6B", whiteSpace: "pre-wrap", fontSize: 12 }}>
          {String((this.state.err && this.state.err.stack) || this.state.err)}
        </pre>
      );
    return this.props.children;
  }
}

/* No layout here on purpose — the component owns its own width and breakpoints. */
const container = document.getElementById("root");

/* Vite re-runs this module on every hot update. Reuse the root that already
   exists on the container, or React warns that createRoot() was called twice
   on it and the warning drowns out real errors while you work. */
const root = (container._codebeatRoot ??= createRoot(container));

root.render(
  <React.StrictMode>
    <Boundary>
      <CodeBeat />
    </Boundary>
  </React.StrictMode>
);
