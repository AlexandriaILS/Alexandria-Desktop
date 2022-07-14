const receiptline = require("receiptline");
const printer = require('@thiagoelg/node-printer');
const {ipcRenderer} = require('electron');

// not actually used in this file but required by the html
require("htmx.org");


function goAhead() {
  // use this function to trigger htmx buttons remotely when validation must
  // be performed. Set up the button with:
  //
  // data-hx-trigger="goAhead from:body"
  //
  // and it will fire when this function is called.

  var event = new Event('goAhead');
  // bombs awayyyy
  document.getElementById("body").dispatchEvent(event);
}

function isValidHttpUrl(string) {
  // https://stackoverflow.com/a/43467144
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

function validateURL(urlBar, urlValidateButton) {
  possibleUrl = urlBar.value;
  if (!possibleUrl) {
    errormessage = document.getElementById("errorMessage");
    errormessage.innerText = "We need a url to try..."
    errormessage.style.display = "block";
    resetButton(urlValidateButton);
    return
  }
  if (!isValidHttpUrl(possibleUrl)) {
    errormessage = document.getElementById("errorMessage");
    errormessage.innerText = "That URL doesn't look valid."
    errormessage.style.display = "block";
    resetButton(urlValidateButton);
    return
  }
  fetch(new URL("api/ping/", possibleUrl).href).then(function (response) {
    return response.ok ? response.json() : Promise.reject(response);
  }).then(function (resp) {
    if (resp.hasOwnProperty("message") && resp.hasOwnProperty("server_hash")) {
      ipcRenderer.invoke('setURL', possibleUrl);
      goAhead();
    } else {
      errormessage = document.getElementById("errorMessage");
      errormessage.innerText = "Server responded with invalid response."
      errormessage.style.display = "block";
      return
    }
  }).catch(function (err) {
    console.log(err);
    errormessage = document.getElementById("errorMessage");
    errormessage.innerText = "Got an error; something doesn't look right."
    errormessage.style.display = "block";
    return
  }).finally(function (err) {
    // button will be undefined if the page has changed
    if (typeof (urlValidateButton) != "undefined") {
      resetButton(urlValidateButton)
    }
  })
}

function validatePrinterSettings() {
  const selectedPrinter = document.getElementById("printerSelect").value;
  const cpl = document.getElementById("cplInput").value;

  if (selectedPrinter === "---") {
    let error = document.getElementById("printerSelectError");
    error.innerText = "Please select your receipt printer from the list.";
    error.style.display = "block";
    return false
  }

  if (cpl < 15) {
    let error = document.getElementById("cplError");
    error.innerText = "That's too low; use 16 or more. Check your printer's documentation for the proper amount.";
    error.style.display = "block";
    return false
  }

  return true;
}

function printTestPage() {
  const selectedPrinter = document.getElementById("printerSelect").value;
  const cpl = document.getElementById("cplInput").value;
  const encoding = document.getElementById("encodingInput").value;
  const command = document.getElementById("commandInput").value;
  const upsideDown = document.getElementById("upsideDownCheck").checked;

  const testReceipt = `
  Test receipt!
  
  cpl: ${cpl}
  
  overflow check:
  ${Array(parseInt(cpl)).fill('*').join('')}
  
  encoding: ${encoding}
  
  upsideDown: ${upsideDown}
  
  command: ${command}
  
  
  `

  if (validatePrinterSettings()) {
    const tempSettings = {
      cpl: cpl, // settings.printer.cpl
      encoding: encoding,  // settings.printer.encoding
      upsideDown: upsideDown,  // settings.printer.upsideDown
      gradient: false,
      spacing: false,
      gamma: 1.8,
      command: command  // settings.printer.command
    };

    printer.printDirect({
      data: receiptline.transform(testReceipt, tempSettings),
      printer: selectedPrinter,
      type: 'RAW',
      success: function (jobID) {
        new Notification("Printing test page", {body: '🎉'})
        console.log("sent to printer with ID: " + jobID);
      },
      error: function (err) {
        new Notification("Printer Error", {body: `Something went wrong: ${err}`})
      }
    });

  }
}

function replaceWithSpinner(e) {
  // does the spinner already exist?
  if (document.getElementById("replacementButton")) {
    return
  }

  const replacementButton = document.createElement("button");
  replacementButton.id = "replacementButton";
  replacementButton.className = "btn btn-success";
  replacementButton.disabled = true;
  replacementButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span class="visually-hidden">Loading...</span>`;
  e.parentElement.appendChild(replacementButton);
  e.style.display = "none";
}

function resetButton(e) {
  let b = document.getElementById("replacementButton");
  if (b) {
    b.remove()
  }
  e.style.display = "block";
}


function handleInit(settings) {
  let initialSetup = document.getElementById("initialSetup");
  if (!initialSetup) {
    // we're actually using Alexandria, not in first run setup.
    return
  }

  // *******
  // Step 1
  // *******
  let urlValidateButton = document.getElementById("urlValidateButton");
  let urlBar = document.getElementById("libraryUrlBar");
  // step one of the setup process. Grab the url they give us, check it, store it.
  if (urlValidateButton && !(urlValidateButton.classList.contains("listened"))) {
    urlValidateButton.addEventListener("click", (el => {
      replaceWithSpinner(urlValidateButton);
      validateURL(urlBar, urlValidateButton);
    }));
    urlValidateButton.classList.add("listened");
  }

  // *******
  // Step 2
  // *******

  let printerSelect = document.getElementById("printerSelect");
  let printerSettingsButton = document.getElementById("printerSettingsButton");
  let testPrintButton = document.getElementById("testPrintButton");
  if (printerSelect && !(printerSelect.classList.contains("loaded"))) {
    const connectedPrinters = printer.getPrinters();
    console.log("Connected printers: ", connectedPrinters);
    connectedPrinters.forEach(p => {
      let option = document.createElement("option");
      option.value = p.name;
      option.innerText = p.name;
      printerSelect.appendChild(option);
    })
    printerSelect.classList.add("loaded");
  }
  if (printerSettingsButton && !(printerSettingsButton.classList.contains("listened"))) {
    printerSettingsButton.addEventListener("click", (el => {
      replaceWithSpinner(printerSettingsButton);
      if (validatePrinterSettings()) {
        const is_selfcheckout = document.getElementById("self-checkout-computer").checked
        ipcRenderer.invoke('setIsSelfcheckout', is_selfcheckout);

        const selectedPrinter = document.getElementById("printerSelect").value;
        const cpl = document.getElementById("cplInput").value;
        const encoding = document.getElementById("encodingInput").value;
        const command = document.getElementById("commandInput").value;
        const upsideDown = document.getElementById("upsideDownCheck").checked;

        ipcRenderer.invoke("setSettings", {
          "name": selectedPrinter,
          "cpl": cpl,
          "encoding": encoding,
          "command": command,
          "upsideDown": upsideDown
        })
        ipcRenderer.invoke("writeSettings");
        goAhead();
      }
      resetButton(printerSettingsButton);
    }));
    printerSettingsButton.classList.add("listened");
  }
  if (testPrintButton && !(testPrintButton.classList.contains("listened"))) {
    testPrintButton.addEventListener("click", (el => {
      printTestPage();
    }));
    testPrintButton.classList.add("listened");
  }

  // *******
  // Step 3
  // *******

  let completeSetupButton = document.getElementById("completeSetupButton");
  if (completeSetupButton && !(completeSetupButton.classList.contains("listened"))) {
    completeSetupButton.addEventListener("click", (el => {
      replaceWithSpinner(completeSetupButton);
      ipcRenderer.invoke("restart");
    }));
    completeSetupButton.classList.add("listened");
  }

}

function handleReceipt(settings) {
  let receipt = document.getElementById("receipt");
  if (!receipt) {
    return
  }
  ipcRenderer.invoke("getSettings").then(settings => {
    const printerConfig = {
      cpl: parseInt(settings.printer.cpl),
      encoding: settings.printer.encoding,
      upsideDown: settings.printer.upsideDown,
      gradient: false,
      spacing: false,
      gamma: 1.8,
      command: settings.printer.command
    };
    printer.printDirect({
      data: receiptline.transform(receipt.innerText, printerConfig),
      printer: settings.printer.name,
      type: 'RAW',
      success: function (jobID) {
        console.log("sent to printer with ID: " + jobID);
      },
      error: function (err) {
        new Notification("Printer Error", {body: `Something went wrong: ${err}`})
      }
    });
  })

  // remove the element so if another one spawns we don't get confused by it
  receipt.remove();
}


window.addEventListener('htmx:load', (evt) => {
  // when htmx swaps out a component, check for a receipt.
  // If there's a receipt, print it, then nuke the element.
  ipcRenderer.invoke('getSettings').then(result => {
    handleReceipt(result);
    handleInit(result);
  })
})

