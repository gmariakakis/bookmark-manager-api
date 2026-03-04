import db from './database.js';
import { migrations } from './migrations.js';

db.exec(migrations);

export default db;
