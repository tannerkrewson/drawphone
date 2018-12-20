#!/bin/bash
if [ "$TRAVIS_BRANCH" == "prod" ]; then
  eval "$(ssh-agent -s)" #start the ssh agent
  chmod 600 .travis/deploy.key # this key should have push access
  ssh-add .travis/deploy.key
  ssh-keyscan dokku@do.tannerkrewson.com >> ~/.ssh/known_hosts
  git remote add deploy dokku@do.tannerkrewson.com:drawphone
  git config --global push.default simple
  git push deploy prod
fi