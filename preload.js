// preload.js

const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  // Vos fonctions existantes
  toogleDevTool: () => ipcRenderer.send('toogle-dev-tool'),
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
  refresh: () => ipcRenderer.send('refresh'),
  goToHome: () => ipcRenderer.send('go-to-home'),
  canGoForward: () => ipcRenderer.invoke('can-go-forward'),
  canGoBack: () => ipcRenderer.invoke('can-go-back'),
  goToPage: (url) => ipcRenderer.invoke('go-to-page', url),
  currentUrl: () => ipcRenderer.invoke('current-url'),
  onInit: (callback) => {
    ipcRenderer.on('url-changed', (event, url) => {
      callback(url);
    })
  },

  //gestion mot de passe
  openPasswordsWindow: () => ipcRenderer.send('open-passwords-window'),
  onPasswordsData: (callback) => ipcRenderer.on('passwords-data', callback),
  // Pour fermer la fenêtre du gestionnaire
  closePasswordWindow: () => ipcRenderer.send('close-password-window'),
  // Pour envoyer la nouvelle liste de mots de passe à sauvegarder
  savePasswords: (passwords) => ipcRenderer.send('save-passwords', passwords)
})