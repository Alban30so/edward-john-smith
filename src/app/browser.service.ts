import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrowserService {

  url = 'https://amiens.unilasalle.fr';
  canGoBack = false;
  canGoForward = false;

  constructor() { 
    const service = this;
    function coucou(url: string) {
      service.url = url;
    }
    // @ts-ignore
    window.electronAPI.onInit(coucou);

  }
// @ts-ignore
  electronAPI = window.electronAPI;

  toogleDevTool() {
    this.electronAPI.toogleDevTool();
  }

  goBack() {
    this.electronAPI.goBack();
    this.updateHistory();
  }

  goForward() {
    this.electronAPI.goForward();
    this.updateHistory();
  }

  refresh() {
    this.electronAPI.refresh();
  }
  goToHome(){
    this.electronAPI.goToPage("https://amiens.unilasalle.fr");
    this.updateHistory();
  }

  goToPage(url: string) {
    this.electronAPI.goToPage(url)
      .then(() => this.updateHistory());
  }
  

  setToCurrentUrl() {
    this.electronAPI.currentUrl()
  }


  updateHistory() {
    this.setToCurrentUrl();

    this.electronAPI.canGoBack()
      .then((canGoBack : boolean) => this.canGoBack = canGoBack);

    this.electronAPI.canGoForward()
      .then((canGoForward : boolean) => this.canGoForward = canGoForward);
  }
}
