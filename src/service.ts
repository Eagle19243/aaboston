import * as scheduler from 'node-schedule';
import Scraper from './scraper';

export default class Service {
    
    private scraper: Scraper = new Scraper();

    start() {
        const rule     = new scheduler.RecurrenceRule();
        rule.hour      = 0;
        rule.minute    = 0;
        rule.second    = 0;
        rule.dayOfWeek = new scheduler.Range(0, 6);

        this.scraper.start();
        
        scheduler.scheduleJob('Start_Scraper', rule, () => {
            try {
                this.scraper.start();
            } catch (e) {
                console.log('Service::start():', e);
            }
        });
    }

}