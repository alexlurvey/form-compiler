# form-compiler

Status: WIP

Main Idea is to take an input TypeScript file and build out a directory structure that matches the main Form interface and generate file for managing the form.

Currently generates state management files based on [rstream](https://github.com/thi-ng/umbrella/tree/develop/packages/rstream) and a file of React hooks.

## Running
`yarn build path/to/FormInterface.ts --interface MainInterfaceName --out-dir path/to/build/dir`
- --interface defaults to 'Form'
- --out-dir defaults to 'build'

To build the sample app with the test interface:
```
cd test-app && yarn install && cd ..
yarn dev
cd test-app
yarn start
```

## Caveats
- Not all TypeScript syntax is supported. Look at [ITestForm.ts](./ITestForm.ts) for what is supported. Any combination of the following should work:
  - Primitives, tuples, and arrays of primitives.
  - Nested interfaces.
  - Arrays of interfaces.