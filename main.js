const {app, BrowserWindow} = require('electron');
const path = require('path')

// don't do weird crap when building for windows
// if (require('electron-squirrel-startup')) return app.quit();

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'print_setup_preload.js'), // Appropriate path to the file in your own project
    },
    width: 1440,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icon.png')
  })

  win.loadURL('http://localhost:8000');
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// kill process entirely on Mac to mimic behavior on other OS'
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
