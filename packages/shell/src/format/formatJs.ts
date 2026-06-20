import * as prettier from "prettier/standalone";
import babel from "prettier/plugins/babel";
import estree from "prettier/plugins/estree";

export interface FormatOptions {
  printWidth?: number;
  semi?: boolean;
  singleQuote?: boolean;
  tabWidth?: number;
}

/**
 * Format JavaScript/JSON source with Prettier (browser-safe standalone build, no
 * filesystem or config lookup). Rejects if the source has a syntax error — callers
 * that format-on-save should catch and keep the original text.
 */
export async function formatJs(source: string, options: FormatOptions = {}): Promise<string> {
  return prettier.format(source, {
    parser: "babel",
    plugins: [babel, estree],
    printWidth: options.printWidth ?? 100,
    semi: options.semi ?? true,
    singleQuote: options.singleQuote ?? false,
    tabWidth: options.tabWidth ?? 2,
  });
}
