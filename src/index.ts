import { Readable } from 'stream';
import {
	Chart as ChartJS,
	ChartConfiguration,
	ChartComponentLike,
} from 'chart.js';
import { createCanvas, GlobalFonts, Image } from '@napi-rs/canvas';
import { BackgroundColourPlugin } from './backgroundColourPlugin.js';
import { Canvas } from '@napi-rs/canvas';

export type ChartJSNodeCanvasPlugins = {
	/**
	 * Global plugins, see https://www.chartjs.org/docs/latest/developers/plugins.html.
	 */
	readonly modern?: ReadonlyArray<string | ChartComponentLike>;
	/**
	 * This will work for plugins that `require` ChartJS themselves.
	 */
	readonly requireChartJSLegacy?: ReadonlyArray<string>;
	/**
	 * This should work for any plugin that expects a global Chart variable.
	 */
	readonly globalVariableLegacy?: ReadonlyArray<string>;
	/**
	 * This will work with plugins that just return a plugin object and do no specific loading themselves.
	 */
	readonly requireLegacy?: ReadonlyArray<string>;
};
export type ChartCallback = (chartJS: typeof ChartJS) => void | Promise<void>;
export type CanvasType = 'pdf' | 'svg';
export type MimeType = 'image/png' | 'image/jpeg';

export interface ChartJSNodeCanvasOptions {
	/**
	 * The width of the charts to render, in pixels.
	 */
	readonly width: number;
	/**
	 * The height of the charts to render, in pixels.
	 */
	readonly height: number;
	/**
	 * Optional callback which is called once with a new ChartJS global reference as the only parameter.
	 */
	readonly chartCallback?: ChartCallback;
	/**
	 * Optional canvas type ('PDF' or 'SVG'), see the [canvas pdf doc](https://github.com/Automattic/node-canvas#pdf-output-support).
	 */
	readonly type?: CanvasType;
	/**
	 * Optional plugins to register.
	 */
	readonly plugins?: ChartJSNodeCanvasPlugins;

	/**
	 * Optional background color for the chart, otherwise it will be transparent. Note, this will apply to all charts. See the [fillStyle](https://www.w3schools.com/tags/canvas_fillstyle.asp) canvas API used for possible values.
	 */
	readonly backgroundColour?: string;
}

export class ChartJSNodeCanvas {
	private readonly _width: number;
	private readonly _height: number;
	private _chartJs!: typeof ChartJS;
	private readonly _createCanvas: typeof createCanvas;
	private readonly _image: typeof Image;

	/**
	 * Create a new instance of CanvasRenderService.
	 *
	 * @param options Configuration for this instance
	 */
	constructor(public options: ChartJSNodeCanvasOptions) {
		if (options === null || typeof options !== 'object') {
			throw new Error('An options parameter object is required');
		}
		if (!options.width || typeof options.width !== 'number') {
			throw new Error('A width option is required');
		}
		if (!options.height || typeof options.height !== 'number') {
			throw new Error('A height option is required');
		}

		this._width = options.width;
		this._height = options.height;
		this._createCanvas = createCanvas;
		this._image = Image;
	}

	/**
	 * Render to a data url.
	 * @see https://github.com/Automattic/node-canvas#canvastodataurl
	 *
	 * @param configuration The Chart JS configuration for the chart to render.
	 * @param mimeType The image format, `image/png` or `image/jpeg`.
	 */
	public renderToDataURL(
		configuration: ChartConfiguration,
		mimeType: MimeType = 'image/png'
	): Promise<string> {
		const chart = this.renderChart(configuration);
		return new Promise<string>((resolve, reject) => {
			if (!chart.canvas) {
				return reject(new Error('Canvas is null'));
			}
			const dataURL = chart.canvas.toDataURL(mimeType);
			chart.destroy();
			resolve(dataURL);
		});
	}

	/**
	 * Render to a data url synchronously.
	 * @see https://github.com/Automattic/node-canvas#canvastodataurl
	 *
	 * @param configuration The Chart JS configuration for the chart to render.
	 * @param mimeType The image format, `image/png` or `image/jpeg`.
	 */
	public renderToDataURLSync(
		configuration: ChartConfiguration,
		mimeType: MimeType = 'image/png'
	): string {
		const chart = this.renderChart(configuration);
		if (!chart.canvas) {
			throw new Error('Canvas is null');
		}
		// @ts-expect-error
		const canvas = chart.canvas as Canvas;
		const dataUrl = canvas.toDataURL(mimeType);
		chart.destroy();
		return dataUrl;
	}

	/**
	 * Render to a buffer.
	 * @see https://github.com/Automattic/node-canvas#canvastobuffer
	 *
	 * @param configuration The Chart JS configuration for the chart to render.
	 * @param mimeType A string indicating the image format. Valid options are `image/png`, `image/jpeg` (if node-canvas was built with JPEG support) or `raw` (unencoded ARGB32 data in native-endian byte order, top-to-bottom). Defaults to `image/png` for image canvases, or the corresponding type for PDF or SVG canvas.
	 */
	public renderToBuffer(
		configuration: ChartConfiguration,
		mimeType: MimeType = 'image/png'
	): Promise<Buffer> {
		const chart = this.renderChart(configuration);
		return new Promise<Buffer>((resolve, reject) => {
			if (!chart.canvas) {
				reject(new Error('Canvas is null'));
			}
			// @ts-expect-error
			const canvas = chart.canvas as Canvas;
			// @ts-expect-error
			const buf = canvas.toBuffer(mimeType);
			chart.destroy();
			resolve(buf);
		});
	}

	/**
	 * Render to a buffer synchronously.
	 * @see https://github.com/Automattic/node-canvas#canvastobuffer
	 *
	 * @param configuration The Chart JS configuration for the chart to render.
	 * @param mimeType A string indicating the image format. Valid options are `image/png`, `image/jpeg` (if node-canvas was built with JPEG support), `raw` (unencoded ARGB32 data in native-endian byte order, top-to-bottom), `application/pdf` (for PDF canvases) and image/svg+xml (for SVG canvases). Defaults to `image/png` for image canvases, or the corresponding type for PDF or SVG canvas.
	 */
	public renderToBufferSync(
		configuration: ChartConfiguration,
		mimeType: MimeType = 'image/png'
	): Buffer {
		const chart = this.renderChart(configuration);
		if (!chart.canvas) {
			throw new Error('Canvas is null');
		}
		// @ts-expect-error
		const canvas = chart.canvas as Canvas;
		// @ts-expect-error
		const buffer = canvas.toBuffer(mimeType);
		chart.destroy();
		return buffer;
	}

	/**
	 * THIS DOES NOT WORK.
	 *
	 * Render to a stream.
	 * @see https://github.com/Automattic/node-canvas#canvascreatepngstream
	 *
	 * @param configuration The Chart JS configuration for the chart to render.
	 * @param mimeType A string indicating the image format. Valid options are `image/png`, `image/jpeg` (if node-canvas was built with JPEG support), `application/pdf` (for PDF canvases) and image/svg+xml (for SVG canvases). Defaults to `image/png` for image canvases, or the corresponding type for PDF or SVG canvas.
	 */
	public renderToStream(
		configuration: ChartConfiguration,
		mimeType: MimeType = 'image/png'
	): Readable {
		const chart = this.renderChart(configuration);
		if (!chart.canvas) {
			throw new Error('Canvas is null');
		}
		// @ts-expect-error
		const canvas = chart.canvas as Canvas;
		setImmediate(() => chart.destroy());
		switch (mimeType) {
			case 'image/png':
				// @ts-expect-error
				return canvas.createPNGStream();
			case 'image/jpeg':
				// @ts-expect-error
				return canvas.createJPEGStream();
			default:
				throw new Error(`Un-handled mimeType: ${mimeType}`);
		}
	}

	public async initialize(
		options: ChartJSNodeCanvasOptions
	): Promise<typeof ChartJS> {
		const chartJs = (await import('chart.js')).default.Chart;
		this._chartJs = chartJs;

		if (options.plugins?.requireChartJSLegacy) {
			for (const plugin of options.plugins.requireChartJSLegacy) {
				await import(plugin);
			}
		}

		if (options.plugins?.globalVariableLegacy) {
			(global as any).Chart = chartJs;
			for (const plugin of options.plugins.globalVariableLegacy) {
				await import(plugin);
			}
			delete (global as any).Chart;
		}

		if (options.plugins?.modern) {
			for (const plugin of options.plugins.modern) {
				if (typeof plugin === 'string') {
					const mod = await import(plugin);
					chartJs.register(mod.default ?? mod);
				} else {
					chartJs.register(plugin);
				}
			}
		}

		if (options.plugins?.requireLegacy) {
			for (const plugin of options.plugins.requireLegacy) {
				const mod = await import(plugin);
				chartJs.register(mod.default ?? mod);
			}
		}

		if (options.chartCallback) {
			options.chartCallback(chartJs);
		}

		if (options.backgroundColour) {
			chartJs.register(
				new BackgroundColourPlugin(
					options.width,
					options.height,
					options.backgroundColour
				)
			);
		}

		return chartJs;
	}

	private renderChart(configuration: ChartConfiguration): ChartJS {
		const canvas = this._createCanvas(this._width, this._height);
		(canvas as any).style ||= {};
		// Disable animation (otherwise charts will throw exceptions)
		configuration.options ||= {};
		configuration.options.responsive = false;
		configuration.options.animation = false;
		const context = canvas.getContext('2d');
		(global as any).Image = this._image; // Some plugins use this API
		// @ts-expect-error
		const chart = new this._chartJs(context, configuration);
		delete (global as any).Image;
		return chart;
	}
}
