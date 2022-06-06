const {app, BrowserWindow, ipcMain, Menu, shell} = require('electron');
const path = require('path')
const fs = require('fs');

// don't do weird crap when building for windows
if (require('electron-squirrel-startup')) return app.quit();

const settingsPath = path.join(app.getPath("appData"), app.getName(), "settings.json");
global.settings = {}

const isMac = process.platform === 'darwin'

// literally a straight copy from the docs
// https://www.electronjs.org/docs/latest/api/menu
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      {role: 'about'},
      {type: 'separator'},
      {role: 'services'},
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideOthers'},
      {role: 'unhide'},
      {type: 'separator'},
      {role: 'quit'}
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? {role: 'close'} : {role: 'quit'},
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'},
      ...(isMac ? [
        {role: 'pasteAndMatchStyle'},
        {role: 'delete'},
        {role: 'selectAll'},
        {type: 'separator'},
        {
          label: 'Speech',
          submenu: [
            {role: 'startSpeaking'},
            {role: 'stopSpeaking'}
          ]
        }
      ] : [
        {role: 'delete'},
        {type: 'separator'},
        {role: 'selectAll'}
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forceReload'},
      {role: 'toggleDevTools'},
      {type: 'separator'},
      {role: 'resetZoom'},
      {role: 'zoomIn'},
      {role: 'zoomOut'},
      {type: 'separator'},
      {role: 'togglefullscreen'}
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      {role: 'minimize'},
      {role: 'zoom'},
      ...(isMac ? [
        {type: 'separator'},
        {role: 'front'},
        {type: 'separator'},
        {role: 'window'}
      ] : [
        {role: 'close'}
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Documentation (link)',
        click: async () => {
          await shell.openExternal('https://alexandriails.github.io/Alexandria/')
        }
      },
      {type: "separator"},
      {
        label: `Version ${app.getVersion()}`
      }
    ]
  }
]

function createWindow(showConfig = false, settings) {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'print_setup_preload.js'),
    },
    width: 1440,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icon.png')
  })
  if (showConfig) {
    win.loadFile('index.html')
  } else {
    win.loadURL(settings.url);
  }
  // win.webContents.openDevTools();
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  // force any link with `target=_blank` to open in a proper browser window
  win.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return {action: 'deny'};
  });
}

app.whenReady().then(() => {
  let showConfig = false;
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath));
  } catch (ex) {
    // This is the first run / we can't load the settings file.
    // Launch the general config first so that we can write the settings.
    console.log(ex);
    showConfig = true;
  }

  createWindow(showConfig, settings)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// kill process entirely on Mac to mimic behavior on other OS'
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// *********
// iHateIpc
// *********
//
// I really hate how this works, but with `remote` being killed then I can't
// seem to get any other method to work. This seems ridiculously overkill
// for what should be a very simple process, so if anyone knows more about
// electron than me (it shouldn't be hard, really) then I welcome them to
// come and fix this mess.

ipcMain.handle('getSettings', async (event) => {
  try {
    return JSON.parse(fs.readFileSync(settingsPath));
  } catch (ex) {
    return global.settings;
  }
})

ipcMain.handle('writeSettings', (event) => {
  let existingSettings;

  try {
    existingSettings = fs.readFile(settingsPath);
  } catch (ex) {
    existingSettings = {}
  }

  fs.writeFileSync(
    Buffer.from(settingsPath),
    Buffer.from(JSON.stringify(Object.assign(existingSettings, global.settings)))
  );
})

// *************************
// Individual IPC Functions
// *************************

ipcMain.handle("setURL", (event, newURL) => {
  global.settings.url = newURL;
});

ipcMain.handle("setPrinterSettings", (event, printerData) => {
  global.settings.printer = printerData;
})

ipcMain.handle("restart", (event) => {
  app.relaunch();
  app.quit();
})

// JSON.stringify(
//   {
//     "printer": {
//       "name": "",
//       "cpl": "",
//       "encoding": "",
//       "upsideDown": false,
//       "command": "escpos",
//     },
//     "url": 'http://localhost:8000'
//   }
// )
// fs.writeFile(settingPath, json);
