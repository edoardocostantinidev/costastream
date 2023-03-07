#!/bin/bash
for dir in ../lambdas/*; do (cd "$dir" && cargo lambda build --release); done
