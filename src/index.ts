import { Chart as ChartJS, ChartConfiguration } from "chart.js";
import { createCanvas, Image } from "@napi-rs/canvas";
import { Canvas } from "@napi-rs/canvas";

export type MimeType = "image/png" | "image/jpeg";

export interface ChartJSNodeCanvasOptions {
  width: number;
  height: number;
  chartCallback?: (chartJS: typeof ChartJS) => void | Promise<void>;
}

export class ChartJSNodeCanvas {
  #chartJs!: typeof ChartJS;

  public constructor(public options: ChartJSNodeCanvasOptions) {}

  public renderToBuffer(
    configuration: ChartConfiguration,
    mimeType: MimeType = "image/png"
  ): Promise<Buffer> {
    const chart = this.renderChart(configuration);
    return new Promise<Buffer>((resolve, reject) => {
      if (!chart.canvas) {
        reject(new Error("Canvas is null"));
      }
      // @ts-expect-error
      const canvas = chart.canvas as Canvas;
      // @ts-expect-error
      const buf = canvas.toBuffer(mimeType);
      chart.destroy();
      resolve(buf);
    });
  }

  public async initialize(
    options: ChartJSNodeCanvasOptions
  ): Promise<typeof ChartJS> {
    const chartJs = (await import("chart.js")).default.Chart;
    this.#chartJs = chartJs;

    if (options.chartCallback) {
      options.chartCallback(chartJs);
    }

    return chartJs;
  }

  private renderChart(configuration: ChartConfiguration): ChartJS {
    const canvas = createCanvas(this.options.width, this.options.height);
    (canvas as any).style ||= {};

    // Disable animation (otherwise charts will throw exceptions)
    configuration.options ||= {};
    configuration.options.responsive = false;
    configuration.options.animation = false;

    const context = canvas.getContext("2d");

    (global as any).Image = Image; // Some plugins use this API

    // @ts-expect-error
    const chart = new this.#chartJs(context, configuration);

    // De-pollute global
    delete (global as any).Image;

    return chart;
  }
}
