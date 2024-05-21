#!/bin/bash

YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No color (reset)

tests_dir="$(dirname "$(dirname "$0")")/test"
zkasmtest_path=$(realpath "$(dirname "$(dirname "$0")")/node_modules/@0xpolygonhermez/zkevm-proverjs/test/zkasmtest.js")
helper_path=$(realpath "$(dirname "$(dirname "$0")")/js/helper.js")

# Navigate to the tests directory
cd "$tests_dir" || exit

mkdir -p ../tmp

echo -e "${YELLOW}--> Start testing zkasm files${NC}"
test_failed=false
for file in *zkasm; do
    # Check if the file exists and is a regular file
    if [[ -f "$file" ]]; then

        if [[ "$file" == *ignore* ]]; then
            continue
        fi

        if [[ "$file" == footer.zkasm || "$file" == header.zkasm ]]; then
            continue
        fi

        echo -e "${BLUE}   --> Test${NC} $file"
        if ! node --max-old-space-size=6144 "$zkasmtest_path" -bsE -H "$helper_path" -N "2**25" "header.zkasm" "$file" "footer.zkasm" &> ../tmp/output.txt; then
            # Check if output.txt is not empty
            if [[ -s ../tmp/output.txt ]]; then
                cat ../tmp/output.txt
            fi
            echo -e "${RED}   --> Fail${NC} $file"
            test_failed=true
        else
            echo -e "${GREEN}   --> Pass${NC} $file"
        fi
        rm ../tmp/output.txt
    fi
done

if [[ "$test_failed" = true ]]; then
    echo -e "${RED}One or more tests failed${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed${NC}"
fi
