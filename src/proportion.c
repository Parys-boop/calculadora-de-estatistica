#include "normal-critical.h"

enum ProportionStatus {
    PROPORTION_OK,
    PROPORTION_INVALID_N,
    PROPORTION_INVALID_X,
    PROPORTION_INVALID_LEVEL,
    PROPORTION_EXTREME
};

enum ProportionOutput {
    Z_CRITICAL, FRACTION, PERCENT, SMALL_SAMPLE,
    MARGIN_POINTS, LOWER_PERCENT, UPPER_PERCENT, LOWER_CEILING, UPPER_CEILING,
    PROPORTION_OUTPUT_COUNT
};

int proportion_interval(double x, double n, double confidence, int calculate, double *output) {
    for (int i = 0; i < PROPORTION_OUTPUT_COUNT; ++i) output[i] = NAN;

    double z = normal_critical_value(confidence);
    if (!isfinite(z)) return PROPORTION_INVALID_LEVEL;
    output[Z_CRITICAL] = z;
    if (!isfinite(n) || n < 1.0 || n > 9007199254740991.0 || trunc(n) != n) {
        return PROPORTION_INVALID_N;
    }
    if (!isfinite(x) || x < 0.0 || x > n || trunc(x) != x) {
        return PROPORTION_INVALID_X;
    }

    double without_cases = n - x;
    double p = x / n;
    double percent = (x * 100.0) / n;
    output[FRACTION] = p;
    output[PERCENT] = percent;
    output[SMALL_SAMPLE] = x < 10.0 || without_cases < 10.0;
    if (x == 0.0 || without_cases == 0.0) return PROPORTION_EXTREME;
    if (!calculate) return PROPORTION_OK;

    /* Use (n - x) / n for 1 - p to retain precision when p is near 1. */
    double standard_error = sqrt(p * (without_cases / n) / n);
    double margin = (100.0 * z) * standard_error;
    double lower = percent - margin;
    double upper = percent + margin;
    output[MARGIN_POINTS] = margin;
    output[LOWER_PERCENT] = lower;
    output[UPPER_PERCENT] = upper;
    output[LOWER_CEILING] = ceil(lower);
    output[UPPER_CEILING] = ceil(upper);
    return PROPORTION_OK;
}
