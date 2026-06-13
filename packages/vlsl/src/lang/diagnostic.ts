export const DiagnosticSeverity = Object.freeze({
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
} as const);

export type DiagnosticSeverityValue = typeof DiagnosticSeverity[keyof typeof DiagnosticSeverity];

export class Diagnostic {
  severity: DiagnosticSeverityValue;
  message: string;
  line: number;
  column: number;
  filename: string | null;

  constructor(severity: DiagnosticSeverityValue, message: string, line: number, column: number, filename?: string | null) {
    this.severity = severity;
    this.message = message;
    this.line = line;
    this.column = column;
    this.filename = filename ?? null;
  }

  static error(message: string, line: number, column: number, filename?: string | null): Diagnostic {
    return new Diagnostic(DiagnosticSeverity.Error, message, line, column, filename);
  }

  static warning(message: string, line: number, column: number, filename?: string | null): Diagnostic {
    return new Diagnostic(DiagnosticSeverity.Warning, message, line, column, filename);
  }

  toString(): string {
    const loc = this.filename
      ? `${this.filename}:${this.line}:${this.column}`
      : `${this.line}:${this.column}`;
    return `${loc}: ${this.severity}: ${this.message}`;
  }
}
