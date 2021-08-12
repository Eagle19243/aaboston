import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';

const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default class Scraper {
    private output = path.resolve(__dirname, 'public', 'output.json');


    async start() {
        this.removeFile();
        const data1: any[] = await this.scrapeAABoston();
        const data2: any[] = await this.scrapeNerna();
        const data3: any[] = await this.scrapeNa();
        this.createOutput([...data1, ...data2, ...data3]);
        console.log('********** completed **********');
    }

    private async scrapeAABoston(): Promise<any[]> {
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
                source: 'aaboston.org',
            });
        }

        return data;
    }

    private async scrapeNerna(): Promise<any[]> {
        const url = `https://nerna.org/main_server/client_interface/jsonp/?switcher=GetSearchResults&get_used_formats&lang_enum=en&data_field_key=id_bigint,longitude,latitude,formats,location_postal_code_1,duration_time,start_time,time_zone,weekday_tinyint,location_province,location_municipality,location_street,location_info,location_text,comments,meeting_name,virtual_meeting_additional_info,virtual_meeting_link,phone_meeting_number&services[]=2&recursive=1&sort_keys=start_time`;
        const response = await axios.get(url);
        const json = JSON.parse(response.data.substr(1, response.data.length - 3));
        const meetings: any[] = json.meetings;
        const formats: any[] = json.formats;
        const data = [];

        for (const meeting of meetings) {
            const mFormats: string[] = meeting.formats.split(',');
            const types = mFormats.map(m => {
                const format = formats.find(f => {
                    return f.key_string === m;
                });
                return format.name_string;
            });
            const type: any = formats.find(f => {
                return mFormats.length && f.key_string === mFormats[0];
            });

            data.push({
                code: meeting.id_bigint,
                datetime: `${weekday[meeting.weekday_tinyint]}, ${meeting.start_time}`,
                town: meeting.location_municipality,
                name: meeting.meeting_name,
                location: `${meeting.latitude}, ${meeting.longitude}`,
                address: `${meeting.location_street}`,
                types,
                type_description: type ? type.description_string : '',
                notes: !!meeting.virtual_meeting_link ? `${meeting.virtual_meeting_link}, ${meeting.virtual_meeting_additional_info}` : '',
                source: 'nerna.org',
            });
        }

        return data;
    }

    private async scrapeNa(): Promise<any[]> {
        let html = await axios.get('https://www.na.org/meetingsearch/text-results.php?country=USA&state=Massachusetts&city=Boston&zip=&street=&within=20&day=0&lang=&orderby=datetime');
        let $ = cheerio.load(html.data);
        const data = $('.result_table tbody tr')
            .map((i, x) => {
                if (i === 0) {
                    return null;
                }

                const frm = $(x).find('form[action="email-update.php"]');
                const code = $(frm).find('#hdnGroupId').val().toString();
                const location = $(frm).find('#hdnLocation').val().toString().replace('(VENUE CLOSED)', '').trim();
                const address = $(x).find('td').first().html().split('<br>')[1];
                const fullAddress = $(frm).find('#hdnAddress').val().toString().replace('(VENUE CLOSED)', '').trim();
                const tmpAry = fullAddress.split(' ');
                const town = tmpAry[tmpAry.indexOf('MA') - 1].replace(',', '');
                const day = $(frm).find('#hdnMtgDay').val().toString();
                const time = $(frm).find('#hdnMtgTime').val().toString();
                const types = $(frm).find('#hdnFormats').val().toString().split(',').map((type) => type.trim());
                const notes = $(frm).find('#hdnRoom').val().toString();
                return {
                    code,
                    datetime: `${day}, ${time}`,
                    town,
                    location,
                    address,
                    types,
                    notes,
                    source: 'na.org',
                }
            })
            .toArray();
        
        data.shift();

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