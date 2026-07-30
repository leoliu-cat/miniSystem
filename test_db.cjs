const db = require('better-sqlite3')(process.env.DATA_DIR ? process.env.DATA_DIR + '/weddings.db' : 'weddings.db');
console.log(db.prepare('SELECT count(*) as c FROM weddings').get().c);
console.log(db.prepare("SELECT social_id, groom_name_zh FROM weddings WHERE social_id LIKE '%janicexyeh%' OR social_id LIKE '%sandyyccc%'").all());
