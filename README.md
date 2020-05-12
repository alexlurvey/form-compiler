# form-compiler

Status: WIP

Main Idea is to take an input TypeScript file and build out a directory structure that matches the main Form interface and generate file for managing the form.

Currently generates state management file base on [rstream](https://github.com/thi-ng/umbrella/tree/develop/packages/rstream) and a file of React hooks.

## Running
`yarn build path/to/FormInterface.ts path/to/build/dir`

To build the sample app with the test interface:
```
cd test-app && yarn install && cd ..
yarn dev
cd test-app
yarn start
```
