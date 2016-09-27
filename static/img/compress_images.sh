#!/usr/bin/env bash
#
# Lossless image compression for JPEGs and PNGs
# Requirements:
# - jpegoptim https://github.com/tjko/jpegoptim
# - jpegtran http://jpegclub.org/jpegtran/
# - optipng http://optipng.sourceforge.net/

# Compress jpeg pics
for file in $(find . -name '*.jpg')
do
    echo "Compressing $file"
    jpegoptim "$file"
    jpegtran -copy none -optimize -outfile "$file" "$file"
done

# Compress PNGs
for file in $(find . -name '*.png')
do
    echo "Compressing $file"
    optipng -o7 -preserve "$file"
done
