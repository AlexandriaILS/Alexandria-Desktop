const electron = require('electron')
const receiptio = require('receiptio');
// Importing BrowserWindow from Main

window.addEventListener('DOMContentLoaded', () => {
  receipt = document.getElementById("receipt");
  console.log(receipt);
  console.log(receipt.innerText);
  receiptio.print(receipt.innerText, '-d ESTPRT001 -p escpos -c 42').then(result => {
    console.log(result);
  });


  // var current = document.getElementById('current');
  // var options = {
  //   silent: false,
  //   printBackground: true,
  //   color: false,
  //   margin: {
  //     marginType: 'printableArea'
  //   },
  //   landscape: false,
  //   pagesPerSheet: 1,
  //   collate: false,
  //   copies: 1,
  //   header: 'Header of the Page',
  //   footer: 'Footer of the Page'
  // }
  // console.log("loaded?")
  // current.addEventListener('click', (event) => {
  //   let win = BrowserWindow.getFocusedWindow();
  //   // let win = BrowserWindow.getAllWindows()[0];
  //
  //   win.webContents.print(options, (success, failureReason) => {
  //     if (!success) console.log(failureReason);
  //
  //     console.log('Print Initiated');
  //   });
  // });
})
