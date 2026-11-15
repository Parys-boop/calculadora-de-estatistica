#ifndef PEARSON_H
#define PEARSON_H

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

int pearson(const double *pairs, size_t count, int calculate, double *output);

#endif
