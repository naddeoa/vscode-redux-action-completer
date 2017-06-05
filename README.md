## Redux Action Completer for vscode 

This visual studio code extension enables autocompletion of actions and action creators when dispatching. It is designed to address the problem of navigate large action libraries in redux applications. If you have issues with action discovery in your project then you might find this interesting.

```javascript
// autocomplete from all known actions when dispatching
dispatch(myAc...)
```

## How it works

The extension will add actions to the autocomplete list when you are completing a call to dispatch. It just checks the current line for the string `dispatch`. At that point, it will use the configuration below to scan/parse files for actions. It assumes that everything that you export from those files is fair game. It will update your import statements after you select one.

## Commands

`redux-action-finder.commands.refresh`: RAC: Refresh. Useful after updating node modules. - This will refresh the cache of parsed action definitions. If you install new modules and they aren't showing up then you pro
bably need to run this.


## Configuration options

`redux-action-finder.modules`: string[] (defaults to []) - These modules will be searched for actions. These are the names of the dependencies that your project uses.

`redux-aciton-finder.fileGlobs`: string[] (defaults to []) - Glob patterns to match file names that contain actions in the modules that are being searched.

`redux-aciton-finder.nodeModulePaths`: string[] (defaults to ["node_modules"]) - The paths of node module folders. Pretty much the same as the NODE_MODULES env variable. If you just use the typical `node_m
odules` folder then you don't have to change this.

`redux-aciton-finder.localFileGlobs`: string[] (defaults to ["src/**/*Actions.js"]) - Glob patterns to match local action files to.

`redux-aciton-finder.localSourceDir`: string[] (defaults to ["src"]) - Directory that local source is stored in for the active project.
