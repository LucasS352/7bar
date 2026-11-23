#!/bin/sh
# Build both PDV images from one clean main commit. Does not restart services or touch databases.
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

if [ "$(git branch --show-current)" != main ]; then
  echo 'Release interrompido: use um checkout da branch main.' >&2
  exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo 'Release interrompido: o checkout contém alterações não commitadas.' >&2
  exit 1
fi

git fetch --quiet origin main
commit=$(git rev-parse HEAD)
if [ "$commit" != "$(git rev-parse refs/remotes/origin/main)" ]; then
  echo 'Release interrompido: o checkout não coincide com origin/main.' >&2
  exit 1
fi

version=$(git rev-parse --short=7 HEAD)
backend_release="pdv_adegas-backend:release-$version"
frontend_release="pdv_adegas-frontend:release-$version"

echo "Construindo backend e frontend do commit $version."
docker build -t "$backend_release" ./backend
docker build -t "$frontend_release" ./frontend

# Keep the currently deployed images available for rollback. Tag only after both builds succeed.
docker image inspect pdv_adegas-backend:latest pdv_adegas-frontend:latest >/dev/null
docker tag pdv_adegas-backend:latest "pdv_adegas-backend:before-$version"
docker tag pdv_adegas-frontend:latest "pdv_adegas-frontend:before-$version"
docker tag "$backend_release" pdv_adegas-backend:latest
docker tag "$frontend_release" pdv_adegas-frontend:latest

echo "Backend esperado: $(docker image inspect -f '{{.Id}}' "$backend_release")"
echo "Frontend esperado: $(docker image inspect -f '{{.Id}}' "$frontend_release")"
echo 'Imagens preparadas; nenhum contêiner foi recriado.'
echo 'No Portainer, recrie somente 7bar_backend e 7bar_frontend, um por vez, com Re-pull image desligado.'
echo "Depois compare: docker inspect -f '{{.Image}}' 7bar_backend 7bar_frontend"
