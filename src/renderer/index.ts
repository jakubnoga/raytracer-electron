type Point2D = [number, number];
type Point3D = [number, number, number];
type RGBA = [number, number, number, number];
type Sphere = {
  C: Point3D;
  r: number;
  color: RGBA;
};
type Scene = {
  spheres: Sphere[];
};
export class Renderer {
  private scene: Scene = {
    spheres: [
      {
        C: [0, -1, 3],
        r: 1,
        color: [255, 0, 0, 255],
      },
      {
        C: [2, 0, 4],
        r: 1,
        color: [0, 0, 255, 255],
      },
      {
        C: [-2, 0, 4],
        r: 1,
        color: [0, 255, 0, 255],
      },
    ],
  };
  private vw = 1;
  private vh = 1;
  private vd = 1;

  private backgroundColor: RGBA = [255, 255, 255, 255];
  private imageData: ImageData;

  static create(canvas: HTMLCanvasElement): Renderer {
    const ctx = canvas.getContext("2d");

    if (ctx == null) {
      throw new Error("context is null");
    }

    return new Renderer(canvas, ctx);
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    private context: CanvasRenderingContext2D
  ) {
    this.imageData = new ImageData(this.canvas.width, this.canvas.height);
  }

  render() {
    const O: Point3D = [0, 0, 0]; // camera
    const [cw, ch] = [this.canvas.width, this.canvas.height];

    // iterate canvas
    for (let x = -cw / 2; x < cw / 2; x++) {
      for (let y = -ch / 2; y < ch / 2; y++) {
        // map canvas pixel to viewport point (3D plane in scene)
        const D = this.canvasToViewport(x, y);
        const color = this.traceRay(O, D, 1, Infinity);
        this.putPixel(x, y, color);
      }
    }
    this.putImageData();
  }

  canvasToViewport(x: number, y: number): Point3D {
    const [cw, ch] = [this.canvas.width, this.canvas.height];
    const D: Point3D = [(x * this.vw) / cw, (y * this.vh) / ch, this.vd];

    return D;
  }

  traceRay(
    origin: Point3D,
    viewportPoint: Point3D,
    tMin: number,
    tMax: number
  ) {
    let closestT = Infinity;
    let closestSphere: Sphere | null = null;

    for (let sphere of this.scene.spheres) {
      // ray can intersect sphere in 0, 1 or 2 points P1 = (O + t1D), P2 = (O + t2D)
      const intersects = this.intersectRaySphere(origin, viewportPoint, sphere);
      for (let t of intersects) {
        if (t > tMin && t < tMax && t < closestT) {
          closestT = t;
          closestSphere = sphere;
        }
      }
    }

    if (closestSphere == null) {
      return this.backgroundColor;
    }

    return closestSphere.color;
  }

  intersectRaySphere(
    origin: Point3D,
    viewportPoint: Point3D,
    sphere: Sphere
  ): [number, number] {
    // solve quadratic equasion
    const co = origin.map((p, i) => p - sphere.C[i]);

    const a = this.dot(viewportPoint, viewportPoint);
    const b = this.dot(co, viewportPoint) * 2;
    const c = this.dot(co, co) - sphere.r * sphere.r;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return [Infinity, Infinity];
    }

    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

    return [t1, t2];
  }

  dot(v1: number[], v2: number[]): number {
    if (v1.length != v2.length) {
      throw new Error("[dot]: vectors have different length");
    }
    return v1.map((p, i) => p * v2[i]).reduce((acc, v) => acc + v, 0);
  }

  subtract(v1: number[], v2: number[]) {
    if (v1.length != v2.length) {
      throw new Error("[subtract]: vectors have different length");
    }
    return v1.map((p, i) => p - v2[i]);
  }

  subtractScalar(v1: number[], a: number) {
    return v1.map((p) => p - a);
  }

  multiplyByScalar(v1: number[], a: number) {
    return v1.map((p) => p * a);
  }

  putPixel(cx: number, cy: number, [R, G, B, A]: RGBA) {
    const sx = this.canvas.width / 2 + cx;
    const sy = this.canvas.height / 2 - cy;

    const index = 4 * (sy * this.canvas.width + sx);

    this.imageData.data[index + 0] = R;
    this.imageData.data[index + 1] = G;
    this.imageData.data[index + 2] = B;
    this.imageData.data[index + 3] = A;
  }

  putImageData() {
    this.context.putImageData(this.imageData, 0, 0);
  }

  clear() {
    this.imageData = new ImageData(this.canvas.width, this.canvas.height);

    this.context.putImageData(
      new ImageData(this.canvas.width, this.canvas.height),
      0,
      0
    );
  }
}
