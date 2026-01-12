#include <cheerp/client.h>

[[cheerp::jsexport]]
int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

[[cheerp::jsexport]]
void matrix_multiply(int size) {
    int a[size][size], b[size][size], c[size][size] = {0};
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            for (int k = 0; k < size; k++) {
                c[i][j] += a[i][k] * b[k][j];
            }
        }
    }
}
