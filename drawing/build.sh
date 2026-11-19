#!/bin/sh
cd "$(dirname "$0")" || exit 1
LISTE=$(grep -oE "^(void|int|float|uint8_t\*) gr_[a-z_0-9]+" scene.cpp | awk '{printf "_%s,", $2}')
em++ -O2 -std=c++17 web-entry.cpp -o ../site/engine/gramofon-core.js -sMODULARIZE=1 -sEXPORT_NAME=GramofonCekirdek \
  -sENVIRONMENT=web -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=67108864 "-sEXPORTED_FUNCTIONS=${LISTE}_malloc,_free" -sEXPORTED_RUNTIME_METHODS=HEAPU8
