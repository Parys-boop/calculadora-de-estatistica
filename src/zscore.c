#include <math.h>

enum ZScoreStatus {
    ZSCORE_OK,
    ZSCORE_NON_FINITE_INPUT,
    ZSCORE_INVALID_DEVIATION,
    ZSCORE_NUMERIC_ERROR
};

enum ZScoreOutput { SCORE, DISTANCE, POSITION, CLASSIFICATION, ZSCORE_OUTPUT_COUNT };

int z_score(double observed, double mean, double deviation, int calculate, double *output) {
    for (int i = 0; i < ZSCORE_OUTPUT_COUNT; ++i) output[i] = NAN;
    if (!isfinite(observed) || !isfinite(mean) || !isfinite(deviation)) {
        return ZSCORE_NON_FINITE_INPUT;
    }
    if (deviation <= 0.0) return ZSCORE_INVALID_DEVIATION;
    if (!calculate) return ZSCORE_OK;

    double difference = observed - mean;
    /* Se a subtração exceder double, os termos divididos ainda podem ser finitos. */
    double score = isfinite(difference)
        ? difference / deviation
        : observed / deviation - mean / deviation;
    if (!isfinite(score) || (observed != mean && score == 0.0)) {
        return ZSCORE_NUMERIC_ERROR;
    }
    double distance = fabs(score);
    output[SCORE] = score == 0.0 ? 0.0 : score;
    output[DISTANCE] = distance;
    output[POSITION] = score > 0.0 ? 1.0 : score < 0.0 ? -1.0 : 0.0;
    /* Classifica o double completo, antes de qualquer arredondamento visual. */
    output[CLASSIFICATION] = distance < 2.0 ? 0.0 : distance == 2.0 ? 1.0 : 2.0;
    return ZSCORE_OK;
}
