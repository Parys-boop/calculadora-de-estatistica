#include <math.h>

enum ConfidenceStatus {
    CONFIDENCE_OK,
    CONFIDENCE_NON_FINITE_INPUT,
    CONFIDENCE_INVALID_N,
    CONFIDENCE_NEGATIVE_DEVIATION,
    CONFIDENCE_INVALID_LEVEL,
    CONFIDENCE_INVALID_DEVIATION_TYPE,
    CONFIDENCE_SAMPLE_TOO_SMALL,
    CONFIDENCE_NORMALITY_REQUIRED,
    CONFIDENCE_NUMERIC_ERROR
};

enum ConfidenceOutput { LEVEL, ALPHA, Z_CRITICAL, MARGIN, LOWER, UPPER, CONFIDENCE_OUTPUT_COUNT };

/* Tipo 0: s amostral; tipo 1: sigma populacional conhecido.
   O tamanho e as seleções chegam como double para validar antes de qualquer conversão.
   A prévia fornece apenas os parâmetros tabelados, nunca margem ou limites. */
int confidence_interval(double mean, double deviation, double n, double confidence,
                        double deviation_type, double normality_confirmed,
                        int calculate, double *output) {
    for (int i = 0; i < CONFIDENCE_OUTPUT_COUNT; ++i) output[i] = NAN;

    /* Valores arredondados da tabela da aula, inclusive 2,575 para 99%. */
    double z;
    if (confidence == 90.0) z = 1.645;
    else if (confidence == 95.0) z = 1.96;
    else if (confidence == 99.0) z = 2.575;
    else return CONFIDENCE_INVALID_LEVEL;
    output[LEVEL] = confidence / 100.0;
    output[ALPHA] = 1.0 - output[LEVEL];
    output[Z_CRITICAL] = z;

    if (deviation_type != 0.0 && deviation_type != 1.0) return CONFIDENCE_INVALID_DEVIATION_TYPE;
    if (!isfinite(mean) || !isfinite(deviation) || !isfinite(n)) return CONFIDENCE_NON_FINITE_INPUT;
    /* Inteiros exatos no limite de representação da integração JavaScript/double. */
    if (n <= 0.0 || n > 9007199254740991.0 || trunc(n) != n) return CONFIDENCE_INVALID_N;
    if (deviation < 0.0) return CONFIDENCE_NEGATIVE_DEVIATION;
    if (deviation_type == 0.0 && n <= 30.0) return CONFIDENCE_SAMPLE_TOO_SMALL;
    if (deviation_type == 1.0 && n <= 30.0 && normality_confirmed != 1.0) {
        return CONFIDENCE_NORMALITY_REQUIRED;
    }
    if (!calculate) return CONFIDENCE_OK;

    /* Dividir antes de multiplicar evita overflow intermediário de z * desvio. */
    double margin = (deviation / sqrt(n)) * z;
    double lower = mean - margin;
    double upper = mean + margin;
    if (!isfinite(margin) || !isfinite(lower) || !isfinite(upper) ||
        (deviation > 0.0 && (margin == 0.0 || lower == mean || upper == mean))) {
        return CONFIDENCE_NUMERIC_ERROR;
    }
    output[MARGIN] = margin;
    output[LOWER] = lower;
    output[UPPER] = upper;
    return CONFIDENCE_OK;
}
