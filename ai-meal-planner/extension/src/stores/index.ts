import { BaseStore } from './base_store';
import { BarboraStore } from './barbora_store';
import { RimiStore } from './rimi_store';
import { MaximaStore } from './maxima_store';
import { IKIStore } from './iki_store';

export { BaseStore, BarboraStore, RimiStore, MaximaStore, IKIStore };

export type StoreName = 'barbora' | 'rimi' | 'maxima' | 'iki';

export class StoreFactory {
    private static stores: Map<StoreName, BaseStore> = new Map();

    static getStore(storeName: StoreName): BaseStore {
        if (!this.stores.has(storeName)) {
            switch (storeName) {
                case 'barbora':
                    this.stores.set(storeName, new BarboraStore());
                    break;
                case 'rimi':
                    this.stores.set(storeName, new RimiStore());
                    break;
                case 'maxima':
                    this.stores.set(storeName, new MaximaStore());
                    break;
                case 'iki':
                    this.stores.set(storeName, new IKIStore());
                    break;
                default:
                    throw new Error(`Unknown store: ${storeName}`);
            }
        }
        return this.stores.get(storeName)!;
    }

    static getAllStores(): BaseStore[] {
        return [
            this.getStore('barbora'),
            this.getStore('rimi'),
            this.getStore('maxima'),
            this.getStore('iki'),
        ];
    }

    static getCurrentStore(): BaseStore | null {
        const url = window.location.href;

        if (url.includes('barbora.lt')) {
            return this.getStore('barbora');
        } else if (url.includes('rimi.lt')) {
            return this.getStore('rimi');
        } else if (url.includes('maxima.lt')) {
            return this.getStore('maxima');
        } else if (url.includes('lastmile.lt/chain/IKI')) {
            return this.getStore('iki');
        }

        return null;
    }
}
