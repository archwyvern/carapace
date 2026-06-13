import { Resource } from "../Resource";

/** Abstract base class for noise resources. */
export abstract class Noise extends Resource {}

export class FastNoiseLite extends Noise {
  readonly noiseType = this.prop.enum("NoiseType", "Simplex",
    ["Simplex", "SimplexSmooth", "Cellular", "Perlin", "ValueCubic", "Value"]);
  readonly seed = this.prop.int("Seed", 0);
  readonly frequency = this.prop.float("Frequency", 0.01, { min: 0, step: 0.001 });
  readonly offset = this.prop.vector3("Offset", 0, 0, 0);

  readonly fractalType = this.prop.enum("FractalType", "Fbm",
    ["None", "Fbm", "Ridged", "PingPong"]);
  readonly fractalOctaves = this.prop.int("FractalOctaves", 5, { min: 1, max: 10 });
  readonly fractalLacunarity = this.prop.float("FractalLacunarity", 2.0);
  readonly fractalGain = this.prop.float("FractalGain", 0.5, { min: 0, max: 1, step: 0.01 });
  readonly fractalWeightedStrength = this.prop.float("FractalWeightedStrength", 0.0);
  readonly fractalPingPongJitter = this.prop.float("FractalPingPongJitter", 2.0);

  readonly cellularDistanceFunction = this.prop.enum("CellularDistanceFunction", "Euclidean",
    ["Euclidean", "EuclideanSquared", "Manhattan", "Hybrid"]);
  readonly cellularJitter = this.prop.float("CellularJitter", 1.0, { min: 0, max: 1, step: 0.01 });
  readonly cellularReturnType = this.prop.enum("CellularReturnType", "Distance",
    ["CellValue", "Distance", "Distance2", "Distance2Add", "Distance2Sub", "Distance2Mul", "Distance2Div"]);

  readonly domainWarpEnabled = this.prop.bool("DomainWarpEnabled", false);
  readonly domainWarpType = this.prop.enum("DomainWarpType", "Simplex",
    ["Simplex", "SimplexReduced", "BasicGrid"]);
  readonly domainWarpAmplitude = this.prop.float("DomainWarpAmplitude", 30.0);
  readonly domainWarpFrequency = this.prop.float("DomainWarpFrequency", 0.05);
  readonly domainWarpFractalType = this.prop.enum("DomainWarpFractalType", "None",
    ["None", "Progressive", "Independent"]);
  readonly domainWarpFractalOctaves = this.prop.int("DomainWarpFractalOctaves", 5, { min: 1, max: 10 });
  readonly domainWarpFractalLacunarity = this.prop.float("DomainWarpFractalLacunarity", 6.0);
  readonly domainWarpFractalGain = this.prop.float("DomainWarpFractalGain", 0.5, { min: 0, max: 1, step: 0.01 });

  override groups() {
    return [
      {
        name: "Fractal",
        fields: [
          "FractalType", "FractalOctaves", "FractalLacunarity", "FractalGain",
          "FractalWeightedStrength", "FractalPingPongJitter",
        ],
      },
      {
        name: "Cellular",
        fields: ["CellularDistanceFunction", "CellularJitter", "CellularReturnType"],
      },
      {
        name: "Domain Warp",
        enabledBy: "DomainWarpEnabled",
        fields: [
          "DomainWarpType", "DomainWarpAmplitude", "DomainWarpFrequency",
          "DomainWarpFractalType", "DomainWarpFractalOctaves",
          "DomainWarpFractalLacunarity", "DomainWarpFractalGain",
        ],
      },
    ];
  }

  override visibility(): Record<string, boolean> {
    const fractal = this.fractalType.get() !== "None";
    const pingPong = this.fractalType.get() === "PingPong";
    const cellular = this.noiseType.get() === "Cellular";
    return {
      FractalOctaves: fractal,
      FractalLacunarity: fractal,
      FractalGain: fractal,
      FractalWeightedStrength: fractal,
      FractalPingPongJitter: pingPong,
      CellularDistanceFunction: cellular,
      CellularJitter: cellular,
      CellularReturnType: cellular,
    };
  }
}
