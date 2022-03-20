export interface MDXParseError {
    name: string;
    column: number;
    line: number;
    reason: string;
}
export declare function isMDXParseError(e: any): e is MDXParseError;
