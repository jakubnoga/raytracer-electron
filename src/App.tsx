import { useEffect, useRef } from "react";
import { Canvas } from "./components/canvas/Canvas";
import { Renderer } from "./renderer";

function App() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current == null) {
      return;
    }

    canvas.current.width = canvas.current.offsetWidth;
    canvas.current.height = canvas.current.offsetHeight;

    const renderer = Renderer.create(canvas.current);
    renderer.render(); 

    return () => renderer.clear();
  }, []);

  return <Canvas id="main" ref={canvas} />;
}

export default App;
