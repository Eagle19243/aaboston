import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';

export default class Scraper {
    private output = path.resolve(__dirname, 'public', 'output.json');


    async start() {
        this.removeFile();
        const data: any[] = await this.scrape();
        this.createOutput(data);
        console.log('********** completed **********');
    }

    private async scrape(): Promise<any[]> {
        let html = await axios.get('https://aaboston.org/meetings?tsml-day=any');
        let $ = cheerio.load(html.data);
        const meetings = $('#meetings_tbody tr')
            .map((i, x) => {
                return {
                    link: $(x).find('.name a').attr('href'),
                    code: $(x).find('.types').text(),
                    town: $(x).find('.region').text(),
                    name: $(x).find('.name a').text(),
                    location: $(x).find('.location').text().trim(),
                    address: $(x).find('.address').text(),
                }
            })
            .toArray();
        const data = [];

        for (const meeting of meetings) {
            html = await axios.get(meeting.link);
            $ = cheerio.load(html.data);
            console.log(meeting.link);
            const datetime = $('.meeting-time').text();
            const types = $('.meeting-types li').map((i, x) => $(x).text().trim()).toArray();
            const type_description = $('.meeting-type-description').text();
            const last_updated = $('.list-group-item-updated').text().replace('Updated', '').trim();
            const notes = $('.meeting-notes').text();
            const contact = $('.list-group-item-group a').map((i, x) => $(x).attr('href').replace('mailto:', '')).toArray();
            
            data.push({
                code: meeting.code,
                datetime,
                town: meeting.town,
                name: meeting.name,
                location: meeting.location,
                address: meeting.address,
                types,
                type_description,
                last_updated,
                notes,
                contact,
            });
        }

        return data;
    }

    private createOutput(data: any[]) {
        fs.writeFileSync(this.output, JSON.stringify(data));
    }

    private removeFile() {
        if (fs.existsSync(this.output)) {
            fs.unlinkSync(this.output);
        }
    }

}