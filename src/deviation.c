#include <math.h>
#include <stddef.h>

enum DeviationStatus {
    DEVIATION_OK,
    DEVIATION_TOO_FEW_VALUES,
    DEVIATION_NON_FINITE_INPUT,
    DEVIATION_INVALID_TYPE,
    DEVIATION_NUMERIC_ERROR
};

enum DeviationOutput { COUNT, MEAN, DIVISOR, DEVIATION, DEVIATION_OUTPUT_COUNT };

typedef struct { double sum; double correction; } DeviationSum;

static void add(DeviationSum *total, double value) {
    double next = total->sum + value;
    if (fabs(total->sum) >= fabs(value)) total->correction += (total->sum - next) + value;
    else total->correction += (value - next) + total->sum;
    total->sum = next;
}

int standard_deviation(const double *values, size_t count, double sample,
                       int calculate, double *output) {
    for (int i = 0; i < DEVIATION_OUTPUT_COUNT; ++i) output[i] = NAN;
    if (sample != 0.0 && sample != 1.0) return DEVIATION_INVALID_TYPE;
    output[COUNT] = (double)count;
    if (count == 0) return DEVIATION_TOO_FEW_VALUES;

    double maximum = 0.0;
    for (size_t i = 0; i < count; ++i) {
        if (!isfinite(values[i])) return DEVIATION_NON_FINITE_INPUT;
        maximum = fmax(maximum, fabs(values[i]));
    }
    /* Escala em potências de dois e origem local preservam diferenças pequenas
       e evitam overflow dos quadrados quando o desvio ainda é representável. */
    int exponent = 0;
    frexp(maximum, &exponent);
    double origin = scalbn(values[0], -exponent);
    DeviationSum offsets = {0};
    for (size_t i = 0; i < count; ++i) {
        add(&offsets, scalbn(values[i], -exponent) - origin);
    }
    double mean_offset = (offsets.sum + offsets.correction) / (double)count;
    double mean = scalbn(origin + mean_offset, exponent);
    if (!isfinite(mean)) return DEVIATION_NUMERIC_ERROR;
    output[MEAN] = mean;
    if (sample == 1.0 && count < 2) return DEVIATION_TOO_FEW_VALUES;
    double divisor = (double)count - sample;
    output[DIVISOR] = divisor;
    if (!calculate) return DEVIATION_OK;

    DeviationSum squares = {0};
    for (size_t i = 0; i < count; ++i) {
        double difference = (scalbn(values[i], -exponent) - origin) - mean_offset;
        add(&squares, difference * difference);
    }
    double sum_squares = squares.sum + squares.correction;
    double deviation = scalbn(sqrt(sum_squares / divisor), exponent);
    if (!isfinite(deviation) || (sum_squares > 0.0 && deviation == 0.0)) {
        return DEVIATION_NUMERIC_ERROR;
    }
    output[DEVIATION] = deviation;
    return DEVIATION_OK;
}
