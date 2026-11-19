#!/bin/sh
# Rigenera tutta la grafica e le voci dalla cartella grafica/ e ricostruisce il gioco.
# Uso (dalla cartella del progetto):  sh tools/build_all.sh
set -e
mkdir -p anteprime
python3 tools/build_assets.py grafica src/content/sprites.ts anteprime
python3 tools/build_extra.py grafica/oggetti/oggetti.png grafica/voci src/content/extra.ts anteprime/oggetti.png grafica/oggetti/armi.png grafica/musica
# HOLY SLUG: il livello della chiesa (personaggi, fondali, musica e voci da progetto-chiesa/)
python3 tools/build_chiesa.py progetto-chiesa src/content/chiesa.ts anteprime
npx tsc --noEmit -p .
npx vite build
cp dist/index.html bar-bucaneve.html
echo "Fatto: bar-bucaneve.html aggiornato"
