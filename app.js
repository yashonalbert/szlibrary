/* eslint-disable import/newline-after-import */

// replace global.Promise to bluebird
global.Promise = require('bluebird');

// require electron
const electron = require('electron');
const { getConfig } = require('./config');

// define global app & config
const app = global.app = electron.app;
const config = app.config = getConfig(app.getAppPath());

// start web server
const { default: server } = require('./lib/server');
server.listen(config.port);

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new electron.BrowserWindow({ width: 800, height: 600, title: '图书馆' });

  // and load the index.html of the app.
  win.loadURL(`http://localhost:${config.port}`);

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});
