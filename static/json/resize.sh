#!/bin/bash
for file in *.json
do
    echo $file
    topojson -s 10e-9 -q 1e6 -o $file $file
done
