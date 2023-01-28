#!/bin/bash
for dir in ../src/*; do (cd "$dir" && cargo lambda build --release); done
