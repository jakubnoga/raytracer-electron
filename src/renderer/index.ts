type Point2D = [number, number];
type Vector3 = [number, number, number];

type RGB = [number, number, number];
type Sphere = Surface & {
  C: Vector3;
  r: number;
};

type Triangle = Surface & {
  a: Vector3;
  b: Vector3;
  c: Vector3;
};

type Surface = {
  color: RGB;
  specular: number;
  reflective: number;
};

type AmbientLight = {
  type: "ambient";
  intensity: number;
};

type PointLight = {
  type: "point";
  intensity: number;
  position: Vector3;
};

type DirectionalLight = {
  type: "directional";
  intensity: number;
  direction: Vector3;
};

type Light = AmbientLight | PointLight | DirectionalLight;

type Scene = {
  spheres: Sphere[];
  lights: Light[];
  triangles: Triangle[];
};
type ClosestIntersection = {
  closestIntersection: Sphere | Triangle | null;
  closestT: number;
  closestNormal: Vector3 | null;
};
export class Renderer {
  private scene: Scene = {
    spheres: [
      // {
      //   C: [0, -1, 3],
      //   r: 1,
      //   color: [255, 0, 0],
      //   specular: 500,
      //   reflective: 0.2,
      // },
      // {
      //   C: [2, 0, 4],
      //   r: 1,
      //   color: [0, 0, 255],
      //   specular: 500,
      //   reflective: 0.3,
      // },
      // {
      //   C: [-2, 0, 4],
      //   r: 1,
      //   color: [0, 255, 0],
      //   specular: 10,
      //   reflective: 0.4,
      // },
      // {
      //   C: [0, -5001, 0],
      //   r: 5000,
      //   color: [255, 255, 0],
      //   specular: 1000,
      //   reflective: 0.5,
      // },
    ],
    lights: [
      { type: "ambient", intensity: 0.2 },
      { type: "point", intensity: 0.6, position: [2, 1, 0] },
      { type: "directional", intensity: 0.2, direction: [1, 4, 4] },
    ],
    triangles: [
      {
        a: [0, .1, 2],
        b: [.2, -.1, 2],
        c: [-.2, -.1, 2],
        color: [0, 255, 255],
        specular: 500,
        reflective: 0.3,
      },
      {
        a: [0, .1, 2],
        b: [.2, -.1, 2],
        c: [.2, -.1, 40],
        color: [0, 255, 255],
        specular: 500,
        reflective: 0.3,
      },
    ],
  };
  private vw = 1;
  private vh = 1;
  private vd = 1;

  // private backgroundColor: RGB = [255, 255, 255];
  private backgroundColor: RGB = [0, 0, 0];
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
    const O: Vector3 = [0, 0, 0]; // camera
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

  canvasToViewport(x: number, y: number): Vector3 {
    const [cw, ch] = [this.canvas.width, this.canvas.height];
    const D: Vector3 = [(x * this.vw) / cw, (y * this.vh) / ch, this.vd];

    return D;
  }

  traceRay(
    origin: Vector3,
    viewportPoint: Vector3,
    tMin: number,
    tMax: number,
    recursionDepth = 3
  ): RGB {
    let { closestIntersection, closestT, closestNormal }: ClosestIntersection =
      this.closestIntersection(origin, viewportPoint, tMin, tMax);

    if (closestIntersection == null || closestNormal == null) {
      return this.backgroundColor;
    }

    const intersection = this.add(
      origin,
      this.multiplyByScalar(viewportPoint, closestT)
    ) as Vector3;

    const negativeViewportPoint = this.multiplyByScalar(viewportPoint, -1);

    const color = this.multiplyByScalar(
      closestIntersection.color,
      this.computeLighting(
        intersection,
        closestNormal,
        negativeViewportPoint,
        closestIntersection.specular
      )
    );

    // recursion limit
    const r = closestIntersection.reflective;
    if (recursionDepth <= 0 || r <= 0) {
      return color;
    }

    const nextRay = this.reflectRay(negativeViewportPoint, closestNormal);
    const reflectedColor = this.traceRay(
      intersection,
      nextRay,
      0.001,
      Infinity,
      recursionDepth - 1
    );

    return this.add(
      this.multiplyByScalar(color, 1 - r),
      this.multiplyByScalar(reflectedColor, r)
    );
  }

  closestIntersection(
    origin: Vector3,
    viewportPoint: Vector3,
    tMin: number,
    tMax: number
  ): ClosestIntersection {
    let closestT = Infinity;
    let closestIntersection: Sphere | Triangle | null = null;
    let closestNormal: Vector3 | null = null;

    for (let sphere of this.scene.spheres) {
      // ray can intersect sphere in 0, 1 or 2 points P1 = (O + t1D), P2 = (O + t2D)
      const intersects = this.intersectRaySphere(origin, viewportPoint, sphere);
      for (let t of intersects) {
        if (t > tMin && t < tMax && t < closestT) {
          closestT = t;
          closestIntersection = sphere;

          const intersection = this.add(
            origin,
            this.multiplyByScalar(viewportPoint, closestT)
          ) as Vector3;

          const n = this.subtract(intersection, closestIntersection.C);
          closestNormal = this.multiplyByScalar(n, 1 / this.length(n));
        }
      }
    }

    for (let triangle of this.scene.triangles) {
      const [t, normal] = this.intersectRayTriangle(
        origin,
        viewportPoint,
        triangle
      );
      if (t != null && t > tMin && t < tMax && t < closestT) {
        closestT = t;
        closestIntersection = triangle;
        closestNormal = normal;
      }
    }
    return { closestIntersection, closestT, closestNormal };
  }

  intersectRaySphere(
    origin: Vector3,
    viewportPoint: Vector3,
    sphere: Sphere
  ): [number, number] {
    // solve quadratic equasion
    const co = origin.map((p, i) => p - sphere.C[i]) as Vector3;

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

  intersectRayTriangle(
    origin: Vector3,
    viewportPoint: Vector3,
    triangle: Triangle
  ): [number | null, Vector3 | null] {
    const cross = this.cross(
      this.subtract(triangle.b, triangle.a),
      this.subtract(triangle.c, triangle.a)
    );
    const normal = this.multiplyByScalar(cross, 1 / this.length(cross));

    const nDotD = this.dot(normal, viewportPoint);
    if (nDotD == 0) {
      return [null, null];
    }
    const AO = this.subtract(origin, triangle.a);
    const NDotPO = this.dot(normal, AO);

    const t = -1 * (NDotPO / nDotD);
    if (t < 0) {
      return [null, null];
    }

    const P = this.add(origin, this.multiplyByScalar(viewportPoint, t));

    const AB = this.subtract(triangle.b, triangle.a);
    const AC = this.subtract(triangle.c, triangle.a);
    const AP = this.subtract(P, triangle.a);


    // https://gamedev.stackexchange.com/a/23745
    const dotAB = this.dot(AB, AB);
    const dotABAC = this.dot(AB, AC);
    const dotAC = this.dot(AC, AC);
    const dotAPAB = this.dot(AP, AB);
    const dotAPAC = this.dot(AP, AC);
    const denom = dotAB * dotAC - dotABAC * dotABAC;
    const alpha = (dotAC * dotAPAB - dotABAC * dotAPAC) / denom;
    const beta = (dotAB * dotAPAC - dotABAC * dotAPAB) / denom;
    const gamma = 1 - alpha - beta;

    if (alpha < 0 || alpha > 1) {
      return [null, null];
    }

    if (beta < 0 || beta > 1) {
      return [null, null];
    }

    if (gamma < 0 || gamma > 1) {
      return [null, null];
    }

    return [t, normal];
  }

  computeLighting(point: Vector3, normal: Vector3, v: Vector3, s: number) {
    let i = 0.0; // base intensity

    for (let light of this.scene.lights) {
      if (light.type == "ambient") {
        i += light.intensity;
        continue;
      }

      // light direction
      let L: Vector3;
      let [tMin, tMax] = [0.001, 1];
      if (light.type == "point") {
        // vector from point to light position
        L = this.subtract(light.position, point);
      } else {
        // simply light direction
        L = light.direction;
        tMax = Infinity;
      }

      // shadow
      const { closestIntersection } = this.closestIntersection(
        point,
        L as Vector3,
        tMin,
        tMax
      );

      if (closestIntersection != null) {
        continue;
      }

      const nDotL = this.dot(normal, L);
      if (nDotL > 0) {
        // intensity of diffused light depends on the angle
        i += (light.intensity * nDotL) / (this.length(normal) * this.length(L));
      }

      if (s != -1) {
        const R = this.reflectRay(L, normal);
        const rDotV = this.dot(R, v);
        if (rDotV > 0) {
          i +=
            light.intensity *
            Math.pow(rDotV / (this.length(R) * this.length(v)), s);
        }
      }
    }

    return i;
  }

  private reflectRay(ray: Vector3, normal: Vector3) {
    const nDotR = this.dot(normal, ray);
    return this.subtract(this.multiplyByScalar(normal, 2 * nDotR), ray);
  }

  dot(v1: Vector3, v2: Vector3): number {
    if (v1.length != v2.length) {
      throw new Error("[dot]: vectors have different length");
    }
    return v1.map((p, i) => p * v2[i]).reduce((acc, v) => acc + v, 0);
  }

  cross(v1: Vector3, v2: Vector3): Vector3 {
    if (v1.length != v2.length) {
      throw new Error("[cross]: vectors have different length");
    }

    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0],
    ];
  }

  add(v1: Vector3, v2: Vector3): Vector3 {
    if (v1.length != v2.length) {
      throw new Error("[add]: vectors have different length");
    }
    return v1.map((p, i) => p + v2[i]) as Vector3;
  }

  subtract(v1: Vector3, v2: Vector3): Vector3 {
    if (v1.length != v2.length) {
      throw new Error("[subtract]: vectors have different length");
    }
    return v1.map((p, i) => p - v2[i]) as Vector3;
  }

  subtractScalar(v1: Vector3, a: number) {
    return v1.map((p) => p - a);
  }

  multiplyByScalar(v1: Vector3, a: number): Vector3 {
    return v1.map((p) => p * a) as Vector3;
  }

  length(v1: Vector3): number {
    return Math.sqrt(v1.reduce((acc, v) => acc + v * v, 0));
  }

  putPixel(cx: number, cy: number, [R, G, B]: RGB) {
    const sx = this.canvas.width / 2 + cx;
    const sy = this.canvas.height / 2 - cy;

    const index = 4 * (sy * this.canvas.width + sx);

    this.imageData.data[index + 0] = Math.min(R, 255);
    this.imageData.data[index + 1] = Math.min(G, 255);
    this.imageData.data[index + 2] = Math.min(B, 255);
    this.imageData.data[index + 3] = 255;
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
