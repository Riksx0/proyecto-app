import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    this.initDarkMode();
  }

  private initDarkMode() {
    const savedTheme = localStorage.getItem('darkMode');
    const isDark = savedTheme !== null 
      ? savedTheme === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    document.documentElement.classList.toggle('ion-palette-dark', isDark);
  }
}
