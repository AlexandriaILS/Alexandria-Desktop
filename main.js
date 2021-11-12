const {app, BrowserWindow} = require('electron');
const path = require('path')

// don't do weird crap when building for windows
// if (require('electron-squirrel-startup')) return app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icon.png')
  })

  win.loadURL('http://localhost:8000');
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
