/** Exported memory */
export declare const memory: WebAssembly.Memory;
// Exported runtime interface
export declare function __new(size: number, id: number): number;
export declare function __pin(ptr: number): number;
export declare function __unpin(ptr: number): void;
export declare function __collect(): void;
export declare const __rtti_base: number;
/**
 * assembly/index/fibonacci
 * @param n `i32`
 * @returns `i32`
 */
export declare function fibonacci(n: number): number;
/**
 * assembly/index/matrix_multiply
 * @param size `i32`
 * @returns `~lib/typedarray/Float64Array`
 */
export declare function matrix_multiply(size: number): Float64Array;
