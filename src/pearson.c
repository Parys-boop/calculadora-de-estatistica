#include <float.h>
#include <math.h>
#include <stddef.h>

enum PearsonStatus {
    PEARSON_OK,
    PEARSON_TOO_FEW_PAIRS,
    PEARSON_NON_FINITE_INPUT,
    PEARSON_CONSTANT_X,
    PEARSON_CONSTANT_Y,
    PEARSON_CONSTANT_BOTH,
    PEARSON_NUMERIC_ERROR
};

enum PearsonOutput { MEAN_X, MEAN_Y, SUM_XY, SUM_XX, SUM_YY, COEFFICIENT, OUTPUT_COUNT };

typedef struct {
    double sum;
    double correction;
} CompensatedSum;

static void add(CompensatedSum *total, double value) {
    double next = total->sum + value;
    /* Compensação de Neumaier, inclusive quando a parcela é maior que a soma. */
    if (fabs(total->sum) >= fabs(value)) {
        total->correction += (total->sum - next) + value;
    } else {
        total->correction += (value - next) + total->sum;
    }
    total->sum = next;
}

static double value_of(CompensatedSum total) {
    return total.sum + total.correction;
}

static int restore_sum(double scaled, int exponent, double *result) {
    double unscaled = scalbn(scaled, exponent);
    if (!isfinite(unscaled) || (unscaled == 0.0 && scaled != 0.0)) {
        return 0;
    }
    *result = unscaled;
    return 1;
}

/* pairs contém X e Y intercalados. A prévia deixa COEFFICIENT sem valor. */
int pearson(const double *pairs, size_t count, int calculate, double *output) {
    for (size_t i = 0; i < OUTPUT_COUNT; ++i) {
        output[i] = NAN;
    }
    if (count == 0) {
        return PEARSON_TOO_FEW_PAIRS;
    }

    double max_x = 0.0, max_y = 0.0;
    for (size_t i = 0; i < count; ++i) {
        double x = pairs[2 * i], y = pairs[2 * i + 1];
        if (!isfinite(x) || !isfinite(y)) {
            return PEARSON_NON_FINITE_INPUT;
        }
        max_x = fmax(max_x, fabs(x));
        max_y = fmax(max_y, fabs(y));
    }

    /* A escala em potências de dois evita overflow no cálculo das médias e desvios.
       A origem preserva diferenças pequenas entre observações com grande magnitude. */
    int exp_x, exp_y;
    frexp(max_x, &exp_x);
    frexp(max_y, &exp_y);
    double origin_x = scalbn(pairs[0], -exp_x);
    double origin_y = scalbn(pairs[1], -exp_y);
    CompensatedSum sum_x = {0}, sum_y = {0}, offsets_x = {0}, offsets_y = {0};

    for (size_t i = 0; i < count; ++i) {
        double x = scalbn(pairs[2 * i], -exp_x);
        double y = scalbn(pairs[2 * i + 1], -exp_y);
        add(&sum_x, x);
        add(&sum_y, y);
        add(&offsets_x, x - origin_x);
        add(&offsets_y, y - origin_y);
    }
    double mean_x = scalbn(value_of(sum_x) / (double)count, exp_x);
    double mean_y = scalbn(value_of(sum_y) / (double)count, exp_y);
    if (!isfinite(mean_x) || !isfinite(mean_y)) {
        return PEARSON_NUMERIC_ERROR;
    }
    output[MEAN_X] = mean_x;
    output[MEAN_Y] = mean_y;

    double offset_x = value_of(offsets_x) / (double)count;
    double offset_y = value_of(offsets_y) / (double)count;
    CompensatedSum sum_xy = {0}, sum_xx = {0}, sum_yy = {0};
    for (size_t i = 0; i < count; ++i) {
        double dx = (scalbn(pairs[2 * i], -exp_x) - origin_x) - offset_x;
        double dy = (scalbn(pairs[2 * i + 1], -exp_y) - origin_y) - offset_y;
        add(&sum_xy, dx * dy);
        add(&sum_xx, dx * dx);
        add(&sum_yy, dy * dy);
    }

    double xy = value_of(sum_xy), xx = value_of(sum_xx), yy = value_of(sum_yy);
    int xy_ok = restore_sum(xy, exp_x + exp_y, &output[SUM_XY]);
    int xx_ok = restore_sum(xx, 2 * exp_x, &output[SUM_XX]);
    int yy_ok = restore_sum(yy, 2 * exp_y, &output[SUM_YY]);

    if (count < 2) return PEARSON_TOO_FEW_PAIRS;
    if (xx == 0.0 && yy == 0.0) return PEARSON_CONSTANT_BOTH;
    if (xx == 0.0) return PEARSON_CONSTANT_X;
    if (yy == 0.0) return PEARSON_CONSTANT_Y;
    if (!xy_ok || !xx_ok || !yy_ok) return PEARSON_NUMERIC_ERROR;

    if (calculate) {
        double r = (xy / sqrt(xx)) / sqrt(yy);
        if (!isfinite(r) || fabs(r) > 1.0 + 8.0 * DBL_EPSILON) {
            return PEARSON_NUMERIC_ERROR;
        }
        output[COEFFICIENT] = fmax(-1.0, fmin(1.0, r));
    }
    return PEARSON_OK;
}
