
export class Indenter {

    private readonly char: string;
    private readonly increment: number;
    private readonly depth: number;
    private readonly baseIndentation: string;

    constructor(char: string, increment: number, depth: number, baseIndentation: string) {
        this.char = char;
        this.increment = increment;
        this.depth = depth;
        this.baseIndentation = baseIndentation;
    }

    alignIndentation(source: string) {
        let output = '';
        let i  = 0;
        let depth = this.depth;
        
        while (i < source.length) {
            output += source[i];

            if (source[i] == '\n') {
                const j = this.skipWhitespaces(source, i + 1);
                let shift = 0;
                if (j < source.length && source[j] == '}') {
                    shift = -1;
                }
                output += this.indentation(depth + shift);
                i = j - 1;
            } else if (source[i] == '{') {
                depth++;
            } else if (source[i] == '}') {
                depth--;
            }
            i++;
        }

        return output;
    }

    private skipWhitespaces(source: string, start: number) {
        let i = start;

        while (i < source.length) {
            if (!Indenter.isWhitespace(source, i)) {
                break;
            }
            i++;
        }
        return i;
    }

    private indentation(depth: number) {
        return this.baseIndentation + this.char.repeat(this.increment * Math.max(depth, 0));
    }

    private static isWhitespace(source: string, i: number) {
        return source[i] == ' ' || source[i] == '\t';
    }

    static fromInput(char: string, increment: number, source: string) {
        let baseIndentation = '';
        let i = 0;

        while (i < source.length) {
            if (!Indenter.isWhitespace(source, i)) {
                break;
            }
            baseIndentation += source[i];
            i++;
        }

        let depth = 0;
        while (i < source.length) {
            if (source[i] == '{') {
                depth++;
            } else if (source[i] == '}') {
                depth = Math.max(depth - 1, 0);
            }
            i++;
        }
        
        return new Indenter(char, increment, depth, baseIndentation);
    }
}