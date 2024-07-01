#!/usr/bin/env bash

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

nvm install 18

git clone git@github.com:abhishek1402/smart-test-ui.git

npx playwright install

npm run make

open -n ./out/smart-test-ui-darwin-arm64/smart-test-ui.app