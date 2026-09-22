import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personOutline, storefrontOutline, trendingUpOutline, logOutOutline, starOutline, analyticsOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { EveMarketService } from '../services/eve-market.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor(
    private authService: AuthService,
    private marketService: EveMarketService
  ) {
    addIcons({ personOutline, storefrontOutline, trendingUpOutline, logOutOutline, starOutline, analyticsOutline });
  }

  logout() {
    this.marketService.clearUserData();
    this.authService.logout();
  }
}
