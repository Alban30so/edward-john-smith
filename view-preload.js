const { ipcRenderer } = require('electron');
//Clic droit listener
window.addEventListener('contextmenu', (e) => {
  // Si la cible du clic est un champ INPUT et que son type est 'password'
  if (e.target.tagName === 'INPUT' && e.target.type === 'password') {
    //Désactivation du menu par défaut
    e.preventDefault(); 
    //Affichage du menu par main.js
    ipcRenderer.send('show-password-menu');
  }
});