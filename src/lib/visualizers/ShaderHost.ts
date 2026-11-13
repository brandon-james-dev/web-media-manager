import {
  ANALYSIS_FFT_SIZE,
  type AnalysisFrame,
} from "@/core/visualizers";
import {
  VisualizerRuntimeError,
  type RuntimeHostContext,
  type VisualizerRuntimeHost,
} from "./VisualizerRuntimeHost";

/**
 * ShaderHost — compiles a plugin's GLSL fragment shader and renders it to a
 * full-screen quad, injecting the audio analysis as uniforms.
 *
 * Uniforms available to a plugin (all optional; unused ones are skipped):
 *   uTime        seconds since the plugin mounted
 *   uResolution  drawing-buffer size in device pixels
 *   uBass        normalized 0..1
 *   uMid         normalized 0..1
 *   uTreble      normalized 0..1
 *   uVolume      normalized 0..1
 *   uFFT[256]    normalized spectrum, low to high
 *   uWaveform[256] time-domain samples, -1..1
 */
const DEFAULT_VERTEX_SHADER = `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

type GlContext = WebGLRenderingContext | WebGL2RenderingContext;

export class ShaderHost implements VisualizerRuntimeHost {
  private readonly context: RuntimeHostContext;
  private readonly canvas: HTMLCanvasElement;
  private gl: GlContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private readonly uniforms = new Map<
    string,
    WebGLUniformLocation | null
  >();
  private readonly fft = new Float32Array(ANALYSIS_FFT_SIZE);
  private readonly waveform = new Float32Array(ANALYSIS_FFT_SIZE);
  private startedAt = 0;
  private disposed = false;

  private readonly handleContextLost = (event: Event) => {
    // Preventing the default lets the browser restore the context later.
    event.preventDefault();
    this.gl = null;
    this.program = null;
    this.buffer = null;
    this.uniforms.clear();
  };

  private readonly handleContextRestored = () => {
    if (this.disposed) {
      return;
    }
    try {
      this.setup();
    } catch (error) {
      this.context.api.log("WebGL context restore failed:", error);
    }
  };

  constructor(context: RuntimeHostContext) {
    this.context = context;
    this.canvas = context.canvas;
  }

  async mount(): Promise<void> {
    this.startedAt = performance.now();
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.addEventListener(
      "webglcontextrestored",
      this.handleContextRestored
    );
    this.setup();
  }

  render(frame: AnalysisFrame): void {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program || this.disposed) {
      return;
    }

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    this.setFloat(gl, "uTime", (performance.now() - this.startedAt) / 1000);
    this.setVec2(
      gl,
      "uResolution",
      gl.drawingBufferWidth,
      gl.drawingBufferHeight
    );
    this.setFloat(gl, "uBass", frame.bass);
    this.setFloat(gl, "uMid", frame.mid);
    this.setFloat(gl, "uTreble", frame.treble);
    this.setFloat(gl, "uVolume", frame.volume);
    this.setFloatArray(gl, "uFFT", frame.spectrum, this.fft);
    this.setFloatArray(gl, "uWaveform", frame.waveform, this.waveform);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const nextWidth = Math.max(1, Math.round(width * pixelRatio));
    const nextHeight = Math.max(1, Math.round(height * pixelRatio));
    if (this.canvas.width !== nextWidth) {
      this.canvas.width = nextWidth;
    }
    if (this.canvas.height !== nextHeight) {
      this.canvas.height = nextHeight;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.handleContextRestored
    );

    const gl = this.gl;
    if (gl) {
      if (this.program) {
        gl.deleteProgram(this.program);
      }
      if (this.buffer) {
        gl.deleteBuffer(this.buffer);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }

    this.gl = null;
    this.program = null;
    this.buffer = null;
    this.uniforms.clear();
  }

  private setup(): void {
    const gl = this.createContext();
    this.gl = gl;

    const program = this.compileProgram(gl);
    this.program = program;
    this.uniforms.clear();

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new VisualizerRuntimeError(
        "webgl-shader",
        "The WebGL context could not allocate a vertex buffer."
      );
    }
    this.buffer = buffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "aPosition");
    if (position >= 0) {
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);
  }

  private createContext(): GlContext {
    const gl =
      this.canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      }) ??
      this.canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
      });

    if (!gl) {
      throw new VisualizerRuntimeError(
        "webgl-shader",
        "WebGL is not available in this browser."
      );
    }

    return gl;
  }

  private compileProgram(gl: GlContext): WebGLProgram {
    const vertex = this.compileShader(
      gl,
      gl.VERTEX_SHADER,
      this.context.vertexSource ?? DEFAULT_VERTEX_SHADER,
      "vertex"
    );
    const fragment = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      this.context.entrySource,
      "fragment"
    );

    const program = gl.createProgram();
    if (!program) {
      throw new VisualizerRuntimeError(
        "webgl-shader",
        "The WebGL context could not allocate a program."
      );
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? "unknown link error";
      gl.deleteProgram(program);
      throw new VisualizerRuntimeError(
        "webgl-shader",
        `The shader program failed to link: ${log}`
      );
    }

    return program;
  }

  private compileShader(
    gl: GlContext,
    type: number,
    source: string,
    label: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new VisualizerRuntimeError(
        "webgl-shader",
        `The WebGL context could not allocate the ${label} shader.`
      );
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? "unknown compile error";
      gl.deleteShader(shader);
      throw new VisualizerRuntimeError(
        "webgl-shader",
        `The ${label} shader failed to compile: ${log}`
      );
    }

    return shader;
  }

  private location(
    gl: GlContext,
    name: string
  ): WebGLUniformLocation | null {
    if (!this.uniforms.has(name)) {
      this.uniforms.set(
        name,
        this.program ? gl.getUniformLocation(this.program, name) : null
      );
    }
    return this.uniforms.get(name) ?? null;
  }

  private setFloat(gl: GlContext, name: string, value: number): void {
    const location = this.location(gl, name);
    if (location) {
      gl.uniform1f(location, value);
    }
  }

  private setVec2(
    gl: GlContext,
    name: string,
    x: number,
    y: number
  ): void {
    const location = this.location(gl, name);
    if (location) {
      gl.uniform2f(location, x, y);
    }
  }

  private setFloatArray(
    gl: GlContext,
    name: string,
    source: Float32Array,
    scratch: Float32Array
  ): void {
    const location = this.location(gl, name);
    if (!location) {
      return;
    }

    const length = Math.min(scratch.length, source.length);
    scratch.set(source.subarray(0, length));
    scratch.fill(0, length);
    gl.uniform1fv(location, scratch);
  }
}
