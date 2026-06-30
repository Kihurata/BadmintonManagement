import '@testing-library/jest-dom'

// Polyfill global Request, Response, and Headers in JSDOM for Next.js server classes
if (typeof global.Headers === 'undefined') {
    global.Headers = class Headers {
        entries() { return []; }
        get() { return null; }
        has() { return false; }
    } as any;
}
if (typeof global.Request === 'undefined') {
    global.Request = class Request {
        url: string;
        method: string;
        headers: any;
        constructor(input: any, init?: any) {
            this.url = typeof input === 'string' ? input : (input?.url ?? 'http://localhost');
            this.method = init?.method ?? 'GET';
            this.headers = new global.Headers();
        }
    } as any;
}
if (typeof global.Response === 'undefined') {
    global.Response = class Response {
        status: number;
        headers: any;
        body: any;
        constructor(body?: any, init?: any) {
            this.status = init?.status ?? 200;
            this.headers = new global.Headers();
            this.body = body;
        }
        async json() {
            return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
        }
    } as any;
}

if (!global.Response.json) {
    global.Response.json = function(data: any, init?: any) {
        const body = JSON.stringify(data);
        const response = new global.Response(body, init);
        return response;
    };
}

// Mock matchMedia which is not present in JSDOM
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}
