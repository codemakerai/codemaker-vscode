
export class Indenter {

    alignIndentation(source: string, whitespace: string, baseIndentation: string) {
        let output = '';
        let i  = 0;
        let depth = 0;
        
        while (i < source.length) {            
            output += source[i];
            if (source[i] == '{') {
                depth++;
            } else if (source[i] == '\n') {
                break;
            }
            i++;
        }

        i++;

        while (i < source.length) {
            output += source[i];

            if (source[i] == '\n') {
                const j = this.skipWhitespaces(source, i + 1);
                let shift = 0;
                if (j < source.length && source[j] == '}') {
                    shift = -1;
                }
                output += this.indentation(depth + shift, whitespace, baseIndentation);
                i = j - 1;
            } else if (source[i] == '{') {
                depth++;
            } else if (source[i] == '}') {
                depth--;
            }
            i++;
        }

        return source;
    }

    private skipWhitespaces(source: string, start: number) {
        let i = start;

        while (i < source.length) {
            if (!this.isWhitespace(source, i)) {
                break;
            }
            i++;
        }
        return i;
    }

    private indentation(depth: number, whitespace: string, baseIndentation: string) {
        return baseIndentation + whitespace.repeat(4 * depth);
    }

    private isWhitespace(source: string, i: number) {
        return source[i] == ' ' || source[i] == '\t';
    }
}