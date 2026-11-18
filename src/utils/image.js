const MAX_SIDE = 480;       // longest side of a stored raster logo, in pixels
const MAX_DATA_URL = 1_400_000; // keep under the server's limit

const readAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that file'));
        reader.readAsDataURL(file);
    });

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('That file is not a valid image'));
        image.src = src;
    });

/**
 * Turns an uploaded logo into a small data URL. PNG/JPG/WebP are scaled down (transparency kept);
 * SVG is stored as is. Throws an Error with a message the person can read.
 */
export async function logoFileToDataUrl(file, { maxSide = MAX_SIDE, format = 'image/png' } = {}) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) throw new Error('Choose a PNG, JPG, WebP or SVG image');

    const original = await readAsDataUrl(file);
    if (file.type === 'image/svg+xml') {
        if (original.length > MAX_DATA_URL) throw new Error('That SVG is too large. Use one under 1 MB');
        return original;
    }

    const image = await loadImage(original);
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    const result = canvas.toDataURL(format, 0.88);
    if (result.length > MAX_DATA_URL) throw new Error('That image is too large. Try a smaller one');
    return result;
}
