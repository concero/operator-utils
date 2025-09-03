export function safeRequireJson(filePath: string): any {
    try {
        return require(filePath);
    } catch {
        return {};
    }
}
