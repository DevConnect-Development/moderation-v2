export default function <T>(array: T[], chunkSize: number) {
    const results = [];
    while (array.length) {
        results.push(array.splice(0, chunkSize));
    }
    return results;
}
