const { app, WebContentsView, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { start } = require('node:repl');
const fs = require('node:fs');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (app.isPackaged){
    win.loadFile('dist/browser-template/browser/index.html');
  }else{
    win.loadURL('http://localhost:4200')
  }

  // --- GESTIONNAIRE DE MOTS DE PASSE ---
  ipcMain.on('open-passwords-window', (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    
    const passwordWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: parentWindow,
      modal: true,
      title: 'Gestionnaire de Mots de Passe',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    });

    if (app.isPackaged) {
      passwordWindow.loadFile(path.join(__dirname, '../browser/index.html'), { hash: 'passwords' });
    } else {
      passwordWindow.loadURL('http://localhost:4200/passwords');
    }
    passwordWindow.webContents.on('did-finish-load', () => {
      const passwordsPath = path.join(__dirname, 'passwords.json');

      //vérification de l'existence de passwords.json
      fs.access(passwordsPath, fs.constants.F_OK, (err) => {
        if (err) {
          console.log('passwords.json non trouvé, création du fichier...');
          fs.writeFile(passwordsPath, '[]', 'utf8', (writeErr) => {
            if (writeErr) {
              console.error("Erreur lors de la création de passwords.json", writeErr);
              return;
            }
            //Envoie des données du json en tableau
            passwordWindow.webContents.send('passwords-data', []);
          });
        } else {
          fs.readFile(passwordsPath, 'utf-8', (readErr, data) => {
            if (readErr) {
              console.error("Erreur de lecture du fichier passwords.json", readErr);
              return;
            }
            //Envoie des données du json en tableau
            passwordWindow.webContents.send('passwords-data', JSON.parse(data));
          });
        }
      });
    });
  });

  //Sauvegarde des mots des données dans le json
  ipcMain.on('save-passwords', (event, passwords) => {
    const passwordsPath = path.join(__dirname, 'passwords.json');
    const data = JSON.stringify(passwords, null, 2); 

    fs.writeFile(passwordsPath, data, 'utf8', (err) => {
      if (err) {
        console.error("Erreur lors de la sauvegarde du fichier passwords.json", err);
      } else {
        console.log("Mots de passe sauvegardés avec succès !");
      }
    });
  });
  //Fermeture de la fenêtre du gestionnaire
  ipcMain.on('close-password-window', (event) => {
    const windowToClose = BrowserWindow.fromWebContents(event.sender);
    if (windowToClose) {
      windowToClose.close();
    }
  });
  const view = new WebContentsView();
  win.contentView.addChildView(view);
  function fitViewToWin() {
    const winSize = win.webContents.getOwnerBrowserWindow().getBounds();
    view.setBounds({ x: 0, y: 55, width: winSize.width, height: winSize.height });
  }
    win.webContents.openDevTools({ mode: 'detach' });
  ipcMain.on('toogle-dev-tool', () => {
    if (winContent.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    } else {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  ipcMain.on('go-back', () => {
    view.webContents.navigationHistory.goBack();
  });

  ipcMain.handle('can-go-back', () => {
    return view.webContents.navigationHistory.canGoBack();
  });

  ipcMain.on('go-forward', () => {
    view.webContents.navigationHistory.goForward();
  });

  ipcMain.handle('can-go-forward', () => {
    return view.webContents.navigationHistory.canGoForward();
  });

  ipcMain.on('refresh', () => {
    view.webContents.reload();
  });

  //Correction pour recherche google rapide.
  ipcMain.handle('go-to-page', (event, url) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return view.webContents.loadURL(url);
    } else {
      const searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(url);
      return view.webContents.loadURL(searchUrl);
    }
  });

  view.webContents.on('did-start-navigation',()=>{
    win.webContents.send('url-changed', view.webContents.getURL());
  });

  ipcMain.handle('current-url', () => {
    return view.webContents.getURL();
  });

  ipcMain.handle('update-toolbar-url', () => {
    win.webContents.send('url-changed', view.webContents.getURL());
  });

  win.once('ready-to-show', () => {
    fitViewToWin();
    view.webContents.loadURL(view.webContents.getURL());
  });

  win.on('resized', () => {
    fitViewToWin();
  });

  // AUTOREMPLISSAGE DES MOTS DE PASSE ---
  view.webContents.on('did-finish-load', () => {
    const url = view.webContents.getURL();
    let domain;
    try {
      domain = new URL(url).hostname;
    } catch (e) {
      console.warn("Impossible d'analyser l'URL pour l'autofill:", url);
      return;
    }

    // Lire le fichier de mots de passe
    const passwordsPath = path.join(__dirname, 'passwords.json');
    fs.readFile(passwordsPath, 'utf-8', (readErr, data) => {
      if (readErr) {
        return;//Pas de fichier passwords.json
      }

      const passwords = JSON.parse(data);
      // On cherche un site enregistré avec son domaine.
      const match = passwords.find(entry => domain.includes(entry.website));

      if (match) {
        console.log(`Identifiants trouvés pour ${match.website}, injection...`);
        const injectionScript = `
          const username = ${JSON.stringify(match.username)};
          const password = ${JSON.stringify(match.password)};
          
          // Cherche le champ mot de passe (très fiable)
          const passField = document.querySelector('input[type="password"]');
          
          // Cherche le champ email/identifiant (plusieurs stratégies)
          let userField = document.querySelector('input[type="email"]');
          if (!userField) {
            userField = document.querySelector('input[type="text"][name*="user"], input[type="text"][id*="user"], input[type="text"][name*="login"], input[type="text"][id*="login"]');
          }
          // Autre stratégie : le premier champ texte/email avant le mot de passe
          if (!userField && passField && passField.form) {
             const inputs = Array.from(passField.form.querySelectorAll('input[type="text"], input[type="email"]'));
             if (inputs.length > 0) userField = inputs[0];
          }

          // Remplir les champs s'ils sont trouvés
          if (passField) {
            passField.value = password;
            passField.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (userField) {
            userField.value = username;
            userField.dispatchEvent(new Event('input', { bubbles: true }));
          }
        `;
        view.webContents.executeJavaScript(injectionScript)
          .then(() => console.log("Script d'autofill exécuté."))
          .catch(err => console.error("Échec du script d'autofill:", err));
      }
    });
  });
  
})
