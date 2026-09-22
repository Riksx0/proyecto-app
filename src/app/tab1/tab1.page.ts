import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personCircleOutline,
  star,
  starOutline,
  trendingUpOutline,
  logOutOutline,
  refreshOutline,
  cartOutline,
  storefrontOutline,
  shieldCheckmarkOutline,
  trashOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { EveMarketService } from '../services/eve-market.service';
import { EveItem, MarketPrice, UserProfile } from '../models/eve-market.model';
import { Subscription } from 'rxjs';

interface FavoriteWithPrice {
  item: EveItem;
  price?: MarketPrice;
  loading: boolean;
}

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent
  ]
})
export class Tab1Page implements OnInit, OnDestroy {
  user: UserProfile | null = null;
  favorites: FavoriteWithPrice[] = [];
  private sub = new Subscription();

  constructor(
    private authService: AuthService,
    private marketService: EveMarketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      personCircleOutline,
      star,
      starOutline,
      trendingUpOutline,
      logOutOutline,
      refreshOutline,
      cartOutline,
      storefrontOutline,
      shieldCheckmarkOutline,
      trashOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
    this.sub.add(
      this.marketService.favorites$.subscribe(items => {
        this.updateFavoritePrices(items);
      })
    );
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  loadUserData() {
    this.user = this.authService.getUser();
    if (this.user?.username) {
      this.marketService.loadUserData(this.user.username);
    }
    this.cdr.detectChanges();
  }

  getPortraitSrc(): string {
    if (this.user?.portraitUrl) {
      return this.user.portraitUrl;
    }
    const name = this.user?.username || 'Pilot';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=ffffff&size=256&bold=true`;
  }

  onPortraitError(event: any) {
    const target = event.target as HTMLImageElement;
    if (target) {
      const name = this.user?.username || 'Pilot';
      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=ffffff&size=256&bold=true`;
    }
  }

  updateFavoritePrices(items: EveItem[]) {
    this.favorites = items.map(item => {
      const existing = this.favorites.find(f => f.item.typeId === item.typeId);
      return {
        item,
        price: existing?.price,
        loading: !existing?.price
      };
    });
    this.cdr.detectChanges();

    this.favorites.forEach(fav => {
      this.marketService.getMarketPrice(fav.item.typeId).subscribe(price => {
        fav.price = price;
        fav.loading = false;
        this.cdr.detectChanges();
      });
    });
  }

  refreshPrices(event?: any) {
    this.favorites.forEach(fav => {
      fav.loading = true;
      this.marketService.getMarketPrice(fav.item.typeId).subscribe(price => {
        fav.price = price;
        fav.loading = false;
        this.cdr.detectChanges();
      });
    });

    if (event) {
      setTimeout(() => {
        event.target.complete();
        this.cdr.detectChanges();
      }, 800);
    }
  }

  removeFavorite(item: EveItem, event: Event) {
    event.stopPropagation();
    this.marketService.toggleFavorite(item);
    this.cdr.detectChanges();
  }

  analyzeItem(item: EveItem) {
    if (!this.marketService.isInAnalyzer(item.typeId)) {
      this.marketService.toggleAnalyzer(item);
    }
    this.router.navigate(['/tabs/tab3'], { queryParams: { typeId: item.typeId } });
  }

  goToMarket() {
    this.router.navigate(['/tabs/tab2']);
  }

  logout() {
    this.marketService.clearUserData();
    this.authService.logout();
  }

  formatIsk(amount?: number | null): string {
    if (amount === undefined || amount === null) return '0.00 ISK';
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(2) + ' B ISK';
    }
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + ' M ISK';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + ' K ISK';
    }
    return amount.toFixed(2) + ' ISK';
  }
}