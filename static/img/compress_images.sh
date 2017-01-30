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
    jpegoptim --strip-all -P "$file"
    jpegtran -copy none -optimize -outfile "$file" "$file"
    #chmod 0644 "$file"
done

# Compress PNGs
for file in $(find ./bios/ -name '*.png')
do
    echo "Compressing $file"
    optipng -o7 -preserve "$file"
done

# Compress TCs
for file in $(find ./twitterCard/ -name '*.png')
do
    echo "Compressing $file"
    optipng -o7 -preserve "$file"
done
