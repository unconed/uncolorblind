#!/bin/bash
scp -r public/* root@acko.net:/var/www/acko.net/files/dump/uncolorblind/
cp -r public/* ~/Projects/Sites/Acko/jekyll/files/dump/uncolorblind/
