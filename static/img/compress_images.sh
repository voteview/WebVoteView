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
    jpegoptim --strip-all "$file"
    jpegtran -copy none -optimize -outfile "$file" "$file"
    chmod 0644 "$file"
    # jpegoptim does not preserve permissions in versions <1.4 and we have 1.3
done

# Compress PNGs
for file in $(find . -name '*.png')
do
    echo "Compressing $file"
    optipng -o7 -preserve "$file"
done
