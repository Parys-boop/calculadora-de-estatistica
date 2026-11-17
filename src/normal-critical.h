#ifndef NORMAL_CRITICAL_H
#define NORMAL_CRITICAL_H

#include <math.h>

/* Valores tabelados do material da aula, inclusive 2,575 para 99%. */
static inline double normal_critical_value(double confidence) {
    if (confidence == 90.0) return 1.645;
    if (confidence == 95.0) return 1.96;
    if (confidence == 99.0) return 2.575;
    return NAN;
}

#endif
