use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: i32) -> i32 {
    if n <= 1 { n } else { fibonacci(n - 1) + fibonacci(n - 2) }
}

#[wasm_bindgen]
pub fn matrix_multiply(size: i32) {
    let mut a = vec![vec![1i32; size as usize]; size as usize];
    let mut b = vec![vec![1i32; size as usize]; size as usize];
    let mut c = vec![vec![0i32; size as usize]; size as usize];
    for i in 0..size {
        for j in 0..size {
            for k in 0..size {
                c[i as usize][j as usize] += a[i as usize][k as usize] * b[k as usize][j as usize];
            }
        }
    }
}
