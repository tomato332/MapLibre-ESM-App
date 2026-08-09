import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getJindoFromColor, getIntensityColor } from '../utils/jma.utils';

export interface AreaMaskResult {
  code: string;
  name: string;
  maxJindo: number;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class EstShindoMaskService {
  private http = inject(HttpClient);

  private areaForecastGeoJSON: any = null;
  private pointsData: any[] = [];
  private lut: Map<string, Array<{ x: number; y: number }>> = new Map();
  private isInitialized = false;

  // Polynomial regression coefficients for (lon, lat) -> (px, py)
  // x = a0 + a1*lon + a2*lat + a3*lon*lat + a4*lon^2 + a5*lat^2
  // y = b0 + b1*lon + b2*lat + b3*lon*lat + b4*lon^2 + b5*lat^2
  private coeffX: number[] = [];
  private coeffY: number[] = [];

  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Fetch Area Forecast GeoJSON & Intensity Points
      const [geoJson, points] = await Promise.all([
        this.http.get<any>('/area_forecast.json').toPromise(),
        this.http.get<any[]>('/intensity-points-v1.json').toPromise()
      ]);

      this.areaForecastGeoJSON = geoJson;
      this.pointsData = points || [];

      // 2. Train 2D Polynomial Regression model using valid station points
      this.trainProjectionModel();

      // 3. Build Lookup Table for area forecast polygons
      this.buildLUT();

      // 4. Offscreen canvas for GIF pixel parsing
      if (typeof document !== 'undefined') {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = 352;
        this.offscreenCanvas.height = 400;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      }

      this.isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize EstShindoMaskService:', err);
    }
  }

  /**
   * Train a 2nd-degree 2D Polynomial model mapping (lon, lat) to (px, py) on 352x400 image.
   */
  private trainProjectionModel(): void {
    const validPoints = this.pointsData.filter(
      p => p.Location && p.Point && typeof p.Point.x === 'number' && typeof p.Point.y === 'number'
    );

    if (validPoints.length < 10) return;

    // Build design matrix X and response vectors Y_x, Y_y
    // Basis terms: [1, lon, lat, lon*lat, lon^2, lat^2]
    const n = validPoints.length;
    const m = 6;

    const A: number[][] = [];
    const Yx: number[] = [];
    const Yy: number[] = [];

    for (let i = 0; i < n; i++) {
      const lon = validPoints[i].Location.longitude;
      const lat = validPoints[i].Location.latitude;
      const px = validPoints[i].Point.x;
      const py = validPoints[i].Point.y;

      A.push([1, lon, lat, lon * lat, lon * lon, lat * lat]);
      Yx.push(px);
      Yy.push(py);
    }

    // Solve Normal Equation (A^T * A) * Coeff = A^T * Y
    this.coeffX = this.solveLeastSquares(A, Yx, m);
    this.coeffY = this.solveLeastSquares(A, Yy, m);
  }

  private solveLeastSquares(A: number[][], Y: number[], m: number): number[] {
    const n = A.length;
    const ATA: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    const ATY: number[] = new Array(m).fill(0);

    for (let i = 0; i < n; i++) {
      for (let r = 0; r < m; r++) {
        ATY[r] += A[i][r] * Y[i];
        for (let c = 0; c < m; c++) {
          ATA[r][c] += A[i][r] * A[i][c];
        }
      }
    }

    // Gaussian Elimination with Partial Pivoting
    for (let i = 0; i < m; i++) {
      let maxRow = i;
      for (let k = i + 1; k < m; k++) {
        if (Math.abs(ATA[k][i]) > Math.abs(ATA[maxRow][i])) maxRow = k;
      }

      // Swap rows
      const tmpRow = ATA[i];
      ATA[i] = ATA[maxRow];
      ATA[maxRow] = tmpRow;

      const tmpY = ATY[i];
      ATY[i] = ATY[maxRow];
      ATY[maxRow] = tmpY;

      if (Math.abs(ATA[i][i]) < 1e-12) continue;

      for (let k = i + 1; k < m; k++) {
        const factor = ATA[k][i] / ATA[i][i];
        ATY[k] -= factor * ATY[i];
        for (let j = i; j < m; j++) {
          ATA[k][j] -= factor * ATA[i][j];
        }
      }
    }

    // Back substitution
    const Coeff = new Array(m).fill(0);
    for (let i = m - 1; i >= 0; i--) {
      let sum = ATY[i];
      for (let j = i + 1; j < m; j++) {
        sum -= ATA[i][j] * Coeff[j];
      }
      Coeff[i] = sum / ATA[i][i];
    }

    return Coeff;
  }

  /**
   * Convert longitude and latitude to kmoni 352x400 pixel (x, y)
   */
  public lonLatToPixel(lon: number, lat: number): { x: number; y: number } | null {
    if (this.coeffX.length < 6 || this.coeffY.length < 6) return null;

    const terms = [1, lon, lat, lon * lat, lon * lon, lat * lat];
    let px = 0;
    let py = 0;

    for (let i = 0; i < 6; i++) {
      px += this.coeffX[i] * terms[i];
      py += this.coeffY[i] * terms[i];
    }

    const rx = Math.round(px);
    const ry = Math.round(py);

    if (rx < 0 || rx >= 352 || ry < 0 || ry >= 400) return null;
    return { x: rx, y: ry };
  }

  /**
   * Build pixel sample Lookup Table for each area forecast polygon.
   */
  private buildLUT(): void {
    if (!this.areaForecastGeoJSON || !this.areaForecastGeoJSON.features) return;

    for (const feature of this.areaForecastGeoJSON.features) {
      const code = feature.properties?.code;
      if (!code) continue;

      const pixels: { x: number; y: number }[] = [];
      const pixelSet = new Set<string>();

      const addPixel = (lon: number, lat: number) => {
        const p = this.lonLatToPixel(lon, lat);
        if (p) {
          const key = `${p.x},${p.y}`;
          if (!pixelSet.has(key)) {
            pixelSet.add(key);
            pixels.push(p);
          }
        }
      };

      const processCoordinates = (coords: any) => {
        if (!Array.isArray(coords) || coords.length === 0) return;

        if (typeof coords[0] === 'number') {
          // [lon, lat]
          addPixel(coords[0], coords[1]);
          return;
        }

        // Polygon ring or MultiPolygon
        let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;

        for (const pt of coords) {
          if (Array.isArray(pt) && typeof pt[0] === 'number') {
            const lon = pt[0];
            const lat = pt[1];
            addPixel(lon, lat);

            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
          } else if (Array.isArray(pt)) {
            processCoordinates(pt);
          }
        }

        // Grid sampling inside bounding box if bbox is valid
        if (minLon < maxLon && minLat < maxLat) {
          const lonStep = Math.max(0.04, (maxLon - minLon) / 5);
          const latStep = Math.max(0.04, (maxLat - minLat) / 5);

          for (let lon = minLon; lon <= maxLon; lon += lonStep) {
            for (let lat = minLat; lat <= maxLat; lat += latStep) {
              addPixel(lon, lat);
            }
          }
        }
      };

      if (feature.geometry && feature.geometry.coordinates) {
        processCoordinates(feature.geometry.coordinates);
      }

      this.lut.set(code, pixels);
    }
  }

  /**
   * Process EstShindoImg GIF from canvas and compute area-wise maximum expected intensity.
   */
  async processEstShindoGif(gifUrl: string): Promise<Map<string, { maxJindo: number; color: string }>> {
    const resultMap = new Map<string, { maxJindo: number; color: string }>();

    if (!this.isInitialized) {
      await this.init();
    }

    if (!this.offscreenCtx || !gifUrl) return resultMap;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          this.offscreenCtx!.clearRect(0, 0, 352, 400);
          this.offscreenCtx!.drawImage(img, 0, 0, 352, 400);

          const imgData = this.offscreenCtx!.getImageData(0, 0, 352, 400);
          const data = imgData.data; // Uint8ClampedArray 352x400x4

          // Iterate over LUT for each area
          for (const [code, pixels] of this.lut.entries()) {
            let maxJindo = -3;

            for (const p of pixels) {
              const idx = (p.y * 352 + p.x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a < 10) continue;

              const jindo = getJindoFromColor(r, g, b);
              if (jindo > maxJindo) {
                maxJindo = jindo;
              }
            }

            // Map numeric jindo to scale & color
            let scale = 0;
            if (maxJindo >= 6.5) scale = 60;
            else if (maxJindo >= 6.0) scale = 55;
            else if (maxJindo >= 5.5) scale = 50;
            else if (maxJindo >= 5.0) scale = 46;
            else if (maxJindo >= 4.5) scale = 45;
            else if (maxJindo >= 3.5) scale = 40;
            else if (maxJindo >= 2.5) scale = 30;
            else if (maxJindo >= 1.5) scale = 20;
            else if (maxJindo >= 0.5) scale = 10;

            const color = scale > 0 ? getIntensityColor(scale) : 'transparent';
            resultMap.set(code, { maxJindo, color });
          }

          resolve(resultMap);
        } catch (err) {
          console.error('Error parsing EstShindo GIF pixels:', err);
          resolve(resultMap);
        }
      };

      img.onerror = () => {
        resolve(resultMap);
      };

      img.src = gifUrl;
    });
  }

  /**
   * Returns updated GeoJSON for Mapbox layer with experimental EstShindo area masking.
   */
  async getMaskedGeoJSON(gifUrl: string): Promise<any> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (!this.areaForecastGeoJSON) return null;

    const areaIntensityMap = await this.processEstShindoGif(gifUrl);

    // Deep clone base GeoJSON structure
    const maskedGeoJSON = {
      type: 'FeatureCollection',
      features: this.areaForecastGeoJSON.features.map((feature: any) => {
        const code = feature.properties?.code;
        const info = areaIntensityMap.get(code);

        const color = info && info.color !== 'transparent' ? info.color : 'transparent';
        let opacity = 0.0;

        if (info && info.color !== 'transparent') {
          const mj = info.maxJindo;
          if (mj >= 6.5) opacity = 0.95;       // 진도 7
          else if (mj >= 5.5) opacity = 0.90;  // 진도 6약, 6강
          else if (mj >= 4.5) opacity = 0.85;  // 진도 5약, 5강
          else if (mj >= 3.5) opacity = 0.75;  // 진도 4
          else if (mj >= 2.5) opacity = 0.60;  // 진도 3
          else if (mj >= 1.5) opacity = 0.45;  // 진도 2
          else if (mj >= 0.5) opacity = 0.30;  // 진도 1
          else opacity = 0.20;
        }

        return {
          ...feature,
          properties: {
            ...feature.properties,
            color,
            opacity,
            maxJindo: info ? info.maxJindo : -3
          }
        };
      })
    };

    return maskedGeoJSON;
  }
}
