#include <math.h>
#include "pearson.h"

enum RegressionOutput {
    REG_MEAN_X, REG_MEAN_Y, REG_SUM_XY, REG_SUM_XX,
    REG_SLOPE, REG_INTERCEPT, REG_MIN_X, REG_MAX_X, REG_OUTPUT_COUNT
};

int linear_regression(const double *pairs, size_t count, int calculate, double *output) {
    for (size_t i = 0; i < REG_OUTPUT_COUNT; ++i) output[i] = NAN;
    double statistics[OUTPUT_COUNT];
    int status = pearson(pairs, count, 0, statistics);
    output[REG_MEAN_X] = statistics[MEAN_X];
    output[REG_MEAN_Y] = statistics[MEAN_Y];
    output[REG_SUM_XY] = statistics[SUM_XY];
    output[REG_SUM_XX] = statistics[SUM_XX];

    if (count == 0 || status == PEARSON_NON_FINITE_INPUT) return status;
    double minimum = pairs[0], maximum = pairs[0];
    for (size_t i = 1; i < count; ++i) {
        minimum = fmin(minimum, pairs[2 * i]);
        maximum = fmax(maximum, pairs[2 * i]);
    }
    output[REG_MIN_X] = minimum;
    output[REG_MAX_X] = maximum;

    if (count < 2) return PEARSON_TOO_FEW_PAIRS;
    if (status == PEARSON_CONSTANT_X || status == PEARSON_CONSTANT_BOTH) return PEARSON_CONSTANT_X;
    if (status != PEARSON_OK && status != PEARSON_CONSTANT_Y) return status;
    if (!calculate) return PEARSON_OK;

    /* Y constante é um ajuste horizontal válido. */
    double slope = 0.0;
    if (status != PEARSON_CONSTANT_Y) {
        slope = statistics[SUM_XY] / statistics[SUM_XX];
        if (!isfinite(slope) || (slope == 0.0 && statistics[SUM_XY] != 0.0)) {
            return PEARSON_NUMERIC_ERROR;
        }
    }
    double intercept = fma(-slope, statistics[MEAN_X], statistics[MEAN_Y]);
    if (!isfinite(intercept)) return PEARSON_NUMERIC_ERROR;
    output[REG_SLOPE] = slope;
    output[REG_INTERCEPT] = intercept;
    return PEARSON_OK;
}

int regression_predict(double slope, double intercept, double minimum, double maximum,
                       double x, double *output) {
    output[0] = NAN;
    output[1] = 0.0;
    if (!isfinite(slope) || !isfinite(intercept) || !isfinite(minimum) ||
        !isfinite(maximum) || !isfinite(x)) return PEARSON_NON_FINITE_INPUT;
    if (minimum > maximum) return PEARSON_NUMERIC_ERROR;

    double prediction = fma(slope, x, intercept);
    if (!isfinite(prediction)) return PEARSON_NUMERIC_ERROR;
    output[0] = prediction;
    output[1] = x < minimum || x > maximum;
    return PEARSON_OK;
}
