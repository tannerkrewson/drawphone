#!/bin/bash
if [ "$TRAVIS_BRANCH" == "prod" ]; then
  eval "$(ssh-agent -s)"
  chmod 600 .travis/deploy.key
  ssh-add .travis/deploy.key
  ssh-keyscan do.tannerkrewson.com >> ~/.ssh/known_hosts
  git remote add deploy dokku@do.tannerkrewson.com:drawphone
  git config --global push.default simple
  git push deploy prod
fi