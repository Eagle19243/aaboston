import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import Service from './service';

class App {

   public app: express.Application;

   private service: Service = new Service();

   constructor() {
      this.app = express();
      this.config();
      this.service.start();
   }

   private config(): void {
      this.app.use(bodyParser.json());
      this.app.use(bodyParser.urlencoded({ extended: false }));
      this.app.use(express.static(path.resolve(__dirname, 'public')));
   }

}

export default new App().app;