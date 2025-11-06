const { app, WebContentsView, BrowserWindow, ipcMain, Menu } = require('electron'); // 'Menu' est requis
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

  //Fenêtre gestionnaire de mot de passe
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

    //Lecture/Ecriture des mots de passe
    passwordWindow.webContents.on('did-finish-load', () => {
      const passwordsPath = path.join(__dirname, 'passwords.json');
      fs.access(passwordsPath, fs.constants.F_OK, (err) => {
        if (err) {
          console.log('passwords.json non trouvé, création du fichier...');
          fs.writeFile(passwordsPath, '[]', 'utf8', (writeErr) => {
            if (writeErr) {
              console.error("Erreur lors de la création de passwords.json", writeErr);
              return;
            }
            passwordWindow.webContents.send('passwords-data', []);
          });
        } else {
          fs.readFile(passwordsPath, 'utf-8', (readErr, data) => {
            if (readErr) {
              console.error("Erreur de lecture du fichier passwords.json", readErr);
              return;
            }
            passwordWindow.webContents.send('passwords-data', JSON.parse(data));
          });
        }
      });
    });
  });

  //Sauvegarde des mots de passe.
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

  //fermeture fenêtre mdp
  ipcMain.on('close-password-window', (event) => {
    const windowToClose = BrowserWindow.fromWebContents(event.sender);
    if (windowToClose) {
      windowToClose.close();
    }
  });


  // view preload pour lecture page web par electron
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'view-preload.js') 
    }
  });
  win.contentView.addChildView(view);

  //match electron/webview
  function fitViewToWin() {
    const winSize = win.webContents.getOwnerBrowserWindow().getBounds();
    view.setBounds({ x: 0, y: 55, width: winSize.width, height: winSize.height });
  }

    //Dev Tools
    //view.webContents.openDevTools({ mode: 'detach' });
    //win.webContents.openDevTools({ mode: 'detach' });


  //ToolBar
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

  
  //Ecoute view-preload.js
  ipcMain.on('show-password-menu', () => {
    console.log("[LOG] 'show-password-menu' reçu ! Vérification des correspondances...");

    const url = view.webContents.getURL();
    let domain;
    try {
      domain = new URL(url).hostname; 
    } catch (e) {
      console.warn("URL non valide pour le menu contextuel:", url);
      return;
    }

    const passwordsPath = path.join(__dirname, 'passwords.json');
    fs.readFile(passwordsPath, 'utf-8', (readErr, data) => {
      if (readErr) { 
        console.log('[MDP] Fichier passwords.json non trouvé ou illisible.');
        return; 
      } 

      const passwords = JSON.parse(data);
      const matches = passwords.filter(entry => domain.includes(entry.website));

      if (matches.length === 0) {
        console.log(`[MDP] Aucune correspondance trouvée pour le domaine: ${domain}`);
        return;
      }

      console.log(`[MDP] Trouvé ${matches.length} correspondance(s) ! Construction du menu...`);

      // Construction et affichage du menu
      const menuTemplate = matches.map(match => ({
        label: `Remplir avec : ${match.username}`,
        click: () => {
          const injectionScript = `
            const username = ${JSON.stringify(match.username)};
            const password = ${JSON.stringify(match.password)};
            
            // Cible le champ sur lequel on a cliqué (qui est le champ actif)
            const passField = document.activeElement; 
            
            // Cherche le champ email/identifiant
            let userField = null;
            if (passField && passField.form) {
                // Stratégie 1: chercher un champ 'email'
                userField = passField.form.querySelector('input[type="email"]');
                // Stratégie 2: chercher un champ contenant 'user' ou 'login'
                if (!userField) {
                    userField = passField.form.querySelector('input[type="text"][name*="user"], input[type="text"][id*="user"], input[type="text"][name*="login"], input[type="text"][id*="login"]');
                }
                // Stratégie 3: prendre le premier champ texte/email avant le champ mot de passe
                if (!userField) {
                   const inputs = Array.from(passField.form.querySelectorAll('input[type="text"], input[type="email"]'));
                   if (inputs.length > 0) userField = inputs[0];
                }
            }

            // Remplir les champs
            if (passField) {
              passField.value = password;
              passField.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (userField) {
              userField.value = username;
              userField.dispatchEvent(new Event('input', { bubbles: true }));
            }
          `;
          view.webContents.executeJavaScript(injectionScript);
        }
      }));

      //Menu clic droit
      menuTemplate.unshift({ label: 'Gestionnaire de mots de passe', enabled: false });
      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup(view.webContents.getOwnerBrowserWindow());
    });
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
})