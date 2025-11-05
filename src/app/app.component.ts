import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AddressComponent } from './address/address.component';
import { BackwardComponent } from './backward/backward.component';
import { DebugComponent } from './debug/debug.component';
import { ForwardComponent } from './forward/forward.component';
import { RefreshComponent } from './refresh/refresh.component';
import { HomeComponent } from './home/home.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet, 
        MatToolbarModule, 
        MatIconModule,
        MatButtonModule,  
        MatTooltipModule,
        HomeComponent, 
        AddressComponent, 
        BackwardComponent, 
        DebugComponent, 
        ForwardComponent, 
        RefreshComponent
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'browser-template';
  isPasswordWindow = false;

  constructor(
    private router: Router, 
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.ngZone.run(() => {
        this.isPasswordWindow = (event as NavigationEnd).url.includes('/passwords');
      });
    });
  }

  openPasswordManager(): void {
    (window as any).electronAPI.openPasswordsWindow();
  }
}

